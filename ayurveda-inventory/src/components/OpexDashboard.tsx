"use client";

import SectionHead from "./opex/SectionHead";
import DonutKpiCard from "./opex/DonutKpiCard";
import KPICards from "./opex/KPICards";
import ExpiryPipelineCard from "./opex/ExpiryPipelineCard";
import LowStockCard from "./opex/LowStockCard";
import AnomalyTrackerCard from "./opex/AnomalyTrackerCard";
import WastageCard from "./opex/WastageCard";
import { useEffect, useState } from 'react';
import { isOpexLowStock, lowStockCeiling } from './registry/utils';

type OpexItem = {
  id: string;
  name: string;
  sub: string | null;
  subcat: string | null;
  stock: number;
  min: number;
  max: number | null;
  unit: string;
  expiry: string | null;
  dept: string | null;
  supplier: string | null;
  createdAt: string | null;
}

export default function OpexDashboard(){
  const [items, setItems] = useState<OpexItem[]>([])
  const [metrics, setMetrics] = useState<{ grnThisMonth: number; issuesThisMonth: number }>({ grnThisMonth: 0, issuesThisMonth: 0 })
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState<number | null>(null)

  useEffect(()=>{
    let mounted = true
    fetch('/api/opex')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((data) => {
        if (!mounted) return;
        if (Array.isArray(data)) {
          // Backward compatibility for older API response shape.
          setItems(data);
          setMetrics({ grnThisMonth: 0, issuesThisMonth: 0 });
        } else {
          const payload = (data ?? {}) as { items?: OpexItem[]; metrics?: { grnThisMonth?: number; issuesThisMonth?: number } }
          setItems(Array.isArray(payload.items) ? payload.items : []);
          setMetrics({
            grnThisMonth: Number(payload.metrics?.grnThisMonth ?? 0),
            issuesThisMonth: Number(payload.metrics?.issuesThisMonth ?? 0),
          });
        }
        setLoading(false);
        setNow(Date.now());
      })
      .catch(()=>{ if (!mounted) return; setItems([]); setMetrics({ grnThisMonth: 0, issuesThisMonth: 0 }); setLoading(false); setNow(Date.now()); })
    return ()=>{ mounted=false }
  }, [])

  if (loading) {
    return (
      <>
        <SectionHead badge="OPEX" title="Operating stock — medicines & consumables" sub="Loading…" />
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', marginBottom: 12 }}>
          <div className="card skeleton" style={{ height: 84 }} />
          <div className="card skeleton" style={{ height: 84 }} />
          <div className="card skeleton" style={{ height: 84 }} />
          <div className="card skeleton" style={{ height: 84 }} />
        </div>
        <div className="grid g-2" style={{ marginBottom: 12 }}>
          <div className="card skeleton" style={{ height: 220 }} />
          <div className="card skeleton" style={{ height: 220 }} />
        </div>
        <div className="grid g-2-1" style={{ marginBottom: 0 }}>
          <div className="card skeleton" style={{ height: 220 }} />
          <div className="card skeleton" style={{ height: 220 }} />
        </div>
      </>
    )
  }

  const total = items.length
  const medicines = items.filter(i => i.subcat === 'medicines').length
  const consumables = items.filter(i => i.subcat === 'consumables').length
  const expiring30Days = items.filter(i => {
    if (!now || !i.expiry) return false
    const diff = Math.round((new Date(i.expiry).getTime() - now) / (1000 * 60 * 60 * 24))
    return diff >= 0 && diff <= 30
  }).length
  const lowStock = items.filter((i) => isOpexLowStock(i.stock, i.min)).length
  const grnThisMonth = metrics.grnThisMonth
  const issuesThisMonth = metrics.issuesThisMonth

  // expiry buckets based on earliest expiry date
  const days = (d?: string | null) => {
    if (now == null) return null
    return d ? Math.round((new Date(d).getTime() - now)/(1000*60*60*24)) : null
  }
  const buckets = { lt30:0, lt60:0, lt90:0, gt90:0, expired:0 }
  items.forEach(it => {
    const dd = days(it.expiry)
    if (dd == null) { buckets.gt90++ }
    else if (dd < 0) buckets.expired++
    else if (dd < 30) buckets.lt30++
    else if (dd < 60) buckets.lt60++
    else if (dd < 90) buckets.lt90++
    else buckets.gt90++
  })

  // Low stock: at or within 20% above minimum (matches registry isLowStock)
  const fmt = (n: number) => n.toLocaleString()
  const lowRows = items
    .filter((i) => isOpexLowStock(i.stock, i.min))
    .map((i) => {
      const ceiling = lowStockCeiling(i.min)
      const pct = Math.round((i.stock / ceiling) * 100)
      const critical = i.stock <= Math.max(1, i.min * 0.25)
      return {
        name: i.name,
        avail: i.stock,
        min: i.min,
        ceiling,
        unit: i.unit || '',
        pct,
        pill: critical ? 'pill-red' : 'pill-amber',
      }
    })
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 6)
    .map((r) => [
      r.name,
      `${fmt(r.avail)} / limit ${fmt(r.ceiling)} (min ${fmt(r.min)})${r.unit ? ` ${r.unit}` : ''}`.trim(),
      `${Math.min(100, r.pct)}%`,
      r.pill,
    ] as string[])

  return (
    <>
      <SectionHead badge="OPEX" title="Operating stock — medicines & consumables" sub="Regular purchase · Expiry tracked · Stock replenished" />

      {/* ROW 1: Donut + 3 KPIs */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', marginBottom: 12 }}>
        <DonutKpiCard total={total} medicines={medicines} consumables={consumables} />
        <KPICards expiring30Days={expiring30Days} lowStock={lowStock} grnThisMonth={grnThisMonth} issuesThisMonth={issuesThisMonth} />
      </div>

      {/* ROW 2: Expiry pipeline + Low stock */}
      <div className="grid g-2" style={{ marginBottom: 12 }}>
        <ExpiryPipelineCard buckets={buckets} total={total} />
        <LowStockCard rows={lowRows} />
      </div>

      {/* ROW 3: Anomaly tracker + Wastage */}
      <div className="grid g-2-1" style={{ marginBottom: 0 }}>
        <AnomalyTrackerCard />
        <WastageCard />
      </div>
    </>
  )
}
