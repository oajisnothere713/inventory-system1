"use client";

type Grn = {
  grnId: number
  grnNumber: string
  grnDate: Date | string
  batchNumber?: string
  quantityReceived?: any
  item?: { itemName?: string }
}

type Props = {
  recentGrns?: Grn[]
}

function fmtDate(d?: Date | string) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  return dt.toLocaleDateString()
}

export default function ActivityPanel({ recentGrns = [] }: Props) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Recent activity</span>
        <a className="view-link">View full log →</a>
      </div>
      <div className="panel-body" style={{ padding: '0 16px' }}>
        <div className="activity-list">
          {recentGrns.length === 0 && <div style={{ padding: 12, color: 'var(--text-dim)' }}>No recent activity</div>}
          {recentGrns.map((g) => (
            <div className="act-row" key={g.grnId}>
              <div className="act-icon green">↓</div>
              <div className="act-content">
                <div className="act-title">GRN recorded — {g.item?.itemName ?? g.grnNumber} <span className="pill pill-green" style={{ marginLeft: 4 }}>{g.quantityReceived?.toString?.() ?? ''}</span></div>
                <div className="act-detail">{g.batchNumber ?? ''} · {fmtDate(g.grnDate)}</div>
              </div>
              <div className="act-time">{fmtDate(g.grnDate)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
