"use client";

import React from "react";
import { FilterState } from "./utils";

export default function ResultStrip({ filters, filteredCount, setFilters }: { filters: FilterState; filteredCount: number; setFilters: React.Dispatch<React.SetStateAction<FilterState>>; }) {
  return (
    <div className="result-strip">
      <div className="result-count">Showing <strong>{filteredCount}</strong> items</div>
      <div className="sort-row">
        Sort by
        <select
          className="sort-select"
          value={filters.sortCol}
          onChange={(e) => setFilters((f: FilterState) => ({ ...f, sortCol: e.target.value }))}
        >
          <option value="name">Name A–Z</option>
          <option value="status">Status</option>
          <option value="expiry">Expiry date</option>
          <option value="stock">Stock level</option>
          <option value="dept">Department</option>
        </select>
        <div className="view-toggle">
          <div className="vt-btn active" title="Table view">☰</div>
          <div className="vt-btn" title="Grid view">⊞</div>
        </div>
      </div>
    </div>
  );
}
