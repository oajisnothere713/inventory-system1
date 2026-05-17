import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { NextResponse } from 'next/server'

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL is not set')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter: new PrismaPg(dbUrl) } as any)

export async function GET() {
  try {
    const [departments, suppliers] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT dept_id AS id, COALESCE(dept_code, dept_name) AS code, dept_name AS name
        FROM departments
        WHERE is_active = true
        ORDER BY dept_name ASC
      `) as Promise<Array<Record<string, unknown>>>,
      prisma.$queryRawUnsafe(`
        SELECT supplier_id AS id, supplier_name AS name
        FROM suppliers
        WHERE is_active = true
        ORDER BY supplier_name ASC
      `) as Promise<Array<Record<string, unknown>>>,
    ])

    return NextResponse.json({
      departments: departments.map((dept) => ({
        id: Number(dept.id),
        label: dept.code && dept.code !== dept.name ? `${dept.code} - ${dept.name}` : String(dept.name ?? dept.code ?? ''),
      })),
      suppliers: suppliers.map((supplier) => ({
        id: Number(supplier.id),
        label: String(supplier.name ?? ''),
      })),
    })
  } catch (err) {
    console.error('Error in /api/registry/meta:', err)
    return NextResponse.json({ error: 'Could not load registry options' }, { status: 500 })
  }
}
