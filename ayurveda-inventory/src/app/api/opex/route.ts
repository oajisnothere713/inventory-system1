import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { NextResponse } from 'next/server'

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL is not set')
const prisma = new PrismaClient({ adapter: new PrismaPg(dbUrl) } as any)

export async function GET() {
  try {
    const sql = `
      SELECT
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
        COALESCE(b.qty_sum, 0) AS stock,
        to_char(b.earliest_expiry, 'YYYY-MM-DD') AS expiry,
        b.batch_number AS batch,
        a.amc_number AS amc,
        to_char(a.contract_end, 'YYYY-MM-DD') AS amc_expiry,
        i.price_per_unit::text AS price,
        i.created_at::date::text AS created_at
      FROM items i
      LEFT JOIN departments d ON d.dept_id = i.primary_dept_id
      LEFT JOIN suppliers s ON s.supplier_id = i.default_supplier_id
      LEFT JOIN LATERAL (
        SELECT
          SUM(quantity_available)::numeric AS qty_sum,
          MIN(expiry_date) AS earliest_expiry,
          (SELECT batch_number FROM item_batches ib WHERE ib.item_id = i.item_id AND ib.expiry_date IS NOT NULL ORDER BY ib.expiry_date ASC LIMIT 1) AS batch_number
        FROM item_batches ib2 WHERE ib2.item_id = i.item_id
      ) b ON true
      LEFT JOIN LATERAL (
        SELECT amc_number, contract_end FROM amc_contracts ac WHERE ac.item_id = i.item_id ORDER BY ac.contract_end DESC LIMIT 1
      ) a ON true
      WHERE i.is_active = true AND i.category = 'OPEX'
      ORDER BY i.item_name ASC;
    `

    const raw = await prisma.$queryRawUnsafe(sql)

    const items = (raw as any[]).map((it) => ({
      id: it.id,
      name: it.name,
      sub: it.sub || '',
      category: it.category,
      subcat: it.subcat,
      stock: Number(it.stock || 0),
      min: Number(it.min_stock_level || 0),
      max: Number(it.max_stock_level || 0),
      unit: it.unit || '',
      expiry: it.expiry || null,
      dept: it.dept || '',
      batch: it.batch || null,
      supplier: it.supplier || null,
      price: Number(it.price || 0),
      amc: it.amc || null,
      amcExpiry: it.amc_expiry || null,
      createdAt: it.created_at || null,
    }))

    return NextResponse.json(items)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
