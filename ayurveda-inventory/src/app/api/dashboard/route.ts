import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { NextResponse } from 'next/server'

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL is not set')
const prisma = new PrismaClient({ adapter: new PrismaPg(dbUrl) } as any)

export async function GET() {
  try {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Run core queries in parallel instead of a DB transaction. Some serverless
    // Postgres providers (eg. Neon) limit transaction start time which can fail
    // for short-lived connections — use Promise.all to avoid P2028.
    const [totalItems, capexCount, opexCount, activeAlerts, grnThisMonth, recentGrns] = await Promise.all([
      prisma.item.count(),
      prisma.item.count({ where: { category: 'CAPEX' } }),
      prisma.item.count({ where: { category: 'OPEX' } }),
      prisma.alert.count({ where: { status: 'active' } }),
      prisma.grnEntry.count({ where: { grnDate: { gte: firstDayOfMonth } } }),
      // limit fields returned for recent GRNs to reduce payload
      prisma.grnEntry.findMany({ orderBy: { grnDate: 'desc' }, take: 5, include: { item: { select: { itemId: true, itemName: true } } } }),
    ])

    // attention lists
    const in30 = new Date()
    in30.setDate(in30.getDate() + 30)
    const in60 = new Date()
    in60.setDate(in60.getDate() + 60)

    const expiringPromise = prisma.itemBatch.findMany({
      where: { expiryDate: { gte: new Date(), lte: in30 }, quantityAvailable: { gt: 0 } },
      include: { item: { select: { itemId: true, itemName: true } } },
      orderBy: { expiryDate: 'asc' },
      take: 6,
    })

    // Compute low-stock using a single aggregated SQL query instead of loading all batches into memory
    const lowStockPromise = prisma.$queryRaw`
      SELECT i.item_id AS "itemId", i.item_name AS "itemName", COALESCE(SUM(b.quantity_available), 0) AS "totalAvailable"
      FROM items i
      LEFT JOIN item_batches b ON b.item_id = i.item_id
      WHERE i.is_active = true
      GROUP BY i.item_id
      HAVING i.min_stock_level > COALESCE(SUM(b.quantity_available), 0)
      ORDER BY i.item_id
      LIMIT 6
    `

    const amcDuePromise = prisma.amcContract.findMany({
      where: { contractEnd: { gte: new Date(), lte: in60 }, status: 'active' },
      include: { item: { select: { itemId: true, itemName: true } } },
      orderBy: { contractEnd: 'asc' },
      take: 6,
    })

    const [expiring, lowStockRaw, amcDue] = await Promise.all([expiringPromise, lowStockPromise, amcDuePromise])

    // normalize lowStock result to expected shape
    const lowStock = (lowStockRaw as any[]).map((r) => ({ itemId: Number(r.itemId), itemName: r.itemName, totalAvailable: Number(r.totalAvailable) }))

    // serialize dates
    const serialized = recentGrns.map((g: any) => ({
      ...g,
      grnDate: g.grnDate?.toISOString?.(),
      quantityReceived: g.quantityReceived?.toString?.(),
    }))

    const serExp = expiring.map((b: any) => ({ batchId: b.batchId, batchNumber: b.batchNumber, expiryDate: b.expiryDate?.toISOString?.(), quantityAvailable: b.quantityAvailable?.toString?.(), item: { itemId: b.item?.itemId, itemName: b.item?.itemName } }))
    // lowStock rows already have itemId/itemName (from the raw SQL projection)
    const serLow = lowStock.map((x: any) => ({ itemId: x.itemId, itemName: x.itemName, totalAvailable: x.totalAvailable }))
    const serAmc = amcDue.map((a: any) => ({ amcId: a.amcId, amcNumber: a.amcNumber, contractEnd: a.contractEnd?.toISOString?.(), item: { itemId: a.item?.itemId, itemName: a.item?.itemName } }))

    return NextResponse.json({ totalItems, capexCount, opexCount, activeAlerts, grnThisMonth, recentGrns: serialized, expiring: serExp, lowStock: serLow, amcDue: serAmc })
  } catch (err: any) {
    // surface the error to server logs for debugging and return message in dev
    console.error('GET /api/dashboard error:', err)
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 })
  }
}
