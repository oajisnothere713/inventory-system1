import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { NextResponse } from 'next/server'

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL is not set')
const prisma = new PrismaClient({ adapter: new PrismaPg(dbUrl) } as any)

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const itemCode = searchParams.get('itemId')
    const batchNumber = searchParams.get('batchNumber')

    if (!itemCode || !batchNumber) {
      return NextResponse.json({ error: 'itemId and batchNumber are required' }, { status: 400 })
    }

    // Check if batch exists via related itemCode
    const batch = await prisma.itemBatch.findFirst({
      where: { 
        batchNumber,
        item: { itemCode }
      },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }
    
    const batchId = batch.batchId

    // Hard delete in correct FK order inside a transaction
    await prisma.$transaction(async (tx: any) => {
      // 1. Delete alerts (references batch_id)
      await tx.$queryRawUnsafe(`DELETE FROM alerts WHERE batch_id = $1`, batchId)
      
      // 2. Delete disposal logs (references batch_id)
      await tx.$queryRawUnsafe(`DELETE FROM disposal_log WHERE batch_id = $1`, batchId)
      
      // 3. Delete stock issues (references batch_id)
      await tx.$queryRawUnsafe(`DELETE FROM stock_issues WHERE batch_id = $1`, batchId)
      
      // 4. Delete AMC contracts (references batch_id)
      await tx.$queryRawUnsafe(`DELETE FROM amc_contracts WHERE batch_id = $1`, batchId)
      
      // 5. Finally delete the batch itself
      await tx.$queryRawUnsafe(`DELETE FROM item_batches WHERE batch_id = $1`, batchId)
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error deleting batch:", err)
    return NextResponse.json({ error: 'Could not delete batch' }, { status: 500 })
  }
}
