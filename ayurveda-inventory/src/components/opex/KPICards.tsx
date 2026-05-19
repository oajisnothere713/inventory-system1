"use client";

type Props = {
  total: number;
  expiring30Days: number;
  lowStock: number;
}

export default function KPICards({ total, expiring30Days, lowStock }: Props) {
  return (
    <>
      <div className="kpi-card g" style={{ animationDelay: '.06s' }}>
        <div className="kpi-num green">{total}</div>
        <div className="kpi-lbl">Total OPEX items</div>
        <div className="kpi-sub">registry-backed items</div>
      </div>

      <div className="kpi-card r" style={{ animationDelay: '.10s' }}>
        <div className="kpi-num red">{expiring30Days}</div>
        <div className="kpi-lbl">Expiring in 30 days</div>
        <div className="kpi-sub">urgent action needed</div>
      </div>

      <div className="kpi-card a" style={{ animationDelay: '.14s' }}>
        <div className="kpi-num amber">{lowStock}</div>
        <div className="kpi-lbl">Low stock items</div>
        <div className="kpi-sub">below minimum level</div>
      </div>
    </>
  );
}
