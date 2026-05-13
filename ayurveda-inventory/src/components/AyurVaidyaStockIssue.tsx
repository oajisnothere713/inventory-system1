import { useState, useEffect, useRef } from "react";
import StepsBar from "./stock-issue/StepsBar";
import ItemBadges from "./stock-issue/ItemBadges";
import PreviewPanel from "./stock-issue/PreviewPanel";
import ConfirmContent from "./stock-issue/ConfirmContent";
import CameraQRScanner from "./qr/CameraQRScanner";

/* ── TYPES ───────────────────────────────────────────────── */
interface Batch {
  batchNo: string;
  qty: number;
  expiry: string | null;
  amcExpiry?: string;
  status: "healthy" | "expiring" | "expired" | "low_stock" | "amc_due";
}

interface Item {
  id: string;
  name: string;
  sub: string;
  category: "OPEX" | "CAPEX";
  subcat: string;
  unit: string;
  dept: string;
  totalStock: number;
  minStock: number;
  batches: Batch[];
}

interface Dept {
  name: string;
  code: string;
}

interface IssueRecord {
  iss: string;
  date: string;
  item: string;
  cat: "OPEX" | "CAPEX";
  batch: string;
  qty: string;
  dept: string;
  auth: string;
  purpose: string;
}

const DEPTS: Dept[] = [
  { name: "OPD — General", code: "OPD-GEN" }, { name: "Pharmacy", code: "PHM" },
  { name: "IPD Ward A", code: "IPD-A" },      { name: "IPD Ward B", code: "IPD-B" },
  { name: "Panchakarma", code: "PKM" },        { name: "Shalakya (ENT & Eye)", code: "SHA" },
  { name: "Kaumarabhritya", code: "KAU" },     { name: "Striroga (OB-GYN)", code: "STR" },
  { name: "Shalya (Surgery)", code: "SHY" },   { name: "Laboratory", code: "LAB" },
  { name: "Swastha Vritta", code: "SWA" },     { name: "Research", code: "RES" },
];

// Issue history will be fetched from the server when the history tab is opened

/* ── HELPERS ─────────────────────────────────────────────── */
function fefoSort(item: Item): Batch[] {
  const b = [...item.batches];
  if (item.category === "OPEX") {
    b.sort((a, c) => {
      if (!a.expiry && !c.expiry) return 0;
      if (!a.expiry) return 1;
      if (!c.expiry) return -1;
      return new Date(a.expiry).getTime() - new Date(c.expiry).getTime();
    });
  }
  return b;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/* ── GLOBAL CSS ──────────────────────────────────────────── */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Sora:wght@300;400;500;600&family=Playfair+Display:wght@600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f1f4f1;--surface:#fff;--surface-2:#f8faf8;
  --border:#dce8dc;--border-2:#c8d8c8;
  --green:#1A6B3C;--green-mid:#2D7A52;--green-light:#eaf3ee;--green-xl:#3aa864;
  --blue:#185FA5;--blue-light:#e8f1fb;
  --red:#B91C1C;--red-light:#fef2f2;
  --amber:#92400E;--amber-light:#fffbeb;
  --slate:#3d5a6c;--slate-light:#eef4f8;
  --text:#0d1f12;--text-mid:#3d6148;--text-dim:#7a9982;--text-mute:#a8bfac;
  --mono:'DM Mono',monospace;--sans:'Sora',sans-serif;--serif:'Playfair Display',serif;
  --r-sm:6px;--r-md:10px;--r-lg:14px;--r-xl:18px;
}
body{font-family:var(--sans);background:var(--bg);color:var(--text)}
.av-root{height:100vh;overflow:hidden;display:flex;font-family:var(--sans);background:var(--bg);color:var(--text)}

/* Sidebar */
.sb{width:204px;min-width:204px;background:var(--green);display:flex;flex-direction:column;height:100vh;position:relative;overflow:hidden}
.sb::after{content:'';position:absolute;bottom:-80px;right:-80px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,0.03);pointer-events:none}
.logo-area{padding:20px 16px 16px;border-bottom:1px solid rgba(255,255,255,0.1)}
.logo-name{font-family:var(--serif);font-size:22px;color:#fff;letter-spacing:-0.3px;line-height:1.05;margin-bottom:4px}
.logo-sub{font-size:10px;color:rgba(255,255,255,0.42);line-height:1.55;font-weight:300}
.logo-pill{display:inline-block;margin-top:8px;padding:2px 8px;border:1px solid rgba(255,255,255,0.18);border-radius:20px;font-family:var(--mono);font-size:9px;color:rgba(255,255,255,0.45);letter-spacing:0.4px}
.nav-s{padding:12px 0 4px}
.nav-lbl{font-size:9px;font-weight:600;color:rgba(255,255,255,0.28);letter-spacing:1.2px;text-transform:uppercase;padding:0 16px 6px}
.nav-i{display:flex;align-items:center;gap:9px;padding:8px 16px;font-size:12.5px;color:rgba(255,255,255,0.58);cursor:pointer;border-left:2px solid transparent;transition:background 0.12s,color 0.12s}
.nav-i:hover{background:rgba(255,255,255,0.06);color:#fff}
.nav-i.active{background:rgba(255,255,255,0.12);color:#fff;border-left-color:rgba(255,255,255,0.65);font-weight:500}
.nav-icon{width:26px;height:26px;border-radius:var(--r-sm);display:flex;align-items:center;justify-content:center;font-size:12px;background:rgba(255,255,255,0.07);flex-shrink:0}
.nav-i.active .nav-icon{background:rgba(255,255,255,0.14)}
.nav-chip{margin-left:auto;font-family:var(--mono);font-size:9.5px;padding:1px 6px;border-radius:20px;background:rgba(220,38,38,0.22);color:#fca5a5;border:1px solid rgba(220,38,38,0.22)}
.nav-chip.a{background:rgba(245,158,11,0.18);color:#fcd34d;border-color:rgba(245,158,11,0.22)}
.sb-user{margin-top:auto;padding:14px 16px;border-top:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:10px}
.av{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.22);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#fff;flex-shrink:0}
.u-name{font-size:11.5px;color:#fff;font-weight:500}
.u-role{font-size:10px;color:rgba(255,255,255,0.38)}

/* Main */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;height:100vh}
.topbar{background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 22px;height:52px;flex-shrink:0}
.tb-l{display:flex;align-items:center;gap:10px}
.page-title{font-size:15px;font-weight:600;color:var(--text);letter-spacing:-0.2px}
.breadcrumb{font-size:12px;color:var(--text-dim)}
.bc-link{color:var(--blue);cursor:pointer}
.bc-link:hover{text-decoration:underline}
.tb-r{display:flex;align-items:center;gap:10px}
.status-pill{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--green-mid);padding:4px 10px;background:var(--green-light);border:1px solid rgba(26,107,60,0.18);border-radius:20px}
.pulse{width:6px;height:6px;border-radius:50%;background:var(--green-xl);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(58,168,100,0.35)}50%{box-shadow:0 0 0 4px rgba(58,168,100,0)}}
.date-chip{font-family:var(--mono);font-size:11px;color:var(--text-dim);padding:4px 10px;background:var(--bg);border:1px solid var(--border);border-radius:var(--r-sm)}
.icon-btn{width:32px;height:32px;border-radius:var(--r-sm);border:1px solid var(--border);background:var(--surface);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;color:var(--text-dim);position:relative;transition:all 0.15s}
.icon-btn:hover{border-color:var(--green);color:var(--green)}
.notif-badge{position:absolute;top:-4px;right:-4px;width:14px;height:14px;background:var(--red);border-radius:50%;font-size:8px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;border:2px solid var(--surface)}

/* Tabs */
.tab-bar{background:var(--surface);border-bottom:1px solid var(--border);display:flex;padding:0 22px;flex-shrink:0}
.tab{padding:10px 20px;font-size:12.5px;cursor:pointer;color:var(--text-dim);border-bottom:2px solid transparent;margin-bottom:-1px;transition:color 0.15s}
.tab:hover{color:var(--text-mid)}
.tab.active{color:var(--green);border-bottom-color:var(--green);font-weight:500}

/* Steps */
.steps-bar{background:var(--surface);border-bottom:1px solid var(--border);padding:12px 22px;flex-shrink:0;display:flex;align-items:center;gap:0}
.step-item{display:flex;align-items:center;gap:10px}
.step-num{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0;transition:all 0.25s}
.step-num.done{background:var(--green);color:#fff}
.step-num.active{background:var(--green);color:#fff;box-shadow:0 0 0 4px rgba(26,107,60,0.18)}
.step-num.idle{background:var(--bg);color:var(--text-dim);border:1.5px solid var(--border)}
.step-label{font-size:12px;font-weight:500;transition:color 0.25s}
.step-label.active{color:var(--green)}
.step-label.done{color:var(--green-mid)}
.step-label.idle{color:var(--text-mute)}
.step-line{flex:1;height:1.5px;background:var(--border);margin:0 14px;border-radius:1px;overflow:hidden;position:relative}
.step-line-fill{position:absolute;left:0;top:0;height:100%;background:var(--green);border-radius:1px;transition:width 0.4s ease}

/* Content layout */
.content{flex:1;display:flex;overflow:hidden}
.form-panel{flex:1;overflow-y:auto;padding:22px;display:flex;flex-direction:column;gap:16px}
.form-panel::-webkit-scrollbar{width:4px}
.form-panel::-webkit-scrollbar-thumb{background:var(--border-2);border-radius:2px}

/* Preview panel */
.preview-panel{width:300px;min-width:300px;background:var(--surface);border-left:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;flex-shrink:0}
.pp-head{padding:14px 16px;border-bottom:1px solid var(--border);flex-shrink:0}
.pp-title{font-size:12px;font-weight:500;color:var(--text-mid)}
.pp-sub{font-size:11px;color:var(--text-mute);margin-top:2px}
.pp-body{flex:1;overflow-y:auto;padding:16px}
.pp-body::-webkit-scrollbar{width:3px}
.pp-body::-webkit-scrollbar-thumb{background:var(--border-2);border-radius:2px}

/* Form cards */
.form-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-xl);overflow:hidden;animation:slideUp 0.25s ease both}
@keyframes slideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.fc-head{padding:13px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.fc-title{font-size:12.5px;font-weight:500;color:var(--text-mid);display:flex;align-items:center;gap:8px}
.fc-step-dot{width:20px;height:20px;border-radius:50%;background:var(--green);color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.fc-body{padding:16px}

/* Search / scan */
.scan-row{display:flex;gap:10px;margin-bottom:12px}
.scan-wrap{position:relative;flex:1}
.scan-input{width:100%;padding:10px 14px 10px 38px;border:1.5px solid var(--border);border-radius:var(--r-md);font-family:var(--sans);font-size:13px;color:var(--text);background:var(--surface);outline:none;transition:border-color 0.15s}
.scan-input:focus{border-color:var(--green)}
.scan-input::placeholder{color:var(--text-mute)}
.scan-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:15px;color:var(--text-dim);pointer-events:none}
.scan-btn{display:flex;align-items:center;gap:6px;padding:10px 16px;border-radius:var(--r-md);font-family:var(--sans);font-size:12.5px;font-weight:500;cursor:pointer;background:var(--green);color:#fff;border:1px solid var(--green);white-space:nowrap;transition:all 0.15s}
.scan-btn:hover{background:var(--green-mid)}

/* Search results */
.search-results{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.1);margin-bottom:12px;animation:slideUp 0.18s ease}
.sr-item{padding:10px 14px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);transition:background 0.1s}
.sr-item:last-child{border-bottom:none}
.sr-item:hover{background:var(--green-light)}
.sr-item.oos{opacity:0.55;cursor:not-allowed}
.sr-item.oos:hover{background:var(--red-light)}
.sr-name{font-size:13px;font-weight:500;color:var(--text)}
.sr-sub{font-size:11px;color:var(--text-dim);margin-top:1px}
.sr-stock-ok{font-family:var(--mono);font-size:12px;color:var(--green)}
.sr-stock-low{font-family:var(--mono);font-size:12px;color:var(--amber)}
.sr-stock-oos{font-family:var(--mono);font-size:12px;color:var(--red)}
.sr-cat{font-size:10.5px;color:var(--text-dim);margin-top:2px}

/* Selected item */
.selected-item{background:var(--green-light);border:1.5px solid rgba(26,107,60,0.28);border-radius:var(--r-lg);padding:12px 14px;display:flex;align-items:flex-start;justify-content:space-between}
.si-name{font-size:13px;font-weight:500;color:var(--green)}
.si-sub{font-size:11px;color:var(--green-mid);margin-top:2px}
.si-badges{display:flex;gap:6px;margin-top:7px;flex-wrap:wrap}
.si-change{font-size:11px;color:var(--green-mid);cursor:pointer;text-decoration:underline;white-space:nowrap;margin-top:2px}

/* FEFO batch selector */
.batch-selector{display:flex;flex-direction:column;gap:8px;margin-bottom:4px}
.batch-option{display:flex;align-items:center;padding:10px 12px;border:1.5px solid var(--border);border-radius:var(--r-md);cursor:pointer;background:var(--surface);transition:all 0.15s;gap:10px}
.batch-option:hover{border-color:var(--green-mid);background:var(--green-light)}
.batch-option.selected,.batch-option.auto-selected{border-color:var(--green);background:var(--green-light)}
.bo-radio{width:16px;height:16px;border-radius:50%;border:2px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all 0.15s}
.batch-option.selected .bo-radio,.batch-option.auto-selected .bo-radio{border-color:var(--green);background:var(--green)}
.bo-radio-dot{width:6px;height:6px;border-radius:50%;background:#fff;display:none}
.batch-option.selected .bo-radio-dot,.batch-option.auto-selected .bo-radio-dot{display:block}
.bo-info{flex:1}
.bo-batch-num{font-family:var(--mono);font-size:12px;font-weight:500;color:var(--text);display:flex;align-items:center;gap:6px}
.bo-details{font-size:11px;color:var(--text-dim);margin-top:2px;display:flex;gap:10px}
.bo-qty-avail{font-family:var(--mono);font-size:13px;font-weight:500;color:var(--text);white-space:nowrap;text-align:right}
.bo-qty-unit{font-size:10px;color:var(--text-dim)}
.fefo-tag{display:inline-flex;padding:1px 6px;border-radius:10px;font-size:9.5px;font-weight:600;background:var(--green);color:#fff}
.fefo-note{display:flex;align-items:center;gap:6px;padding:7px 10px;background:var(--green-light);border:1px solid rgba(26,107,60,0.2);border-radius:var(--r-sm);font-size:11px;color:var(--green-mid);margin-top:4px}

/* Over-issue warning */
.over-issue-box{background:var(--red-light);border:1px solid rgba(185,28,28,0.25);border-radius:var(--r-md);padding:10px 12px;font-size:12px;color:var(--red);display:none}
.over-issue-box.show{display:block}
.below-min-box{background:var(--amber-light);border:1px solid rgba(146,64,14,0.25);border-radius:var(--r-md);padding:10px 12px;font-size:12px;color:var(--amber);display:none;margin-top:8px}
.below-min-box.show{display:block}

/* Qty input */
.qty-row{display:flex;gap:10px;align-items:flex-start}
.qty-input-wrap{flex:1}
.qty-big{width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:var(--r-md);font-family:var(--mono);font-size:20px;font-weight:500;color:var(--text);background:var(--surface);outline:none;transition:border-color 0.15s;text-align:center}
.qty-big:focus{border-color:var(--green)}
.qty-big.warn{border-color:var(--amber)}
.qty-big.error{border-color:var(--red)}
.qty-unit-label{display:flex;align-items:center;justify-content:center;padding:12px 14px;border:1.5px solid var(--border);border-radius:var(--r-md);font-family:var(--mono);font-size:14px;font-weight:500;color:var(--text-mid);background:var(--bg);min-width:64px}
.qty-hint{font-size:11px;color:var(--text-dim);margin-top:5px;text-align:center}
.qty-hint.ok{color:var(--green)}
.qty-hint.warn{color:var(--amber)}
.qty-hint.error{color:var(--red)}

/* Form fields */
.field-grid{display:grid;gap:14px}
.g2{grid-template-columns:1fr 1fr}
.g3{grid-template-columns:1fr 1fr 1fr}
.field{display:flex;flex-direction:column;gap:5px}
.field label{font-size:11.5px;font-weight:500;color:var(--text-mid)}
.req{color:var(--red);margin-left:2px}
.field input,.field select,.field textarea{padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--r-md);font-family:var(--sans);font-size:13px;color:var(--text);background:var(--surface);outline:none;transition:border-color 0.15s}
.field input:focus,.field select:focus{border-color:var(--green)}
.field input::placeholder{color:var(--text-mute)}
.field-hint{font-size:10.5px;color:var(--text-mute);margin-top:3px}

/* Dept grid */
.dept-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:4px}
.dept-option{padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--r-md);cursor:pointer;background:var(--surface);transition:all 0.15s;text-align:center}
.dept-option:hover{border-color:var(--green-mid);background:var(--green-light)}
.dept-option.selected{border-color:var(--green);background:var(--green-light)}
.dept-option-name{font-size:12px;font-weight:500;color:var(--text)}
.dept-option-code{font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:2px}

/* Buttons */
.action-row{display:flex;gap:10px;align-items:center;margin-top:4px}
.btn-cancel{padding:10px 20px;border-radius:var(--r-md);font-family:var(--sans);font-size:13px;font-weight:500;cursor:pointer;background:transparent;color:var(--text-dim);border:1.5px solid var(--border);transition:all 0.15s}
.btn-cancel:hover{border-color:var(--border-2);color:var(--text)}
.btn-back{padding:10px 20px;border-radius:var(--r-md);font-family:var(--sans);font-size:13px;font-weight:500;cursor:pointer;background:var(--surface);color:var(--text-mid);border:1.5px solid var(--border);transition:all 0.15s}
.btn-back:hover{border-color:var(--green-mid);color:var(--text)}
.btn-next{padding:10px 24px;border-radius:var(--r-md);font-family:var(--sans);font-size:13px;font-weight:500;cursor:pointer;background:var(--green);color:#fff;border:1.5px solid var(--green);transition:all 0.15s;margin-left:auto}
.btn-next:hover{background:var(--green-mid)}
.btn-next:disabled{background:var(--border-2);border-color:var(--border-2);color:var(--text-mute);cursor:not-allowed}
.btn-issue{padding:10px 28px;border-radius:var(--r-md);font-family:var(--sans);font-size:13px;font-weight:500;cursor:pointer;background:var(--green);color:#fff;border:1.5px solid var(--green);transition:all 0.15s;margin-left:auto}
.btn-issue:hover{background:var(--green-mid)}

/* Badges */
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:10.5px;font-weight:500;white-space:nowrap}
.badge-opex{background:var(--green-light);color:var(--green);border:1px solid rgba(26,107,60,0.2)}
.badge-capex{background:var(--blue-light);color:var(--blue);border:1px solid rgba(24,95,165,0.2)}
.badge-sub{background:var(--bg);color:var(--text-mid);border:1px solid var(--border)}
.badge-warn{background:var(--amber-light);color:var(--amber);border:1px solid rgba(146,64,14,0.2)}
.badge-ok{background:var(--green-light);color:var(--green);border:1px solid rgba(26,107,60,0.2)}
.badge-low{background:var(--red-light);color:var(--red);border:1px solid rgba(185,28,28,0.2)}

/* Preview panel internals */
.preview-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;text-align:center;color:var(--text-mute)}
.pe-icon{font-size:32px;margin-bottom:10px;opacity:0.3}
.stock-change-box{background:var(--red-light);border:1px solid rgba(185,28,28,0.18);border-radius:var(--r-md);padding:12px;margin-bottom:12px;text-align:center}
.scb-label{font-size:11px;color:var(--red);margin-bottom:6px}
.scb-values{display:flex;align-items:center;justify-content:center;gap:10px}
.scb-old{font-family:var(--mono);font-size:18px;color:var(--text-dim)}
.scb-arrow{font-size:16px;color:var(--text-dim)}
.scb-new{font-family:var(--mono);font-size:22px;font-weight:500}
.scb-new.ok{color:var(--green)}
.scb-new.warn{color:var(--amber)}
.scb-new.danger{color:var(--red)}
.scb-diff{display:inline-block;margin-top:5px;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:500;font-family:var(--mono);background:rgba(185,28,28,0.12);color:var(--red)}
.scb-unit{font-size:11px;color:var(--text-dim);margin-top:3px}
.preview-section{margin-bottom:14px}
.ps-title{font-size:10px;font-weight:600;letter-spacing:0.7px;text-transform:uppercase;color:var(--text-dim);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border)}
.ps-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px}
.ps-row:last-child{border-bottom:none}
.ps-lbl{color:var(--text-dim)}
.ps-val{color:var(--text);font-weight:500;text-align:right}
.ps-val.green{color:var(--green)}
.ps-val.red{color:var(--red)}
.ps-val.amber{color:var(--amber)}
.ps-val.mono{font-family:var(--mono)}

/* Confirm screen */
.confirm-two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.confirm-section-title{font-size:10px;font-weight:600;letter-spacing:0.7px;text-transform:uppercase;color:var(--text-dim);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border)}
.confirm-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px}
.confirm-row:last-child{border-bottom:none}
.cr-lbl{color:var(--text-dim)}
.cr-val{color:var(--text);font-weight:500;text-align:right}
.consequence-list{display:flex;flex-direction:column;gap:10px}
.consequence-item{display:flex;align-items:flex-start;gap:10px;font-size:12.5px}
.cons-num{width:22px;height:22px;border-radius:50%;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;margin-top:1px}
.cons-num.warn{background:var(--amber)}

/* Success */
.success-card{background:var(--green);border-radius:var(--r-xl);padding:32px 24px;text-align:center;color:#fff;animation:slideUp 0.3s ease}
.sc-icon{font-size:48px;margin-bottom:16px}
.sc-title{font-size:20px;font-weight:600;margin-bottom:8px;font-family:var(--serif)}
.sc-sub{font-size:13px;color:rgba(255,255,255,0.75);line-height:1.6;margin-bottom:24px}
.sc-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.sc-btn{padding:10px 20px;border-radius:var(--r-md);font-family:var(--sans);font-size:13px;font-weight:500;cursor:pointer;transition:all 0.15s}
.sc-btn-white{background:#fff;color:var(--green);border:none}
.sc-btn-white:hover{background:var(--green-light)}
.sc-btn-outline{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,0.4)}
.sc-btn-outline:hover{background:rgba(255,255,255,0.1)}

/* History table */
.hist-table{width:100%;border-collapse:collapse;font-size:11.5px}
.hist-table th{background:var(--bg);padding:8px 12px;text-align:left;font-size:10px;font-weight:600;color:var(--text-dim);letter-spacing:0.4px;text-transform:uppercase;border-bottom:1px solid var(--border)}
.hist-table td{padding:9px 12px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:middle}
.hist-table tr:hover td{background:var(--green-light);cursor:pointer}
.hist-mono{font-family:var(--mono);font-size:11px}
.hist-badge{display:inline-block;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:500}
.hb-opex{background:var(--green-light);color:var(--green);border:1px solid rgba(26,107,60,0.2)}
.hb-capex{background:var(--blue-light);color:var(--blue);border:1px solid rgba(24,95,165,0.2)}
`;

/* ── COMPONENT ───────────────────────────────────────────── */
export default function AyurVaidyaStockIssue({ embedded = true }: { embedded?: boolean }) {
  // Core state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  // Selected entities
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedDept, setSelectedDept] = useState<Dept | null>(null);

  // Form fields
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [issueQty, setIssueQty] = useState("");
  const [authorisedBy, setAuthorisedBy] = useState("");
  const [purpose, setPurpose] = useState("");
  const [patientId, setPatientId] = useState("");
  const [specificLocation, setSpecificLocation] = useState("");
  const [issueDate, setIssueDate] = useState("2025-04-21");
  const [notes, setNotes] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [remoteResults, setRemoteResults] = useState<Item[]>([]);
  const [issueHistory, setIssueHistory] = useState<IssueRecord[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Computed
  const qtyInt = parseInt(issueQty) || 0;
  const sortedBatches = selectedItem ? fefoSort(selectedItem) : [];
  const avail = selectedBatch?.qty ?? 0;
  const newTotal = (selectedItem?.totalStock ?? 0) - qtyInt;
  const batchLeft = avail - qtyInt;

  const step3Valid = !!(selectedDept && authorisedBy.trim() && purpose);

  // Qty validation state
  const qtyState: "ok" | "warn" | "error" | "" = (() => {
    if (!selectedBatch || qtyInt <= 0) return "";
    if (qtyInt > avail) return "error";
    if (newTotal < (selectedItem?.minStock ?? 0)) return "warn";
    return "ok";
  })();

  const qtyHint = (() => {
    if (!selectedBatch) return "Select a batch first";
    if (qtyInt <= 0) return `Available in this batch: ${avail.toLocaleString()} ${selectedItem?.unit}`;
    if (qtyState === "error") return `Cannot exceed ${avail.toLocaleString()} ${selectedItem?.unit} available in this batch`;
    if (qtyState === "warn") return "Stock will fall below minimum after this issue";
    return `✓ ${(avail - qtyInt).toLocaleString()} ${selectedItem?.unit} will remain in this batch`;
  })();

  const step2Valid = !!(selectedBatch && qtyInt > 0 && qtyState !== "error");

  // Click-outside to close search
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── ACTIONS ────────────────────────────────────────────── */
  function goStep(n: number) {
    setCurrentStep(n);
    if (n === 2 && selectedItem) {
      const batches = fefoSort(selectedItem);
      setSelectedBatch(batches[0] ?? null);
    }
  }

  function switchTab(tab: "new" | "history") {
    setActiveTab(tab);
  }

  function handleSearch(val: string) {
    setSearchQuery(val);
    setShowSearchResults(val.trim().length > 0);
  }

  function selectItemById(id: string) {
    // fetch detail from server
    fetch(`/api/items/detail?code=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          const mapped: Item = {
            id: data.itemCode,
            name: data.itemName,
            sub: data.itemType || '',
            category: data.category || 'OPEX',
            subcat: data.subCategory || '',
            unit: data.unit || 'pcs',
            dept: '',
            totalStock: Array.isArray(data.itemBatches) ? data.itemBatches.reduce((s: number, b: any) => s + Number(b.quantityAvailable || b.quantityReceived || 0), 0) : 0,
            minStock: Number(data.minStockLevel || 0),
            batches: Array.isArray(data.itemBatches) ? data.itemBatches.map((b: any) => ({ batchNo: b.batchNumber, qty: Number(b.quantityAvailable || b.quantityReceived || 0), expiry: b.expiryDate ? b.expiryDate.split('T')[0] : null })) : [],
          }
          setSelectedItem(mapped)
          setSearchQuery(mapped.name)
          setShowSearchResults(false)
        }
      }).catch(() => {})
  }

  function clearItem() {
    setSelectedItem(null);
    setSelectedBatch(null);
    setSelectedDept(null);
    setSearchQuery("");
    setShowSearchResults(false);
  }

  function simulateScan() {
    selectItemById("MED-003");
  }

  function selectBatchByIdx(idx: number) {
    setSelectedBatch(sortedBatches[idx] ?? null);
    setIssueQty("");
  }

  function selectDeptByIdx(idx: number) {
    setSelectedDept(DEPTS[idx] ?? null);
  }

  function saveIssue() {
    // call API to persist issue
    if (!selectedItem || !selectedBatch) { alert('Select item and batch'); return }
    const payload = {
      itemCode: selectedItem.id,
      batchNo: selectedBatch.batchNo,
      qty: Number(issueQty || 0),
      deptCode: selectedDept?.code || null,
      authorisedBy: authorisedBy || null,
      issuedBy: '',
      purpose: purpose || null,
      specificLocation: specificLocation || null,
      notes: notes || null,
    }
    fetch('/api/issue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then((r) => r.json())
      .then((data) => {
        if (data && data.ok && data.issue) {
          const dept = selectedDept?.name ?? "—";
          setSuccessMsg(`ISS-${String(data.issue.issueId || data.issue.issue_id || 'XXXX')} recorded. ${qtyInt.toLocaleString()} ${selectedItem.unit} of ${selectedItem.name} issued to ${dept}.`)
          // update local selectedBatch qty
          if (data.batch) {
            setSelectedBatch((prev) => prev ? { ...prev, qty: Number(data.batch.quantityAvailable ?? data.batch.quantity_available ?? prev.qty) } : prev)
            setSelectedItem((it) => it ? { ...it, totalStock: (it.totalStock - qtyInt), batches: it.batches.map((b) => b.batchNo === selectedBatch.batchNo ? { ...b, qty: Number(data.batch.quantityAvailable ?? data.batch.quantity_available ?? b.qty) } : b) } : it)
          }
          setCurrentStep(5)
        } else {
          alert('Failed to save issue: ' + (data?.error || 'unknown'))
        }
      }).catch(() => alert('Error saving issue'))
  }

  function resetAll() {
    setSelectedItem(null);
    setSelectedBatch(null);
    setSelectedDept(null);
    setSearchQuery("");
    setShowSearchResults(false);
    setIssueQty("");
    setAuthorisedBy("");
    setPurpose("");
    setPatientId("");
    setSpecificLocation("");
    setIssueDate("2025-04-21");
    setNotes("");
    setSuccessMsg("");
    setCurrentStep(1);
    setActiveTab("new");
  }

  /* ── SEARCH RESULTS ─────────────────────────────────────── */
  // Use only server results when typing — avoid local static fallback
  const searchMatches = searchQuery.trim() ? remoteResults : [];

  // Debounced server-side search for items
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setRemoteResults([]); return }
    let mounted = true;
    const t = setTimeout(() => {
      fetch(`/api/items?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          if (!mounted) return;
          if (!Array.isArray(data)) { setRemoteResults([]); return }
          // Map server shape to local Item shape (server returns `currentStock`, `minStock`, `batches`)
          const mapped = data.map((it: any): Item => ({
            id: it.id,
            name: it.name,
            sub: it.sub || '',
            category: it.category || 'OPEX',
            subcat: it.subcat || '',
            unit: it.unit || '',
            dept: it.dept || '',
            totalStock: Number(it.currentStock ?? it.stock ?? 0),
            minStock: Number(it.minStock ?? it.min_stock_level ?? 0),
            batches: Array.isArray(it.batches) ? it.batches.map((b: any) => ({ batchNo: b.batchNo || b.batch_number, qty: Number(b.qty || b.quantity || b.qty_sum || 0), expiry: b.expiry || null })) : [],
          }))
          setRemoteResults(mapped)
        })
        .catch(() => { if (mounted) setRemoteResults([]) })
    }, 250)
    return () => { mounted = false; clearTimeout(t) }
  }, [searchQuery]);

  // If another panel requested opening Stock Issue for a specific item, consume it now
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('openItemForISS')
      if (pending) {
        sessionStorage.removeItem('openItemForISS')
        selectItemById(pending)
        setActiveTab('new')
        setCurrentStep(1)
      }
    } catch (e) {}
  }, [])

  // If a batch was specified by the caller (DetailPanel), pick it after item details load
  useEffect(() => {
    try {
      const pendingBatch = sessionStorage.getItem('openItemForISSBatch')
      if (selectedItem && pendingBatch) {
        const batches = fefoSort(selectedItem)
        const match = batches.find((bb) => bb.batchNo === pendingBatch)
        if (match) setSelectedBatch(match)
        sessionStorage.removeItem('openItemForISSBatch')
      }
    } catch (e) {}
  }, [selectedItem])

  // Fetch issue history when user switches to history tab
  useEffect(() => {
    if (activeTab !== 'history') return;
    let mounted = true;
    fetch('/api/issue')
      .then((r) => r.json())
      .then((data) => { if (!mounted) return; if (Array.isArray(data)) setIssueHistory(data as IssueRecord[]) })
      .catch(() => { if (mounted) setIssueHistory([]) });
    return () => { mounted = false }
  }, [activeTab]);

  // StepsBar, ItemBadges, PreviewPanel and ConfirmContent have been moved
  // to src/components/stock-issue/*.tsx and are imported at the top of this file.

  /* ── RENDER ─────────────────────────────────────────────── */
  const mainContent = (
    <>
      <div className="main" style={{ height: embedded ? '100%' : undefined, minHeight: 0 }}>

          {/* Topbar */}
          
          {/* Tab bar */}
          <div className="tab-bar" style={{ padding: 0 }}>
            <div className={`tab ${activeTab === "new" ? "active" : ""}`} onClick={() => switchTab("new")} style={{ flex: 1, textAlign: 'center' }}>New issue entry</div>
            <div className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => switchTab("history")} style={{ flex: 1, textAlign: 'center' }}>Issue history</div>
          </div>

          {/* Steps bar */}
          {activeTab === "new" && currentStep < 5 && <StepsBar currentStep={currentStep} />}

          {/* Content */}
          <div className="content" style={{ display: 'flex', width: '100%', gap: 16, flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div className="form-panel" style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto' }}>

              {/* ── HISTORY VIEW ────────────────────────────────── */}
              {activeTab === "history" && (
                <div className="form-card" style={{ animationDelay: "0.04s" }}>
                  <div className="fc-head">
                    <div className="fc-title">Stock issue history</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="text" placeholder="Search issues…" style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", fontFamily: "var(--sans)", fontSize: 12, outline: "none", background: "var(--bg)", color: "var(--text)" }} />
                      <button style={{ padding: "6px 12px", borderRadius: "var(--r-sm)", fontFamily: "var(--sans)", fontSize: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-mid)", cursor: "pointer" }}>↓ Export</button>
                    </div>
                  </div>
                  <div className="fc-body" style={{ padding: 0 }}>
                    <table className="hist-table">
                      <thead>
                        <tr>
                          <th>Issue #</th><th>Date</th><th>Item</th><th>Cat.</th>
                          <th>Batch</th><th>Qty issued</th><th>Department</th>
                          <th>Authorised by</th><th>Purpose</th>
                        </tr>
                      </thead>
                          <tbody>
                        {issueHistory.length > 0 ? issueHistory.map((r) => (
                          <tr key={r.iss}>
                            <td className="hist-mono">{r.iss}</td>
                            <td className="hist-mono">{new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                            <td style={{ fontWeight: 500 }}>{r.item}</td>
                            <td><span className={`hist-badge ${r.cat === "OPEX" ? "hb-opex" : "hb-capex"}`}>{r.cat}</span></td>
                            <td className="hist-mono">{r.batch}</td>
                            <td className="hist-mono" style={{ color: "var(--red)" }}>−{r.qty}</td>
                            <td>{r.dept}</td>
                            <td>{r.auth}</td>
                            <td style={{ color: "var(--text-dim)" }}>{r.purpose}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 20 }}>No issue records found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "new" && (
                <>
                  {/* ── STEP 1: Find item ──────────────────────── */}
                  {currentStep === 1 && (
                    <div>
                      <div className="form-card" style={{ animationDelay: "0.04s" }}>
                        <div className="fc-head">
                          <div className="fc-title"><div className="fc-step-dot">1</div>Find item to issue</div>
                        </div>
                        <div className="fc-body">
                          <div className="scan-row" ref={searchRef}>
                            <div className="scan-wrap">
                              <span className="scan-icon">🔍</span>
                              <input
                                className="scan-input"
                                type="text"
                                placeholder="Scan QR code, barcode, or type item name / ID…"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                autoComplete="off"
                              />
                            </div>
                            <button className="scan-btn" onClick={() => setShowScanner(true)}>📷 Scan QR</button>
                          </div>

                          {showScanner && (
                            <CameraQRScanner onDetected={(code) => { setShowScanner(false); selectItemById(code); setActiveTab('new'); setCurrentStep(1); }} onClose={() => setShowScanner(false)} />
                          )}

                          {showSearchResults && searchMatches.length > 0 && (
                            <div className="search-results">
                              {searchMatches.map((item) => {
                                const isOOS = item.totalStock === 0;
                                const stockCls = isOOS ? "sr-stock-oos" : item.totalStock <= item.minStock ? "sr-stock-low" : "sr-stock-ok";
                                const stockLbl = isOOS ? "Out of stock" : `${item.totalStock.toLocaleString()} ${item.unit}`;
                                return (
                                  <div
                                    key={item.id}
                                    className={`sr-item${isOOS ? " oos" : ""}`}
                                    onMouseDown={(e) => {
                                      // use onMouseDown so selection happens before document mousedown closes dropdown
                                      e.preventDefault();
                                      if (!isOOS) selectItemById(item.id);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                  >
                                    <div>
                                      <div className="sr-name">{item.name}</div>
                                      <div className="sr-sub">{item.sub} · {item.dept}</div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                      <div className={stockCls}>{stockLbl}</div>
                                      <div className="sr-cat">{item.category} · {item.subcat}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {selectedItem && (
                            <div className="selected-item">
                              <div>
                                <div className="si-name">{selectedItem.name}</div>
                                <div className="si-sub">{selectedItem.id} · {selectedItem.sub}</div>
                                <ItemBadges item={selectedItem} />
                              </div>
                              <span className="si-change" onClick={clearItem}>Change item</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="action-row">
                        <button className="btn-cancel" onClick={resetAll}>Cancel</button>
                        <button className="btn-next" disabled={!selectedItem} onClick={() => goStep(2)}>
                          Next: Select batch &amp; quantity →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 2: Batch & quantity ────────────────── */}
                  {currentStep === 2 && selectedItem && (
                    <div>
                      <div className="selected-item" style={{ cursor: "default" }}>
                        <div>
                          <div className="si-name">{selectedItem.name}</div>
                          <div className="si-sub">{selectedItem.id} · {selectedItem.sub}</div>
                          <div className="si-badges">
                            <span className={`badge ${selectedItem.category === "CAPEX" ? "badge-capex" : "badge-opex"}`}>{selectedItem.category}</span>
                            <span className="badge badge-sub">{selectedItem.subcat}</span>
                            <span className="badge badge-sub">{selectedItem.totalStock.toLocaleString()} {selectedItem.unit} total stock</span>
                          </div>
                        </div>
                        <span className="si-change" onClick={() => goStep(1)}>← Change item</span>
                      </div>

                      {/* Batch selector */}
                      <div className="form-card" style={{ animationDelay: "0.04s" }}>
                        <div className="fc-head">
                          <div className="fc-title"><div className="fc-step-dot">2</div>Select batch to issue from</div>
                          <span style={{ fontSize: 11, color: "var(--green-mid)", background: "var(--green-light)", padding: "3px 9px", borderRadius: 20, border: "1px solid rgba(26,107,60,0.2)" }}>📋 FEFO order applied</span>
                        </div>
                        <div className="fc-body">
                          <div className="batch-selector">
                            {sortedBatches.map((b, i) => {
                              const isFefo = selectedItem.category === "OPEX" && i === 0 && sortedBatches.length > 1;
                              const expTxt = b.expiry
                                ? fmtDate(b.expiry)
                                : b.amcExpiry
                                ? `AMC: ${fmtDate(b.amcExpiry)}`
                                : "No expiry";
                              const statusDot = b.status === "expiring" ? "🟡" : b.status === "expired" ? "🔴" : b.status === "low_stock" ? "🟠" : "🟢";
                              const isSelected = selectedBatch?.batchNo === b.batchNo;
                              const isAutoSel = i === 0 && !selectedBatch;
                              return (
                                <div
                                  key={b.batchNo}
                                  className={`batch-option${isSelected || isAutoSel ? " selected" : ""}`}
                                  onClick={() => selectBatchByIdx(i)}
                                >
                                  <div className="bo-radio"><div className="bo-radio-dot" /></div>
                                  <div className="bo-info">
                                    <div className="bo-batch-num">
                                      {statusDot} {b.batchNo}
                                      {isFefo && <span className="fefo-tag">FEFO — issue this first</span>}
                                    </div>
                                    <div className="bo-details">
                                      <span>Expiry: {expTxt}</span>
                                      {b.status === "expiring" && <span style={{ color: "var(--amber)" }}>⏰ Expiring soon</span>}
                                      {b.status === "low_stock" && <span style={{ color: "var(--red)" }}>📉 Low stock</span>}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: "right" }}>
                                    <div className="bo-qty-avail">{b.qty.toLocaleString()}</div>
                                    <div className="bo-qty-unit">{selectedItem.unit} available</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {sortedBatches.length > 1 && selectedItem.category === "OPEX" && sortedBatches[0].expiry && (
                            <div className="fefo-note">
                              <span style={{ fontSize: 14 }}>📋</span>
                              <span>FEFO order applied. {sortedBatches[0].batchNo} expires first ({fmtDate(sortedBatches[0].expiry)}) and should be issued first. You can override by selecting a different batch.</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="form-card" style={{ animationDelay: "0.08s" }}>
                        <div className="fc-head">
                          <div className="fc-title">Quantity to issue</div>
                        </div>
                        <div className="fc-body">
                          <div className="qty-row">
                            <div className="qty-input-wrap">
                              <input
                                type="number"
                                className={`qty-big${qtyState === "warn" ? " warn" : qtyState === "error" ? " error" : ""}`}
                                placeholder="0"
                                min={1}
                                value={issueQty}
                                onChange={(e) => setIssueQty(e.target.value)}
                                autoComplete="off"
                              />
                              <div className={`qty-hint${qtyState ? ` ${qtyState}` : ""}`}>{qtyHint}</div>
                            </div>
                            <div className="qty-unit-label">{selectedItem.unit}</div>
                          </div>

                          <div className={`over-issue-box${qtyState === "error" ? " show" : ""}`}>
                            <strong>⚠ Quantity exceeds available batch stock</strong><br />
                            This batch only has <span>{avail.toLocaleString()} {selectedItem.unit}</span> available. Reduce the quantity or split the issue across multiple batches.
                          </div>

                          <div className={`below-min-box${qtyState === "warn" ? " show" : ""}`}>
                            <strong>⚠ Stock will fall below minimum level after this issue</strong><br />
                            After issuing, only <span>{newTotal.toLocaleString()} {selectedItem.unit}</span> will remain (minimum: <span>{selectedItem.minStock.toLocaleString()} {selectedItem.unit}</span>). Consider raising a purchase request.
                          </div>
                        </div>
                      </div>

                      <div className="action-row">
                        <button className="btn-back" onClick={() => goStep(1)}>← Back</button>
                        <button className="btn-cancel" onClick={resetAll}>Cancel</button>
                        <button className="btn-next" disabled={!step2Valid} onClick={() => goStep(3)}>Next: Issue details →</button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 3: Issue details ───────────────────── */}
                  {currentStep === 3 && selectedItem && (
                    <div>
                      <div className="selected-item" style={{ cursor: "default", marginBottom: 0 }}>
                        <div>
                          <div className="si-name">{selectedItem.name}</div>
                          <div className="si-sub">{selectedItem.id} · {selectedItem.sub}</div>
                          <div className="si-badges">
                            <span className={`badge ${selectedItem.category === "CAPEX" ? "badge-capex" : "badge-opex"}`}>{selectedItem.category}</span>
                            <span className="badge badge-sub">{selectedBatch?.batchNo ?? "—"}</span>
                            <span className="badge badge-low">−{qtyInt.toLocaleString()} {selectedItem.unit}</span>
                          </div>
                        </div>
                        <span className="si-change" onClick={() => goStep(2)}>← Change quantity</span>
                      </div>

                      {/* Dept selection */}
                      <div className="form-card" style={{ animationDelay: "0.04s" }}>
                        <div className="fc-head">
                          <div className="fc-title"><div className="fc-step-dot">3</div>Where is this being issued to?</div>
                        </div>
                        <div className="fc-body">
                          <div style={{ fontSize: 11.5, fontWeight: 500, color: "var(--text-mid)", marginBottom: 10 }}>
                            Select department / ward <span className="req">*</span>
                          </div>
                          <div className="dept-grid">
                            {DEPTS.map((d, i) => (
                              <div
                                key={d.code}
                                className={`dept-option${selectedDept?.code === d.code ? " selected" : ""}`}
                                onClick={() => selectDeptByIdx(i)}
                              >
                                <div className="dept-option-name">{d.name}</div>
                                <div className="dept-option-code">{d.code}</div>
                              </div>
                            ))}
                          </div>
                          <div className="field" style={{ marginTop: 12 }}>
                            <label>Specific location (optional)</label>
                            <input type="text" value={specificLocation} onChange={(e) => setSpecificLocation(e.target.value)} placeholder="e.g. OPD Room 3, Ward B Nurses Station…" />
                          </div>
                        </div>
                      </div>

                      {/* Auth & purpose */}
                      <div className="form-card" style={{ animationDelay: "0.08s" }}>
                        <div className="fc-head">
                          <div className="fc-title">Issue authorisation &amp; purpose</div>
                        </div>
                        <div className="fc-body">
                          <div className="field-grid g2" style={{ marginBottom: 14 }}>
                            <div className="field">
                              <label>Authorised by (doctor / HOD) <span className="req">*</span></label>
                              <input type="text" value={authorisedBy} onChange={(e) => setAuthorisedBy(e.target.value)} placeholder="Dr. S. Verma" />
                            </div>
                            <div className="field">
                              <label>Purpose <span className="req">*</span></label>
                              <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                                <option value="">Select purpose…</option>
                                <option>Patient dispensing — OPD</option>
                                <option>Patient dispensing — IPD</option>
                                <option>Department restocking</option>
                                <option>Panchakarma therapy</option>
                                <option>Research / study</option>
                                <option>Quality testing</option>
                                <option>Other</option>
                              </select>
                            </div>
                          </div>
                          <div className="field-grid g2">
                            <div className="field">
                              <label>Patient / reference ID (optional)</label>
                              <input type="text" value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="e.g. AIIA-PT-2025-0441" />
                            </div>
                            <div className="field">
                              <label>Issue date</label>
                              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                            </div>
                          </div>
                          <div className="field" style={{ marginTop: 14 }}>
                            <label>Notes / remarks</label>
                            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instructions, prescription notes…" style={{ resize: "vertical", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: "var(--r-md)", fontFamily: "var(--sans)", fontSize: 13, color: "var(--text)", background: "var(--surface)", outline: "none" }} />
                          </div>
                        </div>
                      </div>

                      <div className="action-row">
                        <button className="btn-back" onClick={() => goStep(2)}>← Back</button>
                        <button className="btn-cancel" onClick={resetAll}>Cancel</button>
                        <button className="btn-next" disabled={!step3Valid} onClick={() => goStep(4)}>Next: Review &amp; confirm →</button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 4: Confirm ─────────────────────────── */}
                  {currentStep === 4 && selectedItem && (
                    <div>
                      <div className="form-card" style={{ animationDelay: "0.04s" }}>
                        <div className="fc-head">
                          <div className="fc-title"><div className="fc-step-dot">4</div>Review &amp; confirm issue</div>
                          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Issue voucher # auto-generated on save</span>
                        </div>
                        <div className="fc-body">
                          <ConfirmContent
                            selectedItem={selectedItem}
                            qty={qtyInt}
                            batch={selectedBatch?.batchNo ?? "—"}
                            dept={selectedDept?.name ?? "—"}
                            auth={authorisedBy || "—"}
                            pur={purpose || "—"}
                            loc={specificLocation || "—"}
                            patId={patientId || "—"}
                            issueDateFormatted={fmtDate(issueDate)}
                          />
                        </div>
                      </div>

                      <div className="action-row">
                        <button className="btn-back" onClick={() => goStep(3)}>← Back</button>
                        <button className="btn-cancel" onClick={resetAll}>Cancel</button>
                        <button className="btn-issue" onClick={saveIssue}>✓ Confirm issue &amp; deduct stock</button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 5: Success ──────────────────────────── */}
                  {currentStep === 5 && (
                    <div className="success-card">
                      <div className="sc-icon">✓</div>
                      <div className="sc-title">Stock issued successfully</div>
                      <div className="sc-sub">{successMsg || "Stock has been deducted and the issue has been recorded."}</div>
                      <div className="sc-actions">
                        <button className="sc-btn sc-btn-white" onClick={() => alert("Sending issue voucher to printer…")}>Print issue voucher</button>
                        <button className="sc-btn sc-btn-outline" onClick={resetAll}>Issue another item</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── PREVIEW PANEL ──────────────────────────────── */}
            <div className="preview-panel" style={{ flexShrink: 0, alignSelf: 'stretch', overflowY: 'auto' }}>
              <div className="pp-head">
                <div className="pp-title">Live preview</div>
                <div className="pp-sub">Updates as you fill the form</div>
              </div>
              <div className="pp-body">
                <PreviewPanel
                  selectedItem={selectedItem}
                  selectedBatch={selectedBatch}
                  qtyInt={qtyInt}
                  selectedDept={selectedDept?.name ?? null}
                  authorisedBy={authorisedBy}
                  purpose={purpose}
                />
              </div>
            </div>
          </div>
        </div>
    </>
  );

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      {embedded ? mainContent : <div className="av-root">{mainContent}</div>}
    </>
  );
}
