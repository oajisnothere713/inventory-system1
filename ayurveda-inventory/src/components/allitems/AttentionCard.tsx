"use client";

type ExpiringBatch = { batchId: number; batchNumber?: string; expiryDate?: string; quantityAvailable?: string; item?: { itemId?: number; itemName?: string } }
type LowStockItem = { itemId: number; itemName?: string; totalAvailable: number }
type AmcItem = { amcId: number; amcNumber?: string; contractEnd?: string; item?: { itemId?: number; itemName?: string } }

type Props = {
  activeAlerts?: number
  expiring?: ExpiringBatch[]
  lowStock?: LowStockItem[]
  amcDue?: AmcItem[]
}

export default function AttentionCard({ activeAlerts = 0, expiring = [], lowStock = [], amcDue = [] }: Props) {
  return (
    <div className="attention-card">
      <div className="attention-head">
        <div className="attention-title">Needs attention right now</div>
        <div className="attention-sub">Items requiring action — across both CAPEX and OPEX</div>
      </div>
      <div className="attention-grid">
        <div className="attn-col">
          <div className="attn-big" style={{ color: 'var(--red)' }}>{expiring.length}</div>
          <div className="attn-lbl">Expiring in 30 days</div>
          <div className="attn-list">
            {expiring.slice(0,3).map((b) => (
              <div className="attn-row" key={b.batchId}><div className="dot dot-red" /> <span className="attn-name">{b.item?.itemName ?? b.batchNumber}</span> <span className="pill pill-red">{b.expiryDate ? Math.max(0, Math.ceil((new Date(b.expiryDate).getTime() - Date.now())/86400000)) + 'd' : ''}</span></div>
            ))}
            {expiring.length > 3 && <div className="attn-more">+{expiring.length - 3} more → OPEX tab</div>}
          </div>
        </div>

        <div className="attn-col">
          <div className="attn-big" style={{ color: 'var(--amber)' }}>{lowStock.length}</div>
          <div className="attn-lbl">Low stock — reorder needed</div>
          <div className="attn-list">
            {lowStock.slice(0,3).map((it) => (
              <div className="attn-row" key={it.itemId}><div className="dot dot-amber" /> <span className="attn-name">{it.itemName}</span> <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-dim)', marginLeft: 'auto' }}>{Math.round(it.totalAvailable)}</span></div>
            ))}
            {lowStock.length > 3 && <div className="attn-more">+{lowStock.length - 3} more → OPEX tab</div>}
          </div>
        </div>

        <div className="attn-col">
          <div className="attn-big" style={{ color: 'var(--blue)' }}>{amcDue.length}</div>
          <div className="attn-lbl">AMC renewals due (60 days)</div>
          <div className="attn-list">
            {amcDue.slice(0,3).map((a) => (
              <div className="attn-row" key={a.amcId}><div className="dot dot-blue" /> <span className="attn-name">{a.item?.itemName}</span> <span className="pill pill-red">{a.contractEnd ? Math.max(0, Math.ceil((new Date(a.contractEnd).getTime() - Date.now())/86400000)) + 'd' : ''}</span></div>
            ))}
            {amcDue.length > 3 && <div className="attn-more">+{amcDue.length - 3} more → CAPEX tab</div>}
          </div>
        </div>

        <div className="attn-col danger-bg">
          <div className="attn-big" style={{ color: 'var(--red)' }}>{/* expired placeholder */}0</div>
          <div className="attn-lbl">Already expired — dispose now</div>
          <div className="danger-notice">Dispose per AYUSH guidelines immediately. Log disposal in system.</div>
        </div>
      </div>
      <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-dim)' }}>Active alerts: {activeAlerts}</div>
    </div>
  );
}
