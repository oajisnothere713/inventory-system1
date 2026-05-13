import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { NextResponse } from 'next/server'

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL is not set')
// adapter typing is incompatible with current PrismaClient constructor
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter: new PrismaPg(dbUrl) } as any)

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
        SELECT ib.item_id, ib.batch_number AS batch, ib.quantity_available AS stock, to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry, sup.supplier_name AS supplier, ib.purchase_price AS price, ib.storage_location AS location
        FROM item_batches ib
        LEFT JOIN suppliers sup ON sup.supplier_id = ib.supplier_id
        WHERE ib.item_id IN (${itemIds.join(',')})
        ORDER BY ib.expiry_date ASC
      `;
      batchesRaw = (await prisma.$queryRawUnsafe(batchSql)) as unknown as Array<Record<string, unknown>>;
    }

    const batchesByItem: Record<number, Array<Record<string, unknown>>> = {};
    for (const b of batchesRaw) {
      const id = Number(b['item_id']);
      if (!batchesByItem[id]) batchesByItem[id] = [];
      batchesByItem[id].push({ batch: b['batch'] as string, stock: Number(b['stock'] ?? 0), expiry: (b['expiry'] as string) || null, supplier: (b['supplier'] as string) || null, price: b['price'] ?? null, location: b['location'] ?? null });
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
    // Log server-side for easier debugging
    // eslint-disable-next-line no-console
    console.error('Error in /api/registry:', err);
    const body = process.env.NODE_ENV === 'production'
      ? { error: 'Internal server error' }
      : { error: String(err), stack: err instanceof Error ? err.stack : undefined };
    return NextResponse.json(body, { status: 500 })
  }
}
