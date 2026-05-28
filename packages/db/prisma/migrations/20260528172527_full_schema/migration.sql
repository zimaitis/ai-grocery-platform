-- CreateTable
CREATE TABLE "canonical_category" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canonical_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "canonicalCategoryId" TEXT,
    "defaultUnit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attribute" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "unit" TEXT,
    "isFilterable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attribute_value" (
    "id" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_attribute_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attribute_link" (
    "productId" TEXT NOT NULL,
    "attributeValueId" TEXT NOT NULL,

    CONSTRAINT "product_attribute_link_pkey" PRIMARY KEY ("productId","attributeValueId")
);

-- CreateTable
CREATE TABLE "source" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_category" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "parentExternalId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "level" INTEGER NOT NULL,
    "productCount" INTEGER,
    "rawData" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_mapping" (
    "id" TEXT NOT NULL,
    "externalCategoryId" TEXT NOT NULL,
    "canonicalCategoryId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "mappingSource" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_product" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "eanCodes" TEXT[],
    "packageSize" TEXT,
    "unitPrice" DECIMAL(10,4),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "firstSeenAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_product_attribute" (
    "id" TEXT NOT NULL,
    "storeProductId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "attributeValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_product_attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_product_price" (
    "id" TEXT NOT NULL,
    "storeProductId" TEXT NOT NULL,
    "price" DECIMAL(10,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "isPromo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_product_price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_document" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "externalOrderNo" TEXT,
    "documentDate" TIMESTAMP(3) NOT NULL,
    "filePath" TEXT,
    "rawText" TEXT,
    "parsedJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase" (
    "id" TEXT NOT NULL,
    "sourceDocumentId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "paymentStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_item" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "storeProductId" TEXT,
    "productId" TEXT,
    "canonicalCategoryId" TEXT,
    "rawName" TEXT NOT NULL,
    "eanCodes" TEXT[],
    "orderedQuantity" DECIMAL(10,4) NOT NULL,
    "collectedQuantity" DECIMAL(10,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,4) NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_product_preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "preferredStoreProductId" TEXT,
    "strength" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_product_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_recommendation_policy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canonicalCategoryId" TEXT,
    "mode" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_recommendation_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_list" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "context" JSONB,
    "status" TEXT NOT NULL,

    CONSTRAINT "recommendation_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_item" (
    "id" TEXT NOT NULL,
    "recommendationListId" TEXT NOT NULL,
    "productId" TEXT,
    "storeProductId" TEXT,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "score" DOUBLE PRECISION,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_explanation" (
    "id" TEXT NOT NULL,
    "recommendationItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_explanation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_tag" (
    "productId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "product_tag_pkey" PRIMARY KEY ("productId","tagId")
);

-- CreateTable
CREATE TABLE "currency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_canonicalCategoryId_idx" ON "product"("canonicalCategoryId");

-- CreateIndex
CREATE INDEX "product_isActive_idx" ON "product"("isActive");

-- CreateIndex
CREATE INDEX "product_attribute_productId_idx" ON "product_attribute"("productId");

-- CreateIndex
CREATE INDEX "product_attribute_value_attributeId_idx" ON "product_attribute_value"("attributeId");

-- CreateIndex
CREATE INDEX "product_attribute_link_attributeValueId_idx" ON "product_attribute_link"("attributeValueId");

-- CreateIndex
CREATE UNIQUE INDEX "source_code_key" ON "source"("code");

-- CreateIndex
CREATE INDEX "external_category_sourceId_idx" ON "external_category"("sourceId");

-- CreateIndex
CREATE INDEX "external_category_externalId_idx" ON "external_category"("externalId");

-- CreateIndex
CREATE INDEX "category_mapping_externalCategoryId_idx" ON "category_mapping"("externalCategoryId");

-- CreateIndex
CREATE INDEX "category_mapping_canonicalCategoryId_idx" ON "category_mapping"("canonicalCategoryId");

-- CreateIndex
CREATE INDEX "store_sourceId_idx" ON "store"("sourceId");

-- CreateIndex
CREATE INDEX "store_product_storeId_idx" ON "store_product"("storeId");

-- CreateIndex
CREATE INDEX "store_product_productId_idx" ON "store_product"("productId");

-- CreateIndex
CREATE INDEX "store_product_isActive_idx" ON "store_product"("isActive");

-- CreateIndex
CREATE INDEX "store_product_attribute_storeProductId_idx" ON "store_product_attribute"("storeProductId");

-- CreateIndex
CREATE INDEX "store_product_attribute_attributeId_idx" ON "store_product_attribute"("attributeId");

-- CreateIndex
CREATE INDEX "store_product_price_storeProductId_idx" ON "store_product_price"("storeProductId");

-- CreateIndex
CREATE INDEX "store_product_price_validFrom_idx" ON "store_product_price"("validFrom");

-- CreateIndex
CREATE INDEX "source_document_sourceId_idx" ON "source_document"("sourceId");

-- CreateIndex
CREATE INDEX "purchase_sourceDocumentId_idx" ON "purchase"("sourceDocumentId");

-- CreateIndex
CREATE INDEX "purchase_storeId_idx" ON "purchase"("storeId");

-- CreateIndex
CREATE INDEX "purchase_purchasedAt_idx" ON "purchase"("purchasedAt");

-- CreateIndex
CREATE INDEX "purchase_item_purchaseId_idx" ON "purchase_item"("purchaseId");

-- CreateIndex
CREATE INDEX "purchase_item_storeProductId_idx" ON "purchase_item"("storeProductId");

-- CreateIndex
CREATE INDEX "purchase_item_productId_idx" ON "purchase_item"("productId");

-- CreateIndex
CREATE INDEX "purchase_item_canonicalCategoryId_idx" ON "purchase_item"("canonicalCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");

-- CreateIndex
CREATE INDEX "user_product_preference_userId_idx" ON "user_product_preference"("userId");

-- CreateIndex
CREATE INDEX "user_product_preference_productId_idx" ON "user_product_preference"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "user_product_preference_userId_productId_key" ON "user_product_preference"("userId", "productId");

-- CreateIndex
CREATE INDEX "user_recommendation_policy_userId_idx" ON "user_recommendation_policy"("userId");

-- CreateIndex
CREATE INDEX "user_recommendation_policy_canonicalCategoryId_idx" ON "user_recommendation_policy"("canonicalCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "user_recommendation_policy_userId_canonicalCategoryId_mode_key" ON "user_recommendation_policy"("userId", "canonicalCategoryId", "mode");

-- CreateIndex
CREATE INDEX "recommendation_list_userId_idx" ON "recommendation_list"("userId");

-- CreateIndex
CREATE INDEX "recommendation_list_status_idx" ON "recommendation_list"("status");

-- CreateIndex
CREATE INDEX "recommendation_item_recommendationListId_idx" ON "recommendation_item"("recommendationListId");

-- CreateIndex
CREATE INDEX "recommendation_item_productId_idx" ON "recommendation_item"("productId");

-- CreateIndex
CREATE INDEX "recommendation_item_rank_idx" ON "recommendation_item"("rank");

-- CreateIndex
CREATE INDEX "recommendation_explanation_recommendationItemId_idx" ON "recommendation_explanation"("recommendationItemId");

-- CreateIndex
CREATE UNIQUE INDEX "tag_slug_key" ON "tag"("slug");

-- CreateIndex
CREATE INDEX "product_tag_tagId_idx" ON "product_tag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "currency_code_key" ON "currency"("code");

-- AddForeignKey
ALTER TABLE "canonical_category" ADD CONSTRAINT "canonical_category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "canonical_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_canonicalCategoryId_fkey" FOREIGN KEY ("canonicalCategoryId") REFERENCES "canonical_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute" ADD CONSTRAINT "product_attribute_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_value" ADD CONSTRAINT "product_attribute_value_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "product_attribute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_link" ADD CONSTRAINT "product_attribute_link_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_link" ADD CONSTRAINT "product_attribute_link_attributeValueId_fkey" FOREIGN KEY ("attributeValueId") REFERENCES "product_attribute_value"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_category" ADD CONSTRAINT "external_category_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_mapping" ADD CONSTRAINT "category_mapping_externalCategoryId_fkey" FOREIGN KEY ("externalCategoryId") REFERENCES "external_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_mapping" ADD CONSTRAINT "category_mapping_canonicalCategoryId_fkey" FOREIGN KEY ("canonicalCategoryId") REFERENCES "canonical_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store" ADD CONSTRAINT "store_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_product" ADD CONSTRAINT "store_product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_product" ADD CONSTRAINT "store_product_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_product_attribute" ADD CONSTRAINT "store_product_attribute_storeProductId_fkey" FOREIGN KEY ("storeProductId") REFERENCES "store_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_product_attribute" ADD CONSTRAINT "store_product_attribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "product_attribute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_product_price" ADD CONSTRAINT "store_product_price_storeProductId_fkey" FOREIGN KEY ("storeProductId") REFERENCES "store_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_document" ADD CONSTRAINT "source_document_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "source_document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_item" ADD CONSTRAINT "purchase_item_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_item" ADD CONSTRAINT "purchase_item_storeProductId_fkey" FOREIGN KEY ("storeProductId") REFERENCES "store_product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_item" ADD CONSTRAINT "purchase_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_item" ADD CONSTRAINT "purchase_item_canonicalCategoryId_fkey" FOREIGN KEY ("canonicalCategoryId") REFERENCES "canonical_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_product_preference" ADD CONSTRAINT "user_product_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_product_preference" ADD CONSTRAINT "user_product_preference_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_product_preference" ADD CONSTRAINT "user_product_preference_preferredStoreProductId_fkey" FOREIGN KEY ("preferredStoreProductId") REFERENCES "store_product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_recommendation_policy" ADD CONSTRAINT "user_recommendation_policy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_recommendation_policy" ADD CONSTRAINT "user_recommendation_policy_canonicalCategoryId_fkey" FOREIGN KEY ("canonicalCategoryId") REFERENCES "canonical_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_list" ADD CONSTRAINT "recommendation_list_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_item" ADD CONSTRAINT "recommendation_item_recommendationListId_fkey" FOREIGN KEY ("recommendationListId") REFERENCES "recommendation_list"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_item" ADD CONSTRAINT "recommendation_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_item" ADD CONSTRAINT "recommendation_item_storeProductId_fkey" FOREIGN KEY ("storeProductId") REFERENCES "store_product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_explanation" ADD CONSTRAINT "recommendation_explanation_recommendationItemId_fkey" FOREIGN KEY ("recommendationItemId") REFERENCES "recommendation_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tag" ADD CONSTRAINT "product_tag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tag" ADD CONSTRAINT "product_tag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
