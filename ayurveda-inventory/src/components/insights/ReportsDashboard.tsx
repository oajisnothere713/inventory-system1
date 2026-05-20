"use client";

import { useMemo, useState } from "react";
import { Cell, InsightReport, useRegistryInsights } from "./registryInsights";

type ReportKey = "stock" | "expiry" | "consumption" | "grn" | "wastage" | "amc" | "reorder";
type ReportFilters = Record<string, string>;
type FiltersByReport = Record<string, ReportFilters>;

export default function ReportsDashboard() {
  const { reports, loading, error } = useRegistryInsights();
  const [current, setCurrent] = useState<ReportKey>("stock");
  const [filtersByReport, setFiltersByReport] = useState<FiltersByReport>({});
  const report = reports[current];
  const reportKeys = useMemo(() => Object.keys(reports) as ReportKey[], [reports]);
  const activeFilters = useMemo(() => buildActiveFilters(report, filtersByReport[current]), [filtersByReport, current, report]);
  const filteredRows = useMemo(() => (report ? applyReportFilters(report, activeFilters) : []), [report, activeFilters]);

  const downloadCsv = () => {
    if (!report) return;
    const rows = [report.headers, ...filteredRows.map((row) => row.map((cell) => cellText(cell)))];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AyurVaidya_${current}_registry_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateFilter = (id: string, value: string) => {
    setFiltersByReport((currentFilters) => ({
      ...currentFilters,
      [current]: {
        ...(currentFilters[current] ?? {}),
        [id]: value,
      },
    }));
  };

  return (
    <div className="insights-page">
      <div className="reports-layout">
        <aside className="insights-left-panel">
          <div className="insights-panel-head">
            <div className="insights-panel-title">Registry report type</div>
            <div className="insights-panel-sub">Generated from Item Registry</div>
          </div>
          <div className="insights-panel-scroll">
            {reportKeys.map((key) => (
              <button className={`report-type ${current === key ? "active" : ""}`} key={key} onClick={() => setCurrent(key)}>
                <span className="report-icon" style={{ background: iconBg(key) }}>{reports[key].icon}</span>
                <span>
                  <span className="report-label">{reports[key].title.replace(" Report", "")}</span>
                  <span className="report-desc">{reports[key].desc}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="report-main">
          <div className="report-head">
            <div>
              <div className="report-title">{report?.title ?? "Registry Report"}</div>
              <div className="report-sub">{loading ? "Loading Item Registry..." : error ?? report?.sub}</div>
            </div>
          </div>
          {report ? (
            <ReportContent
              report={report}
              filters={activeFilters}
              rows={filteredRows.slice(0, 12)}
              filteredCount={filteredRows.length}
              onFilterChange={updateFilter}
              onDownload={downloadCsv}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

function ReportContent({
  report,
  filters,
  rows,
  filteredCount,
  onFilterChange,
  onDownload,
}: {
  report: InsightReport;
  filters: ReportFilters;
  rows: Cell[][];
  filteredCount: number;
  onFilterChange: (id: string, value: string) => void;
  onDownload: () => void;
}) {
  return (
    <>
      <div className="report-body">
        <section className="report-config">
          <div className="report-config-head"><div className="report-section-title">Report parameters</div></div>
          <div className="report-fields">
            {report.params.map((param) => (
              <label className="insights-field" key={param.id}>
                <span>{param.label}</span>
                {param.type === "select" ? (
                  <select value={filters[param.id] ?? ""} onChange={(event) => onFilterChange(param.id, event.target.value)}>
                    {param.opts?.map((opt) => <option key={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input type="date" value={filters[param.id] ?? ""} onChange={(event) => onFilterChange(param.id, event.target.value)} />
                )}
              </label>
            ))}
          </div>
        </section>

        <section className="report-preview">
          <div className="report-preview-head">
            <div className="report-section-title">Preview <span style={{ fontWeight: 400, textTransform: "none" }}>(first {rows.length} rows)</span></div>
            <div style={{ color: "var(--ins-mute)", fontSize: 10.5 }}>Showing {rows.length} of {filteredCount} rows</div>
          </div>
          <div className="report-table-wrap">
            <table className="report-table">
              <thead><tr>{report.headers.map((head) => <th key={head}>{head}</th>)}</tr></thead>
              <tbody>
                {rows.length ? rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{typeof cell === "string" ? cell : <span className={`insights-pill ${cell.c}`}>{cell.t}</span>}</td>
                    ))}
                  </tr>
                )) : (
                  <tr><td colSpan={report.headers.length}>No rows found for this registry report.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="report-more">{filteredCount > rows.length ? `+ ${filteredCount - rows.length} more rows in full export` : "All matching rows shown in preview"}</div>
          {report.footNote ? <div style={{ padding: "10px 14px", color: "var(--ins-amber)", background: "var(--ins-amber-light)", fontSize: 11 }}>{report.footNote}</div> : null}
        </section>
      </div>
      <div className="report-download">
        <div className="report-download-info">Ready to export from Item Registry: <strong style={{ color: "var(--ins-text)" }}>{filteredCount} rows</strong> - {report.title}</div>
        <button className="insights-btn" onClick={() => window.print()}>Preview PDF</button>
        <button className="insights-btn primary" onClick={onDownload}>Download CSV</button>
      </div>
    </>
  );
}

function iconBg(key: string) {
  if (key === "expiry" || key === "wastage" || key === "reorder") return "var(--ins-amber-light)";
  if (key === "amc" || key === "consumption") return "var(--ins-blue-light)";
  return "var(--ins-green-light)";
}

function buildActiveFilters(report: InsightReport | undefined, saved: ReportFilters | undefined): ReportFilters {
  if (!report) return {};
  return report.params.reduce<ReportFilters>((filters, param) => {
    filters[param.id] = saved?.[param.id] ?? param.default ?? param.opts?.[0] ?? "";
    return filters;
  }, {});
}

function applyReportFilters(report: InsightReport, filters: ReportFilters) {
  return report.rows.filter((row) => {
    for (const [id, rawValue] of Object.entries(filters)) {
      const value = rawValue.trim();
      if (!value || isAllOption(value)) continue;
      if (!matchesFilter(report, row, id, value)) return false;
    }
    return true;
  });
}

function matchesFilter(report: InsightReport, row: Cell[], id: string, value: string) {
  if (id === "category") {
    const category = rowText(report, row, ["Category"]);
    if (!category) return true;
    if (value === "OPEX only") return category === "OPEX";
    if (value === "CAPEX only") return category === "CAPEX";
    return category === value;
  }

  if (id === "dept") {
    const dept = rowText(report, row, ["Dept", "Department"]);
    return !dept || dept === value;
  }

  if (id === "status") {
    return matchesStatus(report, row, value);
  }

  if (id === "supplier") {
    const supplier = rowText(report, row, ["Supplier", "Vendor"]);
    return !supplier || supplier === value;
  }

  if (id === "range") {
    const days = Number.parseInt(rowText(report, row, ["Days"]), 10);
    if (Number.isNaN(days)) return true;
    if (value.includes("30")) return days <= 30;
    if (value.includes("60")) return days <= 60;
    if (value.includes("90")) return days <= 90;
    return true;
  }

  const index = columnIndex(report.headers, [id, labelFromId(id)]);
  if (index === -1) return true;
  return cellText(row[index]).toLowerCase().includes(value.toLowerCase());
}

function matchesStatus(report: InsightReport, row: Cell[], value: string) {
  const status = rowText(report, row, ["Status", "Quality"]);
  const action = rowText(report, row, ["Action"]);
  const days = Number.parseInt(rowText(report, row, ["Days"]), 10);
  const target = value.toLowerCase();

  if (target === "expired") return status.toLowerCase().includes("expired") || action === "Dispose" || (!Number.isNaN(days) && days < 0);
  if (target === "expiring") return status.toLowerCase().includes("expiring") || (!Number.isNaN(days) && days >= 0 && days <= 30);
  if (target === "healthy") return status.toLowerCase().includes("healthy");
  if (target === "low stock") return status.toLowerCase().includes("low stock");
  if (target === "amc due") return status.toLowerCase().includes("amc due") || status.toLowerCase().includes("due soon");
  return status.toLowerCase().includes(target);
}

function rowText(report: InsightReport, row: Cell[], headers: string[]) {
  const index = columnIndex(report.headers, headers);
  return index === -1 ? "" : cellText(row[index]);
}

function columnIndex(headers: string[], candidates: string[]) {
  const lowered = headers.map((header) => header.toLowerCase());
  return candidates.reduce((found, candidate) => {
    if (found !== -1) return found;
    return lowered.indexOf(candidate.toLowerCase());
  }, -1);
}

function cellText(cell: Cell | undefined) {
  if (!cell) return "";
  return typeof cell === "string" ? cell : cell.t;
}

function isAllOption(value: string) {
  return value === "All" || value.toLowerCase().startsWith("all ");
}

function labelFromId(id: string) {
  return id.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
