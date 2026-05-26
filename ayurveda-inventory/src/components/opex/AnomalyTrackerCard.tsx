"use client";

import { useEffect, useRef, useState } from 'react';

const PRODUCTS = [
  {name:'Ashwagandha',color:'#185FA5',data:[820,950,880,1820,900,970],unit:'g',note:'Feb usage (1,820g) was 2× the avg (902g). Possible bulk dispensing or data entry error — verify with Pharmacy.'},
  {name:'Brahmi Tail',color:'#1A6B3C',data:[320,290,350,410,700,360],unit:'ml',note:'Mar usage (700ml) was 1.8× the avg (405ml). Spike may be linked to Panchakarma season — confirm with department.'},
  {name:'Triphala',color:'#92400E',data:[210,240,190,260,220,250],unit:'g',note:null},
  {name:'Neem Tail',color:'#78600A',data:[140,160,120,180,150,130],unit:'ml',note:null},
  {name:'Haritaki',color:'#3d5a6c',data:[95,110,80,130,340,90],unit:'g',note:'Mar usage (340g) was 2.6× the avg (141g). Unexpectedly high — check if stock was bulk issued or misrecorded.'}
];

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - (5 - i));
  return d.toLocaleString('en-US', { month: 'short' });
});
const FACTOR = 1.5;

type Product = { name: string; color?: string; data: number[]; unit?: string; note?: string | null }

function avg(arr:number[]){return Math.round(arr.reduce((a,b)=>a+b,0)/arr.length)}
function isAnomaly(v:number,a:number){return v>a*FACTOR}

export default function AnomalyTrackerCard(){
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(0);
  const noteRef = useRef<HTMLDivElement | null>(null);
  const footLeftRef = useRef<HTMLSpanElement | null>(null);
  const footRightRef = useRef<HTMLSpanElement | null>(null);
  const chartRef = useRef<any>(null);
  const [products, setProducts] = useState<Product[]>([])

  useEffect(()=>{
    let mounted = true;
    const loadAndRender = async () => {
      if (typeof window === 'undefined') return;
      if (!(window as any).Chart) {
        await new Promise(res=>{
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
          s.async = true; s.onload = res; document.body.appendChild(s);
        });
      }
      if (!mounted) return;
      // fetch consumption data and render
      try {
        const resp = await fetch('/api/opex/consumption')
        if (resp.ok) {
          const data = await resp.json()
          const prods: Product[] = (data || []).map((p:any, idx:number) => ({ name: p.name, color: p.color || ['#185FA5','#1A6B3C','#92400E','#78600A','#3d5a6c','#B91C1C'][idx%6], data: (p.data||[]).map((n:any)=>Number(n||0)), unit: p.unit || '', note: p.note || null }))
          if (mounted) setProducts(prods)
          if (mounted) render(prods[active] || PRODUCTS[active])
          return
        }
      } catch(e){}
      // fallback
      render(PRODUCTS[active]);
    };
    loadAndRender();
    return ()=>{ mounted=false; try{ if(chartRef.current) chartRef.current.destroy(); }catch(e){} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function render(p:any){
    const a = avg(p.data);
    const anomalyMonths = p.data
      .map((v:number, idx:number) => (isAnomaly(v, a) ? `${MONTHS[idx]} (${v} ${p.unit})` : null))
      .filter(Boolean) as string[];
    const hasAnomaly = anomalyMonths.length > 0;
    const TT = {backgroundColor:'#fff',borderColor:'#dce8de',borderWidth:1,titleColor:'#0d1f12',bodyColor:'#3d6148',padding:10,cornerRadius:8};

    if (noteRef.current){
      if (hasAnomaly) {
        noteRef.current.style.display='block';
        noteRef.current.style.cssText='display:block;background:#fef9ec;border:1px solid rgba(146,64,14,0.2);color:#5c3a00;border-radius:var(--r-md);padding:7px 10px;font-size:11px;margin-top:8px';
        const detail = p.note ? String(p.note) : `Spikes found in ${anomalyMonths.join(', ')} against 6-month average (${a} ${p.unit}/month).`;
        noteRef.current.innerHTML = `<strong>⚠ Anomaly detected:</strong> ${detail}`;
      } else {
        noteRef.current.style.display='block';
        noteRef.current.style.cssText='display:block;background:#e6f2eb;border:1px solid rgba(26,107,60,0.2);color:#1A6B3C;border-radius:var(--r-md);padding:7px 10px;font-size:11px;margin-top:8px';
        noteRef.current.innerHTML = `<strong>✓ No anomalies</strong> — consumption within normal range all 6 months.`;
      }
    }
    if (footLeftRef.current) footLeftRef.current.innerHTML = `6-month avg &nbsp;<strong>${a} ${p.unit}/month</strong>`;
    if (footRightRef.current) footRightRef.current.innerHTML = hasAnomaly ? `<span style="color:var(--red)">⚠ Spike detected — action needed</span>` : `<span style="color:var(--green)">✓ Normal consumption pattern</span>`;

    const ctx = canvasRef.current as HTMLCanvasElement;
    if (!ctx) return;
    const Chart = (window as any).Chart;
    try{ if (chartRef.current) chartRef.current.destroy(); }catch(e){}
    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: MONTHS,
        datasets: [
          {
            label: 'Monthly usage',
            data: p.data,
            backgroundColor: p.data.map((v:number)=>isAnomaly(v,a)?'rgba(185,28,28,0.7)':`${p.color}99`),
            borderColor: p.data.map((v:number)=>isAnomaly(v,a)?'#B91C1C':p.color),
            borderWidth: 1.5,
            borderRadius: {topLeft:4,topRight:4,bottomLeft:0,bottomRight:0},
            borderSkipped: false,
            barPercentage: 0.55,
            categoryPercentage: 0.7,
            order: 2,
          },
          {
            label: '6-month average',
            data: Array(6).fill(a),
            type: 'line',
            borderColor: '#1A6B3C',
            borderWidth: 2,
            borderDash: [5,4],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
            order: 1,
          },
          {
            label: 'Anomaly',
            data: p.data.map((v:number)=>isAnomaly(v,a)?v:null),
            type: 'scatter',
            pointBackgroundColor: '#B91C1C',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            order: 0,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TT,
            callbacks: {
              label: (ctx2:any) => {
                if (ctx2.dataset.label === 'Anomaly' && ctx2.parsed.y !== null)
                  return ` ⚠ Spike: ${ctx2.parsed.y} ${p.unit} (avg: ${a})`;
                if (ctx2.dataset.label === '6-month average')
                  return ` Avg: ${a} ${p.unit}`;
                return ` Usage: ${ctx2.parsed.y} ${p.unit}`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: '#7a9982', font: { size: 11 } } },
          y: { beginAtZero: false, grid: { color: '#dce8de', lineWidth: 0.5 }, border: { display: false }, ticks: { color: '#7a9982', font: { size: 10, family: "'DM Mono',monospace" } } }
        }
      }
    });
  }

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Consumption anomaly tracker — top 5 products (last 6 months)</span>
        <a className="view-link">View report →</a>
      </div>
      <div className="card-body" style={{ padding: '12px 15px 10px' }}>
        <div className="product-tabs">
          {(products.length ? products : PRODUCTS).map((p,i)=> (
            <div key={p.name} className={`ptab ${i===active? 'active':''}`} style={i===active?{background:p.color,color:'#fff'}:{}} onClick={()=>setActive(i)}>{p.name}</div>
          ))}
        </div>
        <div className="aleg">
          <div className="aleg-item"><div className="aleg-sq" style={{ background: '#185FA5', opacity: 0.65 }}></div>Monthly usage</div>
          <div className="aleg-item"><div className="aleg-line"></div>6-month avg</div>
          <div className="aleg-item"><div className="aleg-dot"></div>Anomaly spike</div>
        </div>
        <div className="chart-wrap" style={{ height: 165 }}>
          <canvas ref={canvasRef} />
        </div>
        <div ref={noteRef as any} id="anomalyNote" style={{ marginTop: 8, padding: '7px 10px', borderRadius: 'var(--r-md)', fontSize: 11, display: 'none' }} />
      </div>
      <div className="card-foot">
        <span className="foot-txt" ref={footLeftRef as any}></span>
        <span className="foot-txt" ref={footRightRef as any}></span>
      </div>
    </div>
  );
}
