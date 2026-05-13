"use client";

type Props = { total: number; medicines: number; consumables: number };

export default function DonutKpiCard({ total, medicines, consumables }: Props) {
  return (
    <div className="card">
      <div className="card-head"><span className="card-title">Total OPEX items</span>
        <a className="view-link" href="#" onClick={(e) => { e.preventDefault(); try { sessionStorage.setItem('registryDeepLink', JSON.stringify({ category: 'OPEX' })); window.dispatchEvent(new CustomEvent('open-registry')); } catch (err){} }}>
          View all →
        </a>
      </div>
      <div className="card-body" style={{ justifyContent: 'center', padding: '12px 14px' }}>
        <div className="donut-row">
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ flexShrink: 0 }}>
            <circle cx="40" cy="40" r="29" fill="none" stroke="#e8eee9" strokeWidth={11} />
            <circle cx="40" cy="40" r="29" fill="none" stroke="#1A6B3C" strokeWidth={11}
              strokeDasharray="153.9 28.3" strokeDashoffset="45.6" />
            <circle cx="40" cy="40" r="29" fill="none" stroke="#185FA5" strokeWidth={11}
              strokeDasharray="28.3 153.9" strokeDashoffset="-108.3" />
            <text x="40" y="36" textAnchor="middle" fontSize={14} fontWeight={500}
              fill="#0d1f12" fontFamily="'DM Mono',monospace">{total}</text>
            <text x="40" y="48" textAnchor="middle" fontSize={8}
              fill="#7a9982" fontFamily="'Sora',sans-serif">total</text>
          </svg>
          <div className="leg-block">
            <div className="leg-item"><div className="leg-sq" style={{ background: '#1A6B3C' }}></div>Medicines<span className="leg-val">{medicines}<span className="leg-pct">{Math.round(medicines / total * 100)}%</span></span></div>
            <div className="leg-item"><div className="leg-sq" style={{ background: '#185FA5' }}></div>Consumables<span className="leg-val">{consumables}<span className="leg-pct">{Math.round(consumables / total * 100)}%</span></span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
