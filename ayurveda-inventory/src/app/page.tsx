"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import dynamic from 'next/dynamic';

const BarChart = dynamic(() => import('../components/charts/BarChart'), { ssr: false });
const OpexDashboard = dynamic(() => import('../components/OpexDashboard'), { ssr: false });
const CapexDashboard = dynamic(() => import('../components/CapexDashboard'), { ssr: false });
const AllItemsDashboard = dynamic(() => import('../components/AllItemsDashboard'), { ssr: false });
const RegistryDashboard = dynamic(() => import('../components/RegistryDashboard'), { ssr: false });
const AyurVaidyaGRN = dynamic(() => import('../components/AyurVaidyaGRN'), { ssr: false });
const AyurVaidyaStockIssue = dynamic(() => import('../components/AyurVaidyaStockIssue'), { ssr: false });

export default function Home() {
  const [activeTab, setActiveTab] = useState<'ALL'|'CAPEX'|'OPEX'|'REG'|'GRN'|'ISS'>('ALL');
  const [grnView, setGrnView] = useState<'grn'|'qr'>('grn');
  const [today, setToday] = useState(() => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));

  const breadcrumbLabel = activeTab === 'GRN'
    ? 'Stock Inward (GRN)'
    : activeTab === 'ISS'
    ? 'Stock Issue'
    : activeTab === 'OPEX'
    ? 'OPEX stock'
    : activeTab === 'CAPEX'
    ? 'CAPEX assets'
    : 'All items';

  useEffect(() => {
    // placeholder: Chart components will initialize later
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setToday(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Listen for requests coming from other UI (DetailPanel) to open Issue / GRN flows
  useEffect(() => {
    function onOpenIssue(e: any) {
      try {
        const id = e?.detail ?? null;
        if (id) sessionStorage.setItem('openItemForISS', String(id));
        setActiveTab('ISS');
      } catch (err) {}
    }
    function onOpenGrn(e: any) {
      try {
        const id = e?.detail ?? null;
        if (id) sessionStorage.setItem('openItemForGRN', String(id));
        setActiveTab('GRN');
        setGrnView('grn');
      } catch (err) {}
    }
    function onOpenRegistry(e: any) {
      try {
        // When opening registry from elsewhere, ensure the registry tab is shown.
        setActiveTab('REG');
      } catch (err) {}
    }
    window.addEventListener('open-issue', onOpenIssue as EventListener);
    window.addEventListener('open-grn', onOpenGrn as EventListener);
    window.addEventListener('open-registry', onOpenRegistry as EventListener);
    return () => {
      window.removeEventListener('open-issue', onOpenIssue as EventListener);
      window.removeEventListener('open-grn', onOpenGrn as EventListener);
      window.removeEventListener('open-registry', onOpenRegistry as EventListener);
    }
  }, []);

  


  return (
    <div className="app-root" style={{ display: "flex", width: "100%", height: "100vh" }}>
      <aside className="sidebar">
        <div className="logo-area">
          <div className="logo-name">AyurVaidya</div>
          <div className="logo-sub">All India Institute of<br/>Ayurveda, Faridabad</div>
          <div className="logo-pill">AIIA · AYUSH</div>
        </div>

        <nav>
          <div className="nav-block">
            <div className="nav-label">Main</div>
            <div className={`nav-item ${(activeTab as any) !== 'REG' && (activeTab as any) !== 'GRN' && (activeTab as any) !== 'ISS' ? 'active' : ''}`} onClick={() => setActiveTab('CAPEX')}><div className="nav-icon">▦</div> Dashboard</div>
            <div className={`nav-item ${(activeTab as any) === 'REG' ? 'active' : ''}`} onClick={()=>setActiveTab('REG')}><div className="nav-icon">☰</div> Item Registry</div>
            <div className={`nav-item ${(activeTab === 'GRN' && grnView === 'grn') ? 'active' : ''}`} onClick={() => { setActiveTab('GRN'); setGrnView('grn'); }}><div className="nav-icon">↓</div> Stock Inward</div>
            <div className={`nav-item ${(activeTab === 'GRN' && grnView === 'qr') ? 'active' : ''}`} onClick={() => { setActiveTab('GRN'); setGrnView('qr'); }}><div className="nav-icon">▦</div> QR Generator</div>
            <div className={`nav-item ${activeTab==='ISS'?'active':''}`} onClick={() => setActiveTab('ISS')}><div className="nav-icon">↑</div> Stock Issue</div>
          </div>

          <div className="nav-block">
            <div className="nav-label">Insights</div>
            <div className="nav-item"><div className="nav-icon">⚑</div> Alerts <span className="nav-chip">22</span></div>
            <div className="nav-item"><div className="nav-icon">≡</div> Reports</div>
            <div className="nav-item"><div className="nav-icon">✦</div> AI Assistant</div>
          </div>

          <div className="nav-block">
            <div className="nav-label">Category</div>
            <div className="nav-item" style={{ color: "rgba(255,255,255,0.9)" }}>
              <div className="nav-icon" style={{ color: "#93c5fd" }}>◈</div> CAPEX items
              <span className="nav-chip amber">3 AMC</span>
            </div>
            <div className="nav-item"><div className="nav-icon" style={{ color: "#86efac" }}>◉</div> OPEX items <span className="nav-chip">7</span></div>
          </div>
        </nav>

        <div className="sidebar-user">
          <div className="avatar">RK</div>
          <div className="user-info">
            <div className="user-name">Ramesh Kumar</div>
            <div className="user-role">Store Manager</div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="page-title">Dashboard</div>
            <div className="breadcrumb">/ <span>{breadcrumbLabel}</span></div>
          </div>
          <div className="topbar-right">
            <div className="status-pill"><div className="status-dot"></div> System online</div>
            <div className="date-chip">{today}</div>
            
          </div>
        </header>

        {activeTab !== 'GRN' && activeTab !== 'REG' && (
          <div className="tab-bar">
            {activeTab === 'ISS' ? (
              <div className={`tab active`} style={{ flex: 1, textAlign: 'center' }}>Stock Issue</div>
            ) : (
              <>
                <div className={`tab ${activeTab==='ALL'?'active':''}`} onClick={()=>setActiveTab('ALL')}>All items</div>
                <div className={`tab ${activeTab==='CAPEX'?'active':''}`} onClick={()=>setActiveTab('CAPEX')}>CAPEX only</div>
                <div className={`tab ${activeTab==='OPEX'?'active':''}`} onClick={()=>setActiveTab('OPEX')}>OPEX only</div>
              </>
            )}
          </div>
        )}

        <div className="content">
          {activeTab === 'ISS' ? (
            <AyurVaidyaStockIssue />
          ) : activeTab === 'GRN' ? (
            <AyurVaidyaGRN grnView={grnView} />
          ) : activeTab === 'REG' ? (
            <RegistryDashboard />
          ) : activeTab === 'ALL' ? (
            <AllItemsDashboard />
          ) : activeTab === 'OPEX' ? (
            <OpexDashboard />
          ) : (
            <CapexDashboard />
          )}
        </div>
      </div>
    </div>
  );
}
