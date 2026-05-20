"use client";

type Props = { total: number; devices: number; electrical: number; groups: Array<{label:string,count:number, pct:number}> }

export default function DonutCard({ total, devices, electrical, groups }: Props){
  const pct = (n:number) => total ? Math.round((n/total)*100) : 0
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const devicesPct = total ? devices / total : 0.6
  const electricalPct = total ? electrical / total : 0.4
  const devicesArc = circumference * devicesPct
  const electricalArc = circumference * electricalPct
  const devicesOffset = circumference * 0.25
  const electricalOffset = -(devicesArc - devicesOffset)

  return (
    <div className="card">
      <div className="card-head"><span className="card-title">Asset breakdown</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="legend-item"><div className="legend-sq" style={{ background: 'var(--blue)' }}></div>Medical device</div>
            <div className="legend-item"><div className="legend-sq" style={{ background: 'var(--green)' }}></div>Electrical</div>
          </div>
          <a className="view-link" href="#" onClick={(e) => { e.preventDefault(); try { sessionStorage.setItem('registryDeepLink', JSON.stringify({ category: 'CAPEX' })); window.dispatchEvent(new CustomEvent('open-registry')); } catch (err){} }}>
            View all →
          </a>
        </div>
      </div>
      <div className="card-body" style={{ flexDirection: 'row', gap: 24, alignItems: 'center', padding: '18px 20px' }}>
        <div style={{ flexShrink: 0 }}>
          <div className="donut-row" style={{ marginBottom: 0, gap: 20 }}>
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
              <circle cx="60" cy="60" r={radius} fill="none" stroke="#e8eee9" strokeWidth="14"/>
              <circle cx="60" cy="60" r={radius} fill="none" stroke="#185FA5" strokeWidth="14" strokeDasharray={`${devicesArc} ${circumference - devicesArc}`} strokeDashoffset={`${devicesOffset}`}/>
              <circle cx="60" cy="60" r={radius} fill="none" stroke="#1A6B3C" strokeWidth="14" strokeDasharray={`${electricalArc} ${circumference - electricalArc}`} strokeDashoffset={`${electricalOffset}`}/>
              <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight={500} fill="#0d1f12" fontFamily="'DM Mono',monospace">{total}</text>
              <text x="60" y="72" textAnchor="middle" fontSize={10} fill="#7a9982" fontFamily="'Sora',sans-serif">total</text>
            </svg>
            <div className="leg-block" style={{ gap: 12 }}>
              <div className="leg-item"><div className="leg-sq" style={{ background: '#185FA5' }}></div>Medical devices <span className="leg-val">{devices}<span className="leg-pct">{pct(devices)}%</span></span></div>
              <div className="leg-item"><div className="leg-sq" style={{ background: '#1A6B3C' }}></div>Electrical <span className="leg-val">{electrical}<span className="leg-pct">{pct(electrical)}%</span></span></div>
            </div>
          </div>
        </div>

        <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', flexShrink: 0 }}></div>

        <div style={{ flex: 1 }}>
          <div className="hbar-list" style={{ gap: 12 }}>
            {groups.map((g, idx) => (
              <div key={idx}>
                {idx === 3 && <div className="section-divider" style={{ margin: '14px 0' }}></div>}
                <div className="hbar-row" style={{ gap: 4 }}>
                  <div className="hbar-top"><span className="hbar-name"><span className="hbar-dot" style={{ background: idx < 3 ? 'var(--blue)' : 'var(--green)' }}></span>{g.label}</span><span className="hbar-val">{g.count}</span></div>
                  <div className="hbar-track" style={{ height: 6 }}><div className="hbar-fill" style={{ width: `${g.pct}%`, background: idx < 3 ? 'var(--blue)' : 'var(--green)' }}></div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
