"use client";

import { useEffect, useState } from 'react';
import StatStrip from './allitems/StatStrip';
import AttentionCard from './allitems/AttentionCard';
import InventoryHealthPanel from './allitems/InventoryHealthPanel';
import ActivityPanel from './allitems/ActivityPanel';

type DashboardPayload = {
  totalItems: number
  capexCount: number
  opexCount: number
  activeAlerts: number
  grnThisMonth: number
  recentGrns: {
    grnId: number
    grnNumber: string
    grnDate: Date | string
    batchNumber?: string
    quantityReceived?: number | string
    item?: { itemName?: string }
  }[]
  expiring?: { batchId: number; batchNumber?: string; expiryDate?: string; quantityAvailable?: string; item?: { itemId?: number; itemName?: string } }[]
  lowStock?: { itemId: number; itemName?: string; totalAvailable: number }[]
  amcDue?: { amcId: number; amcNumber?: string; contractEnd?: string; item?: { itemId?: number; itemName?: string } }[]
}

export default function AllItemsDashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null)

  useEffect(() => {
    let mounted = true
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((json) => {
        if (mounted) setData(json)
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  return (
    // show skeleton while loading
    data == null ? (
      <AllItemsDashboardSkeleton />
    ) : (
      <div className="all-items-root">
        <StatStrip totalItems={data.totalItems ?? 0} capexCount={data.capexCount ?? 0} opexCount={data.opexCount ?? 0} activeAlerts={data.activeAlerts ?? 0} grnThisMonth={data.grnThisMonth ?? 0} />
        <AttentionCard activeAlerts={data.activeAlerts ?? 0} expiring={data.expiring ?? []} lowStock={data.lowStock ?? []} amcDue={data.amcDue ?? []} />

        <div className="bottom-row">
          <InventoryHealthPanel totalItems={data.totalItems ?? 0} capexCount={data.capexCount ?? 0} opexCount={data.opexCount ?? 0} />
          <ActivityPanel recentGrns={data.recentGrns ?? []} />
        </div>

        {/* styles moved to src/components/allitems/allitemsdashboard.css and imported in globals.css */}
      </div>
    )
  )
}

// Skeleton: lightweight placeholders while dashboard data loads
export function AllItemsDashboardSkeleton() {
  return (
    <div className="all-items-root space-y-4">
      {/* stat strip skeleton */}
      <div className="stat-strip">
        <div className="stat-cell">
          <div className="bg-gray-200/60 animate-pulse h-8 w-24 mx-auto rounded" />
          <div className="mt-3 bg-gray-200/60 animate-pulse h-4 w-32 mx-auto rounded" />
        </div>
        <div className="stat-sep" />
        <div className="stat-cell">
          <div className="bg-gray-200/60 animate-pulse h-8 w-24 mx-auto rounded" />
          <div className="mt-3 bg-gray-200/60 animate-pulse h-4 w-32 mx-auto rounded" />
        </div>
        <div className="stat-sep" />
        <div className="stat-cell">
          <div className="bg-gray-200/60 animate-pulse h-8 w-24 mx-auto rounded" />
          <div className="mt-3 bg-gray-200/60 animate-pulse h-4 w-32 mx-auto rounded" />
        </div>
      </div>

      {/* attention card skeleton */}
      <div className="attention-card">
        <div className="attention-head">
          <div className="bg-gray-200/60 animate-pulse h-4 w-40 rounded" />
          <div className="bg-gray-200/60 animate-pulse h-4 w-20 rounded" />
        </div>
        <div className="attention-grid p-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="attn-col" key={i}>
              <div className="bg-gray-200/60 animate-pulse h-6 w-20 rounded mb-3" />
              <div className="attn-list">
                <div className="bg-gray-200/60 animate-pulse h-3 w-full rounded" />
                <div className="bg-gray-200/60 animate-pulse h-3 w-5/6 rounded mt-2" />
                <div className="bg-gray-200/60 animate-pulse h-3 w-3/4 rounded mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* bottom panels skeleton (mirrors .bottom-row) */}
      <div className="bottom-row">
        <div className="panel">
          <div className="panel-head">
            <div className="bg-gray-200/60 animate-pulse h-4 w-32 rounded" />
            <div className="bg-gray-200/60 animate-pulse h-4 w-16 rounded" />
          </div>
          <div className="panel-body">
            <div className="bg-gray-200/60 animate-pulse h-6 w-1/3 rounded mb-4" />
            <div className="mini-stats">
              <div className="mini-stat"><div className="bg-gray-200/60 animate-pulse h-6 w-16 rounded mx-auto" /></div>
              <div className="mini-stat"><div className="bg-gray-200/60 animate-pulse h-6 w-16 rounded mx-auto" /></div>
              <div className="mini-stat"><div className="bg-gray-200/60 animate-pulse h-6 w-16 rounded mx-auto" /></div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="bg-gray-200/60 animate-pulse h-4 w-32 rounded" />
            <div className="bg-gray-200/60 animate-pulse h-4 w-16 rounded" />
          </div>
          <div className="panel-body">
            {Array.from({ length: 4 }).map((_, i) => (
              <div className="act-row" key={i}>
                <div className="act-icon bg-gray-200/60 animate-pulse" style={{ width: 30, height: 30, borderRadius: 9999 }} />
                <div style={{ flex: 1 }}>
                  <div className="bg-gray-200/60 animate-pulse h-4 w-3/4 rounded mb-2" />
                  <div className="bg-gray-200/60 animate-pulse h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
