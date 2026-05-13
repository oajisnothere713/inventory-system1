import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { NextResponse } from 'next/server'

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL is not set')
const prisma = new PrismaClient({ adapter: new PrismaPg(dbUrl) } as any)

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const code = (url.searchParams.get('code') || '').trim()
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

    console.time('items.detail.total')
    console.time('items.detail.query')
    const it = await prisma.item.findUnique({
      where: { itemCode: code },
      select: {
        itemCode: true,
        itemName: true,
        itemType: true,
        category: true,
        subCategory: true,
        unit: true,
        minStockLevel: true,
        itemBatches: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            batchId: true,
            batchNumber: true,
            quantityReceived: true,
            quantityAvailable: true,
            mfgDate: true,
            expiryDate: true,
            createdAt: true,
          }
        }
      }
    })
    console.timeEnd('items.detail.query')
    if (!it) return NextResponse.json({ error: 'item not found' }, { status: 404 })

    const mapped = {
      itemCode: it.itemCode,
      itemName: it.itemName,
      itemType: it.itemType,
      category: it.category,
      subCategory: it.subCategory,
      unit: it.unit,
      minStockLevel: it.minStockLevel?.toString?.() ?? '0',
      itemBatches: it.itemBatches.map((b: any) => ({
        batchId: b.batchId,
        batchNumber: b.batchNumber,
        quantityReceived: b.quantityReceived?.toString?.() ?? '0',
        quantityAvailable: b.quantityAvailable?.toString?.() ?? '0',
        mfgDate: b.mfgDate ? b.mfgDate.toISOString() : null,
        expiryDate: b.expiryDate ? b.expiryDate.toISOString() : null,
        createdAt: b.createdAt ? b.createdAt.toISOString() : null,
      })),
    }
    console.timeEnd('items.detail.total')

    return NextResponse.json(mapped)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
