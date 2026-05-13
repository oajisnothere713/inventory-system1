import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { NextResponse } from 'next/server'

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL is not set')
const prisma = new PrismaClient({ adapter: new PrismaPg(dbUrl) } as any)

export async function GET() {
  try {
    const summarySql = `
      SELECT
        SUM(quantity_disposed)::numeric AS total_qty,
        SUM(COALESCE(value_written_off,0))::numeric AS total_value
      FROM disposal_log d
      WHERE date_trunc('month', d.disposal_date) = date_trunc('month', current_date)
    `

    const rowsSql = `
      SELECT i.item_name AS name, SUM(d.quantity_disposed)::numeric AS qty, SUM(COALESCE(d.value_written_off,0))::numeric AS value
      FROM disposal_log d
      JOIN items i ON i.item_id = d.item_id
      WHERE date_trunc('month', d.disposal_date) = date_trunc('month', current_date)
      GROUP BY i.item_name
      ORDER BY qty DESC
      LIMIT 6
    `

    const summaryRes = await prisma.$queryRawUnsafe(summarySql) as any[]
    const rowsRes = await prisma.$queryRawUnsafe(rowsSql) as any[]

    const totalQty = Number((summaryRes[0] && summaryRes[0].total_qty) || 0)
    const totalValue = Number((summaryRes[0] && summaryRes[0].total_value) || 0)

    const rows = (rowsRes || []).map(r => {
      const qty = Number(r.qty || 0)
      const val = Number(r.value || 0)
      const pct = totalQty ? Math.round((qty / totalQty) * 100) : 0
      return [r.name, `${qty} ${qty>1?'units':'unit'}`, `₹${Math.round(val)}`, pct]
    })

    return NextResponse.json({ totalQty, totalValue, rows })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
