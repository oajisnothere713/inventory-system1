"use client";

import React from "react";
import { FilterState } from "./utils";

export default function ResultStrip({
  filters,
  filteredCount,
  setFilters,
}: {
  filters: FilterState;
  filteredCount: number;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}) {
  return (
    <div className="result-strip rstrip">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span>
          Showing <strong>{filteredCount}</strong> items
        </span>
        <div className="fefo-c">FEFO active</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span>Sort:</span>
        <select
          className="sort-select"
          value={filters.sortCol}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              sortCol: event.target.value,
            }))
          }
        >
          <option value="status">Urgency first</option>
          <option value="name">Name A-Z</option>
          <option value="expiry">Earliest expiry / AMC</option>
          <option value="stock">Stock level</option>
          <option value="dept">Department</option>
        </select>
      </div>
    </div>
  );
}
