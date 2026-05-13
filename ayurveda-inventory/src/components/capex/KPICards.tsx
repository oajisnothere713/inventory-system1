"use client";

type Props = { total: number; devices: number; amcDue: number }

export default function KPICards({ total, devices, amcDue }: Props){
  return (
    <>
      <div className="kpi-card g"><div className="kpi-num green">{total}</div><div className="kpi-lbl">Total CAPEX items</div><div className="kpi-sub">registered in system</div></div>
      <div className="kpi-card b"><div className="kpi-num blue">{devices}</div><div className="kpi-lbl">Medical devices</div><div className="kpi-sub">BP monitors, thermometers…</div></div>
      <div className="kpi-card r"><div className="kpi-num red">{amcDue}</div><div className="kpi-lbl">AMC renewals due</div><div className="kpi-sub">within 60 days — action needed</div></div>
    </>
  );
}
