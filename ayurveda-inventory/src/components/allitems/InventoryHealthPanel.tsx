"use client";

type Props = {
  totalItems?: number
  capexCount?: number
  opexCount?: number
  attentionCount?: number
  expiredCount?: number
}

export default function InventoryHealthPanel({ totalItems = 0, capexCount = 0, opexCount = 0, attentionCount = 0, expiredCount = 0 }: Props) {
  const healthy = Math.max((totalItems || 0) - Math.max(attentionCount, expiredCount), 0)
  const needAttention = Math.max(attentionCount, 0)
  const expired = Math.max(expiredCount, 0)
  const totalForBars = Math.max(totalItems || 0, 1)
  const healthyPct = Math.max(0, Math.min(100, Math.round((healthy / totalForBars) * 100)))
  const attentionPct = Math.max(0, Math.min(100 - healthyPct, Math.round((needAttention / totalForBars) * 100)))
  const expiredPct = Math.max(0, 100 - healthyPct - attentionPct)

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Inventory health — overall status</span>
        <a className="view-link" href="#" onClick={(e) => { e.preventDefault(); try { sessionStorage.setItem('registryDeepLink', JSON.stringify({ status: 'expired', bannerMsg: '← From Dashboard → Alerts: expired items' })); window.dispatchEvent(new CustomEvent('open-registry')); } catch (err){} }}>
          View all alerts →
        </a>
      </div>
      <div className="panel-body">
        <div className="health-block">
          <div className="health-label-row">
            <div className="health-label-left"><div className="cat-dot" style={{ background: 'var(--blue)' }}></div><span>CAPEX — {capexCount} items</span></div>
            <span className="health-status" style={{ color: 'var(--green)' }}>Good overall</span>
          </div>
          <div className="health-bar">
            <div className="hb" style={{ width: `${healthyPct}%`, background: 'var(--green)' }}></div>
            <div className="hb" style={{ width: `${attentionPct}%`, background: 'var(--amber)' }}></div>
            <div className="hb" style={{ width: `${expiredPct}%`, background: 'var(--red)' }}></div>
          </div>
        </div>

        <div className="health-block">
          <div className="health-label-row">
            <div className="health-label-left"><div className="cat-dot" style={{ background: 'var(--green)' }}></div><span>OPEX — {opexCount} items</span></div>
            <span className="health-status" style={{ color: 'var(--amber)' }}>Attention needed</span>
          </div>
          <div className="health-bar">
            <div className="hb" style={{ width: `${healthyPct}%`, background: 'var(--green)' }}></div>
            <div className="hb" style={{ width: `${attentionPct}%`, background: 'var(--amber)' }}></div>
            <div className="hb" style={{ width: `${expiredPct}%`, background: 'var(--red)' }}></div>
          </div>
        </div>

        <div className="health-divider" />

        <div className="mini-stats">
          <div className="mini-stat"><div className="mini-val" style={{ color: 'var(--green)' }}>{healthy}</div><div className="mini-lbl">healthy items</div></div>
          <div className="mini-stat"><div className="mini-val" style={{ color: 'var(--amber)' }}>{needAttention}</div><div className="mini-lbl">need attention</div></div>
          <div className="mini-stat"><div className="mini-val" style={{ color: 'var(--red)' }}>{expired}</div><div className="mini-lbl">expired — act now</div></div>
        </div>
      </div>
    </div>
  );
}
