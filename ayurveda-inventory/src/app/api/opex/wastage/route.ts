import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function parseMonthParam(monthParam: string | null) {
  const monthDate = monthParam ? new Date(`${monthParam}-01T00:00:00.000Z`) : new Date()
  return Number.isNaN(monthDate.getTime()) ? new Date() : monthDate
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const monthFilter = parseMonthParam(url.searchParams.get('month'))
    const monthKey = monthFilter.toISOString().slice(0, 7)
    const now = new Date()
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
    const lastYearStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1))
    const lastYearEnd = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate()))

    // Expired OPEX batches with stock still on hand (wastage at risk), by expiry month
    const monthSummarySql = `
      SELECT
        COUNT(DISTINCT i.item_id)::int AS item_count,
        COUNT(ib.batch_id)::int AS batch_count,
        COALESCE(SUM(ib.quantity_available), 0)::numeric AS total_qty,
        COALESCE(SUM(
          ib.quantity_available * COALESCE(ib.purchase_price, i.price_per_unit, 0)
        ), 0)::numeric AS total_value
      FROM item_batches ib
      JOIN items i ON i.item_id = ib.item_id
      WHERE i.is_active = true
        AND i.category = 'OPEX'
        AND ib.expiry_date IS NOT NULL
        AND ib.expiry_date < CURRENT_DATE
        AND ib.quantity_available > 0
        AND date_trunc('month', ib.expiry_date) = date_trunc('month', $1::timestamptz)
    `

    const monthRowsSql = `
      SELECT
        i.item_name AS name,
        i.unit AS unit,
        SUM(ib.quantity_available)::numeric AS qty,
        SUM(ib.quantity_available * COALESCE(ib.purchase_price, i.price_per_unit, 0))::numeric AS value
      FROM item_batches ib
      JOIN items i ON i.item_id = ib.item_id
      WHERE i.is_active = true
        AND i.category = 'OPEX'
        AND ib.expiry_date IS NOT NULL
        AND ib.expiry_date < CURRENT_DATE
        AND ib.quantity_available > 0
        AND date_trunc('month', ib.expiry_date) = date_trunc('month', $1::timestamptz)
      GROUP BY i.item_id, i.item_name, i.unit
      ORDER BY value DESC
      LIMIT 6
    `

    const ytdSql = `
      SELECT COALESCE(SUM(
        ib.quantity_available * COALESCE(ib.purchase_price, i.price_per_unit, 0)
      ), 0)::numeric AS total_value
      FROM item_batches ib
      JOIN items i ON i.item_id = ib.item_id
      WHERE i.is_active = true
        AND i.category = 'OPEX'
        AND ib.expiry_date IS NOT NULL
        AND ib.expiry_date < CURRENT_DATE
        AND ib.quantity_available > 0
        AND ib.expiry_date >= $1::timestamptz
        AND ib.expiry_date <= $2::timestamptz
    `

    const writtenOffSql = `
      SELECT COALESCE(SUM(COALESCE(d.value_written_off, 0)), 0)::numeric AS total_value
      FROM disposal_log d
      JOIN items i ON i.item_id = d.item_id
      WHERE i.category = 'OPEX'
        AND date_trunc('month', d.disposal_date) = date_trunc('month', $1::timestamptz)
    `

    const [monthSummary, monthRows, ytdValue, lastYearYtd, writtenOffMonth] = await Promise.all([
      prisma.$queryRawUnsafe(monthSummarySql, monthFilter) as Promise<Array<Record<string, unknown>>>,
      prisma.$queryRawUnsafe(monthRowsSql, monthFilter) as Promise<Array<Record<string, unknown>>>,
      prisma.$queryRawUnsafe(ytdSql, yearStart, now) as Promise<Array<Record<string, unknown>>>,
      prisma.$queryRawUnsafe(ytdSql, lastYearStart, lastYearEnd) as Promise<Array<Record<string, unknown>>>,
      prisma.$queryRawUnsafe(writtenOffSql, monthFilter) as Promise<Array<Record<string, unknown>>>,
    ])

    const summary = monthSummary[0] ?? {}
    const itemCount = Number(summary.item_count ?? 0)
    const totalQty = Number(summary.total_qty ?? 0)
    const totalValue = Number(summary.total_value ?? 0)
    const ytd = Number(ytdValue[0]?.total_value ?? 0)
    const ytdLastYear = Number(lastYearYtd[0]?.total_value ?? 0)
    const writtenOff = Number(writtenOffMonth[0]?.total_value ?? 0)

    let trendPct: number | null = null
    if (ytdLastYear > 0) {
      trendPct = Math.round(((ytd - ytdLastYear) / ytdLastYear) * 100)
    } else if (ytd > 0) {
      trendPct = 100
    }

    const rows = (monthRows ?? []).map((r) => {
      const qty = Number(r.qty ?? 0)
      const val = Number(r.value ?? 0)
      const unit = String(r.unit ?? '').trim()
      const pct = totalValue > 0 ? Math.round((val / totalValue) * 100) : 0
      const qtyLabel = unit ? `${qty.toLocaleString('en-IN')} ${unit}` : qty.toLocaleString('en-IN')
      return [String(r.name ?? ''), qtyLabel, `₹${Math.round(val).toLocaleString('en-IN')}`, pct] as (string | number)[]
    })

    return NextResponse.json({
      totalQty: itemCount,
      batchCount: Number(summary.batch_count ?? 0),
      totalValue,
      writtenOff,
      rows,
      selectedMonth: monthKey,
      ytdValue: ytd,
      trendPct,
    })
  } catch (err) {
    console.error('GET /api/opex/wastage error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
