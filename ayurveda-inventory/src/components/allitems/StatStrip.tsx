"use client";

type Props = {
  totalItems?: number
  capexCount?: number
  opexCount?: number
  activeAlerts?: number
  grnThisMonth?: number
}

export default function StatStrip({ totalItems = 0, capexCount = 0, opexCount = 0, activeAlerts = 0, grnThisMonth = 0 }: Props) {
  return (
    <div className="stat-strip">
      <div className="stat-cell">
        <div className="stat-val">{totalItems}</div>
        <div className="stat-lbl">Total items in system</div>
        <div className="tag-row">
          <span className="tag tag-blue">{capexCount} CAPEX</span>
          <span className="tag tag-green">{opexCount} OPEX</span>
        </div>
      </div>
      <div className="stat-sep" />
      <div className="stat-cell">
        <div className="stat-val" style={{ color: 'var(--red)' }}>{activeAlerts}</div>
        <div className="stat-lbl">Active alerts right now</div>
      </div>
      <div className="stat-sep" />
      <div className="stat-cell">
        <div className="stat-val" style={{ color: 'var(--green)' }}>{grnThisMonth}</div>
        <div className="stat-lbl">GRN entries this month</div>
      </div>
    </div>
  );
}
