"use client";

import { useEffect, useMemo, useState } from "react";
import { InsightAlert, Severity, useRegistryInsights } from "./registryInsights";

type Filter = "all" | Severity | "snoozed" | "resolved";

const GROUPS: { key: Severity; label: string; sub: string }[] = [
  { key: "critical", label: "Critical", sub: "Expired, AMC expired, stock critical" },
  { key: "high", label: "High", sub: "Expiring, low stock, AMC due" },
  { key: "medium", label: "Medium", sub: "Upcoming expiry and AMC upcoming" },
  { key: "low", label: "Low", sub: "Dead stock and review items" },
];

export default function AlertsDashboard() {
  const { alerts, loading, error } = useRegistryInsights();
  const [filter, setFilter] = useState<Filter>("all");
  const [resolved, setResolved] = useState<Set<number>>(new Set());
  const [snoozed, setSnoozed] = useState<Set<number>>(new Set());
  const [showResolved, setShowResolved] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<Severity>>(new Set());

  useEffect(() => {
    try {
      const storedResolved = localStorage.getItem('ayur_resolved_alerts');
      if (storedResolved) setResolved(new Set(JSON.parse(storedResolved)));
      const storedSnoozed = localStorage.getItem('ayur_snoozed_alerts');
      if (storedSnoozed) setSnoozed(new Set(JSON.parse(storedSnoozed)));
    } catch(e){}
  }, []);

  const resolveAlert = (id: number) => {
    setResolved(prev => {
      const next = new Set(prev).add(id);
      localStorage.setItem('ayur_resolved_alerts', JSON.stringify([...next]));
      return next;
    });
  };

  const snoozeAlert = (id: number) => {
    setSnoozed(prev => {
      const next = new Set(prev).add(id);
      localStorage.setItem('ayur_snoozed_alerts', JSON.stringify([...next]));
      return next;
    });
  };

  const visibleAlerts = useMemo(
    () =>
      alerts.filter((alert) => {
        const isResolved = resolved.has(alert.id);
        const isSnoozed = snoozed.has(alert.id);
        if (filter === "resolved") return isResolved;
        if (filter === "snoozed") return isSnoozed;
        if (isResolved || isSnoozed) return false;
        if (filter !== "all" && alert.severity !== filter) return false;
        return true;
      }),
    [alerts, filter, resolved, snoozed]
  );

  const counts = useMemo(() => {
    return GROUPS.reduce<Record<Severity, number>>((acc, group) => {
      acc[group.key] = alerts.filter((alert) => alert.severity === group.key && !resolved.has(alert.id) && !snoozed.has(alert.id)).length;
      return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0 });
  }, [alerts, resolved, snoozed]);

  const markAllRead = () => {
    const next = new Set(alerts.map((alert) => alert.id));
    setResolved(next);
    localStorage.setItem('ayur_resolved_alerts', JSON.stringify([...next]));
  };
  
  const toggleGroup = (groupKey: Severity) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };
  const resolvedAlerts = alerts.filter((alert) => resolved.has(alert.id));
  const snoozedAlerts = alerts.filter((alert) => snoozed.has(alert.id));

  return (
    <div className="insights-page">
      <div className="insights-filterbar">
        <span className="insights-filter-label">Show</span>
        {[
          ["all", "All alerts", ""],
          ["critical", "Critical", "red"],
          ["high", "High", "amber"],
          ["medium", "Medium", "blue"],
          ["low", "Low", ""],
          ["snoozed", "Snoozed", "amber"],
          ["resolved", "Resolved", "green"],
        ].map(([key, label, tone]) => (
          <button key={key} className={`insights-chip ${tone} ${filter === key ? "active" : ""}`} onClick={() => setFilter(key as Filter)}>
            {label}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ins-dim)" }}>
          Source: <strong style={{ color: "var(--ins-text)" }}>Item Registry</strong>
        </span>
        <button className="insights-btn" onClick={markAllRead}>Mark all read</button>
      </div>

      <div className="insights-scroll">
        {loading ? <div className="insights-card alert-empty">Loading registry alerts...</div> : null}
        {error ? <div className="insights-card alert-empty">{error}</div> : null}

        <div className="alert-summary">
          {GROUPS.map((group) => (
            <div 
              className={`alert-tile ${group.key} ${filter === group.key ? "active" : ""}`} 
              key={group.key}
              onClick={() => setFilter(filter === group.key ? "all" : group.key)}
              style={{ cursor: "pointer" }}
            >
              <div className="alert-tile-num">{counts[group.key]}</div>
              <div className="alert-tile-label">{group.label}</div>
              <div className="alert-tile-sub">{group.sub}</div>
            </div>
          ))}
        </div>

        {!loading && !alerts.length ? (
          <div className="insights-card alert-empty">No active registry-driven alerts. Item Registry is currently healthy.</div>
        ) : null}

        {filter !== "snoozed" && filter !== "resolved" && GROUPS.map((group) => {
          const rows = visibleAlerts.filter((alert) => alert.severity === group.key);
          if (!rows.length && filter !== "all" && filter !== group.key) return null;
          return (
            <section className="alert-section" key={group.key}>
              <div 
                className="alert-section-head" 
                onClick={() => toggleGroup(group.key)} 
                style={{ cursor: "pointer", userSelect: "none" }}
              >
                <span className={`alert-dot ${group.key}`} />
                <div className="alert-section-title">{group.label}</div>
                <div className="alert-section-count">
                  {rows.length} alert{rows.length === 1 ? "" : "s"}
                  <span style={{ opacity: 0.6, marginLeft: 8, fontSize: "0.85em", fontWeight: "normal" }}>
                    {collapsedGroups.has(group.key) ? "(Click to expand)" : "(Click to collapse)"}
                  </span>
                </div>
              </div>
              {!collapsedGroups.has(group.key) && (
                <div className="insights-card">
                  {rows.length ? rows.map((alert) => (
                    <AlertRow
                      alert={alert}
                      key={alert.id}
                      onSnooze={() => snoozeAlert(alert.id)}
                      onResolve={() => resolveAlert(alert.id)}
                    />
                  )) : <div className="alert-empty">No {group.label.toLowerCase()} alerts.</div>}
                </div>
              )}
            </section>
          );
        })}

        {filter === "snoozed" ? (
          <section className="alert-section" style={{ marginTop: 12, marginBottom: 12 }}>
            <div className="alert-section-head">
              <span className="alert-dot amber" />
              <div className="alert-section-title">Snoozed</div>
              <div className="alert-section-count">{snoozedAlerts.length} alerts</div>
            </div>
            <div className="insights-card">
              {snoozedAlerts.length ? snoozedAlerts.map((alert) => (
                <div className="alert-row snoozed" key={alert.id}>
                  <div className={`alert-icon ${alert.severity}`}>{alert.icon}</div>
                  <div className="alert-body">
                    <div className="alert-title">{alert.title}</div>
                    <div className="alert-detail">{alert.detail}</div>
                    <div className="alert-meta">
                      <span className="insights-pill amber">Snoozed</span>
                    </div>
                  </div>
                  <div className="alert-actions">
                    <button 
                      className="insights-btn" 
                      onClick={() => {
                        setSnoozed(prev => {
                          const next = new Set(prev);
                          next.delete(alert.id);
                          localStorage.setItem('ayur_snoozed_alerts', JSON.stringify([...next]));
                          return next;
                        });
                      }}
                    >
                      Unsnooze
                    </button>
                  </div>
                </div>
              )) : <div className="alert-empty">No snoozed alerts.</div>}
            </div>
          </section>
        ) : null}

        <button className="insights-btn" onClick={() => setShowResolved((current) => !current)}>
          {showResolved ? "Hide" : "Show"} {resolvedAlerts.length} resolved alerts
        </button>

        {showResolved || filter === "resolved" ? (
          <section className="alert-section" style={{ marginTop: 12 }}>
            <div className="alert-section-head">
              <span className="alert-dot low" />
              <div className="alert-section-title">Resolved</div>
              <div className="alert-section-count">{resolvedAlerts.length} alerts</div>
            </div>
            <div className="insights-card">
              {resolvedAlerts.length ? resolvedAlerts.map((alert) => (
                <div className="alert-row resolved" key={alert.id}>
                  <div className={`alert-icon ${alert.severity}`}>{alert.icon}</div>
                  <div className="alert-body">
                    <div className="alert-title">{alert.title}</div>
                    <div className="alert-detail">{alert.detail}</div>
                    <div className="alert-meta">
                      <span className="insights-pill green">Resolved</span>
                      <span style={{ fontSize: 10.5, color: "var(--ins-dim)" }}>by Ramesh Kumar</span>
                    </div>
                  </div>
                </div>
              )) : <div className="alert-empty">No resolved alerts in this session.</div>}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function AlertRow({ alert, onSnooze, onResolve }: { alert: InsightAlert; onSnooze: () => void; onResolve: () => void }) {
  return (
    <div className="alert-row">
      <div className={`alert-icon ${alert.severity}`}>{alert.icon}</div>
      <div className="alert-body">
        <div className="alert-title">{alert.title}</div>
        <div className="alert-detail">{alert.detail}</div>
        <div className="alert-meta">
          <span className={`insights-pill ${toneFor(alert.severity)}`}>{alert.type}</span>
          <span style={{ fontSize: 10.5, color: "var(--ins-dim)" }}>ID: <strong style={{ color: "var(--ins-text)" }}>{alert.item}</strong></span>
          {alert.action ? <span className="alert-action-text">{alert.action}</span> : null}
        </div>
      </div>
      <div className="alert-actions">
        <button className="insights-btn" onClick={onSnooze}>Snooze 7d</button>
        <button className="insights-btn primary" onClick={onResolve}>Resolve</button>
      </div>
    </div>
  );
}

function toneFor(severity: Severity) {
  if (severity === "critical") return "red";
  if (severity === "high") return "amber";
  if (severity === "medium") return "blue";
  return "";
}
