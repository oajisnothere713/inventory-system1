"use client";

type Row = { id: string; name: string; loc?: string | null; vendor?: string | null; days?: number | null }
type Props = { rows: Row[]; total: number; expired: number }

export default function AMCRenewalsCard({ rows, total, expired }: Props){
  const pillFor = (d?: number | null) => {
    if (d == null) return 'pill-pill'
    if (d < 0) return 'pill pill-red'
    if (d < 60) return 'pill pill-amber'
    return 'pill pill-green'
  }

  return (
    <div className="card">
      <div className="card-head"><span className="card-title">AMC renewals due</span>
        <a className="view-link" href="#" onClick={(e) => { e.preventDefault(); try { sessionStorage.setItem('registryDeepLink', JSON.stringify({ category: 'CAPEX', status: 'amc_due', bannerMsg: '← From Dashboard → AMC renewals due' })); window.dispatchEvent(new CustomEvent('open-registry')); } catch (err){} }}>
          View report →
        </a>
      </div>
      <div className="card-body">
        <table className="amc-table">
          <thead>
            <tr><th>Item &amp; location</th><th>Vendor</th><th style={{ textAlign: 'right' }}>Due in</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="item-name">{r.name}</div>
                  <div className="item-loc">{r.loc || ''}</div>
                  <div className="mini-bar-wrap"><div className="mini-bar-track"><div className="mini-bar-fill" style={{ width: `${Math.min(100, r.days ? Math.max(0, 100 - r.days) : 0)}%`, background: r.days && r.days < 30 ? '#E24B4A' : r.days && r.days < 60 ? '#EF9F27' : 'var(--green)' }}></div></div></div>
                </td>
                <td><div className="vendor-txt">{r.vendor || ''}</div></td>
                <td style={{ textAlign: 'right' }}><span className={pillFor(r.days)}>{r.days == null ? '-' : `${r.days} days`}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card-foot"><span className="foot-txt">Total AMC contracts &nbsp;<strong>{total}</strong></span><span className="foot-txt" style={{ color: 'var(--red)' }}>Already expired &nbsp;<strong>{expired}</strong></span></div>
    </div>
  );
}
