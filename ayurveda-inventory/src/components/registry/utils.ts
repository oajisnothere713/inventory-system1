export type Item = {
  id: string;
  name: string;
  sub: string;
  category: "OPEX" | "CAPEX";
  subcat: "medicines" | "consumables" | "devices" | "electrical";
  stock: number;
  min: number;
  max: number;
  unit: string;
  expiry: string | null;
  dept: string;
  status:
    | "healthy"
    | "expiring"
    | "expired"
    | "low_stock"
    | "amc_due"
    | "amc_expired"
    | "no_expiry"
    | "no_amc"
    | "critical";
  batch?: string;
  batches?: Batch[];
  supplier?: string;
  price: number;
  amc?: string | null;
  amcExpiry?: string | null;
  serial?: string;
  purchase?: string;
};

export type Batch = {
  batch: string;
  stock: number;
  mfgDate?: string | null;
  expiry?: string | null;
  supplier?: string | null;
  price?: number | null;
  location?: string | null;

  grn?: string | null;
  grnDate?: string | null;
  invoice?: string | null;
  invoiceDate?: string | null;
  notes?: string | null;
  serials?: string[];

  amc?: string | null;
  amcExpiry?: string | null;
  amcStatus?: string | null;
  amcSupplier?: string | null;
};

export type FilterState = {
  category: "all" | "OPEX" | "CAPEX";
  subcat: string | null;
  status: string | null;
  search: string;
  highlight: string | null;
  bannerMsg: string | null;
  sortCol: string;
};

//new status helpers
export function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  return Math.round((new Date(date).getTime() - Date.now()) / 86400000);
}

export function batchStatus(batch: Batch, isCapex: boolean) {
  if (isCapex) {
    if (!batch.amcExpiry) return "no_amc";
    const days = daysUntil(batch.amcExpiry);
    if (days !== null && days < 0) return "amc_expired";
    if (days !== null && days < 90) return "amc_due";
    return "healthy";
  }

  if (!batch.expiry) return "no_expiry";
  const days = daysUntil(batch.expiry);
  if (days !== null && days < 0) return "expired";
  if (days !== null && days < 60) return "expiring";
  return "healthy";
}

export function totalStock(item: Item) {
  return item.batches?.reduce((sum, batch) => sum + Number(batch.stock || 0), 0) ?? item.stock;
}

export function isLowStock(item: Item) {
  return item.category === "OPEX" && totalStock(item) < item.min;
}

export function itemStatus(item: Item) {
  if (isLowStock(item)) return "low_stock";

  const order = [
    "expired",
    "amc_expired",
    "amc_due",
    "expiring",
    "healthy",
    "no_expiry",
    "no_amc",
  ];

  const statuses = (item.batches ?? []).map((batch) => batchStatus(batch, item.category === "CAPEX"));

  return statuses.sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] ?? "healthy";
}

export function fefoSort(item: Item) {
  const batches = [...(item.batches ?? [])];

  if (item.category === "OPEX") {
    batches.sort((a, b) => {
      if (!a.expiry && !b.expiry) return 0;
      if (!a.expiry) return 1;
      if (!b.expiry) return -1;
      return new Date(a.expiry).getTime() - new Date(b.expiry).getTime();
    });
  }

  return batches;
}


export function stockPct(item: Item): number {
  return Math.min(100, Math.round((totalStock(item) / Math.max(1, item.min || 1)) * 100));
}

export function stockBarColor(item: Item): string {
  const pct = stockPct(item);
  if (pct <= 25) return "var(--red)";
  if (pct <= 60) return "var(--amber)";
  return "var(--green)";
}

export function expiryLabel(item: Item): { txt: string; cls: string } {
  if (item.category === "CAPEX") {
    if (!item.amcExpiry) return { txt: "No AMC", cls: "expiry-none" };
    const d = new Date(item.amcExpiry);
    const now = new Date();
    const days = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { txt: "AMC expired", cls: "expiry-red" };
    if (days < 60) return { txt: `AMC in ${days}d`, cls: "expiry-red" };
    if (days < 90) return { txt: `AMC in ${days}d`, cls: "expiry-amber" };
    return { txt: `AMC in ${days}d`, cls: "expiry-green" };
  }
  if (!item.expiry) return { txt: "No expiry", cls: "expiry-none" };
  const d = new Date(item.expiry);
  const now = new Date();
  const days = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { txt: "Expired", cls: "expiry-red" };
  if (days < 30) return { txt: `${days} days`, cls: "expiry-red" };
  if (days < 60) return { txt: `${days} days`, cls: "expiry-amber" };
  return { txt: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), cls: "expiry-green" };
}

export const STATUS_MAP: Record<string, [string, string]> = {
  healthy:  ["sp-healthy",  "✓ Healthy"],
  expiring: ["sp-expiring", "⏰ Expiring"],
  expired:  ["sp-expired",  "🚫 Expired"],
  low_stock:["sp-low",      "📉 Low stock"],
  amc_due:  ["sp-amc",      "📋 AMC due"],
  amc_expired: ["sp-expired", "🚫 AMC expired"],
  no_expiry: ["sp-healthy", "No expiry"],
  no_amc: ["sp-healthy", "No AMC"],
  critical: ["sp-critical", "⚠ Critical"],
};

// Helpers for cascading filter UI: determine whether a subcat or status
// is applicable for a given category.
export function isSubcatAllowed(category: "all" | "OPEX" | "CAPEX", s: string) {
  if (category === 'all') return true;
  if (category === 'CAPEX') return s === 'devices' || s === 'electrical';
  return s === 'medicines' || s === 'consumables';
}

export function isStatusAllowed(category: "all" | "OPEX" | "CAPEX", st: string) {
  if (category === 'all') return true;
  if (category === 'CAPEX') return st === 'amc_due' || st === 'expired' || st === 'healthy';
  return st === 'expiring' || st === 'expired' || st === 'low_stock' || st === 'healthy';
}
