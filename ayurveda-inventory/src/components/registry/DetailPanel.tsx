"use client";

import React from "react";
import { Item, stockPct, expiryLabel, stockBarColor } from "./utils";
import StatusPill from "./StatusPill";

export default function DetailPanel({ item, onClose }: { item: Item | null | "new"; onClose: () => void }) {
  const isOpen = item !== null;

  const renderBody = () => {
    if (item === "new") {
      return <p style={{ color: "var(--text-dim)", fontSize: 12 }}>Item registration form would appear here.</p>;
    }
    if (!item) return null;

    const exp = expiryLabel(item);
    const pct = stockPct(item);

    const Field = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
      <div className="dp-field">
        <span className="dp-label">{label}</span>
        <span className="dp-value" style={mono ? { fontFamily: "var(--mono)" } : undefined}>{value}</span>
      </div>
    );

    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span className={`cat-badge ${item.category === "CAPEX" ? "cat-capex" : "cat-opex"}`}>{item.category}</span>
          <span className="subcat-badge">{item.subcat}</span>
          <StatusPill status={item.status} />
        </div>

        <div className="dp-section">
          <div className="dp-section-title">Item details</div>
          <Field label="Item ID" value={item.id} mono />
          <Field label="Name" value={item.name} />
          <Field label="Category" value={`${item.category} — ${item.subcat}`} />
          <Field label="Department" value={item.dept} />
          <Field label="Unit" value={item.unit} />
          <Field label="Supplier" value={item.supplier || item.amc || "—"} />
          <Field label="Price per unit" value={item.price ? `₹${item.price.toLocaleString()}` : "—"} />
        </div>

        {item.category === "OPEX" ? (
          <div className="dp-section">
            <div className="dp-section-title">Stock & expiry</div>
            <Field label="Current stock" value={`${item.stock.toLocaleString()} ${item.unit}`} mono />
            <Field label="Minimum level" value={`${item.min.toLocaleString()} ${item.unit}`} mono />
            <div className="dp-field">
              <span className="dp-label">Stock level</span>
              <span className="dp-value">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="stock-bar-track" style={{ width: 80, display: "inline-block" }}>
                    <div className="stock-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: stockBarColor(item) }} />
                  </div>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{pct}%</span>
                </div>
              </span>
            </div>
            <Field label="Batch number" value={item.batch || "—"} mono />
            {(item as any).batches && (item as any).batches.length ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 6 }}>Batches</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {(item as any).batches.map((b: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 8, background: '#fafafa', borderRadius: 6 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ fontFamily: 'var(--mono)', minWidth: 96 }}>{b.batch}</div>
                        <div>{b.stock} {item.unit}</div>
                        <div>{b.expiry ? new Date(b.expiry).toLocaleDateString('en-IN') : '—'}</div>
                        <div style={{ color: 'var(--text-dim)' }}>{b.supplier || '—'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div className="dp-btn" onClick={() => { try { sessionStorage.setItem('openItemForISS', String(item.id)); sessionStorage.setItem('openItemForISSBatch', String(b.batch)); window.dispatchEvent(new CustomEvent('open-issue', { detail: item.id })); } catch (e) {} }}>Issue</div>
                        <div className="dp-btn" onClick={() => { alert('Receive GRN into batch: ' + b.batch); }}>GRN</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="dp-field">
              <span className="dp-label">Expiry date</span>
              <span className={`dp-value expiry-cell ${exp.cls}`}>{exp.txt}</span>
            </div>
          </div>
        ) : (
          <div className="dp-section">
            <div className="dp-section-title">Asset & AMC details</div>
            <Field label="Quantity" value={`${item.stock} ${item.unit}`} />
            <Field label="Serial number" value={item.serial || "—"} mono />
            <Field label="Purchase date" value={item.purchase ? new Date(item.purchase).toLocaleDateString("en-IN") : "—"} />
            <Field label="Purchase price" value={`₹${item.price.toLocaleString()}`} />
            <Field label="AMC vendor" value={item.amc || "No AMC required"} />
            <Field label="AMC expiry" value={item.amcExpiry ? new Date(item.amcExpiry).toLocaleDateString("en-IN") : "—"} />
          </div>
        )}
      </>
    );
  };

  const title = item === "new" ? "Add new item" : item?.name ?? "Item details";

  return (
    <div className={`detail-overlay${isOpen ? " open" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ flex: 1 }} onClick={onClose} />
      <div className="detail-panel">
        <div className="dp-header">
          <div className="dp-title">{title}</div>
          <div className="dp-close" onClick={onClose}>×</div>
        </div>
        <div className="dp-body">{renderBody()}</div>
        <div className="dp-actions">
          <div className="dp-btn" onClick={onClose}>Close</div>
          <div
            className="dp-btn"
            onClick={() => {
              try {
                const id = item !== "new" && item ? item.id : null;
                if (id) {
                  sessionStorage.setItem('openItemForISS', String(id));
                  sessionStorage.removeItem('openItemForISSBatch');
                }
                window.dispatchEvent(new CustomEvent('open-issue', { detail: id }));
              } catch (e) {}
              onClose();
            }}
          >
            Issue stock
          </div>
          <div
            className="dp-btn primary"
            onClick={() => {
              try {
                const id = item !== "new" && item ? item.id : null;
                window.dispatchEvent(new CustomEvent('open-grn', { detail: id }));
              } catch (e) {}
              onClose();
            }}
          >
            Record GRN
          </div>
        </div>
      </div>
    </div>
  );
}
