import React, { useEffect, useState, useRef } from "react";
import { Batch, Item } from "../../types/items";
import SearchResults from "../grn/SearchResults";
import SelectedItemCard from "../grn/SelectedItemCard";
import CameraQRScanner from "./CameraQRScanner";

type RawRecord = Record<string, unknown>;

type SerialQrTarget = {
  serial: string;
  batchNo: string;
};

type QrPayload = {
  itemCode: string;
  batchNo: string;
  serial: string;
  raw: string;
};

const asString = (value: unknown, fallback = "") => String(value ?? fallback);
const asNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const splitSerials = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((serial) => String(serial).trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split(/[\n,]+/)
    .map((serial) => serial.trim())
    .filter(Boolean);
};

const nestedString = (record: RawRecord, key: string) => {
  const value = record[key];
  return value && typeof value === "object" ? value as RawRecord : null;
};

const mapBatch = (batch: RawRecord): Batch => ({
  batchId: typeof batch.batchId === "number" ? batch.batchId : asNumber(batch.batch_id, undefined),
  batchNo: asString(batch.batchNo || batch.batchNumber || batch.batch_number),
  qty: asNumber(batch.qty || batch.quantity || batch.quantityAvailable || batch.quantity_available || batch.qty_sum),
  expiry: asString(batch.expiry || batch.expiryDate || batch.expiry_date, "") || null,
  mfgDate: asString(batch.mfgDate || batch.mfg_date, "") || null,
  serialNumbers: splitSerials(batch.serialNumbers || batch.serial_numbers),
  qrBatchCode: asString(batch.qrBatchCode || batch.qr_batch_code, "") || null,
  supplier: asString(batch.supplier, "") || null,
  purchasePrice: batch.purchasePrice || batch.purchase_price ? asNumber(batch.purchasePrice || batch.purchase_price) : null,
  storageLocation: asString(batch.storageLocation || batch.storage_location, "") || null,
  grnNumber: asString(batch.grnNumber || batch.grn_number, "") || null,
  grnDate: asString(batch.grnDate || batch.grn_date, "") || null,
  amcNumber: asString((nestedString(batch, "amc")?.amcNumber) || batch.amcNumber, "") || null,
  amcExpiry: asString((nestedString(batch, "amc")?.contractEnd) || batch.amcExpiry, "") || undefined,
  amcStatus: asString((nestedString(batch, "amc")?.status) || batch.amcStatus, "") || null,
  amcSupplier: asString((nestedString(batch, "amc")?.supplier) || batch.amcSupplier, "") || null,
});

const mapSearchItem = (item: RawRecord): Item => ({
  id: asString(item.id || item.itemCode || item.item_code),
  name: asString(item.name || item.itemName || item.item_name),
  sub: asString(item.sub || item.itemType || item.item_type),
  category: item.category === "CAPEX" ? "CAPEX" : "OPEX",
  subcat: asString(item.subcat || item.subCategory || item.sub_category),
  unit: asString(item.unit),
  dept: asString(item.dept),
  currentStock: asNumber(item.currentStock || item.stock),
  minStock: asNumber(item.minStock || item.min_stock_level),
  maxStock: asNumber(item.maxStock || item.max_stock_level),
  supplier: asString(item.supplier, "") || null,
  pricePerUnit: item.pricePerUnit || item.price ? asNumber(item.pricePerUnit || item.price) : null,
  batches: Array.isArray(item.batches) ? item.batches.map((batch) => mapBatch(batch as RawRecord)) : [],
});

const mapDetailItem = (data: RawRecord): Item => {
  const batches = Array.isArray(data.itemBatches)
    ? data.itemBatches.map((batch) => mapBatch(batch as RawRecord))
    : [];

  return {
    id: asString(data.itemCode),
    name: asString(data.itemName),
    sub: asString(data.itemType),
    category: data.category === "CAPEX" ? "CAPEX" : "OPEX",
    subcat: asString(data.subCategory),
    unit: asString(data.unit),
    dept: asString((nestedString(data, "department")?.code) || (nestedString(data, "department")?.name), ""),
    currentStock: batches.reduce((sum, batch) => sum + batch.qty, 0),
    minStock: asNumber(data.minStockLevel),
    maxStock: asNumber(data.maxStockLevel),
    supplier: asString(data.supplier, "") || null,
    pricePerUnit: data.pricePerUnit ? asNumber(data.pricePerUnit) : null,
    description: asString(data.description, "") || null,
    itemNameHi: asString(data.itemNameHi, "") || null,
    supplierBarcode: asString(data.supplierBarcode, "") || null,
    createdAt: asString(data.createdAt, "") || null,
    batches,
  };
};

const qrSrcFor = (payload: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;

const cleanPayloadValue = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text || "-";
};

const opexBatchNumbersLabel = (item: Item, limit = 10) => {
  if (item.category !== "OPEX") return "";
  const list = (item.batches ?? [])
    .map((batch) => String(batch.batchNo ?? "").trim())
    .filter(Boolean);

  if (!list.length) return "";
  if (list.length <= limit) return list.join(", ");

  const extra = list.length - limit;
  return `${list.slice(0, limit).join(", ")} +${extra} more`;
};

const itemPayload = (item: Item) => {
  const opexBatchLine = opexBatchNumbersLabel(item);

  return [
    "AyurVaidya Inventory QR",
    "Type: Product",
    `ITEM:${item.id}`,
    `Item name: ${cleanPayloadValue(item.name)}`,
    `Category: ${cleanPayloadValue(item.category)}`,
    `Sub category: ${cleanPayloadValue(item.subcat)}`,
    `Department: ${cleanPayloadValue(item.dept)}`,
    `Stock: ${cleanPayloadValue(item.currentStock)} ${cleanPayloadValue(item.unit)}`,
    `Minimum stock: ${cleanPayloadValue(item.minStock)} ${cleanPayloadValue(item.unit)}`,
    `Supplier: ${cleanPayloadValue(item.supplier)}`,
    `Batches/procurements: ${item.batches.length}`,
    ...(opexBatchLine ? [`Batch numbers: ${opexBatchLine}`] : []),
    `Serial numbers: ${item.batches.reduce((sum, batch) => sum + (batch.serialNumbers?.length ?? 0), 0)}`,
  ].join("\n");
};

const batchPayload = (item: Item, batch: Batch) =>
  [
    "AyurVaidya Inventory QR",
    "Type: OPEX batch",
    `ITEM:${item.id}`,
    `BATCH:${batch.batchNo}`,
    `Item name: ${cleanPayloadValue(item.name)}`,
    `Batch number: ${cleanPayloadValue(batch.batchNo)}`,
    `Quantity available: ${cleanPayloadValue(batch.qty)} ${cleanPayloadValue(item.unit)}`,
    `Mfg date: ${formatDate(batch.mfgDate)}`,
    `Expiry date: ${formatDate(batch.expiry)}`,
    `Supplier: ${cleanPayloadValue(batch.supplier || item.supplier)}`,
    `GRN: ${cleanPayloadValue(batch.grnNumber)}`,
    `Storage location: ${cleanPayloadValue(batch.storageLocation)}`,
  ].join("\n");

const serialPayload = (item: Item, target: SerialQrTarget, batch?: Batch) =>
  [
    "AyurVaidya Inventory QR",
    "Type: CAPEX serial asset",
    `ITEM:${item.id}`,
    `SERIAL:${target.serial}`,
    `Item name: ${cleanPayloadValue(item.name)}`,
    `Serial number: ${cleanPayloadValue(target.serial)}`,
    `Batch/procurement: ${cleanPayloadValue(target.batchNo)}`,
    `Department: ${cleanPayloadValue(item.dept)}`,
    `Supplier: ${cleanPayloadValue(batch?.supplier || item.supplier)}`,
    `GRN: ${cleanPayloadValue(batch?.grnNumber)}`,
    `AMC number: ${cleanPayloadValue(batch?.amcNumber)}`,
    `AMC expiry: ${formatDate(batch?.amcExpiry)}`,
  ].join("\n");

const parseQrPayload = (raw: string): QrPayload => {
  const text = String(raw || "").trim();
  const itemMatch = text.match(/(?:^|[\n|])ITEM:\s*([^\n|]+)/i);
  const batchMatch = text.match(/(?:^|[\n|])BATCH:\s*([^\n|]+)/i);
  const serialMatch = text.match(/(?:^|[\n|])SERIAL:\s*([^\n|]+)/i);

  return {
    itemCode: itemMatch ? itemMatch[1].trim() : text,
    batchNo: batchMatch ? batchMatch[1].trim() : "",
    serial: serialMatch ? serialMatch[1].trim() : "",
    raw: text,
  };
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function DetailSummary({ item, scanned }: { item: Item; scanned: QrPayload | null }) {
  const matchingBatch = scanned?.batchNo
    ? item.batches.find((batch) => batch.batchNo === scanned.batchNo)
    : scanned?.serial
    ? item.batches.find((batch) => (batch.serialNumbers ?? []).includes(scanned.serial))
    : null;

  return (
    <div style={{ marginTop: 14, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Product details</div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 3 }}>
            {item.id} - {item.category} - {item.subcat}
          </div>
        </div>
        {scanned ? (
          <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--green)", textAlign: "right" }}>
            Scanned {scanned.batchNo ? `batch ${scanned.batchNo}` : scanned.serial ? `serial ${scanned.serial}` : "product QR"}
          </div>
        ) : null}
      </div>

      {scanned ? (
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 8,
            padding: 10,
            border: "1px solid rgba(26, 107, 60, 0.18)",
            borderRadius: 7,
            background: "var(--green-light)",
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: "var(--text-dim)" }}>QR type</div>
            <div style={{ fontWeight: 700 }}>{scanned.batchNo ? "Batch" : scanned.serial ? "Serial asset" : "Product"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-dim)" }}>Item code</div>
            <div style={{ fontFamily: "var(--mono)" }}>{scanned.itemCode}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-dim)" }}>Batch</div>
            <div style={{ fontFamily: "var(--mono)" }}>{scanned.batchNo || matchingBatch?.batchNo || "-"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-dim)" }}>Serial</div>
            <div style={{ fontFamily: "var(--mono)" }}>{scanned.serial || "-"}</div>
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
        <div><strong>Stock:</strong> {item.currentStock} {item.unit}</div>
        <div><strong>Min:</strong> {item.minStock} {item.unit}</div>
        <div><strong>Department:</strong> {item.dept || "-"}</div>
        <div><strong>Supplier:</strong> {item.supplier || "-"}</div>
        <div><strong>Price:</strong> {item.pricePerUnit ? `Rs ${item.pricePerUnit}` : "-"}</div>
        <div><strong>Barcode:</strong> {item.supplierBarcode || "-"}</div>
      </div>

      {item.description ? <div style={{ marginTop: 10, color: "var(--text-dim)" }}>{item.description}</div> : null}

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
          {item.category === "CAPEX" ? "Procurements and serial numbers" : "Batches"}
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {item.batches.map((batch, index) => {
            const active = matchingBatch?.batchNo === batch.batchNo;
            return (
              <div
                key={`${batch.batchNo}-${index}`}
                style={{
                  border: `1px solid ${active ? "var(--green)" : "var(--border)"}`,
                  borderRadius: 7,
                  padding: 10,
                  background: active ? "var(--green-light)" : "var(--surface-2)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>{batch.batchNo}</div>
                  <div>{batch.qty} {item.unit}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6, marginTop: 8, fontSize: 11.5, color: "var(--text-dim)" }}>
                  <div>Expiry: {formatDate(batch.expiry)}</div>
                  <div>Mfg: {formatDate(batch.mfgDate)}</div>
                  <div>Supplier: {batch.supplier || "-"}</div>
                  <div>GRN: {batch.grnNumber || "-"}</div>
                  <div>Received: {formatDate(batch.grnDate)}</div>
                  <div>Location: {batch.storageLocation || "-"}</div>
                  {item.category === "CAPEX" ? <div>AMC: {batch.amcNumber || "No AMC"}</div> : null}
                  {item.category === "CAPEX" ? <div>AMC expiry: {formatDate(batch.amcExpiry)}</div> : null}
                </div>
                {(batch.serialNumbers ?? []).length ? (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                    {batch.serialNumbers?.map((serial) => (
                      <span
                        key={serial}
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 10.5,
                          padding: "2px 6px",
                          borderRadius: 5,
                          background: scanned?.serial === serial ? "var(--green)" : "var(--slate-light)",
                          color: scanned?.serial === serial ? "#fff" : "var(--slate)",
                        }}
                      >
                        {serial}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QRCard({
  title,
  meta,
  payload,
  onCopy,
}: {
  title: string;
  meta: string;
  payload: string;
  onCopy: (payload: string) => void;
}) {
  const src = qrSrcFor(payload);

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--surface)",
        padding: 12,
        display: "grid",
        gridTemplateColumns: "132px minmax(0, 1fr)",
        gap: 12,
        alignItems: "center",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={`QR for ${title}`}
        src={src}
        style={{ width: 132, height: 132, borderRadius: 6, border: "1px solid var(--border)" }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{title}</div>
        <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--text-dim)" }}>{meta}</div>
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: "var(--text-dim)",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
            fontFamily: "var(--mono)",
          }}
        >
          {payload}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button className="btn-cancel" style={{ padding: "7px 10px" }} onClick={() => onCopy(payload)}>
            Copy payload
          </button>
          <a href={src} target="_blank" rel="noreferrer" className="btn-cancel" style={{ padding: "7px 10px", textDecoration: "none" }}>
            Open QR
          </a>
        </div>
      </div>
    </div>
  );
}

export default function QRGenerator() {
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteResults, setRemoteResults] = useState<Item[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedPayload, setScannedPayload] = useState<QrPayload | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      return;
    }

    let mounted = true;
    const timeoutId = setTimeout(() => {
      fetch(`/api/items?q=${encodeURIComponent(q)}`)
        .then((response) => response.json())
        .then((data: unknown) => {
          if (!mounted) return;
          if (!Array.isArray(data)) {
            setRemoteResults([]);
            return;
          }
          setRemoteResults(data.map((item) => mapSearchItem(item as RawRecord)));
        })
        .catch(() => {
          if (mounted) setRemoteResults([]);
        });
    }, 250);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const loadItemDetails = (item: Item, scanned: QrPayload | null = null) => {
    setLoadingDetails(true);
    fetch(`/api/items/detail?code=${encodeURIComponent(item.id)}`)
      .then((response) => response.json())
      .then((data: unknown) => {
        if (!data || typeof data !== "object" || "error" in data) return;
        setSelectedItem(mapDetailItem(data as RawRecord));
        setScannedPayload(scanned);
      })
      .catch(() => {})
      .finally(() => setLoadingDetails(false));
  };

  const selectItem = (item: Item) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setShowResults(false);
    setScannedPayload(null);
    loadItemDetails(item);
  };

  const loadScannedPayload = (raw: string) => {
    const parsed = parseQrPayload(raw);
    if (!parsed.itemCode) return;
    setShowScanner(false);
    setLoadingDetails(true);
    fetch(`/api/items/detail?code=${encodeURIComponent(parsed.itemCode)}`)
      .then((response) => response.json())
      .then((data: unknown) => {
        if (!data || typeof data !== "object" || "error" in data) {
          alert("No item found for this QR code.");
          return;
        }

        const mapped = mapDetailItem(data as RawRecord);
        setSelectedItem(mapped);
        setSearchQuery(mapped.name);
        setShowResults(false);
        setScannedPayload(parsed);
      })
      .catch(() => alert("Could not load item details from QR."))
      .finally(() => setLoadingDetails(false));
  };

  const openInGRN = (id: string) => {
    try {
      sessionStorage.setItem("openItemForGRN", String(id));
    } catch {}
    window.dispatchEvent(new CustomEvent("open-grn", { detail: id }));
  };

  const openInISS = (id: string) => {
    try {
      sessionStorage.setItem("openItemForISS", String(id));
    } catch {}
    window.dispatchEvent(new CustomEvent("open-issue", { detail: id }));
  };

  const copyPayload = async (payload: string) => {
    try {
      await navigator.clipboard.writeText(payload);
      alert("QR payload copied");
    } catch {
      alert("Copy failed");
    }
  };

  const serialTargets: SerialQrTarget[] = selectedItem
    ? selectedItem.batches.flatMap((batch) =>
        (batch.serialNumbers ?? []).map((serial) => ({
          serial,
          batchNo: batch.batchNo,
        }))
      )
    : [];

  const opexBatches = selectedItem?.category === "OPEX" ? selectedItem.batches.filter((batch) => batch.batchNo) : [];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>QR generator</div>
        <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
          Search for an item. CAPEX items generate one QR per serial number; OPEX items generate one QR per batch.
        </div>
      </div>

      <div ref={searchRef} style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              type="text"
              placeholder="Type item name or ID..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setShowResults(true);
                if (!event.target.value.trim()) {
                  setSelectedItem(null);
                  setRemoteResults([]);
                }
              }}
              onFocus={() => searchQuery.trim() && setShowResults(true)}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6 }}
            />
          </div>
          <button
            className="btn-next"
            style={{ padding: "8px 12px", marginLeft: 0 }}
            onClick={() => setShowScanner(true)}
          >
            Scan QR
          </button>
          <button
            style={{ padding: "8px 12px", borderRadius: 6 }}
            onClick={() => {
              setSearchQuery("");
              setSelectedItem(null);
              setRemoteResults([]);
              setScannedPayload(null);
              setShowResults(false);
            }}
          >
            Clear
          </button>
        </div>
        {showResults && remoteResults.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <SearchResults results={remoteResults} onSelect={selectItem} />
          </div>
        )}
      </div>

      {showScanner ? (
        <CameraQRScanner onDetected={loadScannedPayload} onClose={() => setShowScanner(false)} />
      ) : null}

      {selectedItem ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(360px, 1fr) minmax(360px, 1.1fr)", gap: 18, alignItems: "start" }}>
          <div>
            <SelectedItemCard item={selectedItem} onChange={() => setSelectedItem(null)} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn-next" onClick={() => openInGRN(selectedItem.id)}>
                Open in GRN
              </button>
              <button className="btn-next" onClick={() => openInISS(selectedItem.id)}>
                Open in Stock Issue
              </button>
              <button className="btn-cancel" onClick={() => copyPayload(itemPayload(selectedItem))}>
                Copy item payload
              </button>
            </div>

            <DetailSummary item={selectedItem} scanned={scannedPayload} />

            {loadingDetails && (
              <div style={{ marginTop: 12, color: "var(--text-dim)", fontSize: 12 }}>Loading batches and serial numbers...</div>
            )}

            {!loadingDetails && selectedItem.category === "CAPEX" && (
              <div style={{ marginTop: 14, padding: 12, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>CAPEX serial QR codes</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-dim)" }}>
                  {serialTargets.length
                    ? `${serialTargets.length} serial number${serialTargets.length === 1 ? "" : "s"} found for this item.`
                    : "No serial numbers are recorded for this CAPEX item yet."}
                </div>
              </div>
            )}

            {!loadingDetails && selectedItem.category === "OPEX" && (
              <div style={{ marginTop: 14, padding: 12, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>OPEX batch QR codes</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-dim)" }}>
                  {opexBatches.length
                    ? `${opexBatches.length} batch${opexBatches.length === 1 ? "" : "es"} found for this item.`
                    : "No batches are recorded for this OPEX item yet."}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <QRCard
              title={`${selectedItem.name} product QR`}
              meta={
                selectedItem.category === "CAPEX"
                  ? `Opens full asset details with ${serialTargets.length} serial number${serialTargets.length === 1 ? "" : "s"}`
                  : `Opens full product details with ${opexBatches.length} batch${opexBatches.length === 1 ? "" : "es"}`
              }
              payload={itemPayload(selectedItem)}
              onCopy={copyPayload}
            />

            {selectedItem.category === "CAPEX" && serialTargets.map((target, index) => {
              const batch = selectedItem.batches.find((row) => row.batchNo === target.batchNo);
              return (
                <QRCard
                  key={`${target.batchNo}-${target.serial}-${index}`}
                  title={target.serial}
                  meta={`Serial ${index + 1} - ${selectedItem.name}${target.batchNo ? ` - batch ${target.batchNo}` : ""}`}
                  payload={serialPayload(selectedItem, target, batch)}
                  onCopy={copyPayload}
                />
              );
            })}

            {selectedItem.category === "OPEX" && opexBatches.map((batch) => (
              <QRCard
                key={`${batch.batchNo}-${batch.expiry ?? ""}`}
                title={batch.batchNo}
                meta={`${batch.qty} ${selectedItem.unit} available${batch.expiry ? ` - expires ${batch.expiry.split("T")[0]}` : ""}`}
                payload={batchPayload(selectedItem, batch)}
                onCopy={copyPayload}
              />
            ))}

            {!loadingDetails && selectedItem.category === "CAPEX" && serialTargets.length === 0 && (
              <div style={{ padding: 20, border: "1px dashed var(--border)", borderRadius: 8, color: "var(--text-dim)" }}>
                Add serial numbers for this CAPEX stock in GRN/registry data to generate individual product QR codes.
              </div>
            )}

            {!loadingDetails && selectedItem.category === "OPEX" && opexBatches.length === 0 && (
              <div style={{ padding: 20, border: "1px dashed var(--border)", borderRadius: 8, color: "var(--text-dim)" }}>
                Add at least one batch for this OPEX item to generate batch QR codes.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: 20, border: "1px dashed var(--border)", borderRadius: 8, color: "var(--text-dim)" }}>
          Select an item to generate QR codes.
        </div>
      )}
    </div>
  );
}
