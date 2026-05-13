"use client";

import SectionHead from './capex/SectionHead';
import DonutCard from './capex/DonutCard';
import KPICards from './capex/KPICards';
import AMCRenewalsCard from './capex/AMCRenewalsCard';
import NewCapexChartCard from './capex/NewCapexChartCard';
import { useEffect, useState } from 'react';

type CapexItem = {
  id: string;
  name: string;
  sub: string;
  subcat: string;
  createdAt: string | null;
  stock: number;
  expiry: string | null;
  batch: string | null;
  amc: string | null;
  amcExpiry: string | null;
  supplier: string | null;
  dept: string | null;
}

export default function CapexDashboard(){
  const [items, setItems] = useState<CapexItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    fetch('/api/capex')
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((data) => { if (!mounted) return; setItems(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { if (!mounted) return; setItems([]); setLoading(false) })
    return () => { mounted = false }
  }, [])
  if (loading) {
    return (
      <>
        <SectionHead badge="CAPEX" title="Capital assets — devices & electrical" sub="Loading…" />

        <div className="grid g-3" style={{ marginBottom: 12 }}>
          <div className="card skeleton" style={{ height: 84 }} />
          <div className="card skeleton" style={{ height: 84 }} />
          <div className="card skeleton" style={{ height: 84 }} />
        </div>

        <div className="grid g-2-1" style={{ marginBottom: 12 }}>
          <div className="card skeleton" style={{ height: 220 }} />
          <div className="card skeleton" style={{ height: 220 }} />
        </div>

        <div className="card skeleton" style={{ height: 180 }} />
      </>
    )
  }

  // Derived stats
  const total = items.length
  const devices = items.filter(i => i.subcat === 'devices').length
  const electrical = items.filter(i => i.subcat === 'electrical').length

  const now = new Date()
  const daysBetween = (d1?: string | null) => {
    if (!d1) return null
    const diff = Math.round((new Date(d1).getTime() - now.getTime()) / (1000*60*60*24))
    return diff
  }

  const amcRows = items
    .filter(i => i.amcExpiry)
    .map(i => ({ id: i.id, name: i.name, loc: i.dept, vendor: i.supplier, days: daysBetween(i.amcExpiry) }))
    .sort((a,b) => (a.days ?? 9999) - (b.days ?? 9999))

  const amcDue = amcRows.filter(r => r.days != null && r.days >=0 && r.days < 60).length
  const amcExpired = amcRows.filter(r => r.days != null && r.days < 0).length

  // groups: top name-prefix groups
  const nameKey = (s: string) => s.split(/\s|\-|–/)[0].slice(0,24)
  const groupsMap: Record<string, number> = {}
  items.forEach(i => { const k = nameKey(i.name || 'Other'); groupsMap[k] = (groupsMap[k]||0)+1 })
  const groups = Object.entries(groupsMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([label,count]) => ({ label, count, pct: total ? Math.round((count/total)*100) : 0 }))

  // last 6 months created counts
  const months: string[] = []
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth()-m, 1)
    months.push(d.toLocaleString('en-IN', { month: 'short', year: 'numeric' }))
  }
  const createdCounts = months.map((label, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5-idx), 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth()+1, 1)
    const monthItems = items.filter(i => i.createdAt && new Date(i.createdAt) >= start && new Date(i.createdAt) < end)
    const dev = monthItems.filter(i=>i.subcat === 'devices').length
    const elec = monthItems.filter(i=>i.subcat === 'electrical').length
    return { month: label, devices: dev, electrical: elec, total: dev+elec }
  })

  const totalThisYear = items.filter(i => i.createdAt && new Date(i.createdAt).getFullYear() === now.getFullYear()).length
  const devicesAdded = items.filter(i => i.createdAt && new Date(i.createdAt).getFullYear() === now.getFullYear() && i.subcat === 'devices').length
  const electricalAdded = items.filter(i => i.createdAt && new Date(i.createdAt).getFullYear() === now.getFullYear() && i.subcat === 'electrical').length
  const monthlyAvg = Math.round(createdCounts.reduce((s,c)=>s+c.total,0)/createdCounts.length * 10)/10
  const peak = createdCounts.reduce((p,c)=> c.total > p.total ? c : p, createdCounts[0] || { month: '', total: 0 })

  return (
    <>
      <SectionHead badge="CAPEX" title="Capital assets — devices & electrical" sub="Long-life items · AMC tracked · No expiry" />

      <div className="grid g-3" style={{ marginBottom: 12 }}>
        <KPICards total={total} devices={devices} amcDue={amcDue} />
      </div>

      <div className="grid g-2-1" style={{ marginBottom: 12 }}>
        <DonutCard total={total} devices={devices} electrical={electrical} groups={groups} />
        <AMCRenewalsCard rows={amcRows.slice(0,6)} total={amcRows.length} expired={amcExpired} />
      </div>

      <NewCapexChartCard createdCounts={createdCounts} totalThisYear={totalThisYear} peakMonth={peak.month} devicesAdded={devicesAdded} electricalAdded={electricalAdded} monthlyAvg={monthlyAvg} />
    </>
  );
}
