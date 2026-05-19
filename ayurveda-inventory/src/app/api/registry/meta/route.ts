import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { NextResponse } from 'next/server'

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL is not set')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter: new PrismaPg(dbUrl) } as any)

const STANDARD_DEPARTMENTS = [
  { code: 'OPD-GEN', name: 'OPD - General' },
  { code: 'PHM', name: 'Pharmacy' },
  { code: 'IPD-A', name: 'IPD Ward A' },
  { code: 'IPD-B', name: 'IPD Ward B' },
  { code: 'PKM', name: 'Panchakarma' },
  { code: 'SHA', name: 'Shalakya (ENT & Eye)' },
  { code: 'KAU', name: 'Kaumarabhritya' },
  { code: 'STR', name: 'Striroga (OB-GYN)' },
  { code: 'SHY', name: 'Shalya (Surgery)' },
  { code: 'LAB', name: 'Laboratory' },
  { code: 'SWA', name: 'Swastha Vritta' },
  { code: 'RES', name: 'Research' },
]

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

    const dbDepartments = departments.map((dept) => ({
      id: Number(dept.id),
      code: String(dept.code ?? ''),
      name: String(dept.name ?? ''),
    }))
    const dbByCode = new Map(dbDepartments.map((dept) => [dept.code.toLowerCase(), dept]))
    const dbByName = new Map(dbDepartments.map((dept) => [dept.name.toLowerCase(), dept]))
    const standardDepartments = STANDARD_DEPARTMENTS.map((dept) => {
      const existing = dbByCode.get(dept.code.toLowerCase()) ?? dbByName.get(dept.name.toLowerCase())
      return {
        id: existing?.id ?? 0,
        code: dept.code,
        name: dept.name,
        label: `${dept.code} - ${dept.name}`,
      }
    })
    const standardCodes = new Set(STANDARD_DEPARTMENTS.map((dept) => dept.code.toLowerCase()))
    const standardNames = new Set(STANDARD_DEPARTMENTS.map((dept) => dept.name.toLowerCase()))
    const extraDepartments = dbDepartments
      .filter((dept) => !standardCodes.has(dept.code.toLowerCase()) && !standardNames.has(dept.name.toLowerCase()))
      .map((dept) => ({
        ...dept,
        label: dept.code && dept.code !== dept.name ? `${dept.code} - ${dept.name}` : dept.name || dept.code,
      }))

    return NextResponse.json({
      departments: [...standardDepartments, ...extraDepartments],
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
