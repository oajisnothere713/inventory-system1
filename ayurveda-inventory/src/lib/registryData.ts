import type { RawRegistryRow } from "@/lib/registryMap";

type PrismaLike = {
  $queryRawUnsafe: (sql: string) => Promise<unknown>;
};

/** Load active registry rows (same shape as `GET /api/registry`). */
export async function fetchRegistryRows(prisma: PrismaLike): Promise<RawRegistryRow[]> {
  const itemsSql = `
    SELECT
      i.item_id AS iid,
      i.item_code AS id,
      i.item_name AS name,
      i.item_type AS sub,
      i.category,
      i.sub_category AS subcat,
      i.unit,
      i.min_stock_level::text AS min_stock_level,
      i.max_stock_level::text AS max_stock_level,
      COALESCE(d.dept_code, d.dept_name) AS dept,
      s.supplier_name AS supplier,
      a.amc_number AS amc,
      to_char(a.contract_end, 'YYYY-MM-DD') AS amc_expiry,
      i.price_per_unit::text AS price
    FROM items i
    LEFT JOIN departments d ON d.dept_id = i.primary_dept_id
    LEFT JOIN suppliers s ON s.supplier_id = i.default_supplier_id
    LEFT JOIN LATERAL (
      SELECT amc_number, contract_end FROM amc_contracts ac WHERE ac.item_id = i.item_id ORDER BY ac.contract_end DESC LIMIT 1
    ) a ON true
    WHERE i.is_active = true
    ORDER BY i.item_name ASC;
  `;

  const itemsRaw = (await prisma.$queryRawUnsafe(itemsSql)) as Array<Record<string, unknown>>;
  const itemIds = itemsRaw.map((r) => r.iid as number).filter(Boolean) as number[];

  let batchesRaw: Array<Record<string, unknown>> = [];
  if (itemIds.length) {
    const batchSql = `
      SELECT
        ib.item_id,
        ib.batch_id,
        ib.batch_number AS batch,
        ib.quantity_available AS stock,
        to_char(ib.mfg_date, 'YYYY-MM-DD') AS mfg_date,
        to_char(ib.expiry_date, 'YYYY-MM-DD') AS expiry,
        sup.supplier_name AS supplier,
        ib.purchase_price AS price,
        ib.storage_location AS location,
        ib.serial_numbers AS serial_numbers,
        g.grn_number AS grn,
        to_char(g.grn_date, 'YYYY-MM-DD') AS grn_date,
        g.invoice_number AS invoice,
        to_char(g.invoice_date, 'YYYY-MM-DD') AS invoice_date,
        ib.notes AS notes,
        ac.amc_number AS amc,
        to_char(ac.contract_end, 'YYYY-MM-DD') AS amc_expiry,
        ac.status AS amc_status,
        amc_sup.supplier_name AS amc_supplier
      FROM item_batches ib
      LEFT JOIN grn_entries g ON g.grn_id = ib.grn_id
      LEFT JOIN suppliers sup ON sup.supplier_id = ib.supplier_id
      LEFT JOIN LATERAL (
        SELECT *
        FROM amc_contracts ac
        WHERE ac.batch_id = ib.batch_id
        ORDER BY ac.contract_end DESC
        LIMIT 1
      ) ac ON true
      LEFT JOIN suppliers amc_sup ON amc_sup.supplier_id = ac.supplier_id
      WHERE ib.item_id IN (${itemIds.join(",")})
      ORDER BY ib.expiry_date ASC NULLS LAST, ib.created_at DESC
    `;
    batchesRaw = (await prisma.$queryRawUnsafe(batchSql)) as Array<Record<string, unknown>>;
  }

  const batchesByItem: Record<number, Array<Record<string, unknown>>> = {};
  for (const b of batchesRaw) {
    const id = Number(b.item_id);
    if (!batchesByItem[id]) batchesByItem[id] = [];
    const serials = String(b.serial_numbers ?? "")
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    batchesByItem[id].push({
      batch: b.batch as string,
      stock: Number(b.stock ?? 0),
      mfgDate: (b.mfg_date as string) || null,
      expiry: (b.expiry as string) || null,
      supplier: (b.supplier as string) || null,
      price: b.price ?? null,
      location: (b.location as string) || null,
      grn: (b.grn as string) || null,
      grnDate: (b.grn_date as string) || null,
      invoice: (b.invoice as string) || null,
      invoiceDate: (b.invoice_date as string) || null,
      notes: (b.notes as string) || null,
      serials,
      amc: (b.amc as string) || null,
      amcExpiry: (b.amc_expiry as string) || null,
      amcStatus: (b.amc_status as string) || null,
      amcSupplier: (b.amc_supplier as string) || null,
    });
  }

  return itemsRaw.map((it) => {
    const bs = batchesByItem[it.iid as number] || [];
    const stockTotal = bs.reduce((s, x) => s + Number(x.stock ?? 0), 0);
    const earliestExpiry =
      bs
        .filter((x) => x.expiry)
        .map((x) => new Date(String(x.expiry)).toISOString())
        .sort()[0] || null;
    return {
      id: it.id as string | number,
      name: it.name as string,
      sub: (it.sub as string) || "",
      category: it.category as string,
      subcat: it.subcat as string,
      stock: stockTotal,
      min: Number(it.min_stock_level || 0),
      max: Number(it.max_stock_level || 0),
      unit: (it.unit as string) || "",
      expiry: earliestExpiry,
      dept: (it.dept as string) || "",
      batch: (bs[0]?.batch as string) || null,
      batches: bs as RawRegistryRow["batches"],
      supplier: (it.supplier as string) || null,
      price: Number(it.price || 0),
      amc: (it.amc as string) || null,
      amcExpiry: (it.amc_expiry as string) || null,
      serial: null,
      purchase: null,
    };
  });
}
