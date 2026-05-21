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

  // Colors from the "Clinical Trust" image
  const colorDevices = "#29A073"; // Deep Teal
  const colorElectrical = "#C67D28"; // Earthy Orange
  const colorBg = "#F1F5F9"; 

  return (
    <div className="card donut-card-enhanced" style={{ padding: 0, backgroundColor: 'white', border: '1px solid var(--border)' }}>
      <style>{`
        .donut-card-enhanced .hbar-row {
          padding: 4px 8px;
          margin: -4px -8px;
          border-radius: 6px;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .donut-card-enhanced .hbar-row:hover {
          background: rgba(0,0,0,0.03);
          transform: translateX(4px);
        }
        .donut-card-enhanced .hbar-fill {
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 4px;
        }
        .donut-card-enhanced .hbar-track {
          border-radius: 4px;
        }
        .donut-card-enhanced .leg-sq,
        .donut-card-enhanced .legend-sq {
          border-radius: 4px;
        }
        .premium-box {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
      `}</style>
      <div className="card-head" style={{ borderBottom: '1px solid #F1F5F9', padding: '16px 20px' }}>
        <span className="card-title" style={{ fontSize: '15px', color: '#0F172A' }}>Asset Breakdown</span>
        <a className="view-link" href="#" style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }} onClick={(e) => { e.preventDefault(); try { sessionStorage.setItem('registryDeepLink', JSON.stringify({ category: 'CAPEX' })); window.dispatchEvent(new CustomEvent('open-registry')); } catch (err){} }}>
          View registry →
        </a>
      </div>
      <div className="card-body" style={{ flexDirection: 'row', gap: 32, alignItems: 'stretch', padding: '24px 20px' }}>
        
        {/* Left Side: Premium Donut Box */}
        <div className="premium-box" style={{ flexShrink: 0, width: 220 }}>
          <div style={{ position: 'relative', width: 120, height: 120 }}>
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r={radius} fill="none" stroke={colorBg} strokeWidth="14"/>
              <circle cx="60" cy="60" r={radius} fill="none" stroke={colorDevices} strokeWidth="14" strokeDasharray={`${devicesArc} ${circumference}`} strokeDashoffset={0} strokeLinecap="butt"/>
              <circle cx="60" cy="60" r={radius} fill="none" stroke={colorElectrical} strokeWidth="14" strokeDasharray={`${electricalArc} ${circumference}`} strokeDashoffset={-devicesArc} strokeLinecap="butt"/>
            </svg>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '26px', fontWeight: 600, color: '#0F172A', lineHeight: 1, fontFamily: 'var(--sans)' }}>{total}</span>
              <span style={{ fontSize: '10px', fontWeight: 500, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>Assets</span>
            </div>
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontWeight: 500 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: colorDevices }}></span> Medical
              </span>
              <span style={{ fontWeight: 600, color: '#0F172A' }}>{devices} <span style={{ color: '#94A3B8', fontWeight: 400, marginLeft: 2 }}>({pct(devices)}%)</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontWeight: 500 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: colorElectrical }}></span> Electrical
              </span>
              <span style={{ fontWeight: 600, color: '#0F172A' }}>{electrical} <span style={{ color: '#94A3B8', fontWeight: 400, marginLeft: 2 }}>({pct(electrical)}%)</span></span>
            </div>
          </div>
        </div>

        {/* Right Side: Elegant Minimalist Bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="hbar-list" style={{ gap: 12 }}>
            {groups.map((g, idx) => {
              const isMedical = idx < 3;
              const color = isMedical ? colorDevices : colorElectrical;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column' }}>
                  {idx === 0 && (
                    <div style={{ marginBottom: 6, fontSize: '11px', fontWeight: 700, color: colorDevices, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Medical Devices
                    </div>
                  )}
                  {idx === 3 && (
                    <div style={{ marginTop: 12, marginBottom: 6, fontSize: '11px', fontWeight: 700, color: colorElectrical, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Electrical
                    </div>
                  )}
                  <div className="hbar-row" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }}></span>
                        {g.label}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: 'var(--sans)' }}>{g.count}</span>
                    </div>
                    <div className="hbar-track" style={{ height: 6, width: '100%', background: '#F1F5F9' }}>
                      <div className="hbar-fill" style={{ width: `${g.pct}%`, height: '100%', background: color }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
