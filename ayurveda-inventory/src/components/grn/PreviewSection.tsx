import React from "react";

export default function PreviewSection({ title, rows }: {
  title: string;
  // Accept either strict tuples or plain string[][] from callers
  rows: ([string, string, string?] | string[])[];
}) {
  return (
    <div className="preview-section">
      <div className="ps-title">{title}</div>
      {rows.map((r) => {
        const lbl = (r[0] ?? "") as string;
        const val = (r[1] ?? "") as string;
        const cls = (r[2] ?? "") as string;
        return (
          <div key={lbl} className="ps-row">
            <span className="ps-lbl">{lbl}</span>
            <span className={`ps-val ${cls}`}>{val}</span>
          </div>
        );
      })}
    </div>
  );
}
