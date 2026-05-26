"use client";

type GroupData = {label:string,count:number, pct:number}
type Props = { total: number; devices: number; electrical: number; deviceGroups: GroupData[]; electricalGroups: GroupData[] }

export default function DonutCard({ total, devices, electrical, deviceGroups, electricalGroups }: Props){
  const pct = (n:number) => total ? Math.round((n/total)*100) : 0
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const devicesPct = total ? devices / total : 0.6
  const electricalPct = total ? electrical / total : 0.4
  const devicesArc = circumference * devicesPct
  const electricalArc = circumference * electricalPct
  const devicesOffset = circumference * 0.25
  const electricalOffset = -(devicesArc - devicesOffset)

  // Colors matched from screenshot
  const colorDevices = "#F59E0B"; // Orange
  const colorElectrical = "#10B981"; // Green
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
      <div className="card-head" style={{ borderBottom: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="card-title" style={{ fontSize: '15px', color: '#475569', fontWeight: 600 }}>Asset breakdown</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', color: '#475569', fontWeight: 500 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: colorDevices }}></span> Medical device
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', color: '#475569', fontWeight: 500 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: colorElectrical }}></span> Electrical
          </span>
          <a className="view-link" href="#" style={{ fontSize: '13px', fontWeight: 500, color: '#3B82F6', textDecoration: 'none', marginLeft: 8 }} onClick={(e) => { e.preventDefault(); try { sessionStorage.setItem('registryDeepLink', JSON.stringify({ category: 'CAPEX' })); window.dispatchEvent(new CustomEvent('open-registry')); } catch (err){} }}>
            View all →
          </a>
        </div>
      </div>
      <div className="card-body" style={{ flexDirection: 'row', gap: 32, alignItems: 'stretch', padding: '24px 20px' }}>
        
        {/* Left Side: Donut & Stats */}
        <div style={{ flexShrink: 0, width: 280, display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            <svg width="100" height="100" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r={radius} fill="none" stroke={colorBg} strokeWidth="16"/>
              <circle cx="60" cy="60" r={radius} fill="none" stroke={colorDevices} strokeWidth="16" strokeDasharray={`${devicesArc} ${circumference}`} strokeDashoffset={0} strokeLinecap="butt"/>
              <circle cx="60" cy="60" r={radius} fill="none" stroke={colorElectrical} strokeWidth="16" strokeDasharray={`${electricalArc} ${circumference}`} strokeDashoffset={-devicesArc} strokeLinecap="butt"/>
            </svg>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '20px', fontWeight: 600, color: '#0F172A', lineHeight: 1 }}>{total}</span>
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#94A3B8', marginTop: '2px' }}>total</span>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontWeight: 500 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: colorDevices }}></span> Medical devices
              </span>
              <span style={{ fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 4 }}>{devices} <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600 }}>{pct(devices)}%</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontWeight: 500 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: colorElectrical }}></span> Electrical
              </span>
              <span style={{ fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 4 }}>{electrical} <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600 }}>{pct(electrical)}%</span></span>
            </div>
          </div>
        </div>
        
        {/* Divider */}
        <div style={{ width: 1, background: '#E2E8F0', margin: '-24px 0' }}></div>

        {/* Right Side: Elegant Minimalist Bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="hbar-list" style={{ gap: 16 }}>

            {deviceGroups.map((g, idx) => (
              <div key={`dev-${idx}`} className="hbar-row" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: colorDevices }}></span>
                    {g.label}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: 'var(--sans)' }}>{g.count}</span>
                </div>
                <div className="hbar-track" style={{ height: 6, width: '100%', background: '#F1F5F9' }}>
                  <div className="hbar-fill" style={{ width: `${g.pct}%`, height: '100%', background: colorDevices }}></div>
                </div>
              </div>
            ))}

            {electricalGroups.length > 0 && deviceGroups.length > 0 && (
              <div style={{ height: 1, background: '#E2E8F0', margin: '4px 0' }}></div>
            )}

            {electricalGroups.map((g, idx) => (
              <div key={`elec-${idx}`} className="hbar-row" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: colorElectrical }}></span>
                    {g.label}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: 'var(--sans)' }}>{g.count}</span>
                </div>
                <div className="hbar-track" style={{ height: 6, width: '100%', background: '#F1F5F9' }}>
                  <div className="hbar-fill" style={{ width: `${g.pct}%`, height: '100%', background: colorElectrical }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
