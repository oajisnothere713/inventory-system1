"use client";

import { useEffect, useRef } from 'react';

type Props = { buckets?: { lt30:number; lt60:number; lt90:number; gt90:number; expired:number }, total?: number }

export default function ExpiryPipelineCard({ buckets, total = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let chartInstance: any = null;
    const load = async () => {
      if (typeof window === 'undefined') return;
      // load Chart.js if not present
      if (!(window as any).Chart) {
        await new Promise((res) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
          s.async = true;
          s.onload = res;
          document.body.appendChild(s);
        });
      }
      try {
        const Chart = (window as any).Chart;
        if (canvasRef.current) {
          chartInstance = new Chart(canvasRef.current as HTMLCanvasElement, {
            type: 'bar',
            data: { labels: ['< 30 days', '< 60 days', '< 90 days', '> 90 days'], datasets: [{ data: [(buckets?.lt30 ?? 0), (buckets?.lt60 ?? 0), (buckets?.lt90 ?? 0), (buckets?.gt90 ?? 0)], backgroundColor: ['#B91C1C', '#92400E', '#78600A', '#1A6B3C'], borderRadius: 4, borderSkipped: false, barPercentage: 0.6, categoryPercentage: 0.7 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } }
          });
        }
      } catch (e) {
        // ignore
      }
    };
    load();

    return () => {
      try { if (chartInstance) chartInstance.destroy(); } catch(e){}
    };
  }, []);

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Expiry pipeline</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="aleg">
            <div className="aleg-item"><div className="aleg-sq" style={{ background: '#B91C1C' }}></div>Critical &lt;30d</div>
            <div className="aleg-item"><div className="aleg-sq" style={{ background: '#92400E' }}></div>Urgent &lt;60d</div>
            <div className="aleg-item"><div className="aleg-sq" style={{ background: '#78600A' }}></div>Monitor &lt;90d</div>
            <div className="aleg-item"><div className="aleg-sq" style={{ background: '#1A6B3C' }}></div>Healthy</div>
          </div>
          <a className="view-link" href="#" onClick={(e) => { e.preventDefault(); try { sessionStorage.setItem('registryDeepLink', JSON.stringify({ category: 'OPEX', status: 'expiring', bannerMsg: '← From Dashboard → Expiring in 30 days' })); window.dispatchEvent(new CustomEvent('open-registry')); } catch (err){} }}>
            View all →
          </a>
        </div>
      </div>
      <div className="card-body">
        <div className="chart-with-summary">
          <div className="chart-col">
            <div className="chart-wrap" style={{ height: 155 }}>
              <canvas ref={canvasRef} />
            </div>
          </div>
          <div className="summary-col">
            <div><div className="sum-lbl">Total items</div><div className="sum-num">{total}</div></div>
            <div className="vdivider" />
            <div><div className="sum-lbl">Already expired</div><div className="sum-num-sm" style={{ color: 'var(--red)' }}>{buckets?.expired ?? 0} items</div></div>
            <div className="vdivider" />
            <div><div className="sum-lbl">Critical this month</div><div className="sum-num-sm" style={{ color: 'var(--amber)' }}>{buckets?.lt30 ?? 0} items</div></div>
            <div className="vdivider" />
            <div><div className="sum-lbl">Healthy</div><div className="sum-num-sm" style={{ color: 'var(--green)' }}>{buckets?.gt90 ?? 0} items</div></div>
          </div>
        </div>
      </div>
      <div className="card-foot">
        <span className="foot-txt">Expiring &lt;30d &nbsp;<strong style={{ color: 'var(--red)' }}>{buckets?.lt30 ?? 0}</strong></span>
        <span className="foot-txt">Expiring &lt;60d &nbsp;<strong style={{ color: 'var(--amber)' }}>{buckets?.lt60 ?? 0}</strong></span>
        <span className="foot-txt">Expiring &lt;90d &nbsp;<strong style={{ color: 'var(--yellow)' }}>{buckets?.lt90 ?? 0}</strong></span>
      </div>
    </div>
  );
}
