"use client";

import React from "react";
import { FilterState, isSubcatAllowed, isStatusAllowed } from "./utils";

export default function FilterBar({
  filters,
  setFilters,
  setCategory,
  setSubcat,
  setStatus,
  clearAllFilters,
  onExport,
  onImport,
}: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  setCategory: (c: "all" | "OPEX" | "CAPEX") => void;
  setSubcat: (s: string) => void;
  setStatus: (s: string) => void;
  clearAllFilters: () => void;
  onExport?: () => void;
  onImport?: () => void;
}) {
  const chipClass = (base: string, type: string, activeWhen: boolean) =>
    `chip${activeWhen ? ` active ${type}` : ""}`;

  // cascading logic is provided by utils helpers
  const category = filters.category;
  const subcatAllowed = (s: string) => isSubcatAllowed(category, s);
  const statusAllowed = (st: string) => isStatusAllowed(category, st);

  return (
    <div className="filter-bar">
      {filters.bannerMsg && (
        <div className="filter-banner show">
          <span style={{ fontSize: 14 }}>🔗</span>
          <span className="filter-banner-text">{filters.bannerMsg}</span>
          <span className="filter-banner-clear" onClick={clearAllFilters}>Clear filter ×</span>
        </div>
      )}
      <div className="filter-top">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name, batch, department…"
            value={filters.search}
            onChange={(e) => setFilters((f: FilterState) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <button className="btn" onClick={() => alert("Column visibility panel — coming soon")}>⊞ Columns</button>
        <button className="btn" onClick={() => { if (onExport) onExport(); else alert("Exporting to Excel…") }}>↓ Export Excel</button>
        <button className="btn" onClick={() => { if (onImport) onImport(); else alert("Importing from Excel…") }}>↑ Import Excel</button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-dim)" }}>
          Total <strong style={{ color: "var(--text)", marginLeft: 3 }}>—</strong>
        </div>
      </div>

      <div className="filter-chips-row">
        <span className="filter-group-label">Category:</span>
        <span className={chipClass("chip", "all",   filters.category === "all")}   onClick={() => setCategory("all")}>All items</span>
        <span className={chipClass("chip", "capex", filters.category === "CAPEX")} onClick={() => setCategory("CAPEX")}>◈ CAPEX</span>
        <span className={chipClass("chip", "opex",  filters.category === "OPEX")}  onClick={() => setCategory("OPEX")}>◉ OPEX</span>

        <div className="filter-divider" />
        <span className="filter-group-label">Sub-type:</span>
        <span className={chipClass("chip", "devices",     filters.subcat === "devices") + (subcatAllowed('devices') ? '' : ' disabled')}     onClick={() => subcatAllowed('devices') && setSubcat("devices")}>🩺 Medical devices</span>
        <span className={chipClass("chip", "electrical",  filters.subcat === "electrical") + (subcatAllowed('electrical') ? '' : ' disabled')}  onClick={() => subcatAllowed('electrical') && setSubcat("electrical")}>💡 Electrical</span>
        <span className={chipClass("chip", "medicines",   filters.subcat === "medicines") + (subcatAllowed('medicines') ? '' : ' disabled')}   onClick={() => subcatAllowed('medicines') && setSubcat("medicines")}>🌿 Medicines</span>
        <span className={chipClass("chip", "consumables", filters.subcat === "consumables") + (subcatAllowed('consumables') ? '' : ' disabled')} onClick={() => subcatAllowed('consumables') && setSubcat("consumables")}>📦 Consumables</span>

        <div className="filter-divider" />
        <span className="filter-group-label">Status:</span>
        <span className={chipClass("chip", "expiring",  filters.status === "expiring") + (statusAllowed('expiring') ? '' : ' disabled')}  onClick={() => statusAllowed('expiring') && setStatus("expiring")}>⏰ Expiring soon</span>
        <span className={chipClass("chip", "expired",   filters.status === "expired") + (statusAllowed('expired') ? '' : ' disabled')}   onClick={() => statusAllowed('expired') && setStatus("expired")}>🚫 Expired</span>
        <span className={chipClass("chip", "low_stock", filters.status === "low_stock") + (statusAllowed('low_stock') ? '' : ' disabled')} onClick={() => statusAllowed('low_stock') && setStatus("low_stock")}>📉 Low stock</span>
        <span className={chipClass("chip", "amc_due",   filters.status === "amc_due") + (statusAllowed('amc_due') ? '' : ' disabled')}   onClick={() => statusAllowed('amc_due') && setStatus("amc_due")}>📋 AMC due</span>
        <span className={chipClass("chip", "healthy",   filters.status === "healthy") + (statusAllowed('healthy') ? '' : ' disabled')}   onClick={() => statusAllowed('healthy') && setStatus("healthy")}>✓ Healthy</span>
      </div>
    </div>
  );
}
