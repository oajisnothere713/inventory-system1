import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({ adapter: new PrismaPg(dbUrl) } as any);

type ImportRow = Record<string, string>;

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
  return (
    name
      .replace(/[^a-z0-9]/gi, "")
      .toUpperCase()
      .slice(0, 8) || "SUP"
  );
}

function makeDeptCode(name: string) {
  return (
    name
      .replace(/[^a-z0-9]/gi, "")
      .toUpperCase()
      .slice(0, 10) || "GEN"
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows = Array.isArray(body.rows) ? (body.rows as ImportRow[]) : [];

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

      let systemUser = await tx.user.findFirst({
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

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];

        const itemCode = clean(row.id || row.item_code || row.itemCode);
        const itemName = clean(row.name || row.item_name || row.itemName);
        const category = clean(row.category).toUpperCase();
        const subcat = clean(row.subcat || row.sub_category || row.subCategory).toLowerCase();
        const unit = clean(row.unit) || "nos";

        if (!itemCode || !itemName) {
          skipped.push({ row: index + 2, reason: "Missing id or name" });
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

        const deptNameOrCode = clean(row.dept) || "GEN";
        let dept = await tx.department.findFirst({
          where: {
            OR: [{ deptCode: deptNameOrCode }, { deptName: deptNameOrCode }],
          },
        });

        if (!dept) {
          dept = await tx.department.create({
            data: {
              deptCode: makeDeptCode(deptNameOrCode),
              deptName: deptNameOrCode,
            },
          });
        }

        const supplierName = clean(row.supplier);
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

        const min = toNumber(row.min || row.min_stock_level);
        const max = toNumber(row.max || row.max_stock_level);
        const price = toNumber(row.price || row.price_per_unit);

        const item = await tx.item.upsert({
          where: { itemCode },
          update: {
            itemName,
            category: category as any,
            subCategory: subcat as any,
            unit,
            primaryDeptId: dept.deptId,
            defaultSupplierId: supplierId,
            minStockLevel: min,
            maxStockLevel: max || null,
            pricePerUnit: price || null,
          },
          create: {
            itemCode,
            itemName,
            category: category as any,
            subCategory: subcat as any,
            unit,
            primaryDeptId: dept.deptId,
            defaultSupplierId: supplierId,
            minStockLevel: min,
            maxStockLevel: max || null,
            pricePerUnit: price || null,
            hasExpiry: category === "OPEX",
            hasAmc: category === "CAPEX",
            createdBy: systemUser.userId,
          },
        });

        const stock = toNumber(row.stock || row.quantity || row.qty);
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
          `) as any[];

          const grnId = Number(seq[0].grn_id);
          const batchId = Number(seq[0].batch_id);
          const grnNumber = `IMP-GRN-${new Date().getFullYear()}-${grnId.toString().padStart(4, "0")}`;
          const finalBatchNumber = batchNumber || `IMPORT-${grnId}`;

          await tx.$queryRaw`
            INSERT INTO grn_entries (
              grn_id, grn_number, grn_date, item_id, batch_id, supplier_id,
              quantity_received, unit, batch_number, expiry_date, invoice_number,
              price_per_unit, total_value, store_location, received_by,
              stock_before, stock_after, created_at
            )
            VALUES (
              ${grnId}, ${grnNumber}, CURRENT_DATE, ${item.itemId}, ${batchId}, ${supplierId},
              ${stock}, ${unit}, ${finalBatchNumber}, ${toDate(row.expiry)},
              ${"IMPORT"}, ${price || null}, ${price ? price * stock : null}, ${"Imported stock"},
              ${systemUser.userId}, ${stockBefore}, ${stockBefore + stock}, CURRENT_TIMESTAMP
            )
          `;

          await tx.$queryRaw`
            INSERT INTO item_batches (
              batch_id, item_id, batch_number, quantity_received, quantity_available,
              expiry_date, grn_id, supplier_id, purchase_price, storage_location,
              created_at, updated_at
            )
            VALUES (
              ${batchId}, ${item.itemId}, ${finalBatchNumber}, ${stock}, ${stock},
              ${toDate(row.expiry)}, ${grnId}, ${supplierId}, ${price || null},
              ${"Imported stock"}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
          `;
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
