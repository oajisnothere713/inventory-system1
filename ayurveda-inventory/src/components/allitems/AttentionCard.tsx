"use client";

type ExpiringBatch = { batchId: string | number; batchNumber?: string; expiryDate?: string; quantityAvailable?: string; item?: { itemId?: string | number; itemName?: string } }
type LowStockItem = { itemId: string | number; itemName?: string; totalAvailable: number; minStockLevel: number }
type AmcItem = { amcId: string | number; amcNumber?: string; contractEnd?: string; item?: { itemId?: string | number; itemName?: string } }
type ExpiredBatch = { batchId: string | number; batchNumber?: string; expiryDate?: string; quantityAvailable?: string; item?: { itemId?: string | number; itemName?: string } }

type Props = {
  expiring?: ExpiringBatch[]
  expiringCount?: number
  lowStock?: LowStockItem[]
  lowStockCount?: number
  amcDue?: AmcItem[]
  amcDueCount?: number
  expiredCount?: number
  expired?: ExpiredBatch[]
}

export default function AttentionCard({ 
  expiring = [], 
  expiringCount = 0,
  lowStock = [], 
  lowStockCount = 0,
  amcDue = [], 
  amcDueCount = 0,
  expiredCount = 0, 
  expired = [] 
}: Props) {
  return (
    <div className="attention-card">
      <div className="attention-head">
        <div className="attention-title">Needs attention right now</div>
        <div className="attention-sub">Items requiring action — across CAPEX and OPEX</div>
      </div>
      <div className="attention-grid">
        <div className="attn-col">
          <div className="attn-big" style={{ color: 'var(--red)' }}>{expiringCount}</div>
          <div className="attn-lbl">Expiring in 30 days</div>
          <div className="attn-list">
            {expiring.slice(0,5).map((b) => (
              <div className="attn-row" key={b.batchId}><div className="dot dot-red" /> <span className="attn-name">{b.item?.itemName ?? b.batchNumber}</span> <span className="pill pill-red">{b.expiryDate ? Math.max(0, Math.ceil((new Date(b.expiryDate).getTime() - Date.now())/86400000)) + 'd' : ''}</span></div>
            ))}
            {expiringCount > 5 && <a href="#" className="attn-more" onClick={(e) => { e.preventDefault(); try { sessionStorage.setItem('registryDeepLink', JSON.stringify({ category: 'OPEX', status: 'expiring', bannerMsg: '← From Dashboard → Expiring in 30 days' })); window.dispatchEvent(new CustomEvent('open-registry')); } catch(err){} }}>+{expiringCount - 5} more → OPEX tab</a>}
          </div>
        </div>

        <div className="attn-col">
          <div className="attn-big" style={{ color: 'var(--amber)' }}>{lowStockCount}</div>
          <div className="attn-lbl">Low stock — reorder needed</div>
          <div className="attn-list">
            {lowStock.slice(0,5).map((it) => (
              <div className="attn-row" key={it.itemId}><div className="dot dot-amber" /> <span className="attn-name">{it.itemName}</span> <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-dim)', marginLeft: 'auto' }}>{Math.round((it.totalAvailable / Math.max(1, it.minStockLevel)) * 100)}%</span></div>
            ))}
            {lowStockCount > 5 && <a href="#" className="attn-more" onClick={(e) => { e.preventDefault(); try { sessionStorage.setItem('registryDeepLink', JSON.stringify({ category: 'OPEX', status: 'low_stock', bannerMsg: '← From Dashboard → Low stock items' })); window.dispatchEvent(new CustomEvent('open-registry')); } catch(err){} }}>+{lowStockCount - 5} more → OPEX tab</a>}
          </div>
        </div>

        <div className="attn-col">
          <div className="attn-big" style={{ color: 'var(--blue)' }}>{amcDueCount}</div>
          <div className="attn-lbl">AMC renewals due (60 days)</div>
          <div className="attn-list">
            {amcDue.slice(0,5).map((a) => (
              <div className="attn-row" key={a.amcId}><div className="dot dot-blue" /> <span className="attn-name">{a.item?.itemName}</span> <span className="pill pill-red">{a.contractEnd ? Math.max(0, Math.ceil((new Date(a.contractEnd).getTime() - Date.now())/86400000)) + 'd' : ''}</span></div>
            ))}
            {amcDueCount > 5 && <a href="#" className="attn-more" onClick={(e) => { e.preventDefault(); try { sessionStorage.setItem('registryDeepLink', JSON.stringify({ category: 'CAPEX', status: 'amc_due', bannerMsg: '← From Dashboard → AMC renewals due' })); window.dispatchEvent(new CustomEvent('open-registry')); } catch(err){} }}>+{amcDueCount - 5} more → CAPEX tab</a>}
          </div>
        </div>

        <div className="attn-col danger-bg">
          <div className="attn-big" style={{ color: 'var(--red)' }}>{expiredCount}</div>
          <div className="attn-lbl">Already expired — dispose now</div>
          <div className="attn-list">
            {expired.slice(0,3).map((b) => {
              const daysAgo = b.expiryDate ? Math.abs(Math.floor((Date.now() - new Date(b.expiryDate).getTime()) / 86400000)) : null;
              return (
                <div className="attn-row" key={b.batchId}><div className="dot dot-red" /> <span className="attn-name">{b.item?.itemName ?? b.batchNumber}</span> <span className="pill pill-red">{daysAgo !== null ? `${daysAgo}d ago` : ''}</span></div>
              );
            })}
            {expiredCount > 3 && <a href="#" className="attn-more" onClick={(e) => { e.preventDefault(); try { sessionStorage.setItem('registryDeepLink', JSON.stringify({ status: 'expired', bannerMsg: '← From Dashboard → Already expired — dispose now' })); window.dispatchEvent(new CustomEvent('open-registry')); } catch(err){} }}>+{expiredCount - 3} more expired</a>}
          </div>
          {expiredCount > 0 && <div className="danger-notice">Dispose per AYUSH guidelines immediately. Log disposal in system.</div>}
        </div>
      </div>
    </div>
  );
}
