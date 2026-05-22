"use client";

type Props = { total: number; medicines: number; consumables: number };

export default function DonutKpiCard({ total, medicines, consumables }: Props) {
  const circumference = 2 * Math.PI * 29 // ~182.2
  const medPct = total ? medicines / total : 0.85
  const conPct = total ? consumables / total : 0.15
  const medArc = circumference * medPct
  const conArc = circumference * conPct
  const medOffset = circumference * 0.25
  const conOffset = -(medArc - medOffset)

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
            <circle cx="40" cy="40" r="29" fill="none" stroke="#f69a45" strokeWidth={11}
              strokeDasharray={`${medArc} ${circumference - medArc}`} strokeDashoffset={`${medOffset}`} />
            <circle cx="40" cy="40" r="29" fill="none" stroke="#12ae34" strokeWidth={11}
              strokeDasharray={`${conArc} ${circumference - conArc}`} strokeDashoffset={`${conOffset}`} />
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
