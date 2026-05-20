import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { NextResponse } from 'next/server'
import { mapRegistryRow } from '@/lib/registryMap'
import { fetchRegistryRows } from '@/lib/registryData'
import {
  buildDashboardAttentionPreviews,
  getOperationalAlertBreakdown,
} from '@/lib/operationalAlerts'

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL is not set')
const prisma = new PrismaClient({ adapter: new PrismaPg(dbUrl) } as any)

export async function GET() {
  try {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalItems, capexCount, opexCount, grnThisMonth, recentGrns, registryRows] = await Promise.all([
      prisma.item.count({ where: { isActive: true } }),
      prisma.item.count({ where: { category: 'CAPEX', isActive: true } }),
      prisma.item.count({ where: { category: 'OPEX', isActive: true } }),
      prisma.grnEntry.count({ where: { grnDate: { gte: firstDayOfMonth } } }),
      prisma.grnEntry.findMany({
        orderBy: { grnDate: 'desc' },
        take: 5,
        include: { item: { select: { itemId: true, itemName: true } } },
      }),
      fetchRegistryRows(prisma),
    ])

    const registryItems = registryRows.map(mapRegistryRow)
    const alertBreakdown = getOperationalAlertBreakdown(registryItems)
    const { expiring, lowStock, amcDue } = buildDashboardAttentionPreviews(registryItems)

    const serialized = recentGrns.map((g: any) => ({
      ...g,
      grnDate: g.grnDate?.toISOString?.(),
      quantityReceived: g.quantityReceived?.toString?.(),
    }))

    return NextResponse.json({
      totalItems,
      capexCount,
      opexCount,
      activeAlerts: alertBreakdown.total,
      alertBreakdown,
      grnThisMonth,
      expiredCount: alertBreakdown.expired,
      recentGrns: serialized,
      expiring,
      lowStock,
      amcDue,
    })
  } catch (err: any) {
    console.error('GET /api/dashboard error:', err)
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 })
  }
}
