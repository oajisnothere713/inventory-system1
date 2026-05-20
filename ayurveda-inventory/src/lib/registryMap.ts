import { Batch, Item, itemStatus } from "@/components/registry/utils";

export type RawBatch = {
  batch?: string | null;
  stock?: number | string | null;
  mfgDate?: string | null;
  expiry?: string | null;
  supplier?: string | null;
  price?: number | string | null;
  location?: string | null;
  grn?: string | null;
  grnDate?: string | null;
  invoice?: string | null;
  invoiceDate?: string | null;
  notes?: string | null;
  serials?: string[] | null;
  amc?: string | null;
  amcExpiry?: string | null;
  amcStatus?: string | null;
  amcSupplier?: string | null;
};

export type RawRegistryRow = {
  id?: string | number;
  name?: string;
  sub?: string | null;
  category?: string;
  subcat?: string | null;
  stock?: number | string | null;
  min?: number | string | null;
  max?: number | string | null;
  unit?: string | null;
  expiry?: string | null;
  dept?: string | null;
  amcExpiry?: string | null;
  batch?: string | null;
  batches?: RawBatch[] | null;
  supplier?: string | null;
  price?: number | string | null;
  amc?: string | null;
  serial?: string | null;
  purchase?: string | null;
};

/** Map `/api/registry` payload rows to registry `Item` models (same rules as Insights). */
export function mapRegistryRow(d: RawRegistryRow): Item {
  const rawBatches: RawBatch[] = Array.isArray(d.batches) && d.batches.length
    ? d.batches
    : d.batch
      ? [{ batch: d.batch, stock: d.stock ?? 0, expiry: d.expiry ?? null, supplier: d.supplier ?? null, price: d.price ?? null }]
      : [];
  const batches: Batch[] = rawBatches.map((batch) => ({
    batch: String(batch.batch ?? ""),
    stock: Number(batch.stock ?? 0),
    mfgDate: batch.mfgDate ?? null,
    expiry: batch.expiry ?? null,
    supplier: batch.supplier ?? null,
    price: batch.price ? Number(batch.price) : null,
    location: batch.location ?? null,
    grn: batch.grn ?? null,
    grnDate: batch.grnDate ?? null,
    invoice: batch.invoice ?? null,
    invoiceDate: batch.invoiceDate ?? null,
    notes: batch.notes ?? null,
    serials: Array.isArray(batch.serials) ? batch.serials : [],
    amc: batch.amc ?? null,
    amcExpiry: batch.amcExpiry ?? null,
    amcStatus: batch.amcStatus ?? null,
    amcSupplier: batch.amcSupplier ?? null,
  }));
  const earliestExpiry = batches
    .filter((batch) => batch.expiry)
    .map((batch) => new Date(batch.expiry as string).getTime())
    .sort((a, b) => a - b)[0];
  const item: Item = {
    id: String(d.id ?? ""),
    name: d.name ?? "",
    sub: d.sub ?? "",
    category: d.category === "CAPEX" ? "CAPEX" : "OPEX",
    subcat: (d.subcat as Item["subcat"]) || "medicines",
    stock: batches.reduce((sum, batch) => sum + Number(batch.stock || 0), 0) || Number(d.stock ?? 0),
    min: Number(d.min ?? 0),
    max: Number(d.max ?? 0),
    unit: d.unit ?? "",
    expiry: earliestExpiry ? new Date(earliestExpiry).toISOString() : d.expiry ?? null,
    dept: d.dept ?? "",
    status: "healthy",
    batch: batches[0]?.batch ?? d.batch ?? undefined,
    batches,
    supplier: d.supplier ?? undefined,
    price: Number(d.price ?? batches[0]?.price ?? 0),
    amc: d.amc ?? null,
    amcExpiry: d.amcExpiry ?? null,
    serial: d.serial ?? undefined,
    purchase: d.purchase ?? undefined,
  };
  item.status = itemStatus(item) as Item["status"];
  return item;
}
