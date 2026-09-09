import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mapRegistryRow } from '@/lib/registryMap'
import { fetchRegistryRows } from '@/lib/registryData'
import {
  buildDashboardAttentionPreviews,
  getOperationalAlertBreakdown,
} from '@/lib/operationalAlerts'

export async function GET() {
  try {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalItems, capexCount, opexCount, grnCapexThisMonth, grnOpexThisMonth, recentGrns, registryRows] = await Promise.all([
      prisma.item.count({ where: { isActive: true } }),
      prisma.item.count({ where: { category: 'CAPEX', isActive: true } }),
      prisma.item.count({ where: { category: 'OPEX', isActive: true } }),
      prisma.grnEntry.count({ where: { grnDate: { gte: firstDayOfMonth }, item: { category: 'CAPEX' } } }),
      prisma.grnEntry.count({ where: { grnDate: { gte: firstDayOfMonth }, item: { category: 'OPEX' } } }),
      prisma.grnEntry.findMany({
        orderBy: { grnDate: 'desc' },
        take: 5,
        include: { item: { select: { itemId: true, itemName: true } } },
      }),
      fetchRegistryRows(prisma),
    ])

    const registryItems = registryRows.map(mapRegistryRow)
    const alertBreakdown = getOperationalAlertBreakdown(registryItems)
    const { expiring, lowStock, amcDue, expired } = buildDashboardAttentionPreviews(registryItems)

    const serialized = recentGrns.map((g: any) => ({
      ...g,
      grnDate: g.grnDate?.toISOString?.(),
      quantityReceived: g.quantityReceived?.toString?.(),
    }))

    // compute issues this month and total value received this month
    const [issuesCapexThisMonth, issuesOpexThisMonth, grnSum] = await Promise.all([
      prisma.stockIssue.count({ where: { issueDate: { gte: firstDayOfMonth }, item: { category: 'CAPEX' } } }),
      prisma.stockIssue.count({ where: { issueDate: { gte: firstDayOfMonth }, item: { category: 'OPEX' } } }),
      prisma.grnEntry.aggregate({ where: { grnDate: { gte: firstDayOfMonth } }, _sum: { totalValue: true } }),
    ])

    const valueReceivedNum = Number((grnSum as any)?._sum?.totalValue ?? 0)
    const valueReceived = valueReceivedNum > 0
      ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(valueReceivedNum)
      : ''

    return NextResponse.json({
      totalItems,
      capexCount,
      opexCount,
      activeAlerts: alertBreakdown.total,
      alertBreakdown,
      grnThisMonth: grnCapexThisMonth + grnOpexThisMonth,
      grnCapexThisMonth,
      grnOpexThisMonth,
      issuesThisMonth: issuesCapexThisMonth + issuesOpexThisMonth,
      issuesCapexThisMonth,
      issuesOpexThisMonth,
      valueReceived,
      expiredCount: alertBreakdown.expired,
      recentGrns: serialized,
      expiring,
      lowStock,
      amcDue,
      expired,
    })
  } catch (err: any) {
    console.error('GET /api/dashboard error:', err)
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 })
  }
}
