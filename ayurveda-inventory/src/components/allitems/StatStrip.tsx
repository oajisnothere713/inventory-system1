"use client";

export type AlertBreakdown = {
  total: number;
  lowStock: number;
  expiring: number;
  expired: number;
  amcDue: number;
  amcExpired: number;
};

type Props = {
  totalItems?: number;
  capexCount?: number;
  opexCount?: number;
  activeAlerts?: number;
  alertBreakdown?: AlertBreakdown;
  grnThisMonth?: number;
  grnCapexThisMonth?: number;
  grnOpexThisMonth?: number;
  issuesThisMonth?: number;
  issuesCapexThisMonth?: number;
  issuesOpexThisMonth?: number;
};

const emptyBreakdown = (): AlertBreakdown => ({
  total: 0,
  lowStock: 0,
  expiring: 0,
  expired: 0,
  amcDue: 0,
  amcExpired: 0,
});

export default function StatStrip({
  totalItems = 0,
  capexCount = 0,
  opexCount = 0,
  activeAlerts = 0,
  alertBreakdown,
  grnThisMonth = 0,
  grnCapexThisMonth = 0,
  grnOpexThisMonth = 0,
  issuesThisMonth = 0,
  issuesCapexThisMonth = 0,
  issuesOpexThisMonth = 0,
}: Props) {
  const breakdown = alertBreakdown ?? emptyBreakdown();
  const partsSum =
    breakdown.lowStock
    + breakdown.expiring
    + breakdown.expired
    + breakdown.amcDue
    + breakdown.amcExpired;
  const alertTotal = breakdown.total > 0 ? breakdown.total : (activeAlerts || partsSum);

  const alertTags: { key: string; count: number; label: string; className: string }[] = [
    { key: "expiring", count: breakdown.expiring, label: "expiring", className: "tag tag-red" },
    { key: "expired", count: breakdown.expired, label: "expired", className: "tag tag-orange" },
    { key: "lowStock", count: breakdown.lowStock, label: "low stock", className: "tag tag-amber" },
    { key: "amcDue", count: breakdown.amcDue, label: "AMC due", className: "tag tag-blue" },
    { key: "amcExpired", count: breakdown.amcExpired, label: "AMC expired", className: "tag tag-slate" },
  ];

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
        <div className="stat-val" style={{ color: "var(--red)" }}>{alertTotal}</div>
        <div className="stat-lbl">Active alerts right now</div>
        <div className="tag-row">
          {alertTags.map((tag) => (
            <span className={tag.className} key={tag.key}>
              {tag.count} {tag.label}
            </span>
          ))}
        </div>
      </div>
      <div className="stat-sep" />
      <div className="stat-cell">
        <div className="stat-val" style={{ color: "var(--green)" }}>{grnThisMonth}</div>
        <div className="stat-lbl">GRN entries this month</div>
        <div className="tag-row">
          <span className="tag tag-blue">{issuesCapexThisMonth} CAPEX issues</span>
          <span className="tag tag-green">{issuesOpexThisMonth} OPEX issues</span>
        </div>
      </div>
    </div>
  );
}
