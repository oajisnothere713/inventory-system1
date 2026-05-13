"use client";

type Props = {
  totalItems?: number
  capexCount?: number
  opexCount?: number
}

export default function InventoryHealthPanel({ totalItems = 0, capexCount = 0, opexCount = 0 }: Props) {
  const healthy = Math.round((totalItems || 0) * 0.7)
  const needAttention = Math.max(0, (totalItems || 0) - healthy - 2)
  const expired = 2

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
            <div className="hb" style={{ width: '70%', background: 'var(--green)' }}></div>
            <div className="hb" style={{ width: '26%', background: 'var(--amber)' }}></div>
            <div className="hb" style={{ width: '4%', background: 'var(--red)' }}></div>
          </div>
        </div>

        <div className="health-block">
          <div className="health-label-row">
            <div className="health-label-left"><div className="cat-dot" style={{ background: 'var(--green)' }}></div><span>OPEX — {opexCount} items</span></div>
            <span className="health-status" style={{ color: 'var(--amber)' }}>Attention needed</span>
          </div>
          <div className="health-bar">
            <div className="hb" style={{ width: '75%', background: 'var(--green)' }}></div>
            <div className="hb" style={{ width: '7%', background: 'var(--amber)' }}></div>
            <div className="hb" style={{ width: '13%', background: 'rgba(185,28,28,0.6)' }}></div>
            <div className="hb" style={{ width: '5%', background: 'var(--red)' }}></div>
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
