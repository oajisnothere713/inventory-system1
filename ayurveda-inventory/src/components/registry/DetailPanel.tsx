"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Batch, Item, batchStatus, stockPct, expiryLabel, stockBarColor } from "./utils";
import StatusPill from "./StatusPill";

type RegistryMeta = {
  departments: { id: number; label: string }[];
  suppliers: { id: number; label: string }[];
};

type NewItemForm = {
  itemName: string;
  itemNameHi: string;
  category: "OPEX" | "CAPEX";
  subCategory: "medicines" | "consumables" | "devices" | "electrical";
  itemType: string;
  unit: string;
  description: string;
  initialQuantity: string;
  batchNumber: string;
  expiryDate: string;
  serialNumbers: string;
  amcRequired: boolean;
  amcNumber: string;
  amcStartDate: string;
  amcEndDate: string;
  amcSupplierId: string;
  minStockLevel: string;
  maxStockLevel: string;
  reorderQty: string;
  primaryDeptId: string;
  defaultSupplierId: string;
  supplierBarcode: string;
};

const initialNewItem: NewItemForm = {
  itemName: "",
  itemNameHi: "",
  category: "OPEX",
  subCategory: "medicines",
  itemType: "",
  unit: "g",
  description: "",
  initialQuantity: "",
  batchNumber: "",
  expiryDate: "",
  serialNumbers: "",
  amcRequired: false,
  amcNumber: "",
  amcStartDate: "",
  amcEndDate: "",
  amcSupplierId: "",
  minStockLevel: "0",
  maxStockLevel: "",
  reorderQty: "",
  primaryDeptId: "",
  defaultSupplierId: "",
  supplierBarcode: "",
};

export default function DetailPanel({
  item,
  onClose,
  onItemCreated,
}: {
  item: Item | null | "new";
  onClose: () => void;
  onItemCreated?: () => void;
}) {
  const isOpen = item !== null;
  const [newItem, setNewItem] = useState<NewItemForm>(initialNewItem);
  const [meta, setMeta] = useState<RegistryMeta>({ departments: [], suppliers: [] });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (item !== "new") return;

    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setNewItem(initialNewItem);
      setSaveError(null);
    });

    fetch("/api/registry/meta")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data: RegistryMeta) => {
        if (!active) return;

        const departments = Array.isArray(data.departments) ? data.departments : [];
        const suppliers = Array.isArray(data.suppliers) ? data.suppliers : [];
        setMeta({ departments, suppliers });

        if (departments[0]?.id) {
          setNewItem((current) => ({ ...current, primaryDeptId: String(departments[0].id) }));
        }
      })
      .catch(() => {
        if (active) setMeta({ departments: [], suppliers: [] });
      });

    return () => {
      active = false;
    };
  }, [item]);

  const subCategoryOptions = useMemo<Array<[NewItemForm["subCategory"], string]>>(
    () =>
      newItem.category === "OPEX"
        ? [
            ["medicines", "Medicines"],
            ["consumables", "Consumables"],
          ]
        : [
            ["devices", "Devices"],
            ["electrical", "Electrical"],
          ],
    [newItem.category]
  );

  const updateNewItem = (patch: Partial<NewItemForm>) => {
    setNewItem((current) => ({ ...current, ...patch }));
  };

  const saveNewItem = async () => {
    setSaveError(null);

    if (!newItem.itemName.trim()) {
      setSaveError("Item name is required.");
      return;
    }

    if (!newItem.unit.trim()) {
      setSaveError("Unit is required.");
      return;
    }

    if (!newItem.primaryDeptId) {
      setSaveError("Please select a department.");
      return;
    }

    if (!newItem.initialQuantity || Number(newItem.initialQuantity) <= 0) {
      setSaveError("Opening quantity is required.");
      return;
    }

    if (newItem.category === "OPEX" && !newItem.batchNumber.trim()) {
      setSaveError("Batch number is required for OPEX items.");
      return;
    }

    if (newItem.category === "OPEX" && !newItem.expiryDate) {
      setSaveError("Expiry date is required for OPEX items.");
      return;
    }

    if (newItem.category === "CAPEX" && !newItem.serialNumbers.trim()) {
      setSaveError("Serial number is required for CAPEX items.");
      return;
    }

    if (newItem.category === "CAPEX" && newItem.amcRequired) {
      if (!newItem.amcNumber.trim()) {
        setSaveError("AMC number is required when AMC is enabled.");
        return;
      }
      if (!newItem.amcStartDate || !newItem.amcEndDate) {
        setSaveError("AMC start and expiry dates are required.");
        return;
      }
      if (!newItem.amcSupplierId && !newItem.defaultSupplierId) {
        setSaveError("Select an AMC supplier.");
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch("/api/registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newItem,
          initialQuantity: newItem.initialQuantity ? Number(newItem.initialQuantity) : 0,
          minStockLevel: Number(newItem.minStockLevel || 0),
          maxStockLevel: newItem.maxStockLevel ? Number(newItem.maxStockLevel) : null,
          reorderQty: newItem.reorderQty ? Number(newItem.reorderQty) : null,
          primaryDeptId: Number(newItem.primaryDeptId),
          defaultSupplierId: newItem.defaultSupplierId ? Number(newItem.defaultSupplierId) : null,
          amcSupplierId: newItem.amcSupplierId ? Number(newItem.amcSupplierId) : null,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Could not save item.");
      }

      onItemCreated?.();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save item.");
    } finally {
      setSaving(false);
    }
  };

  const renderNewItemForm = () => (
    <form
      className="new-item-form"
      onSubmit={(event) => {
        event.preventDefault();
        saveNewItem();
      }}
    >
      <div className="dp-section ni-section">
        <div className="dp-section-title">Item classification</div>
        <div className="ni-grid two">
          <label className="ni-field">
            <span>Category *</span>
            <select
              value={newItem.category}
              onChange={(event) => {
                const category = event.target.value as NewItemForm["category"];
                updateNewItem({
                  category,
                  subCategory: category === "OPEX" ? "medicines" : "devices",
                });
              }}
            >
              <option value="OPEX">OPEX</option>
              <option value="CAPEX">CAPEX</option>
            </select>
          </label>

          <label className="ni-field">
            <span>Sub-type *</span>
            <select
              value={newItem.subCategory}
              onChange={(event) => updateNewItem({ subCategory: event.target.value as NewItemForm["subCategory"] })}
            >
              {subCategoryOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="dp-section ni-section">
        <div className="dp-section-title">Item identity</div>
        <label className="ni-field">
          <span>Item name *</span>
          <input
            value={newItem.itemName}
            onChange={(event) => updateNewItem({ itemName: event.target.value })}
            placeholder="e.g. Ashwagandha Churna"
          />
        </label>

        <div className="ni-grid two">
          <label className="ni-field">
            <span>Hindi / Sanskrit name</span>
            <input
              value={newItem.itemNameHi}
              onChange={(event) => updateNewItem({ itemNameHi: event.target.value })}
              placeholder="e.g. Ashwagandha Churna"
            />
          </label>

          <label className="ni-field">
            <span>Unit *</span>
            <select value={newItem.unit} onChange={(event) => updateNewItem({ unit: event.target.value })}>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="L">L</option>
              <option value="pcs">pcs</option>
              <option value="box">box</option>
              <option value="strip">strip</option>
            </select>
          </label>
        </div>

        <label className="ni-field">
          <span>Item type</span>
          <input
            value={newItem.itemType}
            onChange={(event) => updateNewItem({ itemType: event.target.value })}
            placeholder="e.g. Tail, Churna, Device"
          />
        </label>

        <label className="ni-field">
          <span>Description</span>
          <textarea
            value={newItem.description}
            onChange={(event) => updateNewItem({ description: event.target.value })}
            placeholder="Composition, use, notes..."
            rows={3}
          />
        </label>
      </div>

      <div className="dp-section ni-section">
        <div className="dp-section-title">Stock levels</div>
        <label className="ni-field">
          <span>Opening quantity *</span>
          <input
            type="number"
            min="0"
            step="0.001"
            value={newItem.initialQuantity}
            onChange={(event) => updateNewItem({ initialQuantity: event.target.value })}
            placeholder="Quantity available now"
          />
        </label>
        <div className="ni-grid three">
          <label className="ni-field">
            <span>Min stock *</span>
            <input
              type="number"
              min="0"
              step="0.001"
              value={newItem.minStockLevel}
              onChange={(event) => updateNewItem({ minStockLevel: event.target.value })}
              placeholder="0"
            />
          </label>
          <label className="ni-field">
            <span>Max stock</span>
            <input
              type="number"
              min="0"
              step="0.001"
              value={newItem.maxStockLevel}
              onChange={(event) => updateNewItem({ maxStockLevel: event.target.value })}
              placeholder="Optional"
            />
          </label>
          <label className="ni-field">
            <span>Reorder qty</span>
            <input
              type="number"
              min="0"
              step="0.001"
              value={newItem.reorderQty}
              onChange={(event) => updateNewItem({ reorderQty: event.target.value })}
              placeholder="Suggested"
            />
          </label>
        </div>
        <p className="ni-help">Alert fires below this.</p>
      </div>

      {newItem.category === "OPEX" ? (
        <div className="dp-section ni-section">
          <div className="dp-section-title">Batch & expiry</div>
          <div className="ni-grid two">
            <label className="ni-field">
              <span>Batch number *</span>
              <input
                value={newItem.batchNumber}
                onChange={(event) => updateNewItem({ batchNumber: event.target.value })}
                placeholder="e.g. BRT-2026-A1"
              />
            </label>
            <label className="ni-field">
              <span>Expiry date *</span>
              <input
                type="date"
                value={newItem.expiryDate}
                onChange={(event) => updateNewItem({ expiryDate: event.target.value })}
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="dp-section ni-section">
          <div className="dp-section-title">Serial & AMC details</div>
          <label className="ni-field">
            <span>Serial number(s) *</span>
            <textarea
              value={newItem.serialNumbers}
              onChange={(event) => updateNewItem({ serialNumbers: event.target.value })}
              placeholder="One serial per line or comma-separated"
              rows={2}
            />
          </label>

          <label className="ni-check">
            <input
              type="checkbox"
              checked={newItem.amcRequired}
              onChange={(event) => updateNewItem({ amcRequired: event.target.checked })}
            />
            <span>AMC required for this asset</span>
          </label>

          {newItem.amcRequired ? (
            <>
              <div className="ni-grid two">
                <label className="ni-field">
                  <span>AMC number *</span>
                  <input
                    value={newItem.amcNumber}
                    onChange={(event) => updateNewItem({ amcNumber: event.target.value })}
                    placeholder="e.g. AMC-2026-001"
                  />
                </label>
                <label className="ni-field">
                  <span>AMC supplier *</span>
                  <select value={newItem.amcSupplierId} onChange={(event) => updateNewItem({ amcSupplierId: event.target.value })}>
                    <option value="">Use default supplier</option>
                    {meta.suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="ni-grid two">
                <label className="ni-field">
                  <span>AMC start date *</span>
                  <input
                    type="date"
                    value={newItem.amcStartDate}
                    onChange={(event) => updateNewItem({ amcStartDate: event.target.value })}
                  />
                </label>
                <label className="ni-field">
                  <span>AMC expiry date *</span>
                  <input
                    type="date"
                    value={newItem.amcEndDate}
                    onChange={(event) => updateNewItem({ amcEndDate: event.target.value })}
                  />
                </label>
              </div>
            </>
          ) : (
            <p className="ni-help">Leave AMC unchecked only for assets without a maintenance contract.</p>
          )}
        </div>
      )}

      <div className="dp-section ni-section">
        <div className="dp-section-title">Default supplier & barcode</div>
        <div className="ni-grid two">
          <label className="ni-field">
            <span>Department *</span>
            <select value={newItem.primaryDeptId} onChange={(event) => updateNewItem({ primaryDeptId: event.target.value })}>
              <option value="">Select department</option>
              {meta.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.label}
                </option>
              ))}
            </select>
          </label>

          <label className="ni-field">
            <span>Default supplier</span>
            <select value={newItem.defaultSupplierId} onChange={(event) => updateNewItem({ defaultSupplierId: event.target.value })}>
              <option value="">-- None --</option>
              {meta.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="ni-field">
          <span>Supplier barcode (EAN)</span>
          <input
            value={newItem.supplierBarcode}
            onChange={(event) => updateNewItem({ supplierBarcode: event.target.value })}
            placeholder="Scan or type barcode"
          />
        </label>
        <p className="ni-help">Used for auto-identification when scanning at GRN.</p>
      </div>

      {saveError ? <div className="ni-error">{saveError}</div> : null}
    </form>
  );

  const renderBody = () => {
    if (item === "new") return renderNewItemForm();
    if (!item) return null;

    const exp = expiryLabel(item);
    const pct = stockPct(item);

    const Field = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
      <div className="dp-field">
        <span className="dp-label">{label}</span>
        <span className="dp-value" style={mono ? { fontFamily: "var(--mono)" } : undefined}>{value}</span>
      </div>
    );

    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span className={`cat-badge ${item.category === "CAPEX" ? "cat-capex" : "cat-opex"}`}>{item.category}</span>
          <span className="subcat-badge">{item.subcat}</span>
          <StatusPill status={item.status} />
        </div>

        <div className="dp-section">
          <div className="dp-section-title">Item details</div>
          <Field label="Item ID" value={item.id} mono />
          <Field label="Name" value={item.name} />
          <Field label="Category" value={`${item.category} - ${item.subcat}`} />
          <Field label="Department" value={item.dept} />
          <Field label="Unit" value={item.unit} />
          <Field label="Supplier" value={item.supplier || item.amc || "-"} />
          <Field label="Price per unit" value={item.price ? `Rs ${item.price.toLocaleString()}` : "-"} />
        </div>

        {item.category === "OPEX" ? (
          <div className="dp-section">
            <div className="dp-section-title">Stock & expiry</div>
            <Field label="Current stock" value={`${item.stock.toLocaleString()} ${item.unit}`} mono />
            <Field label="Minimum level" value={`${item.min.toLocaleString()} ${item.unit}`} mono />
            <div className="dp-field">
              <span className="dp-label">Stock level</span>
              <span className="dp-value">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="stock-bar-track" style={{ width: 80, display: "inline-block" }}>
                    <div className="stock-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: stockBarColor(item) }} />
                  </div>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{pct}%</span>
                </div>
              </span>
            </div>
            <Field label="Batch number" value={item.batch || "-"} mono />
            {item.batches && item.batches.length ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 6 }}>Batches</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {item.batches.map((batch: Batch, index: number) => {
                    const status = batchStatus(batch, false);
                    const disabled = status === "expired";

                    return (
                      <div
                        key={`${batch.batch}-${index}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: 8,
                          background: "#fafafa",
                          borderRadius: 6,
                        }}
                      >
                        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                          <div style={{ fontFamily: "var(--mono)", minWidth: 96 }}>{batch.batch}</div>
                          <div>{batch.stock} {item.unit}</div>
                          <div>{batch.expiry ? new Date(batch.expiry).toLocaleDateString("en-IN") : "-"}</div>
                          <div style={{ color: "var(--text-dim)" }}>{batch.supplier || "-"}</div>
                          <div style={{ color: "var(--text-dim)" }}>{status}</div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="dp-btn"
                            disabled={disabled}
                            onClick={() => {
                              if (disabled) return;
                              try {
                                sessionStorage.setItem("openItemForISS", String(item.id));
                                sessionStorage.setItem("openItemForISSBatch", String(batch.batch));
                                window.dispatchEvent(new CustomEvent("open-issue", { detail: item.id }));
                              } catch {}
                            }}
                          >
                            Issue
                          </button>

                          <button
                            className="dp-btn"
                            onClick={() => {
                              try {
                                window.dispatchEvent(new CustomEvent("open-grn", { detail: item.id }));
                              } catch {}
                            }}
                          >
                            GRN
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="dp-field">
              <span className="dp-label">Expiry date</span>
              <span className={`dp-value expiry-cell ${exp.cls}`}>{exp.txt}</span>
            </div>
          </div>
        ) : (
          <div className="dp-section">
            <div className="dp-section-title">Procurement & AMC details</div>
            <Field label="Quantity" value={`${item.stock} ${item.unit}`} />

            {item.batches && item.batches.length ? (
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {item.batches.map((batch: Batch, index: number) => (
                  <div key={`${batch.batch}-${index}`} style={{ padding: 8, background: "#fafafa", borderRadius: 6 }}>
                    <Field label="GRN" value={batch.grn || batch.batch || "-"} mono />
                    <Field label="Received" value={batch.grnDate ? new Date(batch.grnDate).toLocaleDateString("en-IN") : "-"} />
                    <Field label="Qty" value={`${batch.stock} ${item.unit}`} />
                    <Field label="Supplier" value={batch.supplier || "-"} />
                    <Field label="AMC no." value={batch.amc || "No AMC"} mono />
                    <Field label="AMC vendor" value={batch.amcSupplier || "-"} />
                    <Field label="AMC expiry" value={batch.amcExpiry ? new Date(batch.amcExpiry).toLocaleDateString("en-IN") : "-"} />
                    <Field label="Serials" value={(batch.serials ?? []).join(", ") || "-"} mono />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <Field label="Serial number" value={item.serial || "-"} mono />
                <Field label="Purchase date" value={item.purchase ? new Date(item.purchase).toLocaleDateString("en-IN") : "-"} />
                <Field label="Purchase price" value={`Rs ${item.price.toLocaleString()}`} />
                <Field label="AMC vendor" value={item.amc || "No AMC required"} />
                <Field label="AMC expiry" value={item.amcExpiry ? new Date(item.amcExpiry).toLocaleDateString("en-IN") : "-"} />
              </>
            )}
          </div>
        )}
      </>
    );
  };

  const title = item === "new" ? "Register new item" : item?.name ?? "Item details";

  return (
    <div className={`detail-overlay${isOpen ? " open" : ""}`} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div style={{ flex: 1 }} onClick={onClose} />
      <div className="detail-panel">
        <div className="dp-header">
          <div>
            <div className="dp-title">{title}</div>
            {item === "new" ? <div className="dp-subtitle">Item code is auto-generated on save</div> : null}
          </div>
          <div className="dp-close" onClick={onClose}>x</div>
        </div>
        <div className="dp-body">{renderBody()}</div>
        {item === "new" ? (
          <div className="dp-actions ni-actions">
            <button className="dp-btn" type="button" onClick={onClose}>Cancel</button>
            <button className="dp-btn primary" type="button" disabled={saving} onClick={saveNewItem}>
              {saving ? "Saving..." : "Save item ->"}
            </button>
          </div>
        ) : (
          <div className="dp-actions">
            <div className="dp-btn" onClick={onClose}>Close</div>
            <div
              className="dp-btn"
              onClick={() => {
                try {
                  const id = item ? item.id : null;
                  if (id) {
                    sessionStorage.setItem("openItemForISS", String(id));
                    sessionStorage.removeItem("openItemForISSBatch");
                  }
                  window.dispatchEvent(new CustomEvent("open-issue", { detail: id }));
                } catch {}
                onClose();
              }}
            >
              Issue stock
            </div>
            <div
              className="dp-btn primary"
              onClick={() => {
                try {
                  const id = item ? item.id : null;
                  window.dispatchEvent(new CustomEvent("open-grn", { detail: id }));
                } catch {}
                onClose();
              }}
            >
              Record GRN
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
