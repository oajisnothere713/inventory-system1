"use client";

type Grn = {
  grnId: number
  grnNumber: string
  grnDate: Date | string
  batchNumber?: string
  quantityReceived?: any
  item?: { itemName?: string }
}

type ActivityEvent = {
  id: string | number
  type: 'grn' | 'alert' | 'issue' | 'amc'
  title: string
  detail: string
  time: string
  pillLabel?: string
  pillColor?: 'pill-green' | 'pill-red' | 'pill-amber' | 'pill-blue' | 'pill-slate'
}

type Props = {
  recentGrns?: Grn[]
  events?: ActivityEvent[]
}

function fmtDate(d?: Date | string) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  return dt.toLocaleDateString()
}

function timeAgo(d?: Date | string) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  const diff = Date.now() - dt.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

const iconMap: Record<string, { icon: string; color: string }> = {
  grn: { icon: '↓', color: 'green' },
  alert: { icon: '⚑', color: 'red' },
  issue: { icon: '↑', color: 'green' },
  amc: { icon: '📋', color: 'blue' },
}

export default function ActivityPanel({ recentGrns = [], events }: Props) {
  // If explicit events are provided, use them; otherwise derive from recentGrns
  const activityItems: ActivityEvent[] = events ?? recentGrns.map((g) => ({
    id: g.grnId,
    type: 'grn' as const,
    title: `GRN recorded — ${g.item?.itemName ?? g.grnNumber}`,
    detail: `${g.batchNumber ?? ''} · ${fmtDate(g.grnDate)}`,
    time: timeAgo(g.grnDate),
    pillLabel: g.quantityReceived?.toString?.() ?? '',
    pillColor: 'pill-green' as const,
  }))

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Recent activity</span>
        <a className="view-link">View full log →</a>
      </div>
      <div className="panel-body" style={{ padding: '0 16px' }}>
        <div className="activity-list">
          {activityItems.length === 0 && <div style={{ padding: 12, color: 'var(--text-dim)' }}>No recent activity</div>}
          {activityItems.map((evt) => {
            const { icon, color } = iconMap[evt.type] ?? iconMap.grn
            return (
              <div className="act-row" key={evt.id}>
                <div className={`act-icon ${color}`}>{icon}</div>
                <div className="act-content">
                  <div className="act-title">{evt.title} {evt.pillLabel && <span className={`pill ${evt.pillColor ?? 'pill-green'}`} style={{ marginLeft: 4 }}>{evt.pillLabel}</span>}</div>
                  <div className="act-detail">{evt.detail}</div>
                </div>
                <div className="act-time">{evt.time}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
