"use client";

type Props = {
  totalItems?: number
  capexCount?: number
  opexCount?: number
  attentionCount?: number
  expiredCount?: number
  capexHealthy?: number
  capexAttention?: number
  capexCritical?: number
  opexHealthy?: number
  opexLowStock?: number
  opexExpiring?: number
  opexExpired?: number
}

export default function InventoryHealthPanel({
  totalItems = 0, capexCount = 0, opexCount = 0,
  attentionCount = 0, expiredCount = 0,
  capexHealthy, capexAttention, capexCritical,
  opexHealthy, opexLowStock, opexExpiring, opexExpired
}: Props) {
  // Derive CAPEX stats
  const cHealthy = capexHealthy ?? Math.max(0, capexCount - (capexAttention ?? 0) - (capexCritical ?? 0))
  const cAttention = capexAttention ?? 0
  const cCritical = capexCritical ?? 0
  const cTotal = Math.max(capexCount, 1)
  const cHealthyPct = Math.round((cHealthy / cTotal) * 100)
  const cAttentionPct = Math.round((cAttention / cTotal) * 100)
  const cCriticalPct = Math.max(0, 100 - cHealthyPct - cAttentionPct)

  // Derive OPEX stats
  const oHealthy = opexHealthy ?? Math.max(0, opexCount - (opexLowStock ?? 0) - (opexExpiring ?? 0) - (opexExpired ?? 0))
  const oLowStock = opexLowStock ?? 0
  const oExpiring = opexExpiring ?? 0
  const oExpired = opexExpired ?? 0
  const oTotal = Math.max(opexCount, 1)
  const oHealthyPct = Math.round((oHealthy / oTotal) * 100)
  const oLowStockPct = Math.round((oLowStock / oTotal) * 100)
  const oExpiringPct = Math.round((oExpiring / oTotal) * 100)
  const oExpiredPct = Math.max(0, 100 - oHealthyPct - oLowStockPct - oExpiringPct)

  // Overall stats for mini cards
  const healthy = Math.max((totalItems || 0) - attentionCount - expiredCount, 0)

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Inventory health — overall status</span>
        <a className="view-link" href="#" onClick={(e) => { e.preventDefault(); try { sessionStorage.setItem('registryDeepLink', JSON.stringify({ status: 'expired', bannerMsg: '← From Dashboard → Alerts: expired items' })); window.dispatchEvent(new CustomEvent('open-registry')); } catch (err){} }}>
          View all alerts →
        </a>
      </div>
      <div className="panel-body">
        {/* CAPEX health bar */}
        <div className="health-block">
          <div className="health-label-row">
            <div className="health-label-left"><div className="cat-dot" style={{ background: 'var(--blue)' }}></div><span>CAPEX — {capexCount} items</span></div>
            <span className="health-status" style={{ color: cCritical > 0 ? 'var(--amber)' : 'var(--green)' }}>{cCritical > 0 ? 'Attention needed' : 'Good overall'}</span>
          </div>
          <div className="health-bar">
            <div className="hb" style={{ width: `${cHealthyPct}%`, background: 'var(--green)' }}></div>
            <div className="hb" style={{ width: `${cAttentionPct}%`, background: 'var(--amber)' }}></div>
            <div className="hb" style={{ width: `${cCriticalPct}%`, background: 'var(--red)' }}></div>
          </div>
          <div className="health-legend">
            <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--green)' }}></div>{cHealthy} healthy</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--amber)' }}></div>{cAttention} AMC within 90d</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--red)' }}></div>{cCritical} AMC critical</div>
          </div>
        </div>

        {/* OPEX health bar */}
        <div className="health-block">
          <div className="health-label-row">
            <div className="health-label-left"><div className="cat-dot" style={{ background: 'var(--green)' }}></div><span>OPEX — {opexCount} items</span></div>
            <span className="health-status" style={{ color: (oExpired > 0 || oExpiring > 0) ? 'var(--amber)' : 'var(--green)' }}>{(oExpired > 0 || oExpiring > 0) ? 'Attention needed' : 'Good overall'}</span>
          </div>
          <div className="health-bar">
            <div className="hb" style={{ width: `${oHealthyPct}%`, background: 'var(--green)' }}></div>
            <div className="hb" style={{ width: `${oLowStockPct}%`, background: 'var(--amber)' }}></div>
            <div className="hb" style={{ width: `${oExpiringPct}%`, background: 'rgba(185,28,28,0.6)' }}></div>
            <div className="hb" style={{ width: `${oExpiredPct}%`, background: 'var(--red)' }}></div>
          </div>
          <div className="health-legend">
            <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--green)' }}></div>{oHealthy} healthy</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--amber)' }}></div>{oLowStock} low stock</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: 'rgba(185,28,28,0.6)' }}></div>{oExpiring} expiring</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--red)' }}></div>{oExpired} expired</div>
          </div>
        </div>

        <div className="health-divider" />

        <div className="mini-stats">
          <div className="mini-stat"><div className="mini-val" style={{ color: 'var(--green)' }}>{healthy}</div><div className="mini-lbl">healthy items</div></div>
          <div className="mini-stat"><div className="mini-val" style={{ color: 'var(--amber)' }}>{attentionCount}</div><div className="mini-lbl">need attention</div></div>
          <div className="mini-stat"><div className="mini-val" style={{ color: 'var(--red)' }}>{expiredCount}</div><div className="mini-lbl">expired — act now</div></div>
        </div>
      </div>
    </div>
  );
}
