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
  status: "healthy" | "expiring" | "expired" | "low_stock" | "amc_due" | "critical";
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
  expiry?: string | null;
  supplier?: string | null;
  price?: number | null;
  location?: string | null;
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

export function stockPct(item: Item): number {
  return Math.min(100, Math.round((item.stock / item.min) * 100));
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
