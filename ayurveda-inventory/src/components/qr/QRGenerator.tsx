import React, { useEffect, useState, useRef } from "react";
import { Item } from "../../types/items";
import SearchResults from "../grn/SearchResults";
import SelectedItemCard from "../grn/SelectedItemCard";

export default function QRGenerator() {
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteResults, setRemoteResults] = useState<Item[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
          const mapped = data.map((it: any): Item => ({
            id: it.id,
            name: it.name,
            sub: it.sub || '',
            category: it.category || 'OPEX',
            subcat: it.subcat || '',
            unit: it.unit || '',
            dept: it.dept || '',
            currentStock: Number(it.currentStock ?? it.stock ?? 0),
            minStock: Number(it.minStock ?? it.min_stock_level ?? 0),
            batches: Array.isArray(it.batches) ? it.batches.map((b: any) => ({ batchNo: b.batchNo || b.batch_number, qty: Number(b.qty || b.quantity || b.qty_sum || 0), expiry: b.expiry || null })) : [],
          }))
          setRemoteResults(mapped)
        })
        .catch(() => { if (mounted) setRemoteResults([]) })
    }, 250);
    return () => { mounted = false; clearTimeout(t) }
  }, [searchQuery]);

  const selectItem = (it: Item) => {
    setSelectedItem(it);
    setSearchQuery(it.name);
    setShowResults(false);
  };

  const payloadFor = (id: string) => `${id}`;

  const openInGRN = (id: string) => {
    try { sessionStorage.setItem('openItemForGRN', String(id)) } catch (e) {}
    window.dispatchEvent(new CustomEvent('open-grn', { detail: id }))
  }
  const openInISS = (id: string) => {
    try { sessionStorage.setItem('openItemForISS', String(id)) } catch (e) {}
    window.dispatchEvent(new CustomEvent('open-issue', { detail: id }))
  }

  const copyPayload = async (id: string) => {
    const p = payloadFor(id)
    try { await navigator.clipboard.writeText(p); alert('QR payload copied') } catch (e) { alert('Copy failed') }
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>QR generator</div>
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Search for an item and generate a QR that encodes the item ID. Scanning the QR in GRN or Stock Issue will auto-open the selected item.</div>
      </div>

      <div ref={searchRef} style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Type item name or ID…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); if (!e.target.value.trim()) setSelectedItem(null) }}
              onFocus={() => searchQuery.trim() && setShowResults(true)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6 }}
            />
          </div>
          <button style={{ padding: '8px 12px', borderRadius: 6 }} onClick={() => { setSearchQuery(''); setSelectedItem(null); setShowResults(false) }}>Clear</button>
        </div>
        {showResults && remoteResults.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <SearchResults results={remoteResults} onSelect={selectItem} />
          </div>
        )}
      </div>

      {selectedItem ? (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <SelectedItemCard item={selectedItem} onChange={() => setSelectedItem(null)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn-next" onClick={() => openInGRN(selectedItem.id)}>Open in GRN</button>
              <button className="btn-next" onClick={() => openInISS(selectedItem.id)}>Open in Stock Issue</button>
              <button className="btn-cancel" onClick={() => copyPayload(selectedItem.id)}>Copy payload</button>
            </div>
          </div>

          <div style={{ width: 300, textAlign: 'center' }}>
            <div style={{ marginBottom: 8, color: 'var(--text-dim)' }}>QR for item</div>
            {selectedItem.id ? (
              (() => {
                const src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payloadFor(selectedItem.id))}`;
                return (
                  <>
                    <img alt="QR" src={src} onError={(e)=>{ (e.target as HTMLImageElement).dataset['error']='1' }} style={{ width: 260, height: 260, borderRadius: 6, border: '1px solid var(--border)' }} />
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)' }}>{payloadFor(selectedItem.id)}</div>
                    <div style={{ marginTop: 6 }}>
                      <a href={src} target="_blank" rel="noreferrer" style={{ color: 'var(--text)' }}>Open QR image</a>
                      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-dim)' }}>{src}</div>
                      <div style={{ marginTop: 6, color: 'var(--red)' }} data-qr-error> </div>
                    </div>
                  </>
                )
              })()
            ) : (
              <div style={{ color: 'var(--text-dim)' }}>No item id available</div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: 20, border: '1px dashed var(--border)', borderRadius: 8, color: 'var(--text-dim)' }}>
          Select an item to generate its QR code.
        </div>
      )}
    </div>
  )
}
