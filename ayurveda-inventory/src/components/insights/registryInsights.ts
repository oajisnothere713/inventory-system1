"use client";

import { useEffect, useMemo, useState } from "react";
import { Batch, Item, batchStatus, daysUntil, fefoSort, isLowStock, itemStatus, stockPct, totalStock } from "../registry/utils";

export type Severity = "critical" | "high" | "medium" | "low";
export type Cell = string | { t: string; c: string };

export type InsightAlert = {
  id: number;
  severity: Severity;
  type: string;
  icon: string;
  title: string;
  detail: string;
  item: string;
  action: string;
  time: string;
};

export type InsightReport = {
  title: string;
  sub: string;
  icon: string;
  desc: string;
  params: { id: string; label: string; type: "select" | "date"; opts?: string[]; default?: string }[];
  headers: string[];
  rows: Cell[][];
  totalRows: number;
  footNote?: string;
};

export type AssistantResponse = {
  intro?: string;
  text?: string;
  table?: { heads: string[]; rows: Cell[][] };
  caveat?: string;
};

type RawBatch = {
  batch?: string | null;
  stock?: number | string | null;
  mfgDate?: string | null;
  expiry?: string | null;
  supplier?: string | null;
  price?: number | string | null;
  location?: string | null;
  grn?: string | null;
  grnDate?: string | null;
  invoice?: string | null;
  invoiceDate?: string | null;
  notes?: string | null;
  serials?: string[] | null;
  amc?: string | null;
  amcExpiry?: string | null;
  amcStatus?: string | null;
  amcSupplier?: string | null;
};

type RawRow = {
  id?: string | number;
  name?: string;
  sub?: string | null;
  category?: string;
  subcat?: string | null;
  stock?: number | string | null;
  min?: number | string | null;
  max?: number | string | null;
  unit?: string | null;
  expiry?: string | null;
  dept?: string | null;
  amcExpiry?: string | null;
  batch?: string | null;
  batches?: RawBatch[] | null;
  supplier?: string | null;
  price?: number | string | null;
  amc?: string | null;
  serial?: string | null;
  purchase?: string | null;
};

export function useRegistryItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/registry")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (!mounted) return;
        if (!Array.isArray(data)) {
          setItems([]);
          setError("Registry data was not available.");
          return;
        }
        setItems(data.map(mapRegistryRow));
        setError(null);
      })
      .catch(() => {
        if (!mounted) return;
        setItems([]);
        setError("Could not load registry data.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { items, loading, error };
}

export function useRegistryInsights() {
  const registry = useRegistryItems();
  const alerts = useMemo(() => buildAlerts(registry.items), [registry.items]);
  const reports = useMemo(() => buildReports(registry.items), [registry.items]);
  return { ...registry, alerts, reports };
}

function mapRegistryRow(d: RawRow): Item {
  const rawBatches: RawBatch[] = Array.isArray(d.batches) && d.batches.length
    ? d.batches
    : d.batch
    ? [{ batch: d.batch, stock: d.stock ?? 0, expiry: d.expiry ?? null, supplier: d.supplier ?? null, price: d.price ?? null }]
    : [];
  const batches: Batch[] = rawBatches.map((batch) => ({
    batch: String(batch.batch ?? ""),
    stock: Number(batch.stock ?? 0),
    mfgDate: batch.mfgDate ?? null,
    expiry: batch.expiry ?? null,
    supplier: batch.supplier ?? null,
    price: batch.price ? Number(batch.price) : null,
    location: batch.location ?? null,
    grn: batch.grn ?? null,
    grnDate: batch.grnDate ?? null,
    invoice: batch.invoice ?? null,
    invoiceDate: batch.invoiceDate ?? null,
    notes: batch.notes ?? null,
    serials: Array.isArray(batch.serials) ? batch.serials : [],
    amc: batch.amc ?? null,
    amcExpiry: batch.amcExpiry ?? null,
    amcStatus: batch.amcStatus ?? null,
    amcSupplier: batch.amcSupplier ?? null,
  }));
  const earliestExpiry = batches
    .filter((batch) => batch.expiry)
    .map((batch) => new Date(batch.expiry as string).getTime())
    .sort((a, b) => a - b)[0];
  const item: Item = {
    id: String(d.id ?? ""),
    name: d.name ?? "",
    sub: d.sub ?? "",
    category: d.category === "CAPEX" ? "CAPEX" : "OPEX",
    subcat: (d.subcat as Item["subcat"]) || "medicines",
    stock: batches.reduce((sum, batch) => sum + Number(batch.stock || 0), 0) || Number(d.stock ?? 0),
    min: Number(d.min ?? 0),
    max: Number(d.max ?? 0),
    unit: d.unit ?? "",
    expiry: earliestExpiry ? new Date(earliestExpiry).toISOString() : d.expiry ?? null,
    dept: d.dept ?? "",
    status: "healthy",
    batch: batches[0]?.batch ?? d.batch ?? undefined,
    batches,
    supplier: d.supplier ?? undefined,
    price: Number(d.price ?? batches[0]?.price ?? 0),
    amc: d.amc ?? null,
    amcExpiry: d.amcExpiry ?? null,
    serial: d.serial ?? undefined,
    purchase: d.purchase ?? undefined,
  };
  item.status = itemStatus(item) as Item["status"];
  return item;
}

export function buildAlerts(items: Item[]): InsightAlert[] {
  let id = 1;
  const alerts: InsightAlert[] = [];

  for (const item of items) {
    const batches = fefoSort(item);
    if (isLowStock(item)) {
      const total = totalStock(item);
      alerts.push({
        id: id++,
        severity: total <= Math.max(1, item.min * 0.25) ? "critical" : "high",
        type: "Low stock",
        icon: "-",
        title: `${item.name} is below minimum stock`,
        detail: `${total.toLocaleString()} ${item.unit} available against minimum ${item.min.toLocaleString()} ${item.unit}.`,
        item: item.id,
        action: `Reorder ${Math.max(0, item.min - total).toLocaleString()} ${item.unit} or raise purchase request.`,
        time: "live",
      });
    }

    for (const batch of batches) {
      const status = batchStatus(batch, item.category === "CAPEX");
      const qty = `${Number(batch.stock || 0).toLocaleString()} ${item.unit}`;
      if (status === "expired") {
        const days = Math.abs(daysUntil(batch.expiry) ?? 0);
        alerts.push({
          id: id++,
          severity: "critical",
          type: "Expired",
          icon: "!",
          title: `${item.name} - batch ${batch.batch || "unknown"} expired`,
          detail: `${qty} remaining. Expired ${formatDate(batch.expiry)}${days ? ` (${days} days ago)` : ""}.`,
          item: item.id,
          action: "Stop issue and record disposal.",
          time: "live",
        });
      }
      if (status === "expiring") {
        const days = daysUntil(batch.expiry) ?? 0;
        alerts.push({
          id: id++,
          severity: days <= 7 ? "high" : "medium",
          type: "Expiring",
          icon: "T",
          title: `${item.name} - batch ${batch.batch || "unknown"} expires soon`,
          detail: `${qty} expires ${formatDate(batch.expiry)} (${days} days left).`,
          item: item.id,
          action: "Prioritise FEFO issue or prepare disposal plan.",
          time: "live",
        });
      }
      if (status === "amc_expired") {
        const days = Math.abs(daysUntil(batch.amcExpiry) ?? 0);
        alerts.push({
          id: id++,
          severity: "critical",
          type: "AMC expired",
          icon: "A",
          title: `${item.name} AMC expired`,
          detail: `${batch.amc || "AMC"} expired ${formatDate(batch.amcExpiry)}${days ? ` (${days} days ago)` : ""}.`,
          item: item.id,
          action: `Contact ${batch.amcSupplier || item.supplier || "supplier"} for renewal.`,
          time: "live",
        });
      }
      if (status === "amc_due") {
        const days = daysUntil(batch.amcExpiry) ?? 0;
        alerts.push({
          id: id++,
          severity: days <= 30 ? "high" : "medium",
          type: "AMC due",
          icon: "A",
          title: `${item.name} AMC due in ${days} days`,
          detail: `${batch.amc || "AMC"} expires ${formatDate(batch.amcExpiry)}.`,
          item: item.id,
          action: `Plan renewal with ${batch.amcSupplier || item.supplier || "supplier"}.`,
          time: "live",
        });
      }
    }
  }

  return alerts.sort((a, b) => severityRank(a.severity) - severityRank(b.severity)).slice(0, 80);
}

export function buildReports(items: Item[]): Record<string, InsightReport> {
  const stockRows: Cell[][] = items.map((item) => [
    item.id,
    item.name,
    item.category,
    item.dept || "-",
    item.subcat,
    item.unit,
    totalStock(item).toLocaleString(),
    item.min.toLocaleString(),
    `${stockPct(item)}%`,
    statusCell(item.status),
  ]);

  const expiryRows: Cell[][] = items
    .flatMap((item) => fefoSort(item).map((batch) => ({ item, batch, days: daysUntil(batch.expiry) })))
    .filter(({ item, batch }) => item.category === "OPEX" && batch.expiry)
    .sort((a, b) => (a.days ?? 99999) - (b.days ?? 99999))
    .map(({ item, batch, days }) => [
      item.id,
      item.name,
      item.category,
      item.dept || "-",
      batch.batch,
      Number(batch.stock || 0).toLocaleString(),
      item.unit,
      formatDate(batch.expiry),
      statusDaysCell(days),
      days !== null && days < 0 ? "Dispose" : days !== null && days <= 15 ? "Issue urgently" : "Monitor",
    ]);

  const grnRows: Cell[][] = items
    .flatMap((item) => fefoSort(item).map((batch) => ({ item, batch })))
    .filter(({ batch }) => batch.grn || batch.grnDate)
    .sort((a, b) => String(b.batch.grnDate || "").localeCompare(String(a.batch.grnDate || "")))
    .map(({ item, batch }) => [
      batch.grn || "-",
      formatDate(batch.grnDate),
      item.id,
      item.name,
      item.category,
      item.dept || "-",
      Number(batch.stock || 0).toLocaleString(),
      item.unit,
      batch.supplier || item.supplier || "-",
      batch.invoice || "-",
      statusCell("healthy"),
    ]);

  const amcRows: Cell[][] = items
    .flatMap((item) => fefoSort(item).map((batch) => ({ item, batch, days: daysUntil(batch.amcExpiry) })))
    .filter(({ item, batch }) => item.category === "CAPEX" && batch.amcExpiry)
    .sort((a, b) => (a.days ?? 99999) - (b.days ?? 99999))
    .map(({ item, batch, days }) => [
      batch.amc || item.amc || "-",
      item.id,
      item.name,
      item.category,
      item.dept || "-",
      `${Math.max(1, (batch.serials ?? []).length || Number(batch.stock || 0))} unit${Math.max(1, (batch.serials ?? []).length || Number(batch.stock || 0)) === 1 ? "" : "s"}`,
      batch.amcSupplier || item.supplier || "-",
      formatDate(batch.amcExpiry),
      statusDaysCell(days),
      days !== null && days < 0 ? { t: "Expired", c: "red" } : days !== null && days <= 90 ? { t: "Due soon", c: "amber" } : { t: "Active", c: "green" },
    ]);

  const consumptionRows: Cell[][] = items
    .filter((item) => item.category === "OPEX")
    .sort((a, b) => totalStock(b) - totalStock(a))
    .map((item) => [item.id, item.name, item.category, item.dept || "-", item.subcat, totalStock(item).toLocaleString(), item.unit, "Current stock proxy"]);

  const reorderRows: Cell[][] = items
    .filter(isLowStock)
    .map((item) => [item.id, item.name, item.category, item.dept || "-", totalStock(item).toLocaleString(), item.min.toLocaleString(), Math.max(0, item.min - totalStock(item)).toLocaleString(), item.unit, item.supplier || "-"]);

  return {
    stock: {
      title: "Current Stock Report",
      sub: "Live snapshot from Item Registry",
      icon: "B",
      desc: "All registry items with stock levels",
      params: selectParams(items),
      headers: ["ID", "Item name", "Category", "Dept", "Sub-type", "Unit", "Current stock", "Min level", "% of min", "Status"],
      rows: stockRows,
      totalRows: stockRows.length,
    },
    expiry: {
      title: "Expiry Report",
      sub: "Live OPEX batch expiry from Item Registry",
      icon: "T",
      desc: "Batches by expiry date",
      params: selectParams(items),
      headers: ["ID", "Item name", "Category", "Dept", "Batch", "Qty", "Unit", "Expiry date", "Days", "Action"],
      rows: expiryRows,
      totalRows: expiryRows.length,
    },
    consumption: {
      title: "Consumption Planning Report",
      sub: "Registry-based stock movement proxy until issue history is selected",
      icon: "U",
      desc: "OPEX items by available stock",
      params: selectParams(items),
      headers: ["ID", "Item name", "Category", "Dept", "Sub-type", "Available", "Unit", "Basis"],
      rows: consumptionRows,
      totalRows: consumptionRows.length,
    },
    grn: {
      title: "GRN / Stock Inward Report",
      sub: "Live batch receipt records from Item Registry",
      icon: "D",
      desc: "Batch-level GRN and supplier details",
      params: selectParams(items),
      headers: ["GRN #", "GRN date", "ID", "Item name", "Category", "Dept", "Qty", "Unit", "Supplier", "Invoice", "Quality"],
      rows: grnRows,
      totalRows: grnRows.length,
    },
    wastage: {
      title: "Wastage & Disposal Report",
      sub: "Expired stock currently requiring disposal",
      icon: "X",
      desc: "Expired batches and value at risk",
      params: selectParams(items),
      headers: ["ID", "Item name", "Category", "Dept", "Batch", "Qty", "Unit", "Expired on", "Est. value", "Action"],
      rows: expiryRows.filter((row) => String(row[9]) === "Dispose").map((row) => {
        const item = items.find((it) => it.id === row[0]);
        const qty = Number(String(row[5]).replace(/,/g, ""));
        return [...row.slice(0, 8), formatCurrency(qty * Number(item?.price || 0)), "Record disposal"];
      }),
      totalRows: expiryRows.filter((row) => String(row[9]) === "Dispose").length,
      footNote: "Generated from expired Item Registry batches.",
    },
    amc: {
      title: "AMC Status Report",
      sub: "Live CAPEX AMC status from Item Registry",
      icon: "A",
      desc: "CAPEX AMC contracts and renewal status",
      params: selectParams(items),
      headers: ["AMC", "ID", "Item name", "Category", "Dept", "Units", "Vendor", "Contract end", "Days", "Status"],
      rows: amcRows,
      totalRows: amcRows.length,
    },
    reorder: {
      title: "Reorder Report",
      sub: "Items below minimum stock in Item Registry",
      icon: "R",
      desc: "Low stock reorder list",
      params: selectParams(items),
      headers: ["ID", "Item name", "Category", "Dept", "Current", "Min", "Gap", "Unit", "Supplier"],
      rows: reorderRows,
      totalRows: reorderRows.length,
    },
  };
}

export function answerRegistryQuestion(question: string, items: Item[]): AssistantResponse {
  const q = question.toLowerCase();
  const reports = buildReports(items);
  const alerts = buildAlerts(items);
  if (!items.length) {
    return { intro: "I could not load Item Registry data yet.", text: "Open Item Registry once or check the registry API/database connection, then try again." };
  }

  if (q.includes("expir")) {
    const rows = reports.expiry.rows.slice(0, 8);
    return { intro: `Found ${reports.expiry.totalRows} expiring or dated batches from Item Registry.`, table: { heads: reports.expiry.headers, rows }, caveat: "Rows are sorted by earliest expiry first." };
  }
  if (q.includes("expired") || q.includes("disposal") || q.includes("dispose")) {
    const rows = reports.wastage.rows.slice(0, 8);
    return { intro: `Found ${reports.wastage.totalRows} expired batches requiring disposal from Item Registry.`, table: { heads: reports.wastage.headers, rows }, caveat: "Estimated value uses item price per unit where available." };
  }
  if (q.includes("low") || q.includes("minimum") || q.includes("reorder")) {
    const rows = reports.reorder.rows.slice(0, 8);
    return { intro: `Found ${reports.reorder.totalRows} items below minimum stock.`, table: { heads: reports.reorder.headers, rows }, caveat: "Gap is calculated as minimum stock minus available stock." };
  }
  if (q.includes("amc") || q.includes("capex")) {
    const rows = reports.amc.rows.slice(0, 8);
    return { intro: `Found ${reports.amc.totalRows} CAPEX AMC records from Item Registry.`, table: { heads: reports.amc.headers, rows }, caveat: "Sorted by most urgent AMC end date." };
  }
  if (q.includes("fefo")) {
    const named = items.find((item) => q.includes(item.name.toLowerCase())) ?? items.find((item) => item.category === "OPEX" && fefoSort(item).length > 1);
    if (!named) return { intro: "No FEFO batch list is available.", text: "No OPEX item with multiple expiry-tracked batches was found in Item Registry." };
    const rows = fefoSort(named).map((batch, index) => [String(index + 1), batch.batch || "-", Number(batch.stock || 0).toLocaleString(), named.unit, formatDate(batch.expiry), String(daysUntil(batch.expiry) ?? "-")]);
    return { intro: `FEFO order for ${named.name}:`, table: { heads: ["Rank", "Batch", "Qty", "Unit", "Expiry", "Days"], rows }, caveat: "Earliest expiry appears first." };
  }
  if (q.includes("dept") || q.includes("department")) {
    const byDept = new Map<string, number>();
    for (const item of items) byDept.set(item.dept || "Unassigned", (byDept.get(item.dept || "Unassigned") ?? 0) + 1);
    const rows = [...byDept.entries()].sort((a, b) => b[1] - a[1]).map(([dept, count]) => [dept, String(count), items.filter((item) => (item.dept || "Unassigned") === dept).slice(0, 3).map((item) => item.name).join(", ")]);
    return { intro: "Department-wise item coverage from Item Registry:", table: { heads: ["Department", "Items", "Examples"], rows } };
  }

  const rows = alerts.slice(0, 8).map((alert) => [alert.type, alert.item, alert.title, { t: alert.severity, c: toneFor(alert.severity) }, alert.action]);
  return { intro: `I found ${alerts.length} current registry-driven insights.`, table: { heads: ["Type", "ID", "Finding", "Severity", "Action"], rows }, caveat: "Ask about expiry, low stock, reorder, AMC, FEFO, disposal, or departments for a focused answer." };
}

export function questionGroupsFromRegistry(items: Item[]) {
  const firstOpex = items.find((item) => item.category === "OPEX" && fefoSort(item).length) ?? items[0];
  return [
    { category: "Stock & expiry", items: ["Which items are expiring in the next 30 days?", "Which batches have already expired and need disposal?", "What items are currently below minimum stock level?", `Show me the current FEFO order for ${firstOpex?.name ?? "an item"}`] },
    { category: "Procurement", items: ["What should I reorder this week based on stock levels?", "Which departments have the most registered items?"] },
    { category: "CAPEX & AMC", items: ["Which AMC contracts are expiring in the next 90 days?", "Show me all CAPEX assets with expired AMC"] },
  ];
}

function selectParams(items: Item[]) {
  const depts = Array.from(new Set(items.map((item) => item.dept).filter(Boolean))).sort();
  return [
    { id: "category", label: "Category", type: "select" as const, opts: ["All", "OPEX only", "CAPEX only"] },
    { id: "dept", label: "Department", type: "select" as const, opts: ["All departments", ...depts] },
    { id: "status", label: "Status", type: "select" as const, opts: ["All statuses", "Healthy", "Low stock", "Expired", "Expiring", "AMC due"] },
  ];
}

function statusCell(status: string): Cell {
  if (status === "expired" || status === "amc_expired") return { t: status === "expired" ? "Expired" : "AMC expired", c: "red" };
  if (status === "low_stock") return { t: "Low stock", c: "red" };
  if (status === "expiring" || status === "amc_due") return { t: status === "expiring" ? "Expiring" : "AMC due", c: "amber" };
  return { t: status === "no_amc" ? "No AMC" : status === "no_expiry" ? "No expiry" : "Healthy", c: "green" };
}

function statusDaysCell(days: number | null): Cell {
  if (days === null) return "-";
  if (days < 0) return { t: `${days}d`, c: "red" };
  if (days <= 30) return { t: `${days}d`, c: "amber" };
  return { t: `${days}d`, c: "blue" };
}

function formatDate(date?: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(value: number) {
  return `Rs ${Math.round(value).toLocaleString("en-IN")}`;
}

function severityRank(severity: Severity) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[severity];
}

function toneFor(severity: Severity) {
  if (severity === "critical") return "red";
  if (severity === "high") return "amber";
  if (severity === "medium") return "blue";
  return "";
}
