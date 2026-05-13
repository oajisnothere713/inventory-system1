-- CreateEnum
CREATE TYPE "DeptCategory" AS ENUM ('clinical', 'admin', 'lab', 'pharmacy', 'other');

-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('manufacturer', 'distributor', 'local', 'govt_body', 'other');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'store_manager', 'doctor', 'department_head', 'viewer');

-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('OPEX', 'CAPEX');

-- CreateEnum
CREATE TYPE "ItemSubCategory" AS ENUM ('medicines', 'consumables', 'devices', 'electrical');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('active', 'expiring', 'expired', 'depleted', 'disposed');

-- CreateEnum
CREATE TYPE "QualityStatus" AS ENUM ('accepted', 'rejected', 'partial');

-- CreateEnum
CREATE TYPE "IssuePurpose" AS ENUM ('patient_opd', 'patient_ipd', 'dept_restock', 'panchakarma', 'research', 'quality_test', 'other');

-- CreateEnum
CREATE TYPE "AmcCoverageType" AS ENUM ('comprehensive', 'non_comprehensive', 'parts_only', 'labour_only');

-- CreateEnum
CREATE TYPE "AmcStatus" AS ENUM ('active', 'expired', 'renewed', 'cancelled');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('expiry_30d', 'expiry_60d', 'expiry_90d', 'expired', 'low_stock', 'amc_30d', 'amc_60d', 'amc_90d', 'amc_expired', 'dead_stock', 'anomaly');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('active', 'acknowledged', 'resolved', 'snoozed');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT');

-- CreateEnum
CREATE TYPE "DisposalReason" AS ENUM ('expired', 'damaged', 'quality_fail', 'contaminated', 'other');

-- CreateEnum
CREATE TYPE "DisposalMethod" AS ENUM ('incineration', 'return_to_supplier', 'govt_disposal', 'other');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('stock_report', 'expiry_report', 'consumption_report', 'grn_report', 'issue_report', 'amc_report', 'wastage_report', 'dead_stock_report');

-- CreateEnum
CREATE TYPE "SortDirection" AS ENUM ('ASC', 'DESC');

-- CreateEnum
CREATE TYPE "OutputFormat" AS ENUM ('xlsx', 'pdf', 'csv');

-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('daily', 'weekly', 'monthly', 'quarterly');

-- CreateTable
CREATE TABLE "departments" (
    "dept_id" SERIAL NOT NULL,
    "dept_code" VARCHAR(10) NOT NULL,
    "dept_name" VARCHAR(100) NOT NULL,
    "dept_name_hi" VARCHAR(200),
    "category" "DeptCategory" NOT NULL DEFAULT 'clinical',
    "floor_location" VARCHAR(100),
    "hod_name" VARCHAR(150),
    "contact_phone" VARCHAR(15),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("dept_id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "supplier_id" SERIAL NOT NULL,
    "supplier_code" VARCHAR(10) NOT NULL,
    "supplier_name" VARCHAR(200) NOT NULL,
    "supplier_type" "SupplierType" NOT NULL DEFAULT 'distributor',
    "gst_number" VARCHAR(20),
    "pan_number" VARCHAR(12),
    "contact_person" VARCHAR(150),
    "contact_phone" VARCHAR(15),
    "contact_email" VARCHAR(200),
    "address_line1" VARCHAR(300),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "pincode" VARCHAR(10),
    "payment_terms" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("supplier_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "dept_id" INTEGER,
    "email" VARCHAR(200),
    "phone" VARCHAR(15),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "items" (
    "item_id" SERIAL NOT NULL,
    "item_code" VARCHAR(20) NOT NULL,
    "item_name" VARCHAR(200) NOT NULL,
    "item_name_hi" VARCHAR(300),
    "category" "ItemCategory" NOT NULL,
    "sub_category" "ItemSubCategory" NOT NULL,
    "item_type" VARCHAR(100),
    "description" TEXT,
    "unit" VARCHAR(20) NOT NULL,
    "primary_dept_id" INTEGER NOT NULL,
    "default_supplier_id" INTEGER,
    "min_stock_level" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "max_stock_level" DECIMAL(10,3),
    "reorder_qty" DECIMAL(10,3),
    "shelf_life_months" INTEGER,
    "storage_conditions" VARCHAR(200),
    "hsn_code" VARCHAR(20),
    "price_per_unit" DECIMAL(10,2),
    "qr_code" VARCHAR(100),
    "supplier_barcode" VARCHAR(100),
    "has_expiry" BOOLEAN NOT NULL DEFAULT true,
    "has_amc" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "item_batches" (
    "batch_id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "batch_number" VARCHAR(100) NOT NULL,
    "quantity_received" DECIMAL(10,3) NOT NULL,
    "quantity_available" DECIMAL(10,3) NOT NULL,
    "mfg_date" DATE,
    "expiry_date" DATE,
    "grn_id" INTEGER NOT NULL,
    "supplier_id" INTEGER,
    "purchase_price" DECIMAL(10,2),
    "storage_location" VARCHAR(200),
    "serial_numbers" TEXT,
    "status" "BatchStatus" NOT NULL DEFAULT 'active',
    "fefo_rank" INTEGER,
    "qr_batch_code" VARCHAR(150),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_batches_pkey" PRIMARY KEY ("batch_id")
);

-- CreateTable
CREATE TABLE "grn_entries" (
    "grn_id" SERIAL NOT NULL,
    "grn_number" VARCHAR(30) NOT NULL,
    "grn_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "item_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "supplier_id" INTEGER,
    "quantity_received" DECIMAL(10,3) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "batch_number" VARCHAR(100) NOT NULL,
    "mfg_date" DATE,
    "expiry_date" DATE,
    "invoice_number" VARCHAR(100) NOT NULL,
    "invoice_date" DATE,
    "price_per_unit" DECIMAL(10,2),
    "total_value" DECIMAL(12,2),
    "store_location" VARCHAR(200),
    "received_by" INTEGER NOT NULL,
    "verified_by" INTEGER,
    "quality_status" "QualityStatus" NOT NULL DEFAULT 'accepted',
    "notes" TEXT,
    "stock_before" DECIMAL(10,3) NOT NULL,
    "stock_after" DECIMAL(10,3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grn_entries_pkey" PRIMARY KEY ("grn_id")
);

-- CreateTable
CREATE TABLE "stock_issues" (
    "issue_id" SERIAL NOT NULL,
    "issue_number" VARCHAR(30) NOT NULL,
    "issue_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "item_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "dept_id" INTEGER NOT NULL,
    "quantity_issued" DECIMAL(10,3) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "specific_location" VARCHAR(200),
    "purpose" "IssuePurpose" NOT NULL,
    "authorised_by" INTEGER NOT NULL,
    "issued_by" INTEGER NOT NULL,
    "patient_id" VARCHAR(50),
    "prescription_ref" VARCHAR(100),
    "stock_before" DECIMAL(10,3) NOT NULL,
    "stock_after" DECIMAL(10,3) NOT NULL,
    "batch_qty_before" DECIMAL(10,3) NOT NULL,
    "batch_qty_after" DECIMAL(10,3) NOT NULL,
    "triggered_low_stock" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_issues_pkey" PRIMARY KEY ("issue_id")
);

-- CreateTable
CREATE TABLE "amc_contracts" (
    "amc_id" SERIAL NOT NULL,
    "amc_number" VARCHAR(50) NOT NULL,
    "item_id" INTEGER NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "contract_start" DATE NOT NULL,
    "contract_end" DATE NOT NULL,
    "amc_value" DECIMAL(12,2),
    "coverage_type" "AmcCoverageType" NOT NULL DEFAULT 'comprehensive',
    "service_frequency" VARCHAR(100),
    "contact_person" VARCHAR(150),
    "contact_phone" VARCHAR(15),
    "last_service_date" DATE,
    "next_service_date" DATE,
    "status" "AmcStatus" NOT NULL DEFAULT 'active',
    "alert_90d_sent" BOOLEAN NOT NULL DEFAULT false,
    "alert_60d_sent" BOOLEAN NOT NULL DEFAULT false,
    "alert_30d_sent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "amc_contracts_pkey" PRIMARY KEY ("amc_id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "alert_id" SERIAL NOT NULL,
    "alert_type" "AlertType" NOT NULL,
    "item_id" INTEGER NOT NULL,
    "batch_id" INTEGER,
    "amc_id" INTEGER,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'medium',
    "alert_title" VARCHAR(300) NOT NULL,
    "alert_message" TEXT NOT NULL,
    "days_remaining" INTEGER,
    "threshold_value" DECIMAL(10,3),
    "status" "AlertStatus" NOT NULL DEFAULT 'active',
    "acknowledged_by" INTEGER,
    "acknowledged_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "snoozed_until" TIMESTAMP(3),
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("alert_id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "log_id" BIGSERIAL NOT NULL,
    "table_name" VARCHAR(50) NOT NULL,
    "record_id" INTEGER NOT NULL,
    "action" "AuditAction" NOT NULL,
    "changed_by" INTEGER NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "session_id" VARCHAR(100),
    "notes" VARCHAR(500),

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "disposal_log" (
    "disposal_id" SERIAL NOT NULL,
    "disposal_number" VARCHAR(30) NOT NULL,
    "disposal_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "item_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "quantity_disposed" DECIMAL(10,3) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "disposal_reason" "DisposalReason" NOT NULL DEFAULT 'expired',
    "value_written_off" DECIMAL(12,2),
    "disposal_method" "DisposalMethod" NOT NULL DEFAULT 'incineration',
    "ayush_guideline_ref" VARCHAR(200),
    "disposed_by" INTEGER NOT NULL,
    "witnessed_by" VARCHAR(200),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disposal_log_pkey" PRIMARY KEY ("disposal_id")
);

-- CreateTable
CREATE TABLE "report_templates" (
    "template_id" SERIAL NOT NULL,
    "template_name" VARCHAR(200) NOT NULL,
    "report_type" "ReportType" NOT NULL,
    "filters_json" JSONB NOT NULL DEFAULT '{}',
    "columns_json" JSONB NOT NULL DEFAULT '[]',
    "sort_by" VARCHAR(50),
    "sort_direction" "SortDirection" DEFAULT 'ASC',
    "output_format" "OutputFormat" NOT NULL DEFAULT 'xlsx',
    "is_scheduled" BOOLEAN NOT NULL DEFAULT false,
    "schedule_frequency" "ScheduleFrequency",
    "schedule_day" INTEGER,
    "email_recipients" TEXT,
    "created_by" INTEGER NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("template_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_dept_code_key" ON "departments"("dept_code");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_supplier_code_key" ON "suppliers"("supplier_code");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_gst_number_key" ON "suppliers"("gst_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "items_item_code_key" ON "items"("item_code");

-- CreateIndex
CREATE UNIQUE INDEX "items_qr_code_key" ON "items"("qr_code");

-- CreateIndex
CREATE UNIQUE INDEX "item_batches_qr_batch_code_key" ON "item_batches"("qr_batch_code");

-- CreateIndex
CREATE UNIQUE INDEX "grn_entries_grn_number_key" ON "grn_entries"("grn_number");

-- CreateIndex
CREATE UNIQUE INDEX "stock_issues_issue_number_key" ON "stock_issues"("issue_number");

-- CreateIndex
CREATE UNIQUE INDEX "amc_contracts_amc_number_key" ON "amc_contracts"("amc_number");

-- CreateIndex
CREATE UNIQUE INDEX "disposal_log_disposal_number_key" ON "disposal_log"("disposal_number");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "departments"("dept_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_primary_dept_id_fkey" FOREIGN KEY ("primary_dept_id") REFERENCES "departments"("dept_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_default_supplier_id_fkey" FOREIGN KEY ("default_supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_batches" ADD CONSTRAINT "item_batches_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_batches" ADD CONSTRAINT "item_batches_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "grn_entries"("grn_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_batches" ADD CONSTRAINT "item_batches_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_entries" ADD CONSTRAINT "grn_entries_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_entries" ADD CONSTRAINT "grn_entries_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_entries" ADD CONSTRAINT "grn_entries_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_entries" ADD CONSTRAINT "grn_entries_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_issues" ADD CONSTRAINT "stock_issues_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_issues" ADD CONSTRAINT "stock_issues_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "item_batches"("batch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_issues" ADD CONSTRAINT "stock_issues_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "departments"("dept_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_issues" ADD CONSTRAINT "stock_issues_authorised_by_fkey" FOREIGN KEY ("authorised_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_issues" ADD CONSTRAINT "stock_issues_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amc_contracts" ADD CONSTRAINT "amc_contracts_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amc_contracts" ADD CONSTRAINT "amc_contracts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amc_contracts" ADD CONSTRAINT "amc_contracts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "item_batches"("batch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_amc_id_fkey" FOREIGN KEY ("amc_id") REFERENCES "amc_contracts"("amc_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposal_log" ADD CONSTRAINT "disposal_log_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposal_log" ADD CONSTRAINT "disposal_log_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "item_batches"("batch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposal_log" ADD CONSTRAINT "disposal_log_disposed_by_fkey" FOREIGN KEY ("disposed_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
