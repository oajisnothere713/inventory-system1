import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { NextResponse } from 'next/server'

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL is not set')
// adapter typing is incompatible with current PrismaClient constructor
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter: new PrismaPg(dbUrl) } as any)

const deptCategoryFor = (code: string): 'clinical' | 'admin' | 'lab' | 'pharmacy' | 'other' => {
  if (code === 'PHM') return 'pharmacy'
  if (code === 'LAB') return 'lab'
  if (['OPD-GEN', 'IPD-A', 'IPD-B', 'PKM', 'SHA', 'KAU', 'STR', 'SHY', 'SWA'].includes(code)) return 'clinical'
  return 'other'
}

export async function GET() {
  try {
    // Safer approach: fetch items and batches in two queries and merge in JS.
    const itemsSql = `
      SELECT
        i.item_id AS iid,
        i.item_code AS id,
        i.item_name AS name,
        i.item_type AS sub,
        i.category,
        i.sub_category AS subcat,
        i.unit,
        i.min_stock_level::text AS min_stock_level,
        i.max_stock_level::text AS max_stock_level,
        COALESCE(d.dept_code, d.dept_name) AS dept,
        s.supplier_name AS supplier,
        a.amc_number AS amc,
        to_char(a.contract_end, 'YYYY-MM-DD') AS amc_expiry,
        i.price_per_unit::text AS price
      FROM items i
      LEFT JOIN departments d ON d.dept_id = i.primary_dept_id
      LEFT JOIN suppliers s ON s.supplier_id = i.default_supplier_id
      LEFT JOIN LATERAL (
        SELECT amc_number, contract_end FROM amc_contracts ac WHERE ac.item_id = i.item_id ORDER BY ac.contract_end DESC LIMIT 1
      ) a ON true
      WHERE i.is_active = true
      ORDER BY i.item_name ASC;
    `

    const itemsRaw = (await prisma.$queryRawUnsafe(itemsSql)) as unknown as Array<Record<string, unknown>>;
    const itemIds = itemsRaw.map(r => r.iid as number).filter(Boolean) as number[];

    let batchesRaw: Array<Record<string, unknown>> = [];
    if (itemIds.length) {
      const batchSql = `
        SELECT
          ib.item_id,
          ib.batch_id,
          ib.batch_number AS batch,
          ib.quantity_available AS stock,
          to_char(ib.mfg_date, 'YYYY-MM-DD') AS mfg_date,
          to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry,
          sup.supplier_name AS supplier,
          ib.purchase_price AS price,
          ib.storage_location AS location,
          ib.serial_numbers AS serial_numbers,
          g.grn_number AS grn,
          to_char(g.grn_date, 'YYYY-MM-DD') AS grn_date,
          g.invoice_number AS invoice,
          to_char(g.invoice_date, 'YYYY-MM-DD') AS invoice_date,
          ib.notes AS notes,
          ac.amc_number AS amc,
          to_char(ac.contract_end, 'YYYY-MM-DD') AS amc_expiry,
          ac.status AS amc_status,
          amc_sup.supplier_name AS amc_supplier
        FROM item_batches ib
        LEFT JOIN grn_entries g ON g.grn_id = ib.grn_id
        LEFT JOIN suppliers sup ON sup.supplier_id = ib.supplier_id
        LEFT JOIN LATERAL (
          SELECT *
          FROM amc_contracts ac
          WHERE ac.batch_id = ib.batch_id
          ORDER BY ac.contract_end DESC
          LIMIT 1
        ) ac ON true
        LEFT JOIN suppliers amc_sup ON amc_sup.supplier_id = ac.supplier_id
        WHERE ib.item_id IN (${itemIds.join(',')})
        ORDER BY ib.expiry_date ASC NULLS LAST, ib.created_at DESC
`;
      batchesRaw = (await prisma.$queryRawUnsafe(batchSql)) as unknown as Array<Record<string, unknown>>;
    }

    const batchesByItem: Record<number, Array<Record<string, unknown>>> = {};
    for (const b of batchesRaw) {
      const id = Number(b['item_id']);
      if (!batchesByItem[id]) batchesByItem[id] = [];
      const serials = String(b["serial_numbers"] ?? "")
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
      batchesByItem[id].push({
        batch: b["batch"] as string,
        stock: Number(b["stock"] ?? 0),
        mfgDate: (b["mfg_date"] as string) || null,
        expiry: (b["expiry"] as string) || null,
        supplier: (b["supplier"] as string) || null,
        price: b["price"] ?? null,
        location: b["location"] ?? null,
        grn: (b["grn"] as string) || null,
        grnDate: (b["grn_date"] as string) || null,
        invoice: (b["invoice"] as string) || null,
        invoiceDate: (b["invoice_date"] as string) || null,
        notes: (b["notes"] as string) || null,
        serials,
        amc: (b["amc"] as string) || null,
        amcExpiry: (b["amc_expiry"] as string) || null,
        amcStatus: (b["amc_status"] as string) || null,
        amcSupplier: (b["amc_supplier"] as string) || null,
      });
    }

    const items = itemsRaw.map(it => {
      const bs = batchesByItem[it['iid'] as number] || [];
      const totalStock = bs.reduce((s, x) => s + (Number(x['stock'] ?? 0)), 0);
      const earliestExpiry = (bs.filter(x => x['expiry']).map(x => new Date(String(x['expiry'])).toISOString()).sort()[0]) || null;
      return {
        id: it.id,
        name: it.name,
        sub: it.sub || '',
        category: it.category,
        subcat: it.subcat,
        stock: totalStock,
        min: Number(it.min_stock_level || 0),
        max: Number(it.max_stock_level || 0),
        unit: it.unit || '',
        expiry: earliestExpiry,
        dept: it.dept || '',
        batch: bs[0]?.batch || null,
        batches: bs,
        supplier: it.supplier || null,
        price: Number(it.price || 0),
        amc: it.amc || null,
        amcExpiry: it.amc_expiry || null,
        serial: null,
        purchase: null,
      }
    })

    return NextResponse.json(items)
  } catch (err) {
    console.error('Error in /api/registry:', err);
    const body = process.env.NODE_ENV === 'production'
      ? { error: 'Internal server error' }
      : { error: String(err), stack: err instanceof Error ? err.stack : undefined };
    return NextResponse.json(body, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Record<string, unknown>
    const itemName = String(body.itemName ?? '').trim()
    const unit = String(body.unit ?? '').trim()
    const category = body.category === 'CAPEX' ? 'CAPEX' : 'OPEX'
    const allowedSubcats = category === 'CAPEX' ? ['devices', 'electrical'] : ['medicines', 'consumables']
    const subCategory = allowedSubcats.includes(String(body.subCategory)) ? String(body.subCategory) : allowedSubcats[0]
    const primaryDeptCode = String(body.primaryDeptCode ?? '').trim()
    const primaryDeptName = String(body.primaryDeptName ?? '').trim()
    let primaryDeptId = Number(body.primaryDeptId)
    let defaultSupplierId = body.defaultSupplierId === null || body.defaultSupplierId === '' || body.defaultSupplierId === undefined
      ? null
      : Number(body.defaultSupplierId)
    const defaultSupplierName = String(body.defaultSupplierName ?? '').trim()

    if (!itemName) {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 })
    }

    if (!unit) {
      return NextResponse.json({ error: 'Unit is required' }, { status: 400 })
    }

    if (!Number.isFinite(primaryDeptId) || primaryDeptId <= 0) {
      const deptCodeOrName = primaryDeptCode || primaryDeptName
      if (deptCodeOrName) {
        const existingDept = await prisma.department.findFirst({
          where: {
            OR: [
              { deptCode: primaryDeptCode || deptCodeOrName },
              { deptName: primaryDeptName || deptCodeOrName },
            ],
          },
        })

        if (existingDept) {
          primaryDeptId = existingDept.deptId
        } else {
          const deptCode = (primaryDeptCode || deptCodeOrName.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 10) || 'DEPT').slice(0, 10)
          const createdDept = await prisma.department.create({
            data: {
              deptCode,
              deptName: primaryDeptName || primaryDeptCode || deptCode,
              category: deptCategoryFor(deptCode),
            },
          })
          primaryDeptId = createdDept.deptId
        }
      }
    }

    if (!Number.isFinite(primaryDeptId) || primaryDeptId <= 0) {
      return NextResponse.json({ error: 'Department is required' }, { status: 400 })
    }

    if (defaultSupplierId !== null && !Number.isFinite(defaultSupplierId)) {
      return NextResponse.json({ error: 'Default supplier is invalid' }, { status: 400 })
    }

    const creatorRows = await prisma.$queryRawUnsafe(`
      SELECT user_id
      FROM users
      WHERE is_active = true
      ORDER BY user_id ASC
      LIMIT 1
    `) as Array<Record<string, unknown>>

    const createdBy = Number(creatorRows[0]?.user_id)
    if (!Number.isFinite(createdBy)) {
      return NextResponse.json({ error: 'No active user found to create the item' }, { status: 400 })
    }

    if (!defaultSupplierId && defaultSupplierName) {
      const existingSupplier = await prisma.supplier.findFirst({ where: { supplierName: defaultSupplierName } })
      if (existingSupplier) {
        defaultSupplierId = existingSupplier.supplierId
      } else {
        const supplierCode = defaultSupplierName.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8) || 'SUP'
        const createdSupplier = await prisma.supplier.create({
          data: {
            supplierCode: `${supplierCode}${Date.now().toString().slice(-2)}`.slice(0, 10),
            supplierName: defaultSupplierName,
          },
        })
        defaultSupplierId = createdSupplier.supplierId
      }
    }

    const prefixes: Record<string, string> = {
      medicines: 'MED',
      consumables: 'CON',
      devices: 'DEV',
      electrical: 'ELE',
    }
    const prefix = prefixes[subCategory] ?? 'ITM'
    const existingCodes = await prisma.$queryRawUnsafe(
      `
        SELECT item_code
        FROM items
        WHERE item_code LIKE $1
        ORDER BY item_id DESC
        LIMIT 25
      `,
      `${prefix}-%`
    ) as Array<Record<string, unknown>>

    const nextNumber = existingCodes.reduce((highest, row) => {
      const match = String(row.item_code ?? '').match(/-(\d+)$/)
      return match ? Math.max(highest, Number(match[1])) : highest
    }, 0) + 1
    const itemCode = `${prefix}-${String(nextNumber).padStart(3, '0')}`

    const itemNameHi = String(body.itemNameHi ?? '').trim() || null
    const itemType = String(body.itemType ?? '').trim() || null
    const description = String(body.description ?? '').trim() || null
    const supplierBarcode = String(body.supplierBarcode ?? '').trim() || null
    const mfgDateInput = String(body.mfgDate ?? '').trim()
    const invoiceNo = String(body.invoiceNo ?? '').trim() || 'OPENING-STOCK'
    const invoiceDateInput = String(body.invoiceDate ?? '').trim()
    const storeLocation = String(body.storeLocation ?? '').trim() || 'Main Store'
    const openingNotes = String(body.notes ?? '').trim() || 'Opening quantity from item registration'
    const pricePerUnit = body.pricePerUnit === null || body.pricePerUnit === '' || body.pricePerUnit === undefined
      ? null
      : Number(body.pricePerUnit)
    const minStockLevel = Number.isFinite(Number(body.minStockLevel)) ? Number(body.minStockLevel) : 0
    const maxStockLevel = body.maxStockLevel === null || body.maxStockLevel === '' || body.maxStockLevel === undefined
      ? null
      : Number(body.maxStockLevel)
    const reorderQty = body.reorderQty === null || body.reorderQty === '' || body.reorderQty === undefined
      ? null
      : Number(body.reorderQty)

    if (maxStockLevel !== null && !Number.isFinite(maxStockLevel)) {
      return NextResponse.json({ error: 'Max stock is invalid' }, { status: 400 })
    }

    if (reorderQty !== null && !Number.isFinite(reorderQty)) {
      return NextResponse.json({ error: 'Reorder quantity is invalid' }, { status: 400 })
    }

    if (pricePerUnit !== null && !Number.isFinite(pricePerUnit)) {
      return NextResponse.json({ error: 'Price per unit is invalid' }, { status: 400 })
    }

    const initialQuantity = body.initialQuantity === null || body.initialQuantity === '' || body.initialQuantity === undefined
      ? 0
      : Number(body.initialQuantity)

    if (!Number.isFinite(initialQuantity) || initialQuantity < 0) {
      return NextResponse.json({ error: 'Opening quantity is invalid' }, { status: 400 })
    }

    if (initialQuantity <= 0) {
      return NextResponse.json({ error: 'Opening quantity is required' }, { status: 400 })
    }

    const batchNumberInput = String(body.batchNumber ?? '').trim()
    const expiryDateInput = String(body.expiryDate ?? '').trim()
    const serialNumbers = String(body.serialNumbers ?? '').trim()
    const amcRequired = category === 'CAPEX' && body.amcRequired === true
    const amcNumber = String(body.amcNumber ?? '').trim()
    const amcStartDate = String(body.amcStartDate ?? '').trim()
    const amcEndDate = String(body.amcEndDate ?? '').trim()
    const amcValue = body.amcValue === null || body.amcValue === '' || body.amcValue === undefined
      ? null
      : Number(body.amcValue)
    const amcCoverageType = ['comprehensive', 'non_comprehensive', 'parts_only', 'labour_only'].includes(String(body.amcCoverageType))
      ? String(body.amcCoverageType)
      : 'comprehensive'
    const amcServiceFrequency = String(body.amcServiceFrequency ?? '').trim() || null
    const amcContactPerson = String(body.amcContactPerson ?? '').trim() || null
    const amcContactPhone = String(body.amcContactPhone ?? '').trim() || null
    const amcSupplierId = body.amcSupplierId === null || body.amcSupplierId === '' || body.amcSupplierId === undefined
      ? defaultSupplierId
      : Number(body.amcSupplierId)

    if (category === 'OPEX' && !batchNumberInput) {
      return NextResponse.json({ error: 'Batch number is required for OPEX items' }, { status: 400 })
    }

    if (category === 'OPEX' && !expiryDateInput) {
      return NextResponse.json({ error: 'Expiry date is required for OPEX items' }, { status: 400 })
    }

    if (category === 'CAPEX' && !serialNumbers) {
      return NextResponse.json({ error: 'Serial number is required for CAPEX items' }, { status: 400 })
    }

    if (amcRequired) {
      if (!amcNumber) {
        return NextResponse.json({ error: 'AMC number is required' }, { status: 400 })
      }
      if (!amcStartDate || !amcEndDate) {
        return NextResponse.json({ error: 'AMC start and expiry dates are required' }, { status: 400 })
      }
      if (!Number.isFinite(amcSupplierId)) {
        return NextResponse.json({ error: 'AMC supplier is required' }, { status: 400 })
      }
      if (amcValue !== null && !Number.isFinite(amcValue)) {
        return NextResponse.json({ error: 'AMC value is invalid' }, { status: 400 })
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRawUnsafe(
        `
          INSERT INTO items (
            item_code,
            item_name,
            item_name_hi,
            category,
            sub_category,
            item_type,
            description,
            unit,
            primary_dept_id,
            default_supplier_id,
            min_stock_level,
            max_stock_level,
            reorder_qty,
            price_per_unit,
            supplier_barcode,
            has_expiry,
            has_amc,
            updated_at,
            created_by
          )
          VALUES (
            $1,
            $2,
            $3,
            $4::"ItemCategory",
            $5::"ItemSubCategory",
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14,
            $15,
            $16,
            $17,
            NOW(),
            $18
          )
          RETURNING item_id, item_code
        `,
        itemCode,
        itemName,
        itemNameHi,
        category,
        subCategory,
        itemType,
        description,
        unit,
        primaryDeptId,
        defaultSupplierId,
        minStockLevel,
        maxStockLevel,
        reorderQty,
        pricePerUnit,
        supplierBarcode,
        category === 'OPEX',
        amcRequired,
        createdBy
      ) as Array<Record<string, unknown>>

      const insertedItem = inserted[0]
      const itemId = Number(insertedItem?.item_id)

      const seq = await tx.$queryRawUnsafe(`
        SELECT nextval('grn_entries_grn_id_seq') as grn_id, nextval('item_batches_batch_id_seq') as batch_id
      `) as Array<Record<string, unknown>>
      const grnId = Number(seq[0]?.grn_id)
      const batchId = Number(seq[0]?.batch_id)
      const grnNumber = `OPEN-${new Date().getFullYear()}-${grnId.toString().padStart(4, '0')}`
      const batchNumber = category === 'OPEX' ? batchNumberInput : `${itemCode}-OPEN`
      const expiryDate = category === 'OPEX' ? new Date(expiryDateInput) : null

      await tx.$queryRawUnsafe(
        `
          INSERT INTO grn_entries (
            grn_id,
            grn_number,
            grn_date,
            item_id,
            batch_id,
            supplier_id,
            quantity_received,
            unit,
            batch_number,
            mfg_date,
            expiry_date,
            invoice_number,
            invoice_date,
            price_per_unit,
            total_value,
            store_location,
            received_by,
            stock_before,
            stock_after,
            notes,
            created_at
          )
          VALUES (
            $1,
            $2,
            CURRENT_DATE,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14,
            $15,
            $16,
            0,
            $17,
            $18,
            CURRENT_TIMESTAMP
          )
        `,
        grnId,
        grnNumber,
        itemId,
        batchId,
        defaultSupplierId,
        initialQuantity,
        unit,
        batchNumber,
        mfgDateInput ? new Date(mfgDateInput) : null,
        expiryDate,
        invoiceNo,
        invoiceDateInput ? new Date(invoiceDateInput) : null,
        pricePerUnit,
        pricePerUnit ? pricePerUnit * initialQuantity : null,
        storeLocation,
        createdBy,
        initialQuantity,
        openingNotes
      )

      await tx.$queryRawUnsafe(
        `
          INSERT INTO item_batches (
            batch_id,
            item_id,
            batch_number,
            quantity_received,
            quantity_available,
            mfg_date,
            expiry_date,
            grn_id,
            supplier_id,
            purchase_price,
            storage_location,
            serial_numbers,
            notes,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
        `,
        batchId,
        itemId,
        batchNumber,
        initialQuantity,
        initialQuantity,
        mfgDateInput ? new Date(mfgDateInput) : null,
        expiryDate,
        grnId,
        defaultSupplierId,
        pricePerUnit,
        storeLocation,
        category === 'CAPEX' ? serialNumbers : null,
        openingNotes
      )

      if (amcRequired) {
        await tx.$queryRawUnsafe(
          `
            INSERT INTO amc_contracts (
              amc_number,
              item_id,
              batch_id,
              grn_id,
              supplier_id,
              contract_start,
              contract_end,
              amc_value,
              coverage_type,
              service_frequency,
              contact_person,
              contact_phone,
              status,
              notes,
              created_at,
              created_by
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9::"AmcCoverageType",
              $10,
              $11,
              $12,
              'active'::"AmcStatus",
              $13,
              CURRENT_TIMESTAMP,
              $14
            )
          `,
          amcNumber,
          itemId,
          batchId,
          grnId,
          amcSupplierId,
          new Date(amcStartDate),
          new Date(amcEndDate),
          amcValue,
          amcCoverageType,
          amcServiceFrequency,
          amcContactPerson,
          amcContactPhone,
          'AMC added during item registration',
          createdBy
        )
      }

      return insertedItem
    })

    return NextResponse.json({
      id: result?.item_id,
      itemCode: result?.item_code ?? itemCode,
    }, { status: 201 })
  } catch (err) {
    console.error('Error creating registry item:', err)
    return NextResponse.json({ error: 'Could not create item' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const code = new URL(req.url).searchParams.get('code')?.trim()

    if (!code) {
      return NextResponse.json({ error: 'Item code is required' }, { status: 400 })
    }

    // Look up the item_id first
    const itemRows = await prisma.$queryRawUnsafe(
      `SELECT item_id FROM items WHERE item_code = $1 LIMIT 1`,
      code
    ) as Array<Record<string, unknown>>

    if (!itemRows.length) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const itemId = Number(itemRows[0].item_id)

    // Hard delete in correct FK order inside a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete alerts (references item_id, batch_id, amc_id)
      await tx.$queryRawUnsafe(`DELETE FROM alerts WHERE item_id = $1`, itemId)

      // 2. Delete disposal logs (references item_id, batch_id)
      await tx.$queryRawUnsafe(`DELETE FROM disposal_log WHERE item_id = $1`, itemId)

      // 3. Delete stock issues (references item_id, batch_id)
      await tx.$queryRawUnsafe(`DELETE FROM stock_issues WHERE item_id = $1`, itemId)

      // 4. Delete AMC contracts (references item_id, batch_id, grn_id)
      await tx.$queryRawUnsafe(`DELETE FROM amc_contracts WHERE item_id = $1`, itemId)

      // 5. Delete item batches (references item_id, grn_id)
      await tx.$queryRawUnsafe(`DELETE FROM item_batches WHERE item_id = $1`, itemId)

      // 6. Delete GRN entries (references item_id)
      await tx.$queryRawUnsafe(`DELETE FROM grn_entries WHERE item_id = $1`, itemId)

      // 7. Finally delete the item itself
      await tx.$queryRawUnsafe(`DELETE FROM items WHERE item_id = $1`, itemId)
    })

    return NextResponse.json({ ok: true, itemCode: code })
  } catch (err) {
    console.error('Error deleting registry item:', err)
    return NextResponse.json({ error: 'Could not delete item' }, { status: 500 })
  }
}
