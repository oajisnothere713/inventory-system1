"use client";

type Props = {
  expiring30Days: number;
  lowStock: number;
  grnThisMonth: number;
  issuesThisMonth?: number;
}

export default function KPICards({ expiring30Days, lowStock, grnThisMonth, issuesThisMonth = 0 }: Props) {
  return (
    <>
      <div className="kpi-card r" style={{ animationDelay: '.06s' }}>
        <div className="kpi-num red">{expiring30Days}</div>
        <div className="kpi-lbl">Expiring in 30 days</div>
        <div className="kpi-sub">urgent action needed</div>
      </div>

      <div className="kpi-card a" style={{ animationDelay: '.10s' }}>
        <div className="kpi-num amber">{lowStock}</div>
        <div className="kpi-lbl">Low stock items</div>
        <div className="kpi-sub">below minimum level</div>
      </div>

      <div className="kpi-card n" style={{ animationDelay: '.14s' }}>
        <div className="kpi-num" style={{ color: 'var(--text)' }}>{grnThisMonth}</div>
        <div className="kpi-lbl">GRN this month</div>
        <div className="kpi-sub">{issuesThisMonth} issues this month</div>
      </div>
    </>
  );
}
