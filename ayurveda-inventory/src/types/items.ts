export interface Batch {
  batchId?: number;
  batchNo: string;
  qty: number;
  expiry: string | null;
  mfgDate?: string | null;
  amcExpiry?: string;
  serialNumbers?: string[];
  qrBatchCode?: string | null;
  supplier?: string | null;
  purchasePrice?: number | null;
  storageLocation?: string | null;
  grnNumber?: string | null;
  grnDate?: string | null;
  amcNumber?: string | null;
  amcStatus?: string | null;
  amcSupplier?: string | null;
}

export interface Item {
  id: string;
  name: string;
  sub: string;
  category: "OPEX" | "CAPEX";
  subcat: string;
  unit: string;
  dept: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  supplier?: string | null;
  pricePerUnit?: number | null;
  description?: string | null;
  itemNameHi?: string | null;
  supplierBarcode?: string | null;
  createdAt?: string | null;
  batches: Batch[];
}
