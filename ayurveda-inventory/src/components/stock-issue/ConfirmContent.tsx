import React from 'react';

type Item = { name: string; id: string; unit: string; totalStock: number; minStock: number };

export default function ConfirmContent({
  selectedItem,
  qty,
  batch,
  dept,
  auth,
  pur,
  loc,
  patId,
  issueDateFormatted,
}: {
  selectedItem: Item | null;
  qty: number;
  batch: string;
  dept: string;
  auth: string;
  pur: string;
  loc: string;
  patId: string;
  issueDateFormatted: string;
}) {
  if (!selectedItem) return null;
  const confirmNewTotal = selectedItem.totalStock - qty;
  const confirmBatchLeft = 0; // caller can compute if needed

  const itemRows = [
    ['Item name', selectedItem.name],
    ['Item ID', selectedItem.id],
    ['Batch', batch],
    ['Quantity issued', `${qty.toLocaleString()} ${selectedItem.unit}`],
    ['Remaining in batch', `${confirmBatchLeft.toLocaleString()} ${selectedItem.unit}`],
    ['Total stock after', `${confirmNewTotal.toLocaleString()} ${selectedItem.unit}`],
  ];

  const detailRows = [
    ['Department', dept],
    ['Location', loc],
    ['Authorised by', auth],
    ['Purpose', pur],
    ['Patient / ref ID', patId],
    ['Issue date', issueDateFormatted],
  ];

  function rowColor(label: string, value: string): string | undefined {
    if (label === 'Quantity issued') return 'var(--red)';
    if (label === 'Remaining in batch') return confirmBatchLeft < 0 ? 'var(--red)' : 'var(--green)';
    if (label === 'Total stock after') return confirmNewTotal < selectedItem!.minStock ? 'var(--amber)' : 'var(--green)';
    return undefined;
  }

  const newTotalOK = confirmNewTotal >= selectedItem.minStock;

  return (
    <>
      <div className="confirm-two-col">
        <div>
          <div className="confirm-section-title">Item &amp; batch</div>
          {itemRows.map(([lbl, val]) => (
            <div className="confirm-row" key={lbl}>
              <span className="cr-lbl">{lbl}</span>
              <span className="cr-val" style={{ color: rowColor(lbl as string, val as string) }}>{val}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="confirm-section-title">Issue details</div>
          {detailRows.map(([lbl, val]) => (
            <div className="confirm-row" key={lbl}>
              <span className="cr-lbl">{lbl}</span>
              <span className="cr-val">{val}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="form-card" style={{ marginTop: 16, borderColor: 'rgba(26,107,60,0.3)', animationDelay: '0.08s' }}>
        <div className="fc-head" style={{ background: 'var(--green-light)' }}>
          <div className="fc-title" style={{ color: 'var(--green)' }}>What happens when you confirm</div>
        </div>
        <div className="fc-body">
          <div className="consequence-list">
            <div className="consequence-item">
              <div className="cons-num">1</div>
              <div>
                <strong style={{ color: 'var(--text)' }}>Stock deducted immediately</strong><br />
                <span style={{ color: 'var(--text-dim)' }}>{selectedItem.name} drops from {selectedItem.totalStock.toLocaleString()} to {confirmNewTotal.toLocaleString()} {selectedItem.unit}</span>
              </div>
            </div>
            <div className="consequence-item">
              <div className="cons-num">2</div>
              <div>
                <strong style={{ color: 'var(--text)' }}>Batch {batch} updated</strong><br />
                <span style={{ color: 'var(--text-dim)' }}>Remaining in batch: {confirmBatchLeft.toLocaleString()} {selectedItem.unit}{confirmBatchLeft === 0 ? ' — batch fully consumed, will be retired' : ''}</span>
              </div>
            </div>
            <div className="consequence-item">
              <div className={`cons-num ${newTotalOK ? '' : 'warn'}`}>3</div>
              <div>
                <strong style={{ color: 'var(--text)' }}>Issue log entry created</strong><br />
                <span style={{ color: 'var(--text-dim)' }}>Logged to {dept} · Authorised by {auth} · For: {pur}</span>
              </div>
            </div>
            {!newTotalOK && (
              <div className="consequence-item">
                <div className="cons-num warn">⚠</div>
                <div>
                  <strong style={{ color: 'var(--amber)' }}>Low stock alert will fire</strong><br />
                  <span style={{ color: 'var(--text-dim)' }}>After this issue, stock ({confirmNewTotal.toLocaleString()} {selectedItem.unit}) falls below minimum ({selectedItem.minStock.toLocaleString()} {selectedItem.unit}). Raise a purchase request.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
