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
  totalCount,
  onExport,
  onImport,
}: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  setCategory: (c: "all" | "OPEX" | "CAPEX") => void;
  setSubcat: (s: string) => void;
  setStatus: (s: string) => void;
  clearAllFilters: () => void;
  totalCount: number;
  onExport?: () => void;
  onImport?: () => void;
}) {
  const chipClass = (type: string, activeWhen: boolean) =>
    `chip${activeWhen ? ` active ${type}` : ""}`;

  const category = filters.category;
  const subcatAllowed = (s: string) => isSubcatAllowed(category, s);
  const statusAllowed = (st: string) => isStatusAllowed(category, st);

  return (
    <div className="filter-bar fbar">
      <div className="filter-top fbar-r1">
        <div className="search-wrap sw">
          <span className="search-icon sw-ic">⌕</span>
          <input
            type="text"
            placeholder="Search by name, item code, batch or serial number..."
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
          />
        </div>

        <button className="btn" onClick={onExport}>Export</button>
        <button className="btn" onClick={onImport}>Import</button>

        <div className="tot-lbl">
          Total: <strong>{totalCount}</strong>
        </div>
      </div>

      {filters.bannerMsg ? (
        <div className="filter-banner fbar-banner show">
          <span>Link</span>
          <span className="filter-banner-text">{filters.bannerMsg}</span>
          <span className="filter-banner-clear banner-clear" onClick={clearAllFilters}>
            Clear x
          </span>
        </div>
      ) : null}

      <div className="filter-chips-row fbar-r2">
        <div className="fgrp">
          <span className="filter-group-label fgrp-lbl">Category</span>
          <span className={chipClass("all", filters.category === "all")} onClick={() => setCategory("all")}>
           All
          </span>
          <span className={chipClass("capex", filters.category === "CAPEX")} onClick={() => setCategory("CAPEX")}>
            ◇ CAPEX
          </span>
          <span className={chipClass("opex", filters.category === "OPEX")} onClick={() => setCategory("OPEX")}>
            ⊙ OPEX
          </span>
        </div>

        <div className="filter-divider fsep" />

        <div className="fgrp">
          <span className="filter-group-label fgrp-lbl">Sub-type</span>
          <span
            className={`${chipClass("devices", filters.subcat === "devices")}${subcatAllowed("devices") ? "" : " disabled"}`}
            onClick={() => subcatAllowed("devices") && setSubcat("devices")}
          >
            ⚕ Devices
          </span>
          <span
            className={`${chipClass("electrical", filters.subcat === "electrical")}${subcatAllowed("electrical") ? "" : " disabled"}`}
            onClick={() => subcatAllowed("electrical") && setSubcat("electrical")}
          >
           💡 Electrical
          </span>
          <span
            className={`${chipClass("medicines", filters.subcat === "medicines")}${subcatAllowed("medicines") ? "" : " disabled"}`}
            onClick={() => subcatAllowed("medicines") && setSubcat("medicines")}
          >
            💊 Medicines
          </span>
          <span
            className={`${chipClass("consumables", filters.subcat === "consumables")}${subcatAllowed("consumables") ? "" : " disabled"}`}
            onClick={() => subcatAllowed("consumables") && setSubcat("consumables")}
          >
           📦 Consumables
          </span>
        </div>

        <div className="filter-divider fsep" />

        <div className="fgrp">
          <span className="filter-group-label fgrp-lbl">Status</span>
          <span
            className={`${chipClass("expired", filters.status === "expired")}${statusAllowed("expired") ? "" : " disabled"}`}
            onClick={() => statusAllowed("expired") && setStatus("expired")}
          >
           🚫 Expired
          </span>
          <span
            className={`${chipClass("expiring", filters.status === "expiring")}${statusAllowed("expiring") ? "" : " disabled"}`}
            onClick={() => statusAllowed("expiring") && setStatus("expiring")}
          >
           ⏰ Expiring
          </span>
          <span
            className={`${chipClass("low_stock", filters.status === "low_stock")}${statusAllowed("low_stock") ? "" : " disabled"}`}
            onClick={() => statusAllowed("low_stock") && setStatus("low_stock")}
          >
            📉 Low stock
          </span>
          <span
            className={`${chipClass("amc_due", filters.status === "amc_due")}${statusAllowed("amc_due") ? "" : " disabled"}`}
            onClick={() => statusAllowed("amc_due") && setStatus("amc_due")}
          >
           📋 AMC due
          </span>
          <span
            className={`${chipClass("healthy", filters.status === "healthy")}${statusAllowed("healthy") ? "" : " disabled"}`}
            onClick={() => statusAllowed("healthy") && setStatus("healthy")}
          >
            🟢 Healthy
          </span>
        </div>
      </div>
    </div>
  );
}
