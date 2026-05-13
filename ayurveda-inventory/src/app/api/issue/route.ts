import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { NextResponse } from 'next/server'

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL is not set')
const prisma = new PrismaClient({ adapter: new PrismaPg(dbUrl) } as any)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { itemCode, batchNo, qty, deptCode, authorisedBy, issuedBy, purpose, specificLocation, notes } = body
    const quantity = Number(qty || 0)
    if (!itemCode || !quantity || quantity <= 0) return NextResponse.json({ error: 'invalid payload' }, { status: 400 })

    // find item
    const it = await prisma.item.findFirst({ where: { itemCode } })
    if (!it) return NextResponse.json({ error: 'item not found' }, { status: 404 })

    // run transaction: find suitable batch, decrement, create stock issue
    const result = await prisma.$transaction(async (tx) => {
      // determine batch
      let batch: any = null
      if (batchNo) {
        batch = await tx.itemBatch.findFirst({ where: { itemId: it.itemId, batchNumber: batchNo } })
      } else {
        batch = await tx.itemBatch.findFirst({
          where: { itemId: it.itemId, quantityAvailable: { gte: quantity } },
          orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
        })
      }
      if (!batch) throw new Error('suitable batch not found or insufficient quantity')

      const stockAgg = await tx.itemBatch.aggregate({ where: { itemId: it.itemId }, _sum: { quantityAvailable: true } })
      const stockBefore = Number(stockAgg._sum.quantityAvailable || 0)
      const stockAfter = stockBefore - quantity

      // resolve dept id if provided, fall back to item's primaryDept
      let deptId: number | null = null
      if (deptCode) {
        const d = await tx.department.findFirst({ where: { OR: [{ deptCode }, { deptName: deptCode }] } })
        if (d) deptId = d.deptId
      }
      if (!deptId) deptId = it.primaryDeptId

      // resolve users (authorisedBy / issuedBy) by full name fallback to first user
      let authId = null
      if (authorisedBy) {
        const u = await tx.user.findFirst({ where: { fullName: authorisedBy } })
        authId = u ? u.userId : (await tx.user.findFirst())?.userId ?? 1
      }
      let issuedId = null
      if (issuedBy) {
        const u = await tx.user.findFirst({ where: { fullName: issuedBy } })
        issuedId = u ? u.userId : (await tx.user.findFirst())?.userId ?? 1
      }

      // decrement batch quantity
      const batchQtyBefore = Number(batch.quantityAvailable || 0)
      const batchQtyAfter = batchQtyBefore - quantity
      const updatedBatch = await tx.itemBatch.update({ where: { batchId: batch.batchId }, data: { quantityAvailable: batchQtyAfter } })

      // map UI purpose string to enum values expected by DB
      const purposeMap: Record<string, string> = {
        'Patient dispensing — OPD': 'patient_opd',
        'Patient dispensing — IPD': 'patient_ipd',
        'Department restocking': 'dept_restock',
        'Panchakarma therapy': 'panchakarma',
        'Research / study': 'research',
        'Quality testing': 'quality_test',
        'Other': 'other'
      }
      const purposeEnum = purposeMap[(purpose || '').toString()] || 'other'

      // reserve sequence id and generate an issue number to satisfy unique constraint
      const seqRes = (await tx.$queryRaw`SELECT nextval('stock_issues_issue_id_seq') as issue_id`) as any
      const issueId = Number(seqRes[0]?.issue_id ?? seqRes.issue_id ?? 0)
      const issueNumber = `ISSUE-${new Date().getFullYear()}-${issueId.toString().padStart(4, '0')}`

      // create stock issue record
      const created = await tx.stockIssue.create({ data: {
        issueId: issueId,
        issueNumber: issueNumber,
        itemId: it.itemId,
        batchId: batch.batchId,
        deptId: deptId as number,
        quantityIssued: quantity,
        unit: it.unit || '',
        specificLocation: specificLocation ?? '',
        authorisedBy: authId ?? 1,
        issuedBy: issuedId ?? 1,
        purpose: purposeEnum as any,
        stockBefore: stockBefore,
        stockAfter: stockAfter,
        batchQtyBefore: batchQtyBefore,
        batchQtyAfter: batchQtyAfter,
        notes: notes ?? ''
      } })

      return { created, updatedBatch }
    })

    return NextResponse.json({ ok: true, issue: result.created, batch: result.updatedBatch })
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  try {
    // return recent stock issues with lightweight joins for UI
    const rows = await prisma.stockIssue.findMany({
      orderBy: { issueDate: 'desc' },
      take: 200,
      include: {
        item: { select: { itemName: true, category: true, itemCode: true } },
        batch: { select: { batchNumber: true } },
        department: { select: { deptName: true, deptCode: true } },
        authoriser: { select: { fullName: true } },
      },
    })

    const mapped = rows.map((r: any) => ({
      iss: r.issueNumber,
      date: r.issueDate ? r.issueDate.toISOString() : (r.createdAt ? r.createdAt.toISOString() : new Date().toISOString()),
      item: r.item?.itemName ?? r.itemId?.toString() ?? '—',
      cat: r.item?.category ?? 'OPEX',
      batch: r.batch?.batchNumber ?? '',
      qty: `${Number(r.quantityIssued || 0)} ${r.unit || ''}`,
      dept: r.department?.deptName ?? '',
      auth: r.authoriser?.fullName ?? '',
      purpose: String(r.purpose || ''),
    }))

    return NextResponse.json(mapped)
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
