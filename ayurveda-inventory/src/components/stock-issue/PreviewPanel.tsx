import React from 'react';

type Batch = { batchNo: string; qty: number };
type Item = { name: string; unit: string; totalStock: number; minStock: number; dept: string; category: string; subcat: string };

export default function PreviewPanel({ selectedItem, selectedBatch, qtyInt, selectedDept, authorisedBy, purpose }: { selectedItem: Item | null; selectedBatch?: Batch | null; qtyInt: number; selectedDept?: string | null; authorisedBy?: string | null; purpose?: string | null }) {
  if (!selectedItem) {
    return (
      <div className="preview-empty">
        <div className="pe-icon">↑</div>
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>Select an item, batch and quantity to see what will be deducted</div>
      </div>
    );
  }

  const previewNewTotal = selectedItem.totalStock - qtyInt;
  const previewBatchLeft = (selectedBatch?.qty ?? 0) - qtyInt;
  const newCls = previewNewTotal < 0 ? 'danger' : previewNewTotal < selectedItem.minStock ? 'warn' : 'ok';
  const dept = selectedDept ?? '—';
  const auth = authorisedBy || '—';
  const pur = purpose || '—';

  return (
    <>
      <div className="stock-change-box">
        <div className="scb-label">Stock after this issue</div>
        <div className="scb-values">
          <div className="scb-old">{selectedItem.totalStock.toLocaleString()}</div>
          <div className="scb-arrow">→</div>
          <div className={`scb-new ${newCls}`}>{previewNewTotal.toLocaleString()}</div>
        </div>
        <div className="scb-unit">{selectedItem.unit}</div>
        {qtyInt > 0 && (
          <div className="scb-diff">−{qtyInt.toLocaleString()} {selectedItem.unit}</div>
        )}
      </div>

      <div className="preview-section">
        <div className="ps-title">Item</div>
        {[
          ['Name', selectedItem.name, ''],
          ['Category', `${selectedItem.category} · ${selectedItem.subcat}`, ''],
          ['Dept', selectedItem.dept, ''],
          ['Current stock', `${selectedItem.totalStock.toLocaleString()} ${selectedItem.unit}`, 'mono'],
          ['Min stock level', `${selectedItem.minStock.toLocaleString()} ${selectedItem.unit}`, 'mono'],
        ].map(([lbl, val, cls]) => (
          <div className="ps-row" key={lbl as string}>
            <span className="ps-lbl">{lbl}</span>
            <span className={`ps-val ${cls as string}`}>{val}</span>
          </div>
        ))}
      </div>

      {selectedBatch && (
        <div className="preview-section">
          <div className="ps-title">Selected batch</div>
          <div className="ps-row"><span className="ps-lbl">Batch no.</span><span className="ps-val mono">{selectedBatch.batchNo}</span></div>
          <div className="ps-row"><span className="ps-lbl">Available</span><span className="ps-val mono">{selectedBatch.qty.toLocaleString()} {selectedItem.unit}</span></div>
          <div className="ps-row"><span className="ps-lbl">Issuing</span><span className="ps-val red mono">{qtyInt > 0 ? `−${qtyInt.toLocaleString()} ${selectedItem.unit}` : '—'}</span></div>
          <div className="ps-row">
            <span className="ps-lbl">Remaining</span>
            <span className={`ps-val ${previewBatchLeft < 0 ? 'red' : previewBatchLeft < 20 ? 'amber' : 'green'} mono`}>{previewBatchLeft.toLocaleString()} {selectedItem.unit}</span>
          </div>
        </div>
      )}

      {(dept !== '—' || auth !== '—' || pur !== '—') && (
        <div className="preview-section">
          <div className="ps-title">Issue details</div>
          {dept !== '—' && <div className="ps-row"><span className="ps-lbl">Department</span><span className="ps-val">{dept}</span></div>}
          {auth !== '—' && <div className="ps-row"><span className="ps-lbl">Authorised by</span><span className="ps-val">{auth}</span></div>}
          {pur !== '—' && <div className="ps-row"><span className="ps-lbl">Purpose</span><span className="ps-val">{pur}</span></div>}
        </div>
      )}

    </>
  );
}
