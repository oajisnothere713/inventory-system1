"use client";

import { useEffect, useState } from 'react';

type WastagePayload = {
  totalQty?: number;
  totalValue?: number;
  writtenOff?: number;
  rows?: (string | number)[][];
  ytdValue?: number;
  trendPct?: number | null;
  selectedMonth?: string;
};

export default function WastageCard() {
  const [data, setData] = useState<WastagePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7))

  const monthTabs = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setMonth(date.getMonth() - index)
    const value = date.toISOString().slice(0, 7)
    const label = date.toLocaleString('en-IN', { month: 'short', year: 'numeric' })
    return { value, label }
  }).reverse()

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetch(`/api/opex/wastage?month=${selectedMonth}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((payload: WastagePayload) => {
        if (!mounted) return
        setData(payload)
      })
      .catch(() => {
        if (!mounted) return
        setData({ totalQty: 0, totalValue: 0, writtenOff: 0, rows: [], ytdValue: 0, trendPct: null })
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [selectedMonth])

  const totalQty = data?.totalQty ?? 0
  const totalValue = data?.totalValue ?? 0
  const writtenOff = data?.writtenOff ?? 0
  const rows = data?.rows ?? []
  const ytdValue = data?.ytdValue ?? 0
  const trendPct = data?.trendPct ?? null

  const trendLabel = (() => {
    if (trendPct === null) return ytdValue > 0 ? 'No prior-year baseline' : 'No YTD wastage vs last year'
    if (trendPct === 0) return 'Same as last year (YTD)'
    const arrow = trendPct > 0 ? '↑' : '↓'
    return `${arrow} ${Math.abs(trendPct)}% vs last year (YTD)`
  })()

  const trendColor = trendPct === null ? 'var(--text-dim)' : trendPct > 0 ? 'var(--red)' : 'var(--green)'

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Stock wastage — expiry</span>
        <a className="view-link">View report →</a>
      </div>
      <div className="card-body" style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 8 }}>
          Expired OPEX stock still on hand — by expiry month
        </div>
        <div className="sum-pills">
          <div className="s-pill">
            <div className="s-pill-val">{loading ? '…' : totalQty}</div>
            <div className="s-pill-lbl">items expired</div>
          </div>
          <div className="s-pill">
            <div className="s-pill-val">{loading ? '…' : `₹${Math.round(totalValue).toLocaleString('en-IN')}`}</div>
            <div className="s-pill-lbl">est. value at risk</div>
          </div>
        </div>
        {writtenOff > 0 ? (
          <div style={{ fontSize: 10, color: 'var(--text-dim)', margin: '6px 0 8px' }}>
            Logged write-off this month: ₹{Math.round(writtenOff).toLocaleString('en-IN')}
          </div>
        ) : null}
        <div className="month-tabs">
          {monthTabs.map((month) => (
            <button
              key={month.value}
              type="button"
              className={`mtab${selectedMonth === month.value ? ' active' : ''}`}
              onClick={() => setSelectedMonth(month.value)}
            >
              {month.label}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="foot-txt" style={{ padding: '10px 0', textAlign: 'center' }}>Loading wastage…</div>
        ) : rows.length === 0 ? (
          <div className="foot-txt" style={{ padding: '10px 0', textAlign: 'center' }}>
            No expired OPEX stock for this month — nothing to write off.
          </div>
        ) : (
          <div className="wastage-list">
            {rows.map((r, i) => (
              <div className="w-row" key={i}>
                <div className="w-top">
                  <span className="w-name">{r[0]}</span>
                  <span className="w-qty">{r[1]}</span>
                  <span className="w-val">{r[2]}</span>
                </div>
                <div className="w-track">
                  <div className="w-fill" style={{ width: `${r[3]}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card-foot">
        <span className="foot-txt">
          YTD at risk &nbsp;<strong>₹{Math.round(ytdValue).toLocaleString('en-IN')}</strong>
        </span>
        <span className="foot-txt" style={{ color: trendColor }}>{trendLabel}</span>
      </div>
    </div>
  );
}
