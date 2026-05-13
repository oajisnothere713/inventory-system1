"use client";

export default function KPICards() {
  return (
    <>
      <div className="kpi-card r" style={{ animationDelay: '.06s' }}>
        <div className="kpi-num red">7</div>
        <div className="kpi-lbl">Expiring in 30 days</div>
        <div className="kpi-sub">urgent action needed</div>
      </div>
      <div className="kpi-card a" style={{ animationDelay: '.10s' }}>
        <div className="kpi-num amber">12</div>
        <div className="kpi-lbl">Low stock items</div>
        <div className="kpi-sub">below minimum level</div>
      </div>
      <div className="kpi-card n" style={{ animationDelay: '.14s' }}>
        <div className="kpi-num" style={{ color: 'var(--text)' }}>23</div>
        <div className="kpi-lbl">GRN this month</div>
        <div className="kpi-sub">61 issues this month</div>
      </div>
    </>
  );
}
