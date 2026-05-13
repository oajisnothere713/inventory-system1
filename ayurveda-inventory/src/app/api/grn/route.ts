import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { NextResponse } from 'next/server'

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL is not set')
const prisma = new PrismaClient({ adapter: new PrismaPg(dbUrl) } as any)

export async function GET() {
  try {
    const raw = await prisma.$queryRaw`
      SELECT
        g.grn_number AS grn,
        to_char(g.grn_date, 'YYYY-MM-DD') AS date,
        i.item_name AS item,
        i.category AS cat,
        g.batch_number AS batch,
        (g.quantity_received::text || ' ' || g.unit) AS qty,
        s.supplier_name AS supplier,
        g.invoice_number AS invoice,
        u.full_name AS by
      FROM grn_entries g
      LEFT JOIN items i ON i.item_id = g.item_id
      LEFT JOIN suppliers s ON s.supplier_id = g.supplier_id
      LEFT JOIN users u ON u.user_id = g.received_by
      ORDER BY g.grn_date DESC
      LIMIT 200;
    `

    const rows = (raw as any[]).map((r) => ({
      grn: r.grn,
      date: r.date,
      item: r.item,
      cat: r.cat,
      batch: r.batch,
      qty: r.qty,
      supplier: r.supplier,
      invoice: r.invoice,
      by: r.by,
    }))

    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      itemCode,
      batchNo,
      qty,
      unit,
      mfgDate,
      expiryDate,
      supplierName,
      invoiceNo,
      invoiceDate,
      pricePerUnit,
      storeLocation,
      receivedBy,
      notes,
    } = body

    if (!itemCode) return NextResponse.json({ error: 'itemCode required' }, { status: 400 })

    // Resolve item and compute stock before starting a transaction to reduce transaction wait time.
    const it = await prisma.item.findFirst({ where: { itemCode } })
    if (!it) return NextResponse.json({ error: 'item not found' }, { status: 400 })

    const stockAggOuter = await prisma.itemBatch.aggregate({
      where: { itemId: it.itemId },
      _sum: { quantityAvailable: true },
    })
    const stockBeforeOuter = Number(stockAggOuter._sum.quantityAvailable || 0)

    // Run the common sequence of reads + writes inside a single interactive transaction.
    // Increase Prisma transaction wait/timeout and retry once if the transaction cannot start immediately.
    const txOptions = { maxWait: 5000, timeout: 30000 }
    let result: any = null
    let lastErr: any = null
    const attempts = 2
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        result = await prisma.$transaction(async (tx) => {
          // Resolve or create supplier (single roundtrip logic)
          let supId: number | null = null
          if (supplierName && supplierName.trim()) {
            const s = await tx.supplier.findFirst({ where: { supplierName } })
            if (s) supId = s.supplierId
            else {
              const code = supplierName.replace(/[^A-Z0-9]/gi, '').slice(0, 8) || 'SUP'
              const created = await tx.supplier.create({ data: { supplierCode: code, supplierName } })
              supId = created.supplierId
            }
          }

          // Resolve receiver (user) id by full name, fallback to first user or 1
          let recvId = 1
          if (receivedBy) {
            const u = await tx.user.findFirst({ where: { fullName: receivedBy } })
            if (u) recvId = u.userId
            else {
              const any = await tx.user.findFirst()
              if (any) recvId = any.userId
            }
          }

          // Use pre-computed stockBefore to avoid heavy aggregates inside transaction
          const stockBefore = stockBeforeOuter
          const receiveQty = Number(qty) || 0

          // Reserve sequence ids for grn and batch to satisfy circular FK constraints
          const seq = (await tx.$queryRaw`SELECT nextval('grn_entries_grn_id_seq') as grn_id, nextval('item_batches_batch_id_seq') as batch_id`) as any
          const grnId = Number(seq[0].grn_id)
          const batchId = Number(seq[0].batch_id)

          const grnNumber = `GRN-${new Date().getFullYear()}-${grnId.toString().padStart(4, '0')}`

          const total = pricePerUnit ? Number(pricePerUnit) * receiveQty : null

          // Insert records and RETURNING inserted rows to avoid extra SELECTs
          const grnInsert = (await tx.$queryRaw`
            INSERT INTO grn_entries (grn_id, grn_number, grn_date, item_id, batch_id, supplier_id, quantity_received, unit, batch_number, mfg_date, expiry_date, invoice_number, invoice_date, price_per_unit, total_value, store_location, received_by, stock_before, stock_after, created_at)
            VALUES (${grnId}, ${grnNumber}, CURRENT_DATE, ${it.itemId}, ${batchId}, ${supId ?? null}, ${receiveQty}, ${unit}, ${batchNo}, ${mfgDate ? new Date(mfgDate) : null}, ${expiryDate ? new Date(expiryDate) : null}, ${invoiceNo ?? ''}, ${invoiceDate ? new Date(invoiceDate) : null}, ${pricePerUnit ?? null}, ${total ?? null}, ${storeLocation ?? ''}, ${recvId}, ${stockBefore}, ${stockBefore + receiveQty}, CURRENT_TIMESTAMP)
            RETURNING grn_id, grn_number, grn_date, item_id, batch_id, supplier_id, quantity_received, unit, batch_number, mfg_date, expiry_date, invoice_number, invoice_date, price_per_unit, total_value, store_location, received_by, stock_before, stock_after, created_at;
          `) as any

          const batchInsert = (await tx.$queryRaw`
            INSERT INTO item_batches (batch_id, item_id, batch_number, quantity_received, quantity_available, mfg_date, expiry_date, grn_id, supplier_id, purchase_price, storage_location, notes, created_at, updated_at)
            VALUES (${batchId}, ${it.itemId}, ${batchNo}, ${receiveQty}, ${receiveQty}, ${mfgDate ? new Date(mfgDate) : null}, ${expiryDate ? new Date(expiryDate) : null}, ${grnId}, ${supId ?? null}, ${pricePerUnit ?? null}, ${storeLocation ?? ''}, ${notes ?? ''}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING batch_id, item_id, batch_number, quantity_received, quantity_available, mfg_date, expiry_date, grn_id, supplier_id, purchase_price, storage_location, notes, created_at, updated_at;
          `) as any

          const grnRow = Array.isArray(grnInsert) ? grnInsert[0] : grnInsert
          const batchRow = Array.isArray(batchInsert) ? batchInsert[0] : batchInsert

          // Construct a lightweight updatedItem with the newly created batch to avoid heavy includes
          const updatedItem = { ...it, itemBatches: [batchRow] }

          return { grnNumber, grnId, grnRow, updatedItem }
        }, txOptions)
        lastErr = null
        break
      } catch (e: any) {
        lastErr = e
        const msg = String(e || '')
        if (msg.includes('Unable to start a transaction') && attempt < attempts - 1) {
          // small backoff then retry once
          await new Promise((r) => setTimeout(r, 200))
          continue
        }
        throw e
      }
    }
    if (!result && lastErr) throw lastErr

    return NextResponse.json({ ok: true, grn: result.grnNumber, grnId: result.grnId, grnEntry: result.grnRow, item: result.updatedItem })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
