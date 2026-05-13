"use client";

type Props = { rows?: string[][] }

export default function LowStockCard({ rows }: Props) {
  const fallback = rows ?? [
    ['Cotton Bandages','210/1,000 rolls','21%','pill-red'],
    ['Surgical Gloves (M)','30/200 pairs','15%','pill-red'],
    ['Triphala Churna','480/2,000 g','24%','pill-amber'],
    ['Neem Tail','320/500 ml','64%','pill-amber'],
    ['Brahmi Tail','380/1,000 ml','38%','pill-amber'],
    ['Ashwagandha Churna','4,200/1,000 g','100%','pill-green']
  ];

  return (
    <div className="card">
      <div className="card-head"><span className="card-title">Low stock — needs reorder</span>
        <a className="view-link" href="#" onClick={(e) => { e.preventDefault(); try { sessionStorage.setItem('registryDeepLink', JSON.stringify({ category: 'OPEX', status: 'low_stock', bannerMsg: '← From Dashboard → Low stock items' })); window.dispatchEvent(new CustomEvent('open-registry')); } catch (err){} }}>
          View all →
        </a>
      </div>
      <div className="card-body" style={{ justifyContent: 'center' }}>
        <div className="stock-list">
          {fallback.map((r, i) => (
            <div className="stock-row" key={i}>
              <div className="stock-top"><span className="stock-name">{r[0]}</span><span className="stock-nums">{r[1]}</span><span className={`pill ${r[3]}`} style={{ marginLeft: 6 }}>{r[2]==='100%'?'Healthy':(i<2?'Critical':'Low')}</span></div>
              <div className="stock-track"><div className="stock-fill" style={{ width: r[2], background: r[3] === 'pill-red' ? 'var(--red)' : r[3]==='pill-amber' ? 'var(--amber)' : 'var(--green)' }}></div></div>
            </div>
          ))}
        </div>
      </div>
      <div className="card-foot">
        <span className="foot-txt">Critical &nbsp;<strong style={{ color: 'var(--red)' }}>{fallback.slice(0,2).length}</strong></span>
        <span className="foot-txt">Low &nbsp;<strong style={{ color: 'var(--amber)' }}>{Math.max(0, fallback.length-3)}</strong></span>
        <span className="foot-txt">Healthy &nbsp;<strong style={{ color: 'var(--green)' }}>{fallback.filter(r=>r[2]==='100%').length}</strong></span>
      </div>
    </div>
  );
}
