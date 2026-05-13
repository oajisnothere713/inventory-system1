"use client";

import BarChart from '../charts/BarChart';

type Props = { createdCounts: { month: string; devices: number; electrical: number; total: number }[], totalThisYear: number, peakMonth: string, devicesAdded: number, electricalAdded: number, monthlyAvg: number }

export default function NewCapexChartCard({ createdCounts, totalThisYear, peakMonth, devicesAdded, electricalAdded, monthlyAvg }: Props){
  return (
    <div className="card">
      <div className="card-head"><span className="card-title">New CAPEX items added — last 6 months</span><a className="view-link">View GRN report →</a></div>
      <div className="card-body">
        <div className="chart-with-summary">
          <div className="chart-col">
            <div className="chart-legend">
              <div className="legend-item"><div className="legend-sq" style={{ background: 'var(--blue)' }}></div>Medical devices</div>
              <div className="legend-item"><div className="legend-sq" style={{ background: 'var(--green)' }}></div>Electrical</div>
            </div>
            <div className="chart-wrap">
              <BarChart data={{
                labels: createdCounts.map(c => c.month),
                datasets: [
                  { label: 'Medical devices', data: createdCounts.map(c => c.devices), backgroundColor: '#185FA5' },
                  { label: 'Electrical', data: createdCounts.map(c => c.electrical), backgroundColor: '#1A6B3C' },
                ]
              }} />
            </div>
          </div>

          <div className="summary-col">
            <div className="sum-block"><div className="sum-lbl">Total this year</div><div className="sum-num">{totalThisYear}</div><div className="sum-sub">↑ 18% vs last year</div></div>
            <div style={{ height: 1, background: 'var(--border)' }}></div>
            <div className="sum-block"><div className="sum-lbl">Peak month</div><div className="sum-num-sm">{peakMonth} &nbsp;<span style={{ color: 'var(--green)' }}>{createdCounts.reduce((m, c) => c.total > m.total ? c : m, createdCounts[0] || { month: '', total: 0 }).total} items</span></div></div>
            <div style={{ height: 1, background: 'var(--border)' }}></div>
            <div className="sum-block"><div className="sum-lbl">Devices added</div><div className="sum-num-sm" style={{ color: 'var(--blue)' }}>{devicesAdded} items</div></div>
            <div style={{ height: 1, background: 'var(--border)' }}></div>
            <div className="sum-block"><div className="sum-lbl">Electrical added</div><div className="sum-num-sm" style={{ color: 'var(--green)' }}>{electricalAdded} items</div></div>
            <div style={{ height: 1, background: 'var(--border)' }}></div>
            <div className="sum-block"><div className="sum-lbl">Monthly average</div><div className="sum-num-sm">{monthlyAvg} items</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
