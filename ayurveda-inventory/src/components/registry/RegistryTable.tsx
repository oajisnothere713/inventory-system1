"use client";

import React, { useState } from "react";
import { MdDelete } from "react-icons/md";
import {
  Batch,
  Item,
  batchStatus,
  daysUntil,
  fefoSort,
  isLowStock,
  stockBarColor,
  stockPct,
  totalStock,
} from "./utils";

function fmtDate(date?: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function expirySummary(item: Item) {
  const isCapex = item.category === "CAPEX";
  const batches = item.batches ?? [];

  if (isCapex) {
    const amcBatches = batches.filter((batch) => batch.amcExpiry);
    if (!amcBatches.length) {
      return {
        main: "No AMC required",
        sub: "Asset tracked, no contract needed",
        cls: "ec-none",
        icon: "·",
      };
    }

    const expired = amcBatches.find((batch) => batchStatus(batch, true) === "amc_expired");
    if (expired) {
      const days = daysUntil(expired.amcExpiry);
      return {
        main: "AMC expired",
        sub: `Expired ${fmtDate(expired.amcExpiry)}${days !== null ? ` (${Math.abs(days)} days ago)` : ""}`,
        cls: "ec-red",
        icon: "⛔",
      };
    }

    const due = amcBatches
      .filter((batch) => batchStatus(batch, true) === "amc_due")
      .sort((a, b) => String(a.amcExpiry).localeCompare(String(b.amcExpiry)))[0];

    if (due) {
      const days = daysUntil(due.amcExpiry);
      return {
        main: `${days ?? "-"} days left`,
        sub: `AMC expires ${fmtDate(due.amcExpiry)}`,
        cls: days !== null && days < 30 ? "ec-red" : "ec-amber",
        icon: "⏰",
      };
    }

    const next = amcBatches.sort((a, b) => String(a.amcExpiry).localeCompare(String(b.amcExpiry)))[0];
    return {
      main: "AMC active",
      sub: `Renew by ${fmtDate(next.amcExpiry)}`,
      cls: "ec-green",
      icon: "✓",
    };
  }

  const expiringBatches = batches.filter((batch) => batch.expiry);
  if (!expiringBatches.length) {
    return { main: "No expiry", sub: "Consumable - no expiry date", cls: "ec-none", icon: "·" };
  }

  const expired = expiringBatches.filter((batch) => {
    const days = daysUntil(batch.expiry);
    return days !== null && days < 0;
  });

  const active = expiringBatches.filter((batch) => {
    const days = daysUntil(batch.expiry);
    return days === null || days >= 0;
  });

  if (expired.length && !active.length) {
    return {
      main: "All batches expired",
      sub: `${expired.length} batch${expired.length > 1 ? "es" : ""} - dispose now`,
      cls: "ec-red",
      icon: "⛔",
    };
  }

  const soonest = active.sort((a, b) => String(a.expiry).localeCompare(String(b.expiry)))[0];
  const days = daysUntil(soonest?.expiry);

  if (expired.length) {
    return {
      main: `${expired.length} batch${expired.length > 1 ? "es" : ""} expired`,
      sub: soonest ? `Next active: ${fmtDate(soonest.expiry)} (${days}d)` : "",
      cls: "ec-amber",
      icon: "⚠",
    };
  }

  if (days !== null && days < 30) return { main: `${days} days`, sub: `Soonest batch: ${fmtDate(soonest.expiry)}`, cls: "ec-red", icon: "⏰" };
  if (days !== null && days < 60) return { main: `${days} days`, sub: `Soonest batch: ${fmtDate(soonest.expiry)}`, cls: "ec-amber", icon: "⏰" };

  return { main: fmtDate(soonest.expiry) ?? "No expiry", sub: "Soonest batch expiry", cls: "ec-green", icon: "✓" };
}

function urgencyClass(item: Item) {
  if (isLowStock(item)) return "u-amber";
  if (["expired", "amc_expired"].includes(item.status)) return "u-red";
  if (item.status === "expiring") return "u-amber";
  if (item.status === "amc_due") return "u-blue";
  return "u-green";
}

function batchStatusBadge(status: string, isCapex: boolean) {
  if (status === "expired") return <span className="batch-badge batch-badge-red">Expired</span>;
  if (status === "expiring") return <span className="batch-badge batch-badge-amber">Expiring</span>;
  if (status === "amc_expired") return <span className="batch-badge batch-badge-red">AMC expired</span>;
  if (status === "amc_due") return <span className="batch-badge batch-badge-blue">AMC due</span>;
  if (status === "no_expiry") return <span className="batch-muted">No expiry</span>;
  if (status === "no_amc" && isCapex) return <span className="batch-muted">No AMC</span>;
  return null;
}

export default function RegistryTable({
  items,
  highlight,
  onRowClick,
  onDeleteItem,
  highlightRef,
}: {
  items: Item[];
  highlight: string | null;
  onRowClick: (item: Item) => void;
  onDeleteItem: (item: Item) => void;
  highlightRef: React.RefObject<HTMLTableRowElement | null>;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
  };

  if (!items.length) {
    return (
      <div className="twrap">
        <div className="empty-st show">
          <div className="empty-title">No items match your filters</div>
          <div className="empty-sub">Try adjusting the category, status, or search</div>
        </div>
      </div>
    );
  }

  return (
    <div className="twrap">
      <table>
        <colgroup>
          <col className="tog" />
          <col className="code" />
          <col className="name" />
          <col className="cat" />
          <col className="stock" />
          <col className="exp" />
          <col className="dept" />
          <col className="act" />
        </colgroup>
        <thead>
          <tr>
            <th />
            <th>ID</th>
            <th>Item name</th>
            <th>Category</th>
            <th>Stock</th>
            <th>Expiry date / AMC due</th>
            <th>Dept</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const isCapex = item.category === "CAPEX";
            const batches = fefoSort(item);
            const isExpanded = Boolean(expanded[item.id]);
            const summary = expirySummary(item);
            const low = isLowStock(item);
            const total = totalStock(item);
            const pct = stockPct(item);
            return (
              <React.Fragment key={item.id}>
                <tr
                  ref={highlight === item.id ? (el) => { if (el) highlightRef.current = el; } : undefined}
                  className={`irow ${urgencyClass(item)}${isExpanded ? " exp" : ""}${highlight === item.id ? " hl" : ""}`}
                  style={{ animationDelay: `${index * 0.02}s` }}
                  onClick={() => toggle(item.id)}
                >
                  <td>
                    <span className="etog">{isExpanded ? "v" : ">"}</span>
                  </td>
                  <td><span className="code-txt">{item.id}</span></td>
                  <td>
                    <div className="iname">{item.name}{low ? <span className="low-badge">Low stock</span> : null}</div>
                    <div className="isub">{item.sub}</div>
                  </td>
                  <td>
                    <span className={`cat-badge ${isCapex ? "cat-capex" : "cat-opex"}`}>{item.category}</span>
                    <div><span className="subcat-badge">{item.subcat}</span></div>
                  </td>
                  <td>
                    {isCapex ? (
                      <div>
                        <span className="sval">{total} {item.unit}</span>
                      </div>
                    ) : (
                      <div>
                        <div className="sval">{total.toLocaleString()} {item.unit}</div>
                        <div className="sbar"><div className="sbf" style={{ width: `${pct}%`, background: stockBarColor(item) }} /></div>
                        <div className="spct">{pct}% of min {item.min.toLocaleString()}</div>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className={`exp-main ${summary.cls}`}>
                      <span className="exp-icon" aria-hidden="true">{summary.icon}</span>
                      <span>{summary.main}</span>
                    </div>
                    <div className="exp-sub">{summary.sub}</div>
                  </td>
                  <td><span className="dept-cell">{item.dept}</span></td>
                  <td>
                    <div className="row-acts">
                      <button className="ra" onClick={(event) => { event.stopPropagation(); onRowClick(item); }}>View</button>
                      <button className="ra p" onClick={(event) => {
                        event.stopPropagation();
                        window.dispatchEvent(new CustomEvent("open-grn", { detail: item.id }));
                      }}>+ GRN</button>
                      <button className="ra danger icon-only" aria-label="Delete item" title="Delete item" onClick={(event) => { event.stopPropagation(); onDeleteItem(item); }}>
                        <MdDelete size={22} />
                      </button>
                    </div>
                  </td>
                </tr>

                {isExpanded ? (
                  <>
                    <tr className="b-hdr">
                      <td colSpan={8}>
                        <div className="b-hdr-in">
                          <span className="bc-tog" />
                          <span className="bc-code">{isCapex ? "GRN ref" : "Batch no."}</span>
                          <span className="bc-name">{isCapex ? "Serial numbers" : "Status / tags"}</span>
                          <span className="bc-cat">Qty / Units</span>
                          <span className="bc-stock">{isCapex ? "AMC expiry" : "Expiry date"}</span>
                          <span className="bc-exp">Supplier</span>
                          <span className="bc-dept">Date received</span>
                          <span className="bc-act" />
                        </div>
                      </td>
                    </tr>

                    {batches.map((batch: Batch, batchIndex) => {
                      const status = batchStatus(batch, isCapex);
                      const expDate = isCapex ? batch.amcExpiry : batch.expiry;
                      const days = daysUntil(expDate);
                      const disabled = status === "expired" || status === "amc_expired";
                      const expClass = days === null ? "ec-none" : days < 0 || days < 30 ? "ec-red" : days < 90 ? "ec-amber" : "ec-green";

                      return (
                        <tr key={`${item.id}-${batch.batch}-${batchIndex}`} className={`b-row${batchIndex === batches.length - 1 ? " last" : ""}`}>
                          <td colSpan={8}>
                            <div className="b-row-in">
                              <span className="bc-tog" />
                              <span className="bc-code"><span className="bnum">{isCapex ? batch.grn || batch.batch : batch.batch}</span></span>
                              <span className="bc-name">
                                {isCapex ? (
                                  <span className="serial-wrap">
                                    {(batch.serials ?? []).length ? batch.serials?.map((serial) => <span key={serial} className="serial-chip">{serial}</span>) : "—"}
                                    {batchStatusBadge(status, true)}
                                  </span>
                                ) : (
                                  <span className="batch-status-line">
                                    {batchIndex === 0 && batches.length > 1 ? <span className="fefo-t">FEFO</span> : null}
                                    {batchStatusBadge(status, false)}
                                  </span>
                                )}
                              </span>
                              <span className="bc-cat"><span className="sval">{batch.stock} {item.unit}</span></span>
                              <span className="bc-stock"><span className={`exp-main ${expClass}`}>{expDate ? fmtDate(expDate) : "—"}</span></span>
                              <span className="bc-exp">{batch.supplier || batch.amcSupplier || "—"}</span>
                              <span className="bc-dept">{fmtDate(batch.grnDate) || "—"}</span>
                              <span className="bc-act">
                                {!isCapex ? (
                                  <button
                                    className="ra p"
                                    disabled={disabled}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      sessionStorage.setItem("openItemForISS", item.id);
                                      sessionStorage.setItem("openItemForISSBatch", batch.batch);
                                      window.dispatchEvent(new CustomEvent("open-issue", { detail: item.id }));
                                    }}
                                  >
                                    Issue
                                  </button>
                                ) : (
                                  <button className="ra" onClick={(event) => { event.stopPropagation(); onRowClick(item); }}>Details</button>
                                )}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    <tr className="b-foot">
                      <td colSpan={8}>
                        <div className="b-foot-in">
                        </div>
                      </td>
                    </tr>
                  </>
                ) : null}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
