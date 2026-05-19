"use client";

import React, { useState, useEffect, useRef } from "react";
import { Item, FilterState, Batch, itemStatus } from "./registry/utils";
import FilterBar from "./registry/FilterBar";
import ResultStrip from "./registry/ResultStrip";
import RegistryTable from "./registry/RegistryTable";
import DetailPanel from "./registry/DetailPanel";

// Data will be provided from the DB via the API route `/api/registry`

// Helpers and panel components have been moved to src/components/registry/*

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AyurVaidyaRegistry() {
  const [filters, setFilters] = useState<FilterState>({
    category: "all",
    subcat: null,
    status: null,
    search: "",
    highlight: null,
    bannerMsg: null,
    sortCol: "status",
  });
  const [detailItem, setDetailItem] = useState<Item | null | "new">(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const highlightRef = useRef<HTMLTableRowElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Styles are loaded from src/components/registry/registry.css (imported in globals.css)

  // Scroll to highlighted row
  useEffect(() => {
    if (filters.highlight && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [filters.highlight]);

  // Fetch items from the DB-backed API and map to `Item` shape
  useEffect(() => {
    let mounted = true
    fetch('/api/registry')
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((data) => {
        if (!mounted || !Array.isArray(data)) return
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
        }

        const mapped: Item[] = data.map((d: RawRow) => {
          const rawBatches: RawBatch[] = Array.isArray(d.batches) && d.batches.length ? d.batches : (d.batch ? [{ batch: d.batch, stock: d.stock ?? 0, expiry: d.expiry ?? null, supplier: d.supplier ?? null, price: d.price ?? null }] : []);
          const batches: Batch[] = rawBatches.map((b) => ({
            batch: String(b.batch ?? ""),
            stock: Number(b.stock ?? 0),
            mfgDate: b.mfgDate ?? null,
            expiry: b.expiry ?? null,
            supplier: b.supplier ?? null,
            price: b.price ? Number(b.price) : null,
            location: b.location ?? null,
            grn: b.grn ?? null,
            grnDate: b.grnDate ?? null,
            invoice: b.invoice ?? null,
            invoiceDate: b.invoiceDate ?? null,
            notes: b.notes ?? null,
            serials: Array.isArray(b.serials) ? b.serials : [],
            amc: b.amc ?? null,
            amcExpiry: b.amcExpiry ?? null,
            amcStatus: b.amcStatus ?? null,
            amcSupplier: b.amcSupplier ?? null,
          }));
          const totalStock = batches.reduce((s, x) => s + (x.stock || 0), 0);
          const earliestExpiry = batches.filter(b => b.expiry).map(b => new Date(b.expiry as string).getTime()).sort((a,b)=>a-b)[0];
          const expiryStr = earliestExpiry ? new Date(earliestExpiry).toISOString() : (d.expiry ?? null);

          const item: Item = {
            id: String(d.id ?? ""),
            name: d.name ?? "",
            sub: d.sub ?? "",
            category: (d.category === "CAPEX" ? "CAPEX" : "OPEX") as Item["category"],
            subcat: (d.subcat as Item["subcat"]) || "medicines",
            stock: totalStock || Number(d.stock ?? 0),
            min: Number(d.min ?? 0),
            max: Number(d.max ?? 0),
            unit: d.unit ?? "",
            expiry: expiryStr ?? null,
            dept: d.dept ?? "",
            status: "healthy",
            batch: batches[0]?.batch ?? d.batch ?? undefined,
            batches,
            supplier: d.supplier ?? undefined,
            price: Number(d.price ?? (batches[0]?.price ?? 0)),
            amc: d.amc ?? null,
            amcExpiry: d.amcExpiry ?? null,
            serial: d.serial ?? undefined,
            purchase: d.purchase ?? undefined,
          };

          item.status = itemStatus(item) as Item["status"];
          return item;
        })
        setItems(mapped)
        setLoading(false)
      })
      .catch(() => {
        // on error keep items empty
        setItems([])
        setLoading(false)
      })
    return () => { mounted = false }
  }, [refreshKey])

  useEffect(() => {
    const openNewItem = () => setDetailItem("new");
    window.addEventListener("open-new-registry-item", openNewItem);
    return () => window.removeEventListener("open-new-registry-item", openNewItem);
  }, []);

  // ── Filter logic ──────────────────────────────────────────────────────────

  const filtered = (() => {
    const rows = items.filter((item) => {
      if (filters.category !== "all" && item.category !== filters.category) return false;
      if (filters.subcat && item.subcat !== filters.subcat) return false;
      if (filters.status) {
        if (filters.status === "expiring" && item.status !== "expiring") return false;
      if (filters.status === "expired" && !["expired", "amc_expired"].includes(item.status)) return false;
      if (filters.status === "low_stock" && item.status !== "low_stock") return false;
      if (filters.status === "amc_due" && !["amc_due", "amc_expired"].includes(item.status)) return false;
      if (filters.status === "healthy" && !["healthy", "no_expiry", "no_amc"].includes(item.status)) return false;
      }
      if (filters.search) {
        const hay = [
          item.name,
          item.sub,
          item.id,
          item.dept,
          item.batch,
          ...(item.batches ?? []).flatMap((batch) => [
            batch.batch,
            batch.grn,
            batch.supplier,
            batch.amc,
            batch.amcSupplier,
            ...(batch.serials ?? []),
          ]),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(filters.search.toLowerCase())) return false;
      }
      return true;
    });

    // Sort according to selected column. When sorting by `status`, group by urgency
    // (expired/amc_due/expiring/low_stock/healthy). For other sorts, apply the
    // selected comparator and keep name as a tie-breaker.
    const urgency: Record<string, number> = {expired: 0,
      amc_expired: 0,
      amc_due: 1,
      expiring: 2,
      low_stock: 3,
      healthy: 4,
      no_expiry: 5,
      no_amc: 5,
    };
    rows.sort((a, b) => {
      if (filters.sortCol === "status") {
        const ua = urgency[a.status] ?? 4;
        const ub = urgency[b.status] ?? 4;
        if (ua !== ub) return ua - ub;
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
      }

      let va: string | number = a.name, vb: string | number = b.name;
      if (filters.sortCol === "expiry") {
        va = a.expiry || a.amcExpiry || a.batches?.find((batch) => batch.amcExpiry)?.amcExpiry || "9999";
        vb = b.expiry || b.amcExpiry || b.batches?.find((batch) => batch.amcExpiry)?.amcExpiry || "9999";
      }
      else if (filters.sortCol === "stock")  { va = a.stock / Math.max(1, a.min || 1); vb = b.stock / Math.max(1, b.min || 1); }
      else if (filters.sortCol === "dept")   { va = a.dept; vb = b.dept; }

      if (va < vb) return -1;
      if (va > vb) return 1;
      // tie-breaker
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });

    return rows;
  })();

  // ── Chip state helpers ────────────────────────────────────────────────────

  const setCategory = (cat: "all" | "OPEX" | "CAPEX") => {
    setFilters((f) => {
      let newSub = f.subcat;
      let newStatus = f.status;
      if (cat === 'OPEX') {
        // clear CAPEX-only subcats/status
        if (newSub === 'devices' || newSub === 'electrical') newSub = null;
        if (newStatus === 'amc_due') newStatus = null;
      } else if (cat === 'CAPEX') {
        // clear OPEX-only subcats/status
        if (newSub === 'medicines' || newSub === 'consumables') newSub = null;
        if (newStatus === 'expiring' || newStatus === 'low_stock') newStatus = null;
      }
      if (cat === 'all') { newSub = null; newStatus = null }
      return { ...f, category: cat, subcat: newSub, status: newStatus };
    });
  };

  const setSubcat = (sub: string) => {
    setFilters((f) => {
      const newSub = f.subcat === sub ? null : sub;
      let newCat: "all" | "OPEX" | "CAPEX" = f.category;
      if (newSub === "devices" || newSub === "electrical") newCat = "CAPEX";
      if (newSub === "medicines" || newSub === "consumables") newCat = "OPEX";
      return { ...f, subcat: newSub, category: newCat };
    });
  };

  const setStatus = (st: string) => {
    setFilters((f) => ({ ...f, status: f.status === st ? null : st }));
  };

  const applyDeepLink = (params: Partial<FilterState>) => {
    setFilters({
      category: (params.category as "all" | "OPEX" | "CAPEX") || "all",
      subcat: params.subcat || null,
      status: params.status || null,
      search: "",
      highlight: params.highlight || null,
      bannerMsg: params.bannerMsg || null,
      sortCol: "status",
    });
  };

  // Read any deep-link set by other UI (dashboard cards) and apply it once
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('registryDeepLink');
      if (raw) {
        const params = JSON.parse(raw) as Partial<FilterState>;
        // Defer applying the deep-link to avoid synchronous setState inside this effect
        setTimeout(() => applyDeepLink(params), 0);
        sessionStorage.removeItem('registryDeepLink');
      }
    } catch {
      // ignore
    }
  }, []);

  const clearAllFilters = () => {
    setFilters({ category: "all", subcat: null, status: null, search: "", highlight: null, bannerMsg: null, sortCol: "status" });
  };

  const exportRegistryRows = () => {
    try {
      const rows = filtered;
      if (!rows || !rows.length) {
        alert('No rows to export');
        return;
      }
      const includeBatches = confirm('Include batch-level rows in CSV? Click OK to include, Cancel to export aggregated items.');
      const cols = includeBatches
        ? ['id','name','category','subcat','batch','stock','unit','dept','status','expiry','price']
        : ['id','name','category','subcat','stock','min','max','unit','dept','status','expiry','price'];
      const esc = (v: unknown) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
        return s;
      }

      const records: Record<string, unknown>[] = [];
      if (includeBatches) {
        for (const it of rows) {
          const b = (it as Item).batches as Batch[] | undefined;
          if (b && b.length) {
            for (const bb of b) {
              records.push({ id: it.id, name: it.name, category: it.category, subcat: it.subcat, batch: bb.batch, stock: bb.stock, unit: it.unit, dept: it.dept, status: it.status, expiry: bb.expiry || it.expiry, price: bb.price ?? it.price });
            }
            continue;
          }
          records.push({ id: it.id, name: it.name, category: it.category, subcat: it.subcat, batch: it.batch, stock: it.stock, unit: it.unit, dept: it.dept, status: it.status, expiry: it.expiry, price: it.price });
        }
      } else {
        for (const it of rows) records.push(it as unknown as Record<string, unknown>);
      }

      const csv = [cols.join(',')].concat(records.map(r => {
        return cols.map(c => esc((r as Record<string, unknown>)[c])).join(',');
      })).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const name = 'registry-' + new Date().toISOString().slice(0,10) + '.csv';
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); alert('Export failed') }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try{
      const text = await file.text();

      const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

      if (lines.length < 2) {
        alert("Import file has no data rows.");
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim());
        return headers.reduce<Record<string, string>>((acc, header, index) => {
          acc[header] = values[index] ?? "";
          return acc;
        }, {});
      });
      const res = await fetch("/api/registry/import", {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "import failed.");
        return;
      }
      alert(`Imported ${data.imported ?? rows.length} rows successfully.`);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to import file. Please ensure it's a valid CSV with the correct format.");
    }finally {
      e.target.value = ""; // reset file input
    }   
  };

  const deleteItem = async (item: Item) => {
    const ok = window.confirm(`Delete ${item.name} (${item.id}) from Item Registry? Existing GRN and issue history will stay saved.`);
    if (!ok) return;

    try {
      const response = await fetch(`/api/registry?code=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        alert(data.error || "Could not delete item.");
        return;
      }

      setItems((current) => current.filter((row) => row.id !== item.id));
      setDetailItem((current) => (current && current !== "new" && current.id === item.id ? null : current));
      setFilters((current) => ({
        ...current,
        highlight: current.highlight === item.id ? null : current.highlight,
        bannerMsg: `${item.name} deleted from Item Registry`,
      }));
    } catch (err) {
      console.error(err);
      alert("Could not delete item.");
    }
  };

  // ── Demo scenarios ────────────────────────────────────────────────────────

  const DEMO_SCENARIOS: Record<string, Partial<FilterState>> = {
    "all-expiry":    { category: "OPEX",  status: "expiring", bannerMsg: "← From Dashboard → Expiring in 30 days" },
    "all-low":       { category: "OPEX",  status: "low_stock", bannerMsg: "← From Dashboard → Low stock items" },
    "all-amc":       { category: "CAPEX", status: "amc_due",  bannerMsg: "← From Dashboard → AMC renewals due" },
    "all-expired":   { status: "expired", bannerMsg: "← From Dashboard → Already expired — dispose now" },
    "capex-devices": { category: "CAPEX", subcat: "devices",  bannerMsg: "← From CAPEX tab → Medical devices (48)" },
    "capex-elec":    { category: "CAPEX", subcat: "electrical", bannerMsg: "← From CAPEX tab → Electrical items (32)" },
    "opex-meds":     { category: "OPEX",  subcat: "medicines", bannerMsg: "← From OPEX tab → Medicines (142)" },
    "opex-cons":     { category: "OPEX",  subcat: "consumables", bannerMsg: "← From OPEX tab → Consumables (26)" },
    "highlight-neem":{ category: "OPEX",  status: "expiring", highlight: "MED-005", bannerMsg: "← From Dashboard → Neem Tail highlighted" },
    "all":           {},
  };

  

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="av-app registry-page">
      <input 
        ref={importInputRef}
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={handleImportFile}
      />
      {/* Inject Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

      {/* ── Sidebar ────────────────────────────────────────────── */}
     

      {/* ── Main ───────────────────────────────────────────────── */}
      <div className="main registry-main">

        {/* Topbar */}
        <div className="registry-head">
          <div>
            <h1>Item Registry</h1>
          </div>
          <div className="registry-head-actions">
            <button className="btn" onClick={exportRegistryRows}>Export</button>
            <button className="btn btn-primary" onClick={() => setDetailItem("new")}>+ Add New Item</button>
          </div>
        </div>

        <FilterBar
          filters={filters}
          setFilters={setFilters}
          setCategory={setCategory}
          setSubcat={setSubcat}
          setStatus={setStatus}
          clearAllFilters={clearAllFilters}
          totalCount={items.length}
        />

        <div className="registry-table-card">
          <ResultStrip filters={filters} filteredCount={filtered.length} setFilters={setFilters} />

          {loading ? (
            <div style={{ padding: 20 }}>
              <div style={{ height: 18, width: 220, background: '#eee', borderRadius: 6, marginBottom: 12 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', gap: 12 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, background: '#fafafa', borderRadius: 8 }}>
                    <div style={{ height: 14, width: 220, background: '#eee', borderRadius: 4 }} />
                    <div style={{ height: 14, width: 80, background: '#eee', borderRadius: 4, marginLeft: 'auto' }} />
                    <div style={{ height: 14, width: 80, background: '#eee', borderRadius: 4 }} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <RegistryTable
              items={filtered}
              highlight={filters.highlight}
              onRowClick={(it) => setDetailItem(it)}
              onDeleteItem={deleteItem}
              highlightRef={highlightRef}
            />
          )}
        </div>
      </div>

      {/* ── Detail Panel ───────────────────────────────────────── */}
      <DetailPanel
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onItemCreated={() => setRefreshKey((key) => key + 1)}
      />

      {/* ── Demo toolbar ───────────────────────────────────────── */}
    </div>
  );
}
