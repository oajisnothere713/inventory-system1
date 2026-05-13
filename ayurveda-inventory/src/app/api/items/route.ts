import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { NextResponse } from 'next/server'

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL is not set')
const prisma = new PrismaClient({ adapter: new PrismaPg(dbUrl) } as any)

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') || '').trim()
    const pattern = `%${q}%`

    const sql = `
      SELECT
        i.item_code AS id,
        i.item_name AS name,
        i.item_type AS sub,
        i.category,
        i.sub_category AS subcat,
        i.unit,
        COALESCE(d.dept_code, d.dept_name) AS dept,
        COALESCE(b.qty_sum, 0) AS stock,
        i.min_stock_level::text AS min_stock_level,
        to_char(b.earliest_expiry, 'YYYY-MM-DD') AS expiry,
        b.batch_number AS batch
      FROM items i
      LEFT JOIN departments d ON d.dept_id = i.primary_dept_id
      LEFT JOIN LATERAL (
        SELECT
          SUM(quantity_available)::numeric AS qty_sum,
          MIN(expiry_date) AS earliest_expiry,
          (SELECT batch_number FROM item_batches ib WHERE ib.item_id = i.item_id AND ib.expiry_date IS NOT NULL ORDER BY ib.expiry_date ASC LIMIT 1) AS batch_number
        FROM item_batches ib2 WHERE ib2.item_id = i.item_id
      ) b ON true
      WHERE i.is_active = true
        ${q ? `AND (i.item_name ILIKE ${'${pattern}'} OR i.item_code ILIKE ${'${pattern}'} OR COALESCE(d.dept_code,'') ILIKE ${'${pattern}'})` : ''}
      ORDER BY i.item_name ASC
      LIMIT 100;
    `

    // Use parameterized query when q is provided
    const raw = q
      ? await prisma.$queryRaw`
      SELECT
        i.item_code AS id,
        i.item_name AS name,
        i.item_type AS sub,
        i.category,
        i.sub_category AS subcat,
        i.unit,
        COALESCE(d.dept_code, d.dept_name) AS dept,
        COALESCE(b.qty_sum, 0) AS stock,
        i.min_stock_level::text AS min_stock_level,
        to_char(b.earliest_expiry, 'YYYY-MM-DD') AS expiry,
        b.batch_number AS batch
      FROM items i
      LEFT JOIN departments d ON d.dept_id = i.primary_dept_id
      LEFT JOIN LATERAL (
        SELECT
          SUM(quantity_available)::numeric AS qty_sum,
          MIN(expiry_date) AS earliest_expiry,
          (SELECT batch_number FROM item_batches ib WHERE ib.item_id = i.item_id AND ib.expiry_date IS NOT NULL ORDER BY ib.expiry_date ASC LIMIT 1) AS batch_number
        FROM item_batches ib2 WHERE ib2.item_id = i.item_id
      ) b ON true
      WHERE i.is_active = true
        AND (i.item_name ILIKE ${pattern} OR i.item_code ILIKE ${pattern} OR COALESCE(d.dept_code,'') ILIKE ${pattern})
      ORDER BY i.item_name ASC
      LIMIT 100;
    `
      : await prisma.$queryRaw`
      SELECT
        i.item_code AS id,
        i.item_name AS name,
        i.item_type AS sub,
        i.category,
        i.sub_category AS subcat,
        i.unit,
        COALESCE(d.dept_code, d.dept_name) AS dept,
        COALESCE(b.qty_sum, 0) AS stock,
        i.min_stock_level::text AS min_stock_level,
        to_char(b.earliest_expiry, 'YYYY-MM-DD') AS expiry,
        b.batch_number AS batch
      FROM items i
      LEFT JOIN departments d ON d.dept_id = i.primary_dept_id
      LEFT JOIN LATERAL (
        SELECT
          SUM(quantity_available)::numeric AS qty_sum,
          MIN(expiry_date) AS earliest_expiry,
          (SELECT batch_number FROM item_batches ib WHERE ib.item_id = i.item_id AND ib.expiry_date IS NOT NULL ORDER BY ib.expiry_date ASC LIMIT 1) AS batch_number
        FROM item_batches ib2 WHERE ib2.item_id = i.item_id
      ) b ON true
      WHERE i.is_active = true
      ORDER BY i.item_name ASC
      LIMIT 100;
    `

    const items = (raw as any[]).map((it) => ({
      id: it.id,
      name: it.name,
      sub: it.sub || '',
      category: it.category,
      subcat: it.subcat,
      unit: it.unit || '',
      dept: it.dept || '',
      currentStock: Number(it.stock || 0),
      minStock: Number(it.min_stock_level || 0),
      batches: it.batch ? [{ batchNo: it.batch, qty: Number(it.stock || 0), expiry: it.expiry || null }] : [],
    }))

    return NextResponse.json(items)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
