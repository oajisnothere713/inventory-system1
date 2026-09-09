import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ImportRow = Record<string, string>;
type ItemCategoryValue = "OPEX" | "CAPEX";
type ItemSubCategoryValue = "medicines" | "consumables" | "devices" | "electrical";

const validCategories = new Set(["OPEX", "CAPEX"]);
const validSubcats = new Set(["medicines", "consumables", "devices", "electrical"]);

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(clean(value));
  return Number.isFinite(n) ? n : fallback;
}

function toDate(value: unknown) {
  const raw = clean(value);
  if (!raw) return null;

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;

  return d;
}

function makeSupplierCode(name: string) {
  const base = name.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 5) || "SUP";
  return base + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
}

function makeDeptCode(name: string) {
  return (
    name
      .replace(/[^a-z0-9]/gi, "")
      .toUpperCase()
      .slice(0, 10) || "GEN"
  );
}

async function nextItemCode(
  tx: { $queryRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown> },
  subcat: string
) {
  const prefixes: Record<string, string> = {
    medicines: "MED",
    consumables: "CON",
    devices: "DEV",
    electrical: "ELE",
  };
  const prefix = prefixes[subcat] ?? "ITM";
  const rows = (await tx.$queryRawUnsafe(
    `
      SELECT item_code
      FROM items
      WHERE item_code LIKE $1
      ORDER BY item_id DESC
      LIMIT 25
    `,
    `${prefix}-%`
  )) as Array<Record<string, unknown>>;

  const nextNumber = rows.reduce((highest, row) => {
    const match = String(row.item_code ?? "").match(/-(\d+)$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0) + 1;

  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows = Array.isArray(body.rows) ? (body.rows as ImportRow[]) : [];
    const recordedBy = clean(body.recordedBy);

    if (!rows.length) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    let imported = 0;
    const skipped: { row: number; reason: string }[] = [];

    const result = await prisma.$transaction(async (tx) => {
      let systemDept = await tx.department.findFirst({
        where: { deptCode: "GEN" },
      });

      if (!systemDept) {
        systemDept = await tx.department.create({
          data: {
            deptCode: "GEN",
            deptName: "General Store",
          },
        });
      }

      let systemUser;
      
      if (recordedBy) {
        systemUser = await tx.user.findFirst({
          where: { fullName: { equals: recordedBy, mode: 'insensitive' } },
        });

        if (!systemUser) {
          const safeUsername = recordedBy.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 50) + '_' + Math.floor(Math.random() * 1000);
          systemUser = await tx.user.create({
            data: {
              employeeId: `EMP-${Math.floor(Math.random() * 100000)}`,
              fullName: recordedBy,
              username: safeUsername,
              passwordHash: "import",
              role: "store_manager",
              deptId: systemDept.deptId,
            },
          });
        }
      } else {
        systemUser = await tx.user.findFirst({
          where: { username: "import_user" },
        });

        if (!systemUser) {
          systemUser = await tx.user.create({
            data: {
              employeeId: "EMP-IMPORT",
              fullName: "Import User",
              username: "import_user",
              passwordHash: "import",
              role: "store_manager",
              deptId: systemDept.deptId,
            },
          });
        }
      }

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];

        let itemCode = clean(row.id || row.item_code || row.itemCode);
        const itemName = clean(row.name || row.item_name || row.itemName);
        const itemNameHi = clean(row.item_name_hi || row.itemNameHi);
        const category = clean(row.category).toUpperCase();
        const subcat = clean(row.subcat || row.sub_category || row.subCategory).toLowerCase();
        const unit = clean(row.unit) || "nos";
        const openingNotes = clean(row.notes || row.opening_notes || row.openingNotes);

        if (!itemName) {
          skipped.push({ row: index + 2, reason: "Missing item name" });
          continue;
        }

        if (!validCategories.has(category)) {
          skipped.push({ row: index + 2, reason: "Invalid category" });
          continue;
        }

        if (!validSubcats.has(subcat)) {
          skipped.push({ row: index + 2, reason: "Invalid subcat" });
          continue;
        }

        const itemCategory = category as ItemCategoryValue;
        const itemSubCategory = subcat as ItemSubCategoryValue;

        if (!itemCode) {
          itemCode = await nextItemCode(tx, itemSubCategory);
        }

        const deptCode = clean(row.primary_dept_code || row.primaryDeptCode || row.dept_code || row.deptCode);
        const deptName = clean(row.primary_dept_name || row.primaryDeptName || row.dept_name || row.deptName);
        const deptNameOrCode = deptCode || deptName || clean(row.dept || row.department || row.primary_dept) || "GEN";
        let dept = await tx.department.findFirst({
          where: {
            OR: [
              { deptCode: deptCode || deptNameOrCode },
              { deptName: deptName || deptNameOrCode },
            ],
          },
        });

        if (!dept) {
          dept = await tx.department.create({
            data: {
              deptCode: deptCode || makeDeptCode(deptNameOrCode),
              deptName: deptName || deptNameOrCode,
            },
          });
        }

        const supplierName = clean(row.supplier || row.default_supplier || row.default_supplier_name || row.defaultSupplierName);
        let supplierId: number | null = null;

        if (supplierName) {
          let supplier = await tx.supplier.findFirst({
            where: { supplierName },
          });

          if (!supplier) {
            supplier = await tx.supplier.create({
              data: {
                supplierCode: makeSupplierCode(supplierName),
                supplierName,
              },
            });
          }

          supplierId = supplier.supplierId;
        }

        const min = toNumber(row.min || row.min_stock || row.min_stock_level);
        const max = toNumber(row.max || row.max_stock || row.max_stock_level);
        const price = toNumber(row.price || row.price_per_unit);
        const itemType = clean(row.sub || row.item_type || row.itemType);
        const description = clean(row.description);
        const supplierBarcode = clean(row.supplier_barcode || row.supplierBarcode);
        const reorderQtyRaw = clean(row.reorder_qty || row.reorderQty);
        const reorderQty = reorderQtyRaw ? Number(reorderQtyRaw) : null;
        const amcRequired = category === "CAPEX" && ["true", "1", "yes", "y"].includes(clean(row.amc_required || row.amcRequired).toLowerCase());
        const amcNumber = clean(row.amc_number || row.amcNumber);
        const amcStartDate = toDate(row.amc_start_date || row.amcStartDate);
        const amcEndDate = toDate(row.amc_end_date || row.amcEndDate);
        const amcValueRaw = clean(row.amc_value || row.amcValue);
        const amcValue = amcValueRaw ? Number(amcValueRaw) : null;
        const amcCoverageType = ['comprehensive', 'non_comprehensive', 'parts_only', 'labour_only'].includes(clean(row.amc_coverage_type || row.amcCoverageType))
          ? clean(row.amc_coverage_type || row.amcCoverageType)
          : 'comprehensive';
        const amcServiceFrequency = clean(row.amc_service_frequency || row.amcServiceFrequency) || null;
        const amcContactPerson = clean(row.amc_contact_person || row.amcContactPerson) || null;
        const amcContactPhone = clean(row.amc_contact_phone || row.amcContactPhone) || null;
        const amcSupplierName = clean(row.amc_supplier_name || row.amcSupplierName || supplierName);

        const item = await tx.item.upsert({
          where: { itemCode },
          update: {
            itemName,
            itemNameHi: itemNameHi || null,
            category: itemCategory,
            subCategory: itemSubCategory,
            itemType: itemType || null,
            description: description || null,
            unit,
            primaryDeptId: dept.deptId,
            defaultSupplierId: supplierId,
            minStockLevel: min,
            maxStockLevel: max || null,
            reorderQty,
            pricePerUnit: price || null,
            supplierBarcode: supplierBarcode || null,
            hasExpiry: itemCategory === "OPEX",
            hasAmc: itemCategory === "CAPEX",
            isActive: true,
          },
          create: {
            itemCode,
            itemName,
            itemNameHi: itemNameHi || null,
            category: itemCategory,
            subCategory: itemSubCategory,
            itemType: itemType || null,
            description: description || null,
            unit,
            primaryDeptId: dept.deptId,
            defaultSupplierId: supplierId,
            minStockLevel: min,
            maxStockLevel: max || null,
            reorderQty,
            pricePerUnit: price || null,
            supplierBarcode: supplierBarcode || null,
            hasExpiry: itemCategory === "OPEX",
            hasAmc: itemCategory === "CAPEX",
            createdBy: systemUser.userId,
          },
        });

        const stock = toNumber(row.opening_quantity || row.stock || row.quantity || row.qty);
        const batchNumber = clean(row.batch || row.batchNo || row.batch_number);

        if (stock > 0) {
          const stockAgg = await tx.itemBatch.aggregate({
            where: { itemId: item.itemId },
            _sum: { quantityAvailable: true },
          });

          const stockBefore = Number(stockAgg._sum.quantityAvailable || 0);

          const seq = (await tx.$queryRaw`
            SELECT nextval('grn_entries_grn_id_seq') as grn_id,
                   nextval('item_batches_batch_id_seq') as batch_id
          `) as Array<{ grn_id: number | string | bigint; batch_id: number | string | bigint }>;

          const grnId = Number(seq[0].grn_id);
          const batchId = Number(seq[0].batch_id);
          const grnNumber = `IMP-GRN-${new Date().getFullYear()}-${grnId.toString().padStart(4, "0")}`;
          const finalBatchNumber = batchNumber || `IMPORT-${grnId}`;
          const expiryDate = toDate(row.expiry || row.expiry_date || row.expiryDate);
          const mfgDate = toDate(row.mfg_date || row.mfgDate);
          const invoiceNumber = clean(row.invoice || row.invoice_number || row.invoiceNo || row.invoice_no) || "IMPORT";
          const invoiceDate = toDate(row.invoice_date || row.invoiceDate);
          const storeLocation = clean(row.location || row.store_location || row.storeLocation) || "Imported stock";
          const serialNumbers = clean(row.serial_numbers || row.serialNumbers);

          await tx.$queryRaw`
            INSERT INTO grn_entries (
              grn_id, grn_number, grn_date, item_id, batch_id, supplier_id,
              quantity_received, unit, batch_number, mfg_date, expiry_date, invoice_number,
              invoice_date, price_per_unit, total_value, store_location, received_by,
              stock_before, stock_after, notes, created_at
            )
            VALUES (
              ${grnId}, ${grnNumber}, CURRENT_DATE, ${item.itemId}, ${batchId}, ${supplierId},
              ${stock}, ${unit}, ${finalBatchNumber}, ${mfgDate}, ${expiryDate},
              ${invoiceNumber}, ${invoiceDate}, ${price || null}, ${price ? price * stock : null}, ${storeLocation},
              ${systemUser.userId}, ${stockBefore}, ${stockBefore + stock}, ${openingNotes || null}, CURRENT_TIMESTAMP
            )
          `;

          await tx.$queryRaw`
            INSERT INTO item_batches (
              batch_id, item_id, batch_number, quantity_received, quantity_available,
              mfg_date, expiry_date, grn_id, supplier_id, purchase_price, storage_location,
              serial_numbers, notes, created_at, updated_at
            )
            VALUES (
              ${batchId}, ${item.itemId}, ${finalBatchNumber}, ${stock}, ${stock},
              ${mfgDate}, ${expiryDate}, ${grnId}, ${supplierId}, ${price || null},
              ${storeLocation}, ${serialNumbers || null}, ${openingNotes || null}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
          `;

          if (amcRequired && amcNumber && amcStartDate && amcEndDate) {
            let resolvedAmcSupplierId = supplierId;

            if (amcSupplierName && amcSupplierName !== supplierName) {
              let amcSupplier = await tx.supplier.findFirst({
                where: { supplierName: amcSupplierName },
              });

              if (!amcSupplier) {
                amcSupplier = await tx.supplier.create({
                  data: {
                    supplierCode: makeSupplierCode(amcSupplierName),
                    supplierName: amcSupplierName,
                  },
                });
              }

              resolvedAmcSupplierId = amcSupplier.supplierId;
            }

            await tx.$queryRaw`
              INSERT INTO amc_contracts (
                amc_number, item_id, batch_id, grn_id, supplier_id,
                contract_start, contract_end, amc_value, coverage_type,
                service_frequency, contact_person, contact_phone, status,
                notes, created_at, created_by
              )
              VALUES (
                ${amcNumber}, ${item.itemId}, ${batchId}, ${grnId}, ${resolvedAmcSupplierId},
                ${amcStartDate}, ${amcEndDate}, ${amcValue}, ${amcCoverageType}::"AmcCoverageType",
                ${amcServiceFrequency}, ${amcContactPerson}, ${amcContactPhone}, 'active'::"AmcStatus",
                ${'AMC added during bulk import'}, CURRENT_TIMESTAMP, ${systemUser.userId}
              )
            `;
          }
        }

        imported++;
      }

      return { imported, skipped };
    });

    return NextResponse.json({
      ok: true,
      imported: result.imported,
      skipped: result.skipped,
    });
  } catch (err) {
    console.error("POST /api/registry/import error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
