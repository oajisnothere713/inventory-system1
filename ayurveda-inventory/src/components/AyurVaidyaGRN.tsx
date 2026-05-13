import { useState, useEffect, useRef } from "react";
import PreviewSection from "./grn/PreviewSection";
import FefoPreview from "./grn/FefoPreview";
import SearchResults from "./grn/SearchResults";
import SelectedItemCard from "./grn/SelectedItemCard";
import CameraQRScanner from "./qr/CameraQRScanner";
import QRGenerator from "./qr/QRGenerator";

// ─── Types ───────────────────────────────────────────────────────────────────
import { Item, Batch } from "../types/items";

interface GRNRecord {
  grn: string;
  date: string;
  item: string;
  cat: "OPEX" | "CAPEX";
  batch: string;
  qty: string;
  supplier: string;
  invoice: string;
  by: string;
}

interface FormState {
  batchNo: string;
  qty: string;
  unit: string;
  mfgDate: string;
  expiryDate: string;
  expiryType: string;
  supplierName: string;
  invoiceNo: string;
  invoiceDate: string;
  pricePerUnit: string;
  storeLocation: string;
  receivedBy: string;
  notes: string;
}

// Items are fetched from the server; remove local ITEMS_DB mock

const GRN_HISTORY: GRNRecord[] = [
  { grn: "GRN-2025-0023", date: "2025-04-21", item: "Brahmi Tail", cat: "OPEX", batch: "BRT-2025-D1", qty: "10,000 ml", supplier: "Kottakkal AVS", invoice: "INV-2025-0044", by: "Ramesh Kumar" },
  { grn: "GRN-2025-0022", date: "2025-04-18", item: "Cotton Bandages (2 inch)", cat: "OPEX", batch: "JJ-CON-2025-02", qty: "500 Rolls", supplier: "J&J Medical", invoice: "JJ-INV-0881", by: "Ramesh Kumar" },
  { grn: "GRN-2025-0021", date: "2025-04-15", item: "Ashwagandha Churna", cat: "OPEX", batch: "ASH-2025-B1", qty: "1,800 g", supplier: "Dabur India Ltd.", invoice: "DAB-2025-1120", by: "Ramesh Kumar" },
  { grn: "GRN-2025-0020", date: "2025-04-10", item: "Guduchi Churna", cat: "OPEX", batch: "GUD-2024-J2", qty: "1,700 g", supplier: "Charak Pharma", invoice: "CHK-2025-0334", by: "Ramesh Kumar" },
  { grn: "GRN-2025-0019", date: "2025-04-08", item: "Split AC 1.5 Ton", cat: "CAPEX", batch: "DK-AC-002", qty: "1 Pcs", supplier: "Daikin India", invoice: "DK-INV-0092", by: "Ramesh Kumar" },
  { grn: "GRN-2025-0018", date: "2025-04-02", item: "Surgical Gloves (M)", cat: "OPEX", batch: "ANS-2025-M02", qty: "500 Pairs", supplier: "Ansell Healthcare", invoice: "ANS-INV-2025-11", by: "Ramesh Kumar" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const daysUntil = (d: string) =>
  Math.round((new Date(d).getTime() - new Date().getTime()) / 86400000);

// ─── Component ───────────────────────────────────────────────────────────────

export default function AyurVaidyaGRN({ grnView }: { grnView?: 'grn' | 'qr' }) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [successGRNId, setSuccessGRNId] = useState("");
  const [grnHistory, setGrnHistory] = useState<GRNRecord[]>([]);
  const [remoteResults, setRemoteResults] = useState<Item[]>([]);

  const [form, setForm] = useState<FormState>({
    batchNo: "", qty: "", unit: "ml", mfgDate: "", expiryDate: "",
    expiryType: "date", supplierName: "", invoiceNo: "", invoiceDate: "",
    pricePerUnit: "", storeLocation: "Main pharmacy store",
    receivedBy: "Ramesh Kumar", notes: "",
  });

  const searchRef = useRef<HTMLDivElement>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch GRN history when user views history tab
  useEffect(() => {
    if (activeTab !== "history") return;
    let mounted = true;
    fetch('/api/grn')
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (Array.isArray(data)) setGrnHistory(data as GRNRecord[])
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [activeTab]);

  // Debounced server-side search for items
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setRemoteResults([]);
      return;
    }
    let mounted = true;
    const t = setTimeout(() => {
      fetch(`/api/items?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          if (!mounted) return;
          if (Array.isArray(data)) setRemoteResults(data as Item[])
        })
        .catch(() => {
          if (mounted) setRemoteResults([])
        })
    }, 300);
    return () => { mounted = false; clearTimeout(t) }
  }, [searchQuery]);

  // If another panel requested opening GRN for a specific item, consume it now
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('openItemForGRN')
      if (pending) {
        sessionStorage.removeItem('openItemForGRN')
        // prefill search / select item
        selectItemById(pending)
        setActiveTab('new')
      }
    } catch (e) {}
  }, [])

  // Also listen for runtime requests from other components (QRGenerator, DetailPanel)
  useEffect(() => {
    function onOpenGrn(e: any) {
      try {
        const id = e?.detail ?? null;
        if (id) {
          selectItemById(String(id))
          setActiveTab('new')
        }
      } catch (err) {}
    }
    window.addEventListener('open-grn', onOpenGrn as EventListener)
    return () => window.removeEventListener('open-grn', onOpenGrn as EventListener)
  }, [])

  const handleSave = async () => {
    if (!selectedItem) return;
    const payload = {
      itemCode: selectedItem.id,
      batchNo: form.batchNo,
      qty: Number(form.qty || 0),
      unit: form.unit,
      mfgDate: form.mfgDate || null,
      expiryDate: form.expiryDate || null,
      supplierName: form.supplierName || null,
      invoiceNo: form.invoiceNo || null,
      invoiceDate: form.invoiceDate || null,
      pricePerUnit: form.pricePerUnit || null,
      storeLocation: form.storeLocation || null,
      receivedBy: form.receivedBy || null,
      notes: form.notes || null,
    }

    try {
      const res = await fetch('/api/grn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
        if (res.ok && data.grn) {
        setSuccessGRNId(data.grn)

        // If server returned updated item, map and set it locally
        if (data.item) {
          try {
            const it = data.item
            const mapped: Item = {
              id: it.itemCode || selectedItem.id,
              name: it.itemName || selectedItem.name,
              sub: it.itemType || selectedItem?.sub || '',
              category: it.category || selectedItem?.category || 'OPEX',
              subcat: it.subCategory || selectedItem?.subcat || '',
              unit: it.unit || selectedItem?.unit || form.unit,
              dept: '',
              currentStock: Array.isArray(it.itemBatches)
                ? it.itemBatches.reduce((s: number, b: any) => s + Number(b.quantityAvailable ?? b.quantityReceived ?? 0), 0)
                : selectedItem.currentStock,
              minStock: Number(it.minStockLevel || selectedItem?.minStock || 0),
              batches: Array.isArray(it.itemBatches)
                ? it.itemBatches.map((b: any) => ({ batchNo: b.batchNumber, qty: Number(b.quantityAvailable ?? b.quantityReceived ?? 0), expiry: b.expiryDate ? b.expiryDate.split('T')[0] : null }))
                : selectedItem.batches,
            }
            setSelectedItem(mapped)
          } catch (e) {}
        }

        // If server returned grnEntry, prepend it to history for immediate visibility
        if (data.grnEntry) {
          try {
            const r = data.grnEntry
            const row: GRNRecord = {
              grn: r.grnNumber || data.grn,
              date: r.grnDate ? r.grnDate.split('T')[0] : new Date().toISOString().split('T')[0],
              item: r.batchNumber ? r.batchNumber : (selectedItem?.name || ''),
              cat: selectedItem?.category || 'OPEX',
              batch: r.batchNumber || (form.batchNo || ''),
              qty: `${r.quantityReceived || form.qty} ${r.unit || form.unit}`,
              supplier: (r.supplier && r.supplier.supplierName) || (form.supplierName || ''),
              invoice: r.invoiceNumber || form.invoiceNo || '',
              by: (r.receiver && r.receiver.fullName) || (form.receivedBy || ''),
            }
            setGrnHistory((prev) => [row, ...prev].slice(0, 200))
          } catch (e) {}
        }

        setCurrentStep(4)
      } else {
        alert('Failed to save GRN: ' + (data?.error || 'unknown'))
      }
    } catch (err) {
      alert('Error saving GRN')
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const searchResults = remoteResults;

  const qty = parseInt(form.qty) || 0;
  const price = parseFloat(form.pricePerUnit) || 0;
  const newStock = selectedItem ? selectedItem.currentStock + qty : 0;
  const invoiceTotal = qty > 0 && price > 0 ? qty * price : 0;

  const shelfLife = (() => {
    if (!form.mfgDate || !form.expiryDate) return null;
    const months = Math.round(
      (new Date(form.expiryDate).getTime() - new Date(form.mfgDate).getTime()) /
        (1000 * 60 * 60 * 24 * 30.44)
    );
    const days = daysUntil(form.expiryDate);
    return { months, days };
  })();

  const batchExists =
    selectedItem && form.batchNo.trim()
      ? selectedItem.batches.some(
          (b) => !!(b && b.batchNo) && b.batchNo.toLowerCase() === form.batchNo.toLowerCase()
        )
      : false;

  const fefoList = (() => {
    if (!selectedItem || selectedItem.category !== "OPEX") return [];
    const batches: Array<Batch & { isNew?: boolean }> = [
      ...selectedItem.batches.filter((b) => b.expiry).map((b) => ({ ...b, isNew: false })),
    ];
    if (form.batchNo && form.expiryDate && qty > 0) {
      batches.push({ batchNo: form.batchNo, qty, expiry: form.expiryDate, isNew: true });
    }
    return batches.sort((a, b) => {
      if (!a.expiry) return 1;
      if (!b.expiry) return -1;
      return new Date(a.expiry).getTime() - new Date(b.expiry).getTime();
    });
  })();

  const expiryInfo = (() => {
    if (!form.expiryDate) return { display: "—", cls: "" };
    const d = fmtDate(form.expiryDate);
    const days = daysUntil(form.expiryDate);
    if (days < 30) return { display: `${d} (${days}d)`, cls: "red" };
    if (days < 90) return { display: `${d} (${days}d)`, cls: "amber" };
    return { display: d, cls: "green" };
  })();

  // ── Handlers ──────────────────────────────────────────────────────────────

  const selectItem = (item: Item) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setShowResults(false);
    setForm((f) => ({
      ...f,
      unit: item.unit,
      expiryType: item.category === "CAPEX" ? "none" : "date",
    }));
  };

  // Fetch item detail by code and select it (used for deep-linking from DetailPanel)
  function selectItemById(id: string) {
    if (!id) return;
    fetch(`/api/items/detail?code=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data || data.error) return;
        const mapped: Item = {
          id: data.itemCode,
          name: data.itemName,
          sub: data.itemType || '',
          category: data.category || 'OPEX',
          subcat: data.subCategory || '',
          unit: data.unit || 'ml',
          dept: '',
          currentStock: Array.isArray(data.itemBatches) ? data.itemBatches.reduce((s: number, b: any) => s + Number(b.quantityAvailable ?? b.quantityReceived ?? 0), 0) : 0,
          minStock: Number(data.minStockLevel || 0),
          batches: Array.isArray(data.itemBatches) ? data.itemBatches.map((b: any) => ({ batchNo: b.batchNumber, qty: Number(b.quantityAvailable ?? b.quantityReceived ?? 0), expiry: b.expiryDate ? b.expiryDate.split('T')[0] : null })) : [],
        };
        selectItem(mapped);
      })
      .catch(() => {});
  }

  const clearItem = () => {
    setSelectedItem(null);
    setSearchQuery("");
    setShowResults(false);
  };

  const simulateScan = () => {
    // Fetch item detail from server instead of using local mock
    fetch(`/api/items/detail?code=${encodeURIComponent("MED-003")}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data || data.error) return;
        const mapped: Item = {
          id: data.itemCode,
          name: data.itemName,
          sub: data.itemType || '',
          category: data.category || 'OPEX',
          subcat: data.subCategory || '',
          unit: data.unit || 'ml',
          dept: '',
          currentStock: Array.isArray(data.itemBatches) ? data.itemBatches.reduce((s: number, b: any) => s + Number(b.quantityAvailable ?? b.quantityReceived ?? 0), 0) : 0,
          minStock: Number(data.minStockLevel || 0),
          batches: Array.isArray(data.itemBatches) ? data.itemBatches.map((b: any) => ({ batchNo: b.batchNumber, qty: Number(b.quantityAvailable ?? b.quantityReceived ?? 0), expiry: b.expiryDate ? b.expiryDate.split('T')[0] : null })) : [],
        }
        selectItem(mapped)
      }).catch(() => {})
  };

  const resetAll = () => {
    setSelectedItem(null);
    setSearchQuery("");
    setShowResults(false);
    setForm({
      batchNo: "", qty: "", unit: "ml", mfgDate: "", expiryDate: "",
      expiryType: "date", supplierName: "", invoiceNo: "", invoiceDate: "",
      pricePerUnit: "", storeLocation: "Main pharmacy store",
      receivedBy: "Ramesh Kumar", notes: "",
    });
    setCurrentStep(1);
    setActiveTab("new");
  };

  const goStep = (n: 1 | 2 | 3 | 4) => setCurrentStep(n);

  const handleTabSwitch = (tab: "new" | "history") => {
    setActiveTab(tab);
    if (tab === "new") setCurrentStep(currentStep);
  };

  // ── Step indicator helpers ────────────────────────────────────────────────

  const stepState = (i: number) => {
    if (i < currentStep) return "done";
    if (i === currentStep) return "active";
    return "idle";
  };

  const validateStep2 = () => {
    const errs: string[] = [];
    if (!form.batchNo || !form.batchNo.trim()) errs.push('Batch number is required');
    if (!form.qty || Number(form.qty) <= 0) errs.push('Quantity must be greater than zero');
    if (form.expiryType !== 'none' && !form.expiryDate) errs.push('Expiry date is required');
    if (!form.mfgDate) errs.push('Manufacturing date is required');
    if (!form.supplierName || !form.supplierName.trim()) errs.push('Supplier name is required');
    if (!form.invoiceNo || !form.invoiceNo.trim()) errs.push('Invoice / Challan number is required');
    if (errs.length) {
      alert(errs.join('\n'))
      return false
    }
    return true
  }

  // ── Confirm screen data ───────────────────────────────────────────────────

  const confirmRows = selectedItem
    ? {
        item: [
          ["Item name", selectedItem.name, ""],
          ["Item ID", selectedItem.id, ""],
          ["Batch number", form.batchNo || "—", "mono"],
          ["Quantity", `${qty.toLocaleString()} ${form.unit}`, "green"],
          ["Mfg date", fmtDate(form.mfgDate), ""],
          ["Expiry date", fmtDate(form.expiryDate), ""],
          ["Store", form.storeLocation, ""],
          ["Stock change", `${selectedItem.currentStock.toLocaleString()} → ${newStock.toLocaleString()} ${form.unit}`, "green"],
        ],
        supplier: [
          ["Supplier", form.supplierName || "—", ""],
          ["Invoice no.", form.invoiceNo || "—", ""],
          ["Invoice date", fmtDate(form.invoiceDate), ""],
          ["Price per unit", price ? `₹${price.toLocaleString()}` : "—", ""],
          ["Total value", price && qty ? `₹${(price * qty).toLocaleString()}` : "—", ""],
          ["Received by", form.receivedBy, ""],
        ],
      }
    : { item: [], supplier: [] };

  // ─── Render ─────────────────────────────────────────────────────────────

  // If host requested QR generator view, render it as a focused panel
  if (grnView === 'qr') {
    return (
      <>
        <style>{CSS}</style>
        <div className="ay-root">
          <div className="main">
            <div className="tab-bar"><div className={`tab active`}>QR Generator</div></div>
            <div className="content">
              <div className="form-panel">
                <QRGenerator />
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="ay-root">


        {/* ── Main ────────────────────────────────────────────────────── */}
        <div className="main">

          {/* Topbar */}
          
          {/* Tab bar */}
          <div className="tab-bar">
            <div className={`tab ${activeTab === "new" ? "active" : ""}`} onClick={() => handleTabSwitch("new")}>New GRN entry</div>
            <div className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => handleTabSwitch("history")}>GRN history</div>
          </div>

          {/* Steps bar */}
          {activeTab === "new" && currentStep !== 4 && (
            <div className="steps-bar">
              {[1, 2, 3].map((i) => (
                <div key={i} className="step-item-wrap">
                  <div className="step-item">
                    <div className={`step-num ${stepState(i)}`}>
                      {stepState(i) === "done" ? "✓" : i}
                    </div>
                    <div className={`step-label ${stepState(i)}`}>
                      {["Find item", "Enter batch details", "Confirm & save"][i - 1]}
                    </div>
                  </div>
                  {i < 3 && (
                    <div className="step-line">
                      <div className="step-line-fill" style={{ width: currentStep > i ? "100%" : "0%" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="content">

            {/* ── Form panel ────────────────────────────────────────── */}
            <div className="form-panel">

              {/* HISTORY VIEW */}
              {activeTab === "history" && (
                <div className="form-card anim-in">
                  <div className="fc-head">
                    <div className="fc-title">Recent GRN entries</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="text" placeholder="Search GRNs…"
                        style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", fontFamily: "var(--sans)", fontSize: 12, outline: "none", background: "var(--bg)", color: "var(--text)" }}
                      />
                      <button style={{ padding: "6px 12px", borderRadius: "var(--r-sm)", fontFamily: "var(--sans)", fontSize: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-mid)", cursor: "pointer" }}>
                        ↓ Export
                      </button>
                    </div>
                  </div>
                  <div className="fc-body" style={{ padding: 0 }}>
                    <table className="grn-table">
                      <thead>
                        <tr>
                          <th>GRN #</th><th>Date</th><th>Item</th><th>Category</th>
                          <th>Batch</th><th>Qty received</th><th>Supplier</th><th>Invoice</th><th>Recorded by</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grnHistory.length > 0 ? grnHistory.map((r) => (
                          <tr key={r.grn}>
                            <td className="grn-mono">{r.grn}</td>
                            <td className="grn-mono">{fmtDate(r.date)}</td>
                            <td style={{ fontWeight: 500 }}>{r.item}</td>
                            <td><span className={`grn-badge ${r.cat === "OPEX" ? "gb-opex" : "gb-capex"}`}>{r.cat}</span></td>
                            <td className="grn-mono">{r.batch}</td>
                            <td className="grn-mono" style={{ color: "var(--green)" }}>{r.qty}</td>
                            <td>{r.supplier}</td>
                            <td className="grn-mono">{r.invoice}</td>
                            <td style={{ color: "var(--text-dim)" }}>{r.by}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 20 }}>No GRN records found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── STEP 1 ── Find item ───────────────────────────────── */}
              {activeTab === "new" && currentStep === 1 && (
                <div>
                  <div className="form-card anim-in">
                    <div className="fc-head">
                      <div className="fc-title"><div className="fc-step-dot">1</div>Find item to receive stock for</div>
                    </div>
                    <div className="fc-body">
                      <div className="scan-row" ref={searchRef}>
                        <div className="scan-input-wrap">
                          <span className="scan-icon">🔍</span>
                          <input
                            type="text"
                            className="scan-input"
                            placeholder="Scan QR code, barcode, or type item name / ID…"
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setShowResults(true);
                              if (!e.target.value.trim()) setSelectedItem(null);
                            }}
                            onFocus={() => searchQuery.trim() && setShowResults(true)}
                            autoComplete="off"
                          />
                        </div>
                        <button className="scan-btn" onClick={() => setShowScanner(true)}>📷 Scan QR</button>
                      </div>

                      {/* Search results dropdown (moved out of scan-row so it flows below the row) */}
                      {showResults && searchResults.length > 0 && (
                        <SearchResults results={searchResults} onSelect={selectItem} />
                      )}

                      {/* Selected item display */}
                      {selectedItem && (
                        <SelectedItemCard item={selectedItem} onChange={clearItem} />
                      )}
                    </div>
                  </div>

                  {showScanner && (
                    <CameraQRScanner onDetected={(code) => { setShowScanner(false); selectItemById(code) }} onClose={() => setShowScanner(false)} />
                  )}

                  <div className="action-row" style={{ marginTop: 4 }}>
                    <button className="btn-cancel" onClick={resetAll}>Cancel</button>
                    <button className="btn-next" disabled={!selectedItem} onClick={() => goStep(2)}>
                      Next: Enter batch details →
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 2 ── Batch details ───────────────────────────── */}
              {activeTab === "new" && currentStep === 2 && selectedItem && (
                <div>
                  {/* Item reminder */}
                  <SelectedItemCard item={selectedItem} onChange={() => goStep(1)} style={{ marginBottom: 0, cursor: "default" }} changeLabel="← Change item" />

                  {/* Batch & quantity card */}
                  <div className="form-card anim-in" style={{ animationDelay: "0.04s" }}>
                    <div className="fc-head">
                      <div className="fc-title"><div className="fc-step-dot">2</div>Batch &amp; quantity details</div>
                    </div>
                    <div className="fc-body">
                      <div className="field-grid g2" style={{ marginBottom: 14 }}>
                        <div className="field">
                          <label>Batch number <span className="req">*</span></label>
                          <input type="text" placeholder="e.g. BRT-2025-D1" value={form.batchNo}
                            onChange={(e) => setForm((f) => ({ ...f, batchNo: e.target.value }))} />
                          <div className="field-hint">From supplier invoice or printed on packaging</div>
                          {batchExists && (
                            <div className="batch-warn-box show">
                              <strong>⚠ Batch already in system</strong>
                              This batch number exists for this item. Saving will add quantity to the existing batch record. Confirm if this is the same physical batch.
                            </div>
                          )}
                        </div>
                        <div className="field">
                          <label>Quantity received <span className="req">*</span></label>
                          <div style={{ display: "flex", gap: 8 }}>
                            <input type="number" placeholder="0" style={{ flex: 1 }} min={1} value={form.qty}
                              onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} />
                            <select style={{ width: 80 }} value={form.unit}
                              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
                              {["ml", "g", "tab", "cap", "Pcs", "Rolls", "Pairs"].map((u) => <option key={u}>{u}</option>)}
                            </select>
                          </div>
                          {qty > 0 && selectedItem && (
                            <div className="field-computed">
                              Stock after GRN: {newStock.toLocaleString()} {form.unit}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="field-grid g3" style={{ marginBottom: 14 }}>
                        <div className="field">
                          <label>Manufacturing date <span className="req">*</span></label>
                          <input type="date" value={form.mfgDate}
                            onChange={(e) => setForm((f) => ({ ...f, mfgDate: e.target.value }))} />
                        </div>
                        <div className="field">
                          <label>Expiry date <span className="req">*</span></label>
                          <input type="date" value={form.expiryDate}
                            disabled={form.expiryType === "none"}
                            style={form.expiryType === "none" ? { background: "var(--bg)" } : {}}
                            onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} />
                          {shelfLife && (
                            <div className={`shelf-indicator ${shelfLife.days > 180 ? "shelf-good" : shelfLife.days > 60 ? "shelf-ok" : "shelf-warn"}`}>
                              Shelf life: {shelfLife.months} months &nbsp;·&nbsp; {shelfLife.days} days remaining
                            </div>
                          )}
                        </div>
                        <div className="field">
                          <label>Expiry type</label>
                          <select value={form.expiryType}
                            onChange={(e) => setForm((f) => ({ ...f, expiryType: e.target.value }))}>
                            <option value="date">Fixed date</option>
                            <option value="none">No expiry (CAPEX)</option>
                          </select>
                        </div>
                      </div>

                      {/* FEFO preview */}
                      {fefoList.length > 0 && (
                        <FefoPreview fefoList={fefoList} unit={selectedItem.unit} />
                      )}
                    </div>
                  </div>

                  {/* Supplier card */}
                  <div className="form-card anim-in" style={{ animationDelay: "0.08s" }}>
                    <div className="fc-head">
                      <div className="fc-title">Supplier &amp; invoice details</div>
                    </div>
                    <div className="fc-body">
                      <div className="field-grid g2" style={{ marginBottom: 14 }}>
                        <div className="field">
                          <label>Supplier name <span className="req">*</span></label>
                          <input type="text" placeholder="e.g. Kottakkal Arya Vaidya Sala" value={form.supplierName}
                            onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))} />
                        </div>
                        <div className="field">
                          <label>Invoice / Challan number <span className="req">*</span></label>
                          <input type="text" placeholder="e.g. INV-2025-0892" value={form.invoiceNo}
                            onChange={(e) => setForm((f) => ({ ...f, invoiceNo: e.target.value }))} />
                        </div>
                      </div>
                      <div className="field-grid g3">
                        <div className="field">
                          <label>Invoice date</label>
                          <input type="date" value={form.invoiceDate}
                            onChange={(e) => setForm((f) => ({ ...f, invoiceDate: e.target.value }))} />
                        </div>
                        <div className="field">
                          <label>Price per unit (₹)</label>
                          <input type="number" placeholder="0.00" min={0} value={form.pricePerUnit}
                            onChange={(e) => setForm((f) => ({ ...f, pricePerUnit: e.target.value }))} />
                        </div>
                        <div className="field">
                          <label>Total invoice value (₹)</label>
                          <input type="text" readOnly
                            style={{ background: "var(--bg)", color: "var(--text-dim)" }}
                            value={invoiceTotal > 0 ? `₹${invoiceTotal.toLocaleString()}` : ""} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Storage card */}
                  <div className="form-card anim-in" style={{ animationDelay: "0.12s" }}>
                    <div className="fc-head">
                      <div className="fc-title">Storage location &amp; notes</div>
                    </div>
                    <div className="fc-body">
                      <div className="field-grid g2" style={{ marginBottom: 14 }}>
                        <div className="field">
                          <label>Store location</label>
                          <select value={form.storeLocation}
                            onChange={(e) => setForm((f) => ({ ...f, storeLocation: e.target.value }))}>
                            {["Main pharmacy store", "Panchakarma store", "Shalakya store", "IPD store", "Cold storage (2–8°C)", "Controlled temperature"]
                              .map((s) => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="field">
                          <label>Received by</label>
                          <input type="text" value={form.receivedBy}
                            onChange={(e) => setForm((f) => ({ ...f, receivedBy: e.target.value }))} />
                        </div>
                      </div>
                      <div className="field">
                        <label>Notes / remarks</label>
                        <textarea rows={2} value={form.notes} style={{ resize: "vertical" }}
                          placeholder="Any quality observations, damaged packaging, partial delivery notes…"
                          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                      </div>
                    </div>
                  </div>

                  <div className="action-row">
                    <button className="btn-back" onClick={() => goStep(1)}>← Back</button>
                    <button className="btn-cancel" onClick={resetAll}>Cancel</button>
                    <button className="btn-next" onClick={() => { if (validateStep2()) goStep(3) }}>Next: Review &amp; confirm →</button>
                  </div>
                </div>
              )}

              {/* ── STEP 3 ── Confirm & save ──────────────────────────── */}
              {activeTab === "new" && currentStep === 3 && selectedItem && (
                <div>
                  <div className="form-card anim-in" style={{ animationDelay: "0.04s" }}>
                    <div className="fc-head">
                      <div className="fc-title"><div className="fc-step-dot">3</div>Review &amp; confirm GRN</div>
                      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>GRN # will be auto-generated on save</span>
                    </div>
                    <div className="fc-body">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                          <div className="confirm-section-title">Item &amp; batch</div>
                          {confirmRows.item.map(([l, v, c]) => (
                            <div key={l} className="confirm-row">
                              <span style={{ color: "var(--text-dim)" }}>{l}</span>
                              <span style={{ color: c === "green" ? "var(--green)" : c === "mono" ? "var(--mono)" : "var(--text)", fontWeight: 500, textAlign: "right" }}>{v}</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div className="confirm-section-title">Supplier &amp; invoice</div>
                          {confirmRows.supplier.map(([l, v]) => (
                            <div key={l} className="confirm-row">
                              <span style={{ color: "var(--text-dim)" }}>{l}</span>
                              <span style={{ color: "var(--text)", fontWeight: 500, textAlign: "right" }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* What happens on save */}
                  <div className="form-card anim-in" style={{ animationDelay: "0.08s", borderColor: "rgba(26,107,60,0.35)" }}>
                    <div className="fc-head" style={{ background: "var(--green-light)" }}>
                      <div className="fc-title" style={{ color: "var(--green)" }}>What happens when you save this GRN</div>
                    </div>
                    <div className="fc-body">
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {[
                          { label: "Stock increases live", desc: `${selectedItem.name} stock will increase from ${selectedItem.currentStock.toLocaleString()} to ${newStock.toLocaleString()} ${form.unit}.` },
                          { label: "New batch added to registry", desc: `Batch ${form.batchNo || "—"} will be added as batch #${selectedItem.batches.length + 1} for this item.` },
                          { label: "Expiry tracking begins", desc: form.expiryDate ? `Alert will fire ${daysUntil(form.expiryDate)} days from now (${fmtDate(form.expiryDate)}).` : "No expiry tracked for this item (CAPEX asset)." },
                          { label: "QR label ready to print", desc: "A QR sticker for this batch will be generated. Print and stick on the shelf." },
                        ].map((item, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 12.5 }}>
                            <div className="confirm-num">{i + 1}</div>
                            <div>
                              <strong style={{ color: "var(--text)" }}>{item.label}</strong>
                              <br /><span style={{ color: "var(--text-dim)" }}>{item.desc}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="action-row">
                    <button className="btn-back" onClick={() => goStep(2)}>← Back</button>
                    <button className="btn-cancel" onClick={resetAll}>Cancel</button>
                    <button className="btn-save" onClick={handleSave}>✓ Save GRN &amp; update stock</button>
                  </div>
                </div>
              )}

              {/* ── STEP 4 ── Success ─────────────────────────────────── */}
              {activeTab === "new" && currentStep === 4 && selectedItem && (
                <div className="success-card anim-in">
                  <div className="sc-icon">✓</div>
                  <div className="sc-title">GRN recorded successfully</div>
                  <div className="sc-sub">
                    {successGRNId} saved. {selectedItem.name} stock increased by {qty.toLocaleString()} {selectedItem.unit}.{" "}
                    Batch {form.batchNo} is now tracked with FEFO ordering.
                  </div>
                  <div className="sc-actions">
                    <button className="sc-btn sc-btn-white" onClick={() => alert("Sending QR label to printer…")}>Print QR label</button>
                    <button className="sc-btn sc-btn-outline" onClick={resetAll}>Record another GRN</button>
                  </div>
                </div>
              )}

            </div>{/* /form-panel */}

            {/* ── Preview panel ──────────────────────────────────────── */}
            {activeTab === "new" && (
              <div className="preview-panel">
                <div className="pp-head">
                  <div className="pp-title">Live preview</div>
                  <div className="pp-sub">Updates as you fill the form</div>
                </div>
                <div className="pp-body">
                  {!selectedItem ? (
                    <div className="preview-empty">
                      <div className="pe-icon">↓</div>
                      <div className="pe-text">Select an item and fill batch details to see a live preview of what will change</div>
                    </div>
                  ) : (
                    <>
                      <div className="stock-change-box">
                        <div className="scb-label">Stock after this GRN</div>
                        <div className="scb-values">
                          <div className="scb-old">{selectedItem.currentStock.toLocaleString()}</div>
                          <div className="scb-arrow">→</div>
                          <div className="scb-new">{newStock.toLocaleString()}</div>
                        </div>
                        <div className="scb-unit">{selectedItem.unit}</div>
                        {qty > 0 && <div className="scb-diff">+{qty.toLocaleString()} {selectedItem.unit}</div>}
                      </div>

                      <PreviewSection title="Item" rows={[
                        ["Name", selectedItem.name],
                        ["Category", `${selectedItem.category} · ${selectedItem.subcat}`],
                        ["Department", selectedItem.dept],
                        ["Current stock", `${selectedItem.currentStock.toLocaleString()} ${selectedItem.unit}`, "mono"],
                        ["Min stock level", `${selectedItem.minStock.toLocaleString()} ${selectedItem.unit}`, "mono"],
                      ]} />

                      <PreviewSection title="New batch" rows={[
                        ["Batch no.", form.batchNo || "—", "mono"],
                        ["Quantity", qty > 0 ? `+${qty.toLocaleString()} ${selectedItem.unit}` : "—", "green mono"],
                        ["Expiry date", expiryInfo.display, expiryInfo.cls],
                        ["Supplier", form.supplierName || "—"],
                        ["Invoice", form.invoiceNo || "—"],
                      ]} />

                      {
                        (() => {
                          const afterRows: [string, string, string?][] = [
                            ["Total batches", `${selectedItem.batches.length + 1} batches`],
                            ["New total stock", `${newStock.toLocaleString()} ${selectedItem.unit}`, "green mono"],
                          ];
                          if (form.expiryDate && daysUntil(form.expiryDate) < 90) {
                            afterRows.push(["⚠ Expiry alert", `Will trigger in ${daysUntil(form.expiryDate)}d`, "amber"]);
                          }
                          return <PreviewSection title="After saving" rows={afterRows} />;
                        })()
                      }
                    </>
                  )}
                </div>

                {selectedItem && (
                  <div className="pp-foot">
                    <div className="qr-preview">
                      <div className="qr-box">▦</div>
                      <div className="qr-id">{selectedItem.id}-{form.batchNo || "BATCH"}</div>
                      <div className="qr-name">{selectedItem.name}</div>
                      <button className="btn-print" onClick={() => alert("Sending QR label to printer…")}>Print QR sticker</button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>{/* /content */}
        </div>{/* /main */}
      </div>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────



// ─── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
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

.ay-root{font-family:var(--sans);background:var(--bg);color:var(--text);height:100%;overflow:visible;display:flex;width:100%}

/* Sidebar */
.sb{width:204px;min-width:204px;background:var(--green);display:flex;flex-direction:column;height:100%;position:relative;overflow:hidden}
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
.main{flex:1;display:flex;flex-direction:column;overflow:auto;height:100%}

/* Topbar */
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

/* Steps bar */
.steps-bar{background:var(--surface);border-bottom:1px solid var(--border);padding:12px 22px;flex-shrink:0;display:flex;align-items:center;gap:0}
.step-item-wrap{display:flex;align-items:center;flex:1}
.step-item-wrap:last-child{flex:none}
.step-item{display:flex;align-items:center;gap:10px;flex-shrink:0}
.step-num{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0;transition:all 0.25s}
.step-num.done{background:var(--green);color:#fff}
.step-num.active{background:var(--green);color:#fff;box-shadow:0 0 0 4px rgba(26,107,60,0.18)}
.step-num.idle{background:var(--bg);color:var(--text-dim);border:1.5px solid var(--border)}
.step-label{font-size:12px;font-weight:500;transition:color 0.25s}
.step-label.active{color:var(--green)}
.step-label.done{color:var(--green-mid)}
.step-label.idle{color:var(--text-mute)}
.step-line{flex:1;height:1.5px;background:var(--border);margin:0 14px;border-radius:1px;overflow:hidden;position:relative;min-width:20px}
.step-line-fill{position:absolute;left:0;top:0;height:100%;background:var(--green);border-radius:1px;transition:width 0.4s ease}

/* Content area */
.content{flex:1;display:flex;overflow:visible}

/* Left: form panel */
.form-panel{flex:1;overflow-y:auto;padding:22px;display:flex;flex-direction:column;gap:18px}
.form-panel::-webkit-scrollbar{width:4px}
.form-panel::-webkit-scrollbar-thumb{background:var(--border-2);border-radius:2px}

/* Right: preview panel */
.preview-panel{width:300px;min-width:300px;background:var(--surface);border-left:1px solid var(--border);display:flex;flex-direction:column;overflow:auto;flex-shrink:0}
.pp-head{padding:14px 16px;border-bottom:1px solid var(--border);flex-shrink:0}
.pp-title{font-size:12px;font-weight:500;color:var(--text-mid)}
.pp-sub{font-size:11px;color:var(--text-mute);margin-top:2px}
.pp-body{flex:1;overflow-y:auto;padding:16px}
.pp-body::-webkit-scrollbar{width:3px}
.pp-body::-webkit-scrollbar-thumb{background:var(--border-2);border-radius:2px}
.pp-foot{padding:14px 16px;border-top:1px solid var(--border);flex-shrink:0}

/* Cards */
.form-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-xl);overflow:hidden}
.anim-in{animation:slideUp 0.28s ease both}
@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.fc-head{padding:13px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.fc-title{font-size:12.5px;font-weight:500;color:var(--text-mid);display:flex;align-items:center;gap:8px}
.fc-step-dot{width:20px;height:20px;border-radius:50%;background:var(--green);color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.fc-body{padding:16px}

/* Scan row */
.scan-row{display:flex;gap:10px;margin-bottom:12px;position:relative;flex-wrap:wrap}
.scan-input-wrap{position:relative;flex:1;min-width:200px}
.scan-input{width:100%;padding:10px 14px 10px 38px;border:1.5px solid var(--border);border-radius:var(--r-md);font-family:var(--sans);font-size:13px;color:var(--text);background:var(--surface);outline:none;transition:border-color 0.15s}
.scan-input:focus{border-color:var(--green)}
.scan-input::placeholder{color:var(--text-mute)}
.scan-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:15px;color:var(--text-dim);pointer-events:none}
.scan-btn{display:flex;align-items:center;gap:6px;padding:10px 16px;border-radius:var(--r-md);font-family:var(--sans);font-size:12.5px;font-weight:500;cursor:pointer;background:var(--green);color:#fff;border:1px solid var(--green);white-space:nowrap;transition:all 0.15s}
.scan-btn:hover{background:var(--green-mid)}

/* Search results dropdown */
.search-results{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);overflow:hidden;box-shadow:0 12px 32px rgba(0,0,0,0.12);margin-bottom:12px;animation:slideUp 0.18s ease}
.sr-item{padding:10px 14px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);transition:background 0.1s}
.sr-item:last-child{border-bottom:none}
.sr-item:hover{background:var(--green-light)}
.sr-name{font-size:13px;font-weight:500;color:var(--text)}
.sr-sub{font-size:11px;color:var(--text-dim);margin-top:1px}
.sr-right{text-align:right}
.sr-stock{font-family:var(--mono);font-size:12px;color:var(--text)}
.sr-cat{font-size:10.5px;color:var(--text-dim)}

/* Selected item card */
.selected-item{background:var(--green-light);border:1.5px solid rgba(26,107,60,0.3);border-radius:var(--r-lg);padding:12px 14px;display:flex;align-items:center;justify-content:space-between;margin-bottom:0}
.si-name{font-size:13px;font-weight:500;color:var(--green)}
.si-sub{font-size:11px;color:var(--green-mid);margin-top:2px}
.si-badges{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}
.si-change{font-size:11px;color:var(--green-mid);cursor:pointer;text-decoration:underline;white-space:nowrap;margin-left:12px}

/* Form fields */
.field-grid{display:grid;gap:14px}
.g2{grid-template-columns:1fr 1fr}
.g3{grid-template-columns:1fr 1fr 1fr}
.g1{grid-template-columns:1fr}
.field{display:flex;flex-direction:column;gap:5px}
.field label{font-size:11.5px;font-weight:500;color:var(--text-mid)}
.req{color:var(--red);margin-left:2px}
.field input,.field select,.field textarea{padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--r-md);font-family:var(--sans);font-size:13px;color:var(--text);background:var(--surface);outline:none;transition:border-color 0.15s,background 0.15s}
.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--green);background:var(--surface)}
.field input::placeholder,.field textarea::placeholder{color:var(--text-mute)}
.field-hint{font-size:10.5px;color:var(--text-mute);margin-top:3px}
.field-computed{font-size:10.5px;color:var(--green-mid);margin-top:3px;font-weight:500}
.field-warn{font-size:10.5px;color:var(--amber);margin-top:3px}

/* Batch warning box */
.batch-warn-box{background:var(--amber-light);border:1px solid rgba(146,64,14,0.25);border-radius:var(--r-md);padding:10px 12px;font-size:12px;color:var(--amber);display:none;margin-top:6px}
.batch-warn-box.show{display:block}
.batch-warn-box strong{display:block;margin-bottom:3px}

/* FEFO preview */
.fefo-preview{background:var(--green-light);border:1px solid rgba(26,107,60,0.2);border-radius:var(--r-md);padding:10px 12px;margin-top:4px}
.fefo-title{font-size:11px;font-weight:600;color:var(--green-mid);margin-bottom:6px;letter-spacing:0.3px;text-transform:uppercase}
.fefo-list{display:flex;flex-direction:column;gap:4px}
.fefo-row{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--text-mid)}
.fefo-pos{width:18px;height:18px;border-radius:50%;background:var(--green);color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.fefo-pos.new{background:var(--blue);animation:pulseBlue 1.2s ease infinite}
@keyframes pulseBlue{0%,100%{box-shadow:0 0 0 0 rgba(24,95,165,0.35)}50%{box-shadow:0 0 0 4px rgba(24,95,165,0)}}
.fefo-name{flex:1}
.fefo-exp{font-family:var(--mono);font-size:11px;color:var(--text-dim)}
.fefo-tag{font-size:9px;padding:1px 6px;border-radius:10px;font-weight:600}
.fefo-tag.fefo{background:var(--green);color:#fff}
.fefo-tag.new-b{background:var(--blue);color:#fff}

/* Action buttons */
.action-row{display:flex;gap:10px;align-items:center}
.btn-cancel{padding:10px 20px;border-radius:var(--r-md);font-family:var(--sans);font-size:13px;font-weight:500;cursor:pointer;background:transparent;color:var(--text-dim);border:1.5px solid var(--border);transition:all 0.15s}
.btn-cancel:hover{border-color:var(--border-2);color:var(--text)}
.btn-back{padding:10px 20px;border-radius:var(--r-md);font-family:var(--sans);font-size:13px;font-weight:500;cursor:pointer;background:var(--surface);color:var(--text-mid);border:1.5px solid var(--border);transition:all 0.15s}
.btn-back:hover{border-color:var(--green-mid);color:var(--text)}
.btn-next{padding:10px 24px;border-radius:var(--r-md);font-family:var(--sans);font-size:13px;font-weight:500;cursor:pointer;background:var(--green);color:#fff;border:1.5px solid var(--green);transition:all 0.15s;margin-left:auto}
.btn-next:hover{background:var(--green-mid)}
.btn-next:disabled{background:var(--border-2);border-color:var(--border-2);color:var(--text-mute);cursor:not-allowed}
.btn-save{padding:10px 28px;border-radius:var(--r-md);font-family:var(--sans);font-size:13px;font-weight:500;cursor:pointer;background:var(--green);color:#fff;border:1.5px solid var(--green);transition:all 0.15s;margin-left:auto}
.btn-save:hover{background:var(--green-mid)}

/* Preview panel */
.preview-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;text-align:center;color:var(--text-mute)}
.pe-icon{font-size:32px;margin-bottom:10px;opacity:0.3}
.pe-text{font-size:12px;line-height:1.5}
.preview-section{margin-bottom:16px}
.ps-title{font-size:10px;font-weight:600;letter-spacing:0.7px;text-transform:uppercase;color:var(--text-dim);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border)}
.ps-row{display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:1px solid var(--border)}
.ps-row:last-child{border-bottom:none}
.ps-lbl{color:var(--text-dim)}
.ps-val{color:var(--text);font-weight:500;text-align:right}
.ps-val.green{color:var(--green)}
.ps-val.red{color:var(--red)}
.ps-val.amber{color:var(--amber)}
.ps-val.mono{font-family:var(--mono)}

/* Stock change box */
.stock-change-box{background:var(--green-light);border:1px solid rgba(26,107,60,0.2);border-radius:var(--r-md);padding:12px;margin-bottom:12px;text-align:center}
.scb-label{font-size:11px;color:var(--green-mid);margin-bottom:6px}
.scb-values{display:flex;align-items:center;justify-content:center;gap:10px}
.scb-old{font-family:var(--mono);font-size:18px;color:var(--text-dim)}
.scb-arrow{font-size:16px;color:var(--green-mid)}
.scb-new{font-family:var(--mono);font-size:22px;font-weight:500;color:var(--green)}
.scb-unit{font-size:11px;color:var(--green-mid);margin-top:3px}
.scb-diff{display:inline-block;margin-top:5px;padding:2px 8px;background:var(--green);color:#fff;border-radius:20px;font-size:11px;font-weight:500;font-family:var(--mono)}

/* QR preview */
.qr-preview{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:14px;text-align:center;margin-bottom:12px}
.qr-box{width:80px;height:80px;background:var(--bg);border:2px dashed var(--border-2);border-radius:var(--r-md);display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 10px}
.qr-id{font-family:var(--mono);font-size:13px;font-weight:500;color:var(--text);margin-bottom:3px}
.qr-name{font-size:11px;color:var(--text-dim);margin-bottom:8px}
.btn-print{width:100%;padding:7px;border-radius:var(--r-sm);font-family:var(--sans);font-size:12px;font-weight:500;cursor:pointer;background:transparent;color:var(--blue);border:1px solid rgba(24,95,165,0.3);transition:all 0.15s}
.btn-print:hover{background:var(--blue-light)}

/* Shelf life */
.shelf-indicator{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:var(--r-md);font-size:12px;margin-top:6px}
.shelf-good{background:var(--green-light);color:var(--green);border:1px solid rgba(26,107,60,0.2)}
.shelf-ok{background:var(--amber-light);color:var(--amber);border:1px solid rgba(146,64,14,0.2)}
.shelf-warn{background:var(--red-light);color:var(--red);border:1px solid rgba(185,28,28,0.2)}

/* GRN table */
.grn-table{width:100%;border-collapse:collapse;font-size:11.5px}
.grn-table th{background:var(--bg);padding:7px 10px;text-align:left;font-size:10px;font-weight:600;color:var(--text-dim);letter-spacing:0.4px;text-transform:uppercase;border-bottom:1px solid var(--border)}
.grn-table td{padding:8px 10px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:middle}
.grn-table tr:last-child td{border-bottom:none}
.grn-table tr:hover td{background:var(--green-light);cursor:pointer}
.grn-mono{font-family:var(--mono);font-size:11px}
.grn-badge{display:inline-block;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:500}
.gb-opex{background:var(--green-light);color:var(--green);border:1px solid rgba(26,107,60,0.2)}
.gb-capex{background:var(--blue-light);color:var(--blue);border:1px solid rgba(24,95,165,0.2)}

/* Success state */
.success-card{background:var(--green);border-radius:var(--r-xl);padding:32px 24px;text-align:center;color:#fff}
.sc-icon{font-size:48px;margin-bottom:16px}
.sc-title{font-size:20px;font-weight:600;margin-bottom:8px;font-family:var(--serif)}
.sc-sub{font-size:13px;color:rgba(255,255,255,0.75);line-height:1.6;margin-bottom:24px}
.sc-actions{display:flex;gap:10px;justify-content:center}
.sc-btn{padding:10px 20px;border-radius:var(--r-md);font-family:var(--sans);font-size:13px;font-weight:500;cursor:pointer;transition:all 0.15s}
.sc-btn-white{background:#fff;color:var(--green);border:none}
.sc-btn-white:hover{background:var(--green-light)}
.sc-btn-outline{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,0.4)}
.sc-btn-outline:hover{background:rgba(255,255,255,0.1)}

/* Tabs */
.tab-bar{background:var(--surface);border-bottom:1px solid var(--border);display:flex;padding:0 22px;flex-shrink:0}
.tab{padding:10px 20px;font-size:12.5px;cursor:pointer;color:var(--text-dim);border-bottom:2px solid transparent;margin-bottom:-1px;transition:color 0.15s}
.tab:hover{color:var(--text-mid)}
.tab.active{color:var(--green);border-bottom-color:var(--green);font-weight:500}

/* Badge */
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:10.5px;font-weight:500;white-space:nowrap}
.badge-opex{background:var(--green-light);color:var(--green);border:1px solid rgba(26,107,60,0.2)}
.badge-capex{background:var(--blue-light);color:var(--blue);border:1px solid rgba(24,95,165,0.2)}
.badge-sub{background:var(--bg);color:var(--text-mid);border:1px solid var(--border)}

/* Confirm screen */
.confirm-section-title{font-size:10px;font-weight:600;letter-spacing:0.7px;text-transform:uppercase;color:var(--text-dim);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border)}
.confirm-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px}
.confirm-row:last-child{border-bottom:none}
.confirm-num{width:22px;height:22px;border-radius:50%;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;margin-top:1px}
`;
