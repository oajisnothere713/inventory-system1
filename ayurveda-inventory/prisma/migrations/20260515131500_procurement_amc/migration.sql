ALTER TABLE "amc_contracts"
ADD COLUMN "batch_id" INTEGER,
ADD COLUMN "grn_id" INTEGER;

ALTER TABLE "amc_contracts"
ADD CONSTRAINT "amc_contracts_batch_id_fkey"
FOREIGN KEY ("batch_id") REFERENCES "item_batches"("batch_id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "amc_contracts"
ADD CONSTRAINT "amc_contracts_grn_id_fkey"
FOREIGN KEY ("grn_id") REFERENCES "grn_entries"("grn_id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "amc_contracts_batch_id_idx" ON "amc_contracts"("batch_id");
CREATE INDEX "amc_contracts_grn_id_idx" ON "amc_contracts"("grn_id");

WITH latest_batch AS (
  SELECT
    ac."amc_id",
    ib."batch_id",
    ib."grn_id",
    ROW_NUMBER() OVER (
      PARTITION BY ac."amc_id"
      ORDER BY ib."created_at" DESC, ib."batch_id" DESC
    ) AS rn
  FROM "amc_contracts" ac
  JOIN "item_batches" ib ON ib."item_id" = ac."item_id"
  WHERE ac."batch_id" IS NULL
)
UPDATE "amc_contracts" ac
SET
  "batch_id" = lb."batch_id",
  "grn_id" = lb."grn_id"
FROM latest_batch lb
WHERE ac."amc_id" = lb."amc_id"
  AND lb.rn = 1;
