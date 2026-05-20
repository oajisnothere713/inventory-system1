"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Batch, Item, batchStatus, stockPct, expiryLabel, stockBarColor } from "./utils";
import StatusPill from "./StatusPill";

type RegistryMeta = {
  departments: { id: number; label: string; code?: string; name?: string }[];
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
  mfgDate: string;
  expiryDate: string;
  invoiceNo: string;
  invoiceDate: string;
  pricePerUnit: string;
  storeLocation: string;
  notes: string;
  serialNumbers: string;
  amcRequired: boolean;
  amcNumber: string;
  amcStartDate: string;
  amcEndDate: string;
  amcSupplierId: string;
  amcValue: string;
  amcCoverageType: string;
  amcServiceFrequency: string;
  amcContactPerson: string;
  amcContactPhone: string;
  minStockLevel: string;
  maxStockLevel: string;
  reorderQty: string;
  primaryDeptId: string;
  primaryDeptCode: string;
  defaultSupplierId: string;
  defaultSupplierName: string;
  supplierBarcode: string;
};

const initialNewItem: NewItemForm = {
  itemName: "",
  itemNameHi: "",
  category: "OPEX",
  subCategory: "medicines",
  itemType: "",
  unit: "",
  description: "",
  initialQuantity: "",
  batchNumber: "",
  mfgDate: "",
  expiryDate: "",
  invoiceNo: "",
  invoiceDate: "",
  pricePerUnit: "",
  storeLocation: "Main Store",
  notes: "",
  serialNumbers: "",
  amcRequired: false,
  amcNumber: "",
  amcStartDate: "",
  amcEndDate: "",
  amcSupplierId: "",
  amcValue: "",
  amcCoverageType: "comprehensive",
  amcServiceFrequency: "",
  amcContactPerson: "",
  amcContactPhone: "",
  minStockLevel: "0",
  maxStockLevel: "",
  reorderQty: "",
  primaryDeptId: "",
  primaryDeptCode: "",
  defaultSupplierId: "",
  defaultSupplierName: "",
  supplierBarcode: "",
};

const opexUnits = ["g", "kg", "ml", "L", "strip", "box", "rolls", "pairs"];
const capexUnits = ["pcs", "nos", "unit", "set"];

const bulkTemplateColumns = [
  "item_code",
  "item_name",
  "item_name_hi",
  "category",
  "subcat",
  "item_type",
  "unit",
  "description",
  "opening_quantity",
  "batch_number",
  "mfg_date",
  "expiry_date",
  "invoice_no",
  "invoice_date",
  "price_per_unit",
  "store_location",
  "notes",
  "serial_numbers",
  "primary_dept_code",
  "primary_dept_name",
  "default_supplier_name",
  "supplier_barcode",
  "min_stock",
  "max_stock",
  "reorder_qty",
  "amc_required",
  "amc_number",
  "amc_start_date",
  "amc_end_date",
  "amc_value",
  "amc_coverage_type",
  "amc_service_frequency",
  "amc_contact_person",
  "amc_contact_phone",
  "amc_supplier_name",
];

function csvEscape(value: string | number) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell.trim());
  rows.push(row);
  return rows.filter((cells) => cells.some(Boolean));
}

function csvTextToObjects(text: string) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values) =>
    headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = values[index] ?? "";
      return record;
    }, {})
  );
}

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
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [newItemMode, setNewItemMode] = useState<"single" | "bulk">("single");
  const bulkInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (item !== "new") return;

    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setNewItem(initialNewItem);
      setSaveError(null);
      setBulkMessage(null);
      setNewItemMode("single");
    });

    fetch("/api/registry/meta")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data: RegistryMeta) => {
        if (!active) return;

        const departments = Array.isArray(data.departments) ? data.departments : [];
        const suppliers = Array.isArray(data.suppliers) ? data.suppliers : [];
        setMeta({ departments, suppliers });

        if (departments[0]) {
          setNewItem((current) => ({
            ...current,
            primaryDeptId: departments[0].id ? String(departments[0].id) : "",
            primaryDeptCode: departments[0].code || "",
          }));
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

  const selectedDepartment = meta.departments.find(
    (department) => department.code === newItem.primaryDeptCode || String(department.id) === newItem.primaryDeptId
  );
  const stockUnit = newItem.unit || "";

  const saveNewItem = async () => {
    setSaveError(null);

    if (!newItem.itemName.trim()) {
      setSaveError("Item name is required.");
      return;
    }

    if (!newItem.primaryDeptId && !newItem.primaryDeptCode) {
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
          pricePerUnit: newItem.pricePerUnit ? Number(newItem.pricePerUnit) : null,
          primaryDeptId: newItem.primaryDeptId ? Number(newItem.primaryDeptId) : null,
          primaryDeptCode: newItem.primaryDeptCode || selectedDepartment?.code || null,
          primaryDeptName: selectedDepartment?.name || null,
          defaultSupplierId: newItem.defaultSupplierId ? Number(newItem.defaultSupplierId) : null,
          defaultSupplierName: newItem.defaultSupplierName.trim() || null,
          amcSupplierId: newItem.amcSupplierId ? Number(newItem.amcSupplierId) : null,
          amcValue: newItem.amcValue ? Number(newItem.amcValue) : null,
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

  const downloadBulkTemplate = () => {
    const sampleRows = [
      {
        item_code: "",
        item_name: "Ashwagandha Churna",
        item_name_hi: "Ashwagandha Churna",
        category: "OPEX",
        subcat: "medicines",
        item_type: "Churna",
        unit: "g",
        description: "Classical medicine powder",
        opening_quantity: 1200,
        batch_number: "ASH-2026-A1",
        mfg_date: "2026-02-01",
        expiry_date: "2027-08-01",
        invoice_no: "INV-2026-018",
        invoice_date: "2026-02-03",
        price_per_unit: 0.85,
        store_location: "Pharmacy Store",
        notes: "Opening stock entry",
        serial_numbers: "",
        primary_dept_code: "PHM",
        primary_dept_name: "Pharmacy",
        default_supplier_name: "AyurSupplier Pvt",
        supplier_barcode: "",
        min_stock: 500,
        max_stock: 2500,
        reorder_qty: 1000,
        amc_required: "false",
        amc_number: "",
        amc_start_date: "",
        amc_end_date: "",
        amc_value: "",
        amc_coverage_type: "comprehensive",
        amc_service_frequency: "",
        amc_contact_person: "",
        amc_contact_phone: "",
        amc_supplier_name: "",
      },
      {
        item_code: "",
        item_name: "Examination Lamp",
        item_name_hi: "Examination Lamp",
        category: "CAPEX",
        subcat: "devices",
        item_type: "Medical Device",
        unit: "pcs",
        description: "Portable examination lamp",
        opening_quantity: 2,
        batch_number: "LAMP-OPEN",
        mfg_date: "2026-01-10",
        expiry_date: "",
        invoice_no: "INV-2026-022",
        invoice_date: "2026-01-15",
        price_per_unit: 4200,
        store_location: "OPD Store",
        notes: "Asset registered during opening import",
        serial_numbers: "LAM-1001, LAM-1002",
        primary_dept_code: "OPD-GEN",
        primary_dept_name: "OPD General",
        default_supplier_name: "MediStore",
        supplier_barcode: "MS-EXAM-01",
        min_stock: 1,
        max_stock: 5,
        reorder_qty: 1,
        amc_required: "true",
        amc_number: "AMC-2026-001",
        amc_start_date: "2026-01-15",
        amc_end_date: "2027-01-14",
        amc_value: 4800,
        amc_coverage_type: "comprehensive",
        amc_service_frequency: "Quarterly",
        amc_contact_person: "Service Desk",
        amc_contact_phone: "9876543210",
        amc_supplier_name: "MediStore Service",
      },
    ];

    const csv = [
      bulkTemplateColumns.join(","),
      ...sampleRows.map((row) => bulkTemplateColumns.map((column) => csvEscape(row[column as keyof typeof row] ?? "")).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ayurvaidya-bulk-item-template.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleBulkImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBulkMessage(null);
    setBulkImporting(true);

    try {
      const rows = csvTextToObjects(await file.text());

      if (!rows.length) {
        setBulkMessage("The selected file has no item rows.");
        return;
      }

      const response = await fetch("/api/registry/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Bulk import failed.");
      }

      const skipped = Array.isArray(data.skipped) ? data.skipped.length : 0;
      setBulkMessage(`Imported ${data.imported ?? rows.length} items${skipped ? `, skipped ${skipped}` : ""}.`);
      onItemCreated?.();
    } catch (err) {
      setBulkMessage(err instanceof Error ? err.message : "Bulk import failed.");
    } finally {
      setBulkImporting(false);
      event.target.value = "";
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
      <input
        ref={bulkInputRef}
        type="file"
        accept=".csv"
        className="bulk-file-input"
        onChange={handleBulkImportFile}
      />

      <div className="new-item-mode-tabs">
        <button
          type="button"
          className={newItemMode === "single" ? "active" : ""}
          onClick={() => setNewItemMode("single")}
        >
          Register one item
        </button>
        <button
          type="button"
          className={newItemMode === "bulk" ? "active" : ""}
          onClick={() => setNewItemMode("bulk")}
        >
          Add multiple items
        </button>
      </div>

      {newItemMode === "bulk" ? (
        <div className="bulk-import-panel">
          <div>
            <div className="bulk-title">Add multiple items</div>
            <div className="bulk-subtitle">Download the standard CSV, fill item rows, then import it here.</div>
          </div>
          <div className="bulk-actions">
            <button className="bulk-btn" type="button" onClick={downloadBulkTemplate}>
              Download template
            </button>
            <button className="bulk-btn primary" type="button" disabled={bulkImporting} onClick={() => bulkInputRef.current?.click()}>
              {bulkImporting ? "Importing..." : "Import file"}
            </button>
          </div>
          {bulkMessage ? <div className="bulk-message">{bulkMessage}</div> : null}
        </div>
      ) : (
        <>
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
                  unit: "",
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

        <div className="ni-grid one">
          <label className="ni-field">
            <span>Hindi / Sanskrit name</span>
            <input
              value={newItem.itemNameHi}
              onChange={(event) => updateNewItem({ itemNameHi: event.target.value })}
              placeholder="e.g. Ashwagandha Churna"
            />
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
        <div className="ni-grid two">
          <label className="ni-field">
            <span>Opening quantity *</span>
            <div className="unit-input-wrap">
              <input
                type="number"
                min="0"
                step="0.001"
                value={newItem.initialQuantity}
                onChange={(event) => updateNewItem({ initialQuantity: event.target.value })}
                placeholder={`Quantity available now${stockUnit ? ` (${stockUnit})` : ""}`}
              />
              <span className="unit-input-tag">{stockUnit}</span>
            </div>
          </label>
          <label className="ni-field">
            <span>Unit</span>
            <select
              value={newItem.unit}
              onChange={(event) => updateNewItem({ unit: event.target.value })}
            >
              <option value="">None</option>
              {(newItem.category === "OPEX" ? opexUnits : capexUnits).map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="ni-grid three stock-threshold-grid">
          <label className="ni-field">
            <span>Min stock *</span>
            <div className="unit-input-wrap">
              <input
                type="number"
                min="0"
                step="0.001"
                value={newItem.minStockLevel}
                onChange={(event) => updateNewItem({ minStockLevel: event.target.value })}
                placeholder={`0${stockUnit ? ` ${stockUnit}` : ""}`}
              />
              <span className="unit-input-tag">{stockUnit}</span>
            </div>
          </label>
          <label className="ni-field">
            <span>Max stock</span>
            <div className="unit-input-wrap">
              <input
                type="number"
                min="0"
                step="0.001"
                value={newItem.maxStockLevel}
                onChange={(event) => updateNewItem({ maxStockLevel: event.target.value })}
                placeholder={`Optional${stockUnit ? ` (${stockUnit})` : ""}`}
              />
              <span className="unit-input-tag">{stockUnit}</span>
            </div>
          </label>
          <label className="ni-field">
            <span>Reorder qty</span>
            <div className="unit-input-wrap">
              <input
                type="number"
                min="0"
                step="0.001"
                value={newItem.reorderQty}
                onChange={(event) => updateNewItem({ reorderQty: event.target.value })}
                placeholder={`Suggested${stockUnit ? ` (${stockUnit})` : ""}`}
              />
              <span className="unit-input-tag">{stockUnit}</span>
            </div>
          </label>
        </div>
        <p className="ni-help">Alert fires below this.</p>
      </div>

      <div className="dp-section ni-section">
        <div className="dp-section-title">Opening stock inward details</div>
        <div className="ni-grid two">
          <label className="ni-field">
            <span>Invoice number</span>
            <input
              value={newItem.invoiceNo}
              onChange={(event) => updateNewItem({ invoiceNo: event.target.value })}
              placeholder="e.g. INV-2026-001"
            />
          </label>
          <label className="ni-field">
            <span>Invoice date</span>
            <input
              type="date"
              value={newItem.invoiceDate}
              onChange={(event) => updateNewItem({ invoiceDate: event.target.value })}
            />
          </label>
        </div>
        <label className="ni-field">
          <span>Opening stock notes</span>
          <textarea
            value={newItem.notes}
            onChange={(event) => updateNewItem({ notes: event.target.value })}
            placeholder="Any inward, QC, storage, or procurement note"
            rows={2}
          />
        </label>
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
              <span>Manufacture date</span>
              <input
                type="date"
                value={newItem.mfgDate}
                onChange={(event) => updateNewItem({ mfgDate: event.target.value })}
              />
            </label>
          </div>
          <div className="ni-grid two">
            <label className="ni-field">
              <span>Expiry date *</span>
              <input
                type="date"
                value={newItem.expiryDate}
                onChange={(event) => updateNewItem({ expiryDate: event.target.value })}
              />
            </label>
            <label className="ni-field">
              <span>Price per unit</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newItem.pricePerUnit}
                onChange={(event) => updateNewItem({ pricePerUnit: event.target.value })}
                placeholder="Purchase rate"
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
          <label className="ni-field">
            <span>Price per unit</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newItem.pricePerUnit}
              onChange={(event) => updateNewItem({ pricePerUnit: event.target.value })}
              placeholder="Purchase rate"
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
          {newItem.amcRequired ? (
            <>
              <div className="ni-grid two">
                <label className="ni-field">
                  <span>AMC value</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.amcValue}
                    onChange={(event) => updateNewItem({ amcValue: event.target.value })}
                    placeholder="Contract value"
                  />
                </label>
                <label className="ni-field">
                  <span>Coverage type</span>
                  <select
                    value={newItem.amcCoverageType}
                    onChange={(event) => updateNewItem({ amcCoverageType: event.target.value })}
                  >
                    <option value="comprehensive">Comprehensive</option>
                    <option value="non_comprehensive">Non-comprehensive</option>
                    <option value="parts_only">Parts only</option>
                    <option value="labour_only">Labour only</option>
                  </select>
                </label>
              </div>
              <div className="ni-grid two">
                <label className="ni-field">
                  <span>Service frequency</span>
                  <input
                    value={newItem.amcServiceFrequency}
                    onChange={(event) => updateNewItem({ amcServiceFrequency: event.target.value })}
                    placeholder="e.g. Quarterly"
                  />
                </label>
                <label className="ni-field">
                  <span>AMC contact phone</span>
                  <input
                    value={newItem.amcContactPhone}
                    onChange={(event) => updateNewItem({ amcContactPhone: event.target.value })}
                    placeholder="Vendor support number"
                  />
                </label>
              </div>
              <label className="ni-field">
                <span>AMC contact person</span>
                <input
                  value={newItem.amcContactPerson}
                  onChange={(event) => updateNewItem({ amcContactPerson: event.target.value })}
                  placeholder="Support contact name"
                />
              </label>
            </>
          ) : null}
        </div>
      )}

      <div className="dp-section ni-section">
        <div className="dp-section-title">Department, default supplier & barcode</div>
        <div className="ni-grid two supplier-grid">
          <label className="ni-field">
            <span>Department *</span>
            <select
              value={newItem.primaryDeptCode || newItem.primaryDeptId}
              onChange={(event) => {
                const selected = meta.departments.find(
                  (department) => department.code === event.target.value || String(department.id) === event.target.value
                );
                updateNewItem({
                  primaryDeptId: selected?.id ? String(selected.id) : "",
                  primaryDeptCode: selected?.code || "",
                });
              }}
            >
              <option value="">-- Select department --</option>
              {meta.departments.map((department) => (
                <option key={`${department.code || department.id}-${department.name}`} value={department.code || String(department.id)}>
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
        <div className="ni-grid two supplier-grid">
          <label className="ni-field">
            <span>Add default supplier</span>
            <input
              value={newItem.defaultSupplierName}
              onChange={(event) => updateNewItem({ defaultSupplierName: event.target.value, defaultSupplierId: "" })}
              placeholder="Type supplier name if not listed"
            />
          </label>
          <label className="ni-field">
            <span>Store location</span>
            <input
              value={newItem.storeLocation}
              onChange={(event) => updateNewItem({ storeLocation: event.target.value })}
              placeholder="Main Store"
            />
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

        </>
      )}

      {newItemMode === "single" && saveError ? <div className="ni-error">{saveError}</div> : null}
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
        <div className="detail-hero">
          <div>
            <div className="detail-hero-title">{item.name}</div>
            <div className="detail-hero-sub">{item.id} · {item.sub || item.subcat}</div>
            <div className="detail-hero-badges">
              <span className={`cat-badge ${item.category === "CAPEX" ? "cat-capex" : "cat-opex"}`}>{item.category}</span>
              <span className="subcat-badge">{item.subcat}</span>
              <StatusPill status={item.status} />
            </div>
          </div>
          <div className="detail-hero-stats">
            <div>
              <strong>{item.stock.toLocaleString()}</strong>
              <span>{item.unit} stock</span>
            </div>
            <div>
              <strong>{item.min.toLocaleString()}</strong>
              <span>{item.unit} min</span>
            </div>
          </div>
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
                <div className="detail-batch-list">
                  {item.batches.map((batch: Batch, index: number) => {
                    const status = batchStatus(batch, false);
                    const disabled = status === "expired";

                    return (
                      <div key={`${batch.batch}-${index}`} className="detail-batch-card">
                        <div className="detail-batch-main">
                          <div className="detail-batch-code">{batch.batch}</div>
                          <div className="detail-batch-meta">
                            <span>{batch.stock} {item.unit}</span>
                            <span>{batch.expiry ? new Date(batch.expiry).toLocaleDateString("en-IN") : "No expiry"}</span>
                            <span>{batch.supplier || "No supplier"}</span>
                            <span>GRN {batch.grn || "-"}</span>
                            <span>Invoice {batch.invoice || "-"}</span>
                            <span>{batch.location || "No location"}</span>
                            <span>{status}</span>
                          </div>
                        </div>

                        <div className="detail-batch-actions">
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
              <div className="detail-batch-list">
                {item.batches.map((batch: Batch, index: number) => (
                  <div key={`${batch.batch}-${index}`} className="detail-batch-card stacked">
                    <Field label="GRN" value={batch.grn || batch.batch || "-"} mono />
                    <Field label="Received" value={batch.grnDate ? new Date(batch.grnDate).toLocaleDateString("en-IN") : "-"} />
                    <Field label="Invoice" value={batch.invoice || "-"} mono />
                    <Field label="Invoice date" value={batch.invoiceDate ? new Date(batch.invoiceDate).toLocaleDateString("en-IN") : "-"} />
                    <Field label="Qty" value={`${batch.stock} ${item.unit}`} />
                    <Field label="Supplier" value={batch.supplier || "-"} />
                    <Field label="Store location" value={batch.location || "-"} />
                    <Field label="AMC no." value={batch.amc || "No AMC"} mono />
                    <Field label="AMC vendor" value={batch.amcSupplier || "-"} />
                    <Field label="AMC expiry" value={batch.amcExpiry ? new Date(batch.amcExpiry).toLocaleDateString("en-IN") : "-"} />
                    <Field label="Serials" value={(batch.serials ?? []).join(", ") || "-"} mono />
                    <Field label="Notes" value={batch.notes || "-"} />
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
            {newItemMode === "single" ? (
              <button className="dp-btn primary" type="button" disabled={saving} onClick={saveNewItem}>
                {saving ? "Saving..." : "Save item ->"}
              </button>
            ) : null}
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
