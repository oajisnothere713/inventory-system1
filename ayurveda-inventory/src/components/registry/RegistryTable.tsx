"use client";

import React, { useState } from "react";
import { Item, stockPct, expiryLabel, stockBarColor, Batch } from "./utils";
import StatusPill from "./StatusPill";

export default function RegistryTable({
  items,
  highlight,
  onRowClick,
  highlightRef,
}: {
  items: Item[];
  highlight: string | null;
  onRowClick: (item: Item) => void;
  highlightRef: React.RefObject<HTMLTableRowElement | null>;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded(e => ({ ...e, [id]: !e[id] }));
  return (
    <div className="table-wrap">
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">No items match your filters</div>
          <div className="empty-sub">Try adjusting the category, status, or search term</div>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Item name</th>
              <th>Category</th>
              <th>Sub-type</th>
              <th>Stock / Qty</th>
              <th>Expiry / AMC</th>
              <th>Department</th>
              <th>Status</th>
              <th style={{ width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const pct = stockPct(item);
              const exp = expiryLabel(item);
              const isHL = highlight === item.id;
              const hasBatches = Array.isArray((item as Item).batches) && (item as Item).batches!.length > 0;

              const stockDisp = item.category === "CAPEX" ? (
                <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{item.stock} {item.unit}</span>
              ) : (
                <div className="stock-cell">
                  <div className="stock-nums">{item.stock.toLocaleString()} / {item.min.toLocaleString()} {item.unit}</div>
                  <div className="stock-bar-track">
                    <div className="stock-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: stockBarColor(item) }} />
                  </div>
                </div>
              );

              return (
                <React.Fragment key={item.id}>
                <tr
                  className={isHL ? "highlighted" : ""}
                  style={{ animationDelay: `${idx * 0.02}s` }}
                  ref={isHL ? (el) => { if (el) highlightRef.current = el; } : undefined}
                  data-id={item.id}
                  onClick={() => onRowClick(item)}
                >
                  <td style={{ width: 56 }}>
                    {hasBatches ? (
                      <button className="expand-btn" onClick={(e) => { e.stopPropagation(); toggle(item.id); }} style={{ marginRight: 8 }}>{expanded[item.id] ? '▾' : '▸'}</button>
                    ) : null}
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-dim)" }}>{item.id}</span>
                  </td>
                  <td>
                    <div className="item-name-cell">
                      <div className="item-name">{item.name}</div>
                      <div className="item-sub">{item.sub}</div>
                    </div>
                  </td>
                  <td><span className={`cat-badge ${item.category === "CAPEX" ? "cat-capex" : "cat-opex"}`}>{item.category}</span></td>
                  <td><span className="subcat-badge">{item.subcat}</span></td>
                  <td>{stockDisp}</td>
                  <td><span className={`expiry-cell ${exp.cls}`}>{exp.txt}</span></td>
                  <td><span className="dept-cell">{item.dept}</span></td>
                  <td><StatusPill status={item.status} /></td>
                  <td>
                    <div className="action-cell">
                      <button className="action-btn" onClick={(e) => { e.stopPropagation(); onRowClick(item); }}>View</button>
                      <button className="action-btn primary-sm" onClick={(e) => { e.stopPropagation(); alert((item.category === "OPEX" ? "Opening GRN" : "Details") + " for: " + item.name); }}>
                        {item.category === "OPEX" ? "GRN" : "Details"}
                      </button>
                    </div>
                  </td>
                </tr>
                {hasBatches && expanded[item.id] ? (
                  (item as Item).batches!.map((b: Batch, bi: number) => (
                    <tr key={`${item.id}-batch-${bi}`} className="batch-row" onClick={() => onRowClick(item)}>
                      <td />
                      <td colSpan={6} style={{ paddingLeft: 56 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{ minWidth: 160, fontFamily: 'var(--mono)', fontSize: 12 }}>{b.batch}</div>
                          <div style={{ minWidth: 120 }}>{String(b.stock)} {item.unit}</div>
                          <div style={{ minWidth: 160 }}>{b.expiry ? new Date(b.expiry).toLocaleDateString('en-IN') : '—'}</div>
                          <div style={{ minWidth: 160 }}>{b.supplier || '—'}</div>
                          <div style={{ minWidth: 100 }}>{b.price ? `₹${b.price}` : '—'}</div>
                        </div>
                      </td>
                      <td><StatusPill status={item.status} /></td>
                      <td>
                        <div className="action-cell">
                          <button className="action-btn" onClick={(e) => { e.stopPropagation(); alert('Issue from batch ' + b.batch); }}>Issue</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
