export interface Batch {
  batchNo: string;
  qty: number;
  expiry: string | null;
  amcExpiry?: string;
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
  batches: Batch[];
}
