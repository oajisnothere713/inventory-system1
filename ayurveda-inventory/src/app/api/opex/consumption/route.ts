import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { NextResponse } from 'next/server'

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL is not set')
const prisma = new PrismaClient({ adapter: new PrismaPg(dbUrl) } as any)

export async function GET() {
  try {
    const sql = `
      WITH months AS (
        SELECT generate_series(date_trunc('month', current_date) - interval '5 months', date_trunc('month', current_date), interval '1 month') AS m
      ),
      top_items AS (
        SELECT i.item_id, i.item_name, i.unit, COALESCE(SUM(si.quantity_issued),0) AS total_issued
        FROM items i
        LEFT JOIN stock_issues si ON si.item_id = i.item_id AND si.issue_date >= date_trunc('month', current_date) - interval '5 months'
        WHERE i.category = 'OPEX'
        GROUP BY i.item_id, i.item_name, i.unit
        ORDER BY total_issued DESC NULLS LAST
        LIMIT 6
      )
      SELECT ti.item_id, ti.item_name, ti.unit,
        (SELECT json_agg(coalesce(s.sum_qty,0) ORDER BY s.m) FROM (
          SELECT m as m,
            (SELECT COALESCE(SUM(si2.quantity_issued),0) FROM stock_issues si2 WHERE si2.item_id = ti.item_id AND date_trunc('month', si2.issue_date)=m) AS sum_qty
          FROM months
        ) s) AS data
      FROM top_items ti;
    `

    const raw = await prisma.$queryRawUnsafe(sql)

    const palette = ['#185FA5','#1A6B3C','#92400E','#78600A','#3d5a6c','#B91C1C']
    const items = (raw as any[]).map((r, idx) => ({
      id: r.item_id,
      name: r.item_name,
      unit: r.unit || '',
      color: palette[idx % palette.length],
      data: Array.isArray(r.data) ? r.data.map((n:any)=> Number(n||0)) : [],
      note: null
    }))

    return NextResponse.json(items)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
