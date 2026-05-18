import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { NextResponse } from 'next/server'

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL is not set')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        itemNameHi: true,
        itemType: true,
        description: true,
        category: true,
        subCategory: true,
        unit: true,
        minStockLevel: true,
        maxStockLevel: true,
        pricePerUnit: true,
        supplierBarcode: true,
        qrCode: true,
        createdAt: true,
        updatedAt: true,
        primaryDept: { select: { deptCode: true, deptName: true } },
        defaultSupplier: { select: { supplierName: true } },
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
            serialNumbers: true,
            qrBatchCode: true,
            purchasePrice: true,
            storageLocation: true,
            createdAt: true,
            supplier: { select: { supplierName: true } },
            grn: { select: { grnNumber: true, grnDate: true, invoiceNumber: true, invoiceDate: true } },
            amcContracts: {
              orderBy: { contractEnd: 'desc' },
              take: 1,
              select: {
                amcNumber: true,
                contractStart: true,
                contractEnd: true,
                amcValue: true,
                coverageType: true,
                serviceFrequency: true,
                contactPerson: true,
                contactPhone: true,
                status: true,
                supplier: { select: { supplierName: true } },
              },
            },
          }
        }
      }
    })
    console.timeEnd('items.detail.query')
    if (!it) return NextResponse.json({ error: 'item not found' }, { status: 404 })

    const mapped = {
      itemCode: it.itemCode,
      itemName: it.itemName,
      itemNameHi: it.itemNameHi,
      itemType: it.itemType,
      description: it.description,
      category: it.category,
      subCategory: it.subCategory,
      unit: it.unit,
      minStockLevel: it.minStockLevel?.toString?.() ?? '0',
      maxStockLevel: it.maxStockLevel?.toString?.() ?? null,
      pricePerUnit: it.pricePerUnit?.toString?.() ?? null,
      supplierBarcode: it.supplierBarcode,
      qrCode: it.qrCode,
      department: it.primaryDept ? {
        code: it.primaryDept.deptCode,
        name: it.primaryDept.deptName,
      } : null,
      supplier: it.defaultSupplier?.supplierName ?? null,
      createdAt: it.createdAt ? it.createdAt.toISOString() : null,
      updatedAt: it.updatedAt ? it.updatedAt.toISOString() : null,
      itemBatches: it.itemBatches.map((b) => ({
        batchId: b.batchId,
        batchNumber: b.batchNumber,
        quantityReceived: b.quantityReceived?.toString?.() ?? '0',
        quantityAvailable: b.quantityAvailable?.toString?.() ?? '0',
        mfgDate: b.mfgDate ? b.mfgDate.toISOString() : null,
        expiryDate: b.expiryDate ? b.expiryDate.toISOString() : null,
        purchasePrice: b.purchasePrice?.toString?.() ?? null,
        storageLocation: b.storageLocation ?? null,
        supplier: b.supplier?.supplierName ?? null,
        grnNumber: b.grn?.grnNumber ?? null,
        grnDate: b.grn?.grnDate ? b.grn.grnDate.toISOString() : null,
        invoiceNumber: b.grn?.invoiceNumber ?? null,
        invoiceDate: b.grn?.invoiceDate ? b.grn.invoiceDate.toISOString() : null,
        serialNumbers: String(b.serialNumbers ?? '')
          .split(/[\n,]+/)
          .map((serial) => serial.trim())
          .filter(Boolean),
        qrBatchCode: b.qrBatchCode ?? null,
        amc: b.amcContracts[0] ? {
          amcNumber: b.amcContracts[0].amcNumber,
          contractStart: b.amcContracts[0].contractStart ? b.amcContracts[0].contractStart.toISOString() : null,
          contractEnd: b.amcContracts[0].contractEnd ? b.amcContracts[0].contractEnd.toISOString() : null,
          amcValue: b.amcContracts[0].amcValue?.toString?.() ?? null,
          coverageType: b.amcContracts[0].coverageType,
          serviceFrequency: b.amcContracts[0].serviceFrequency,
          contactPerson: b.amcContracts[0].contactPerson,
          contactPhone: b.amcContracts[0].contactPhone,
          status: b.amcContracts[0].status,
          supplier: b.amcContracts[0].supplier?.supplierName ?? null,
        } : null,
        createdAt: b.createdAt ? b.createdAt.toISOString() : null,
      })),
    }
    console.timeEnd('items.detail.total')

    return NextResponse.json(mapped)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
