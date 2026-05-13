import React from "react";
import { Batch } from "../../types/items";

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "No expiry";

export default function FefoPreview({ fefoList, unit }: { fefoList: (Batch & { isNew?: boolean })[]; unit: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="fefo-preview">
        <div className="fefo-title">📋 FEFO dispatch order after this GRN</div>
        <div className="fefo-list">
          {fefoList.map((b, i) => (
            <div key={b.batchNo + i} className="fefo-row">
              <div className={`fefo-pos ${b.isNew ? "new" : ""}`}>{i + 1}</div>
              <div className="fefo-name">{b.batchNo} — {b.qty.toLocaleString()} {unit}</div>
              <div className="fefo-exp">{b.expiry ? fmtDate(b.expiry) : "No expiry"}</div>
              {i === 0 && !b.isNew && <span className="fefo-tag fefo">FEFO</span>}
              {b.isNew && <span className="fefo-tag new-b">NEW</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
