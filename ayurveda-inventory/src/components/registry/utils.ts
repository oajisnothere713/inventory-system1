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
  if (days !== null && days <= 15) return "expiring";
  return "healthy";
}

export function totalStock(item: Item) {
  return item.batches?.reduce((sum, batch) => sum + Number(batch.stock || 0), 0) ?? item.stock;
}

/** Flag OPEX items at or below minimum. */
export const LOW_STOCK_BUFFER_RATIO = 1.0;

export function lowStockCeiling(min: number) {
  return min > 0 ? min * LOW_STOCK_BUFFER_RATIO : 0;
}

export function isOpexLowStock(stock: number, min: number) {
  return min > 0 && stock <= lowStockCeiling(min);
}

export function isLowStock(item: Item) {
  return item.category === "OPEX" && isOpexLowStock(totalStock(item), item.min);
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
  return Math.round((totalStock(item) / Math.max(1, item.min || 1)) * 100);
}

export function stockBarColor(item: Item): string {
  const pct = stockPct(item);
  if (pct < 25) return "#b91c1c"; // red
  if (pct < 40) return "#f97316"; // orange
  if (pct < 100) return "#eab308"; // yellow
  return "#1a6b3c"; // green
}

export type ExpiryColumnSummary = {
  main: string;
  sub: string;
  cls: "ec-red" | "ec-amber" | "ec-green" | "ec-none" | "ec-blue";
  icon: string;
};

function fmtRegistryDate(date?: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function batchLabel(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "es"}`;
}

function joinSummaryParts(parts: string[]) {
  return parts.filter(Boolean).join(" · ");
}

function sortByDateAsc<T extends { expiry?: string | null; amcExpiry?: string | null }>(
  batches: T[],
  field: "expiry" | "amcExpiry"
) {
  return [...batches].sort((a, b) => String(a[field] ?? "").localeCompare(String(b[field] ?? "")));
}

/** Registry table: batch-level expiry / AMC summary for the Expiry date / AMC due column. */
export function expiryColumnSummary(item: Item): ExpiryColumnSummary {
  const isCapex = item.category === "CAPEX";
  const batches = item.batches ?? [];
  const total = batches.length;

  if (!total) {
    return {
      main: "No batches",
      sub: "Add a GRN to register stock",
      cls: "ec-none",
      icon: "·",
    };
  }

  if (isCapex) {
    let noAmc = 0;
    let expired = 0;
    let due = 0;
    let active = 0;
    const dueBatches: Batch[] = [];

    for (const batch of batches) {
      const status = batchStatus(batch, true);
      if (status === "no_amc") noAmc++;
      else if (status === "amc_expired") {
        expired++;
      } else if (status === "amc_due") {
        due++;
        dueBatches.push(batch);
      } else active++;
    }

    const withAmc = total - noAmc;

    if (!withAmc) {
      return {
        main: "No AMC on file",
        sub: `${batchLabel(total, "batch")} — link AMC on GRN`,
        cls: "ec-none",
        icon: "·",
      };
    }

    if (expired) {
      const soonestDue = sortByDateAsc(dueBatches, "amcExpiry")[0];
      const dueDays = soonestDue ? daysUntil(soonestDue.amcExpiry) : null;
      return {
        main: `${expired}/${total} ${total === 1 ? "batch" : "batches"} AMC expired`,
        sub: joinSummaryParts([
          due ? `${due} AMC due soon` : "",
          active ? `${active} AMC active` : "",
          noAmc ? `${noAmc} without AMC` : "",
          soonestDue && dueDays !== null
            ? `Next due: ${fmtRegistryDate(soonestDue.amcExpiry)} (${dueDays}d)`
            : "",
        ]),
        cls: expired === total ? "ec-red" : "ec-amber",
        icon: "⛔",
      };
    }

    if (due) {
      const soonest = sortByDateAsc(dueBatches, "amcExpiry")[0];
      const days = soonest ? daysUntil(soonest.amcExpiry) : null;
      return {
        main: `${due}/${total} ${total === 1 ? "batch" : "batches"} AMC due`,
        sub: joinSummaryParts([
          active ? `${active} AMC active` : "",
          noAmc ? `${noAmc} without AMC` : "",
          soonest && days !== null
            ? `Soonest: ${fmtRegistryDate(soonest.amcExpiry)} (${days}d)`
            : "",
        ]),
        cls: days !== null && days < 30 ? "ec-red" : "ec-amber",
        icon: "⏰",
      };
    }

    const next = sortByDateAsc(
      batches.filter((batch) => batch.amcExpiry),
      "amcExpiry"
    )[0];
    return {
      main: `${active}/${total} ${total === 1 ? "batch" : "batches"} AMC active`,
      sub: joinSummaryParts([
        noAmc ? `${noAmc} without AMC` : "",
        next ? `Renew by ${fmtRegistryDate(next.amcExpiry)}` : "",
      ]),
      cls: "ec-green",
      icon: "✓",
    };
  }

  let noExpiry = 0;
  let expired = 0;
  let expiring = 0;
  let healthy = 0;
  const expiringBatches: Batch[] = [];
  const healthyBatches: Batch[] = [];

  for (const batch of batches) {
    const status = batchStatus(batch, false);
    if (status === "no_expiry") noExpiry++;
    else if (status === "expired") expired++;
    else if (status === "expiring") {
      expiring++;
      expiringBatches.push(batch);
    } else {
      healthy++;
      if (batch.expiry) healthyBatches.push(batch);
    }
  }

  const tracked = total - noExpiry;

  if (!tracked) {
    return {
      main: "No expiry",
      sub: `${batchLabel(noExpiry, "batch")} — no expiry dates`,
      cls: "ec-none",
      icon: "·",
    };
  }

  const soonest = sortByDateAsc(
    [...expiringBatches, ...healthyBatches],
    "expiry"
  )[0];
  const soonestDays = soonest ? daysUntil(soonest.expiry) : null;

  if (expired) {
    return {
      main: `${expired}/${total} ${total === 1 ? "batch" : "batches"} expired`,
      sub: joinSummaryParts([
        expiring ? `${expiring} expiring soon` : "",
        healthy ? `${healthy} healthy` : "",
        noExpiry ? `${noExpiry} no expiry` : "",
        soonest && soonestDays !== null && soonestDays >= 0
          ? `Next: ${fmtRegistryDate(soonest.expiry)} (${soonestDays}d)`
          : "",
      ]),
      cls: expired === total ? "ec-red" : "ec-amber",
      icon: "⚠",
    };
  }

  if (expiring) {
    return {
      main: `${expiring}/${total} ${total === 1 ? "batch" : "batches"} expiring soon`,
      sub: joinSummaryParts([
        healthy ? `${healthy} healthy` : "",
        noExpiry ? `${noExpiry} no expiry` : "",
        soonest && soonestDays !== null
          ? `Soonest: ${fmtRegistryDate(soonest.expiry)} (${soonestDays}d)`
          : "",
      ]),
      cls: soonestDays !== null && soonestDays <= 7 ? "ec-red" : "ec-amber",
      icon: "⏰",
    };
  }

  return {
    main: `${healthy}/${total} ${total === 1 ? "batch" : "batches"} healthy`,
    sub: joinSummaryParts([
      noExpiry ? `${noExpiry} no expiry` : "",
      soonest ? `Soonest expiry ${fmtRegistryDate(soonest.expiry)}` : "",
    ]),
    cls: "ec-green",
    icon: "✓",
  };
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
  if (days <= 15) return { txt: `${days} days`, cls: days <= 7 ? "expiry-red" : "expiry-amber" };
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
