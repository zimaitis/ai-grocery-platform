-- Stabilization: idempotency, normalization, enum cleanup

-- ── Create Enums ──────────────────────────────────────────────────

CREATE TYPE "SourceType" AS ENUM ('ONLINE_GROCERY', 'PHYSICAL_STORE', 'RECEIPT_MANUAL', 'CSV_IMPORT');
CREATE TYPE "SourceDocumentType" AS ENUM ('BARBORA_ORDER', 'RECEIPT_IMAGE', 'CSV_EXPORT', 'MANUAL_ENTRY');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'CANCELLED');
CREATE TYPE "RecommendationPolicyMode" AS ENUM ('preferred_only', 'prefer_known', 'explore_allowed', 'avoid', 'must_buy');
CREATE TYPE "RecommendationListStatus" AS ENUM ('draft', 'active', 'archived');
CREATE TYPE "RecommendationItemType" AS ENUM ('restock', 'substitute', 'discovery', 'price_alert');

-- ── Convert String Columns to Enums (safe casts, no data loss) ────

ALTER TABLE "source" ALTER COLUMN "type" TYPE "SourceType" USING "type"::"SourceType";
ALTER TABLE "source_document" ALTER COLUMN "type" TYPE "SourceDocumentType" USING "type"::"SourceDocumentType";
ALTER TABLE "purchase" ALTER COLUMN "paymentStatus" TYPE "PaymentStatus" USING "paymentStatus"::"PaymentStatus";
ALTER TABLE "user_recommendation_policy" ALTER COLUMN "mode" TYPE "RecommendationPolicyMode" USING "mode"::"RecommendationPolicyMode";
ALTER TABLE "recommendation_list" ALTER COLUMN "status" TYPE "RecommendationListStatus" USING "status"::"RecommendationListStatus";
ALTER TABLE "recommendation_item" ALTER COLUMN "type" TYPE "RecommendationItemType" USING "type"::"RecommendationItemType";

-- ── SourceDocument: rename field + idempotency ────────────────────

ALTER TABLE "source_document" RENAME COLUMN "externalOrderNo" TO "externalOrderNumber";
CREATE UNIQUE INDEX "source_document_sourceId_externalOrderNumber_key" ON "source_document"("sourceId", "externalOrderNumber");

-- ── ExternalCategory: stale detection + idempotency ───────────────

ALTER TABLE "external_category" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "external_category_sourceId_externalId_key" ON "external_category"("sourceId", "externalId");

-- ── CategoryMapping: dedup ────────────────────────────────────────

CREATE UNIQUE INDEX "category_mapping_externalCategoryId_canonicalCategoryId_key" ON "category_mapping"("externalCategoryId", "canonicalCategoryId");

-- ── StoreProduct: external tracking + normalization readiness ─────

ALTER TABLE "store_product" ADD COLUMN "externalId" TEXT;
ALTER TABLE "store_product" ADD COLUMN "rawData" JSONB;
ALTER TABLE "store_product" ADD COLUMN "normalizationStatus" TEXT NOT NULL DEFAULT 'pending';

CREATE UNIQUE INDEX "store_product_storeId_externalId_key" ON "store_product"("storeId", "externalId");
CREATE INDEX "store_product_externalId_idx" ON "store_product"("externalId");
CREATE INDEX "store_product_name_idx" ON "store_product"("name");
CREATE INDEX "store_product_normalizationStatus_idx" ON "store_product"("normalizationStatus");

-- ── StoreProductPrice: unique constraint + composite index ────────

CREATE UNIQUE INDEX "store_product_price_storeProductId_validFrom_key" ON "store_product_price"("storeProductId", "validFrom");
CREATE INDEX "store_product_price_storeProductId_validFrom_idx" ON "store_product_price"("storeProductId", "validFrom");

-- ── Product: name index ───────────────────────────────────────────

CREATE INDEX "product_name_idx" ON "product"("name");

-- ── Remove orphaned lookup tables ─────────────────────────────────

DROP TABLE "brand";
DROP TABLE "unit";
DROP TABLE "currency";
