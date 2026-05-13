"use client";

import SectionHead from "./opex/SectionHead";
import DonutKpiCard from "./opex/DonutKpiCard";
import KPICards from "./opex/KPICards";
import ExpiryPipelineCard from "./opex/ExpiryPipelineCard";
import LowStockCard from "./opex/LowStockCard";
import AnomalyTrackerCard from "./opex/AnomalyTrackerCard";
import WastageCard from "./opex/WastageCard";
import { useEffect, useState } from 'react';

type OpexItem = {
  id: string;
  name: string;
  sub: string | null;
  subcat: string | null;
  stock: number;
  min: number;
  max: number | null;
  expiry: string | null;
  dept: string | null;
  supplier: string | null;
  createdAt: string | null;
}

export default function OpexDashboard(){
  const [items, setItems] = useState<OpexItem[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState<number | null>(null)

  useEffect(()=>{
    let mounted = true
    fetch('/api/opex')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((data) => { if (!mounted) return; setItems(Array.isArray(data) ? data : []); setLoading(false); setNow(Date.now()); })
      .catch(()=>{ if (!mounted) return; setItems([]); setLoading(false); setNow(Date.now()); })
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

  // low stock rows: pick items where stock <= min (or lowest pct)
  const lowRows = items
    .map(i => ({ name: i.name, avail: i.stock, min: i.min, pct: i.min ? Math.round((i.stock / i.min) * 100) : 100 }))
    .sort((a,b)=> (a.pct - b.pct))
    .slice(0,6)
    .map(r => [r.name, `${r.avail}/${r.min}`, `${Math.max(0, Math.min(100, 100 - r.pct))}%`, r.pct <= 20 ? 'pill-red' : r.pct <= 50 ? 'pill-amber' : 'pill-green'] as string[])

  return (
    <>
      <SectionHead badge="OPEX" title="Operating stock — medicines & consumables" sub="Regular purchase · Expiry tracked · Stock replenished" />

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', marginBottom: 12 }}>
        <DonutKpiCard total={total} medicines={medicines} consumables={consumables} />
        <KPICards />
      </div>

      <div className="grid g-2" style={{ marginBottom: 12 }}>
        <ExpiryPipelineCard buckets={buckets} total={total} />
        <LowStockCard rows={lowRows} />
      </div>

      <div className="grid g-2-1" style={{ marginBottom: 0 }}>
        <AnomalyTrackerCard />
        <WastageCard />
      </div>
    </>
  )
}
