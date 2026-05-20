import { Item, batchStatus, daysUntil, isLowStock, totalStock } from "@/components/registry/utils";

export type OperationalAlertBreakdown = {
  total: number;
  lowStock: number;
  expiring: number;
  expired: number;
  amcDue: number;
  amcExpired: number;
};

/** Count operational problems using the same rules as Insights `buildAlerts`. */
export function getOperationalAlertBreakdown(items: Item[]): OperationalAlertBreakdown {
  let lowStock = 0;
  let expiring = 0;
  let expired = 0;
  let amcDue = 0;
  let amcExpired = 0;

  for (const item of items) {
    if (isLowStock(item)) lowStock++;
    for (const batch of item.batches ?? []) {
      const status = batchStatus(batch, item.category === "CAPEX");
      if (status === "expired") expired++;
      else if (status === "expiring") expiring++;
      else if (status === "amc_expired") amcExpired++;
      else if (status === "amc_due") amcDue++;
    }
  }

  return {
    total: lowStock + expiring + expired + amcDue + amcExpired,
    lowStock,
    expiring,
    expired,
    amcDue,
    amcExpired,
  };
}

export function countOperationalAlerts(items: Item[]): number {
  return getOperationalAlertBreakdown(items).total;
}

export type DashboardExpiringBatch = {
  batchId: string;
  batchNumber?: string;
  expiryDate?: string;
  quantityAvailable?: string;
  item?: { itemId?: string; itemName?: string };
};

export type DashboardLowStockItem = {
  itemId: string;
  itemName?: string;
  totalAvailable: number;
};

export type DashboardAmcDue = {
  amcId: string;
  amcNumber?: string;
  contractEnd?: string;
  item?: { itemId?: string; itemName?: string };
};

const PREVIEW_LIMIT = 6;

export function buildDashboardAttentionPreviews(items: Item[]) {
  const expiring: DashboardExpiringBatch[] = [];
  const lowStock: DashboardLowStockItem[] = [];
  const amcDue: DashboardAmcDue[] = [];

  for (const item of items) {
    if (isLowStock(item) && lowStock.length < PREVIEW_LIMIT) {
      lowStock.push({
        itemId: item.id,
        itemName: item.name,
        totalAvailable: totalStock(item),
      });
    }

    for (const batch of item.batches ?? []) {
      const status = batchStatus(batch, item.category === "CAPEX");
      if (status === "expiring" && expiring.length < PREVIEW_LIMIT) {
        expiring.push({
          batchId: `${item.id}:${batch.batch}`,
          batchNumber: batch.batch,
          expiryDate: batch.expiry ?? undefined,
          quantityAvailable: String(batch.stock ?? 0),
          item: { itemId: item.id, itemName: item.name },
        });
      }
      if (status === "amc_due" && amcDue.length < PREVIEW_LIMIT) {
        amcDue.push({
          amcId: `${item.id}:${batch.amc ?? batch.batch}`,
          amcNumber: batch.amc ?? undefined,
          contractEnd: batch.amcExpiry ?? undefined,
          item: { itemId: item.id, itemName: item.name },
        });
      }
    }
  }

  expiring.sort((a, b) => {
    const da = daysUntil(a.expiryDate) ?? 9999;
    const db = daysUntil(b.expiryDate) ?? 9999;
    return da - db;
  });
  amcDue.sort((a, b) => {
    const da = daysUntil(a.contractEnd) ?? 9999;
    const db = daysUntil(b.contractEnd) ?? 9999;
    return da - db;
  });

  return { expiring, lowStock, amcDue };
}
