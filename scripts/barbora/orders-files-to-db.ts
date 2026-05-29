#!/usr/bin/env tsx
/**
 * barbora:orders-files-to-db
 *
 * Imports collected Barbora order JSON files from .tmp/barbora/orders/ into PostgreSQL.
 * No API calls, no AI, no product/category normalization.
 *
 * Idempotent: re-run produces same result with no duplicates.
 *
 * Usage:
 *   pnpm barbora:orders-files-to-db
 *
 * Prerequisites:
 *   - Database running with {@code pnpm db:migrate} applied
 *   - Seed data loaded ({@code pnpm db:seed}) — Source "BARBORA" + Store "Barbora" exist
 *   - Orders collected by {@code barbora:orders-api-to-files}
 *
 * Maps each JSON file to:
 *   - SourceDocument (BARBORA_ORDER, upsert by sourceId + externalOrderNumber)
 *   - Purchase (findFirst/update/create by sourceDocumentId)
 *   - PurchaseItem (delete-and-recreate per Purchase for idempotency)
 *   - StoreProduct (upsert by storeId + matnr)
 *   - StoreProductPrice (upsert by storeProductId + validFrom)
 */
import "dotenv/config";
import { prisma } from "@ai-grocery/db";
import {
  Prisma,
  SourceDocumentType,
  PaymentStatus,
} from "@prisma/client";

/** Transaction client type for use inside prisma.$transaction callbacks. */
type TxClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse Barbora order status to PaymentStatus enum. */
function mapStatus(status: string | null | undefined): PaymentStatus {
  switch (status) {
    case "Užbaigtas":
    case "Pateiktas":
      return PaymentStatus.PAID;
    case "Atšauktas":
      return PaymentStatus.CANCELLED;
    case "Laukiama":
      return PaymentStatus.PENDING;
    default:
      return PaymentStatus.PAID;
  }
}

/**
 * Extract unit string from a Barbora quantity string.
 * e.g. "4,00 vnt." → "vnt.", "0,40 kg" → "kg", "1,00 l" → "l"
 */
function extractUnit(quantity: string | null | undefined): string {
  if (!quantity) return "vnt.";
  const match = quantity.match(/[\d,.\s]+(.+)/);
  return match?.[1]?.trim() || "vnt.";
}

/**
 * Parse Barbora date strings safely.
 * Supports "2026-05-28" and "2026-05-28 12:04:29.9830" formats.
 */
function parseBarboraDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  // If no time component, append T00:00:00
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T00:00:00`);
  }
  return new Date(dateStr);
}

/**
 * Extract products from an order, falling back to cart.slices[].products[]
 * if top-level products is empty/null.
 */
function getProducts(order: any): any[] {
  if (order.products && Array.isArray(order.products) && order.products.length > 0) {
    return order.products;
  }
  if (order.cart?.slices && Array.isArray(order.cart.slices)) {
    return order.cart.slices.flatMap((s: any) => s.products || []);
  }
  return [];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const fs = await import("fs/promises");
  const pathMod = await import("path");

  const orderDir = pathMod.join(
    process.env.BARBORA_OUTPUT_DIR || ".tmp/barbora",
    "orders"
  );

  // -----------------------------------------------------------------------
  // Stats
  // -----------------------------------------------------------------------
  const stats = {
    processed: 0,
    failed: 0,
    totalFiles: 0,
    documentsUpserted: 0,
    purchases: 0,
    productsUpserted: 0,
    pricesUpserted: 0,
    itemsCreated: 0,
  };
  const errors: { file: string; error: string; timestamp: string }[] = [];

  // -----------------------------------------------------------------------
  // Lookup Barbora source + store (run once at start)
  // -----------------------------------------------------------------------
  const source = await prisma.source.findUnique({ where: { code: "BARBORA" } });
  const store = await prisma.store.findFirst({
    where: { sourceId: source?.id, name: "Barbora" },
  });
  if (!source || !store) {
    throw new Error(
      "Barbora source or store not found. Run `pnpm db:seed` first."
    );
  }
  console.log(`✓ Source found: ${source.code} (${source.id})`);
  console.log(`✓ Store found: ${store.name} (${store.id})`);

  // -----------------------------------------------------------------------
  // Read order files
  // -----------------------------------------------------------------------
  const files = await fs.readdir(orderDir);
  const jsonFiles = files.filter((f: string) => f.endsWith(".json"));
  stats.totalFiles = jsonFiles.length;
  console.log(`\nFound ${jsonFiles.length} order files in ${orderDir}`);

  // -----------------------------------------------------------------------
  // Process each file in a transaction
  // -----------------------------------------------------------------------
  for (const file of jsonFiles.sort()) {
    const filePath = pathMod.join(orderDir, file);
    try {
      await prisma.$transaction(async (tx: TxClient) => {
        // 1. Read & parse JSON
        const raw = await fs.readFile(filePath, "utf-8");
        const order = JSON.parse(raw);

        const purchasedAt = parseBarboraDate(order.order_date);
        const documentDate = parseBarboraDate(order.delivery_date || order.order_date);
        const products = getProducts(order);

        // 2. Upsert SourceDocument
        const sd = await tx.sourceDocument.upsert({
          where: {
            sourceId_externalOrderNumber: {
              sourceId: source.id,
              externalOrderNumber: order.Id,
            },
          },
          create: {
            sourceId: source.id,
            type: SourceDocumentType.BARBORA_ORDER,
            externalOrderNumber: order.Id,
            documentDate,
            parsedJson: order,
          },
          update: {
            documentDate,
            parsedJson: order,
          },
        });

        // 3. Upsert Purchase (findFirst by sourceDocumentId — no unique constraint)
        let purchase = await tx.purchase.findFirst({
          where: { sourceDocumentId: sd.id },
        });
        if (purchase) {
          purchase = await tx.purchase.update({
            where: { id: purchase.id },
            data: {
              purchasedAt,
              totalAmount: order.total_price ?? 0,
              paymentStatus: mapStatus(order.status),
            },
          });
        } else {
          purchase = await tx.purchase.create({
            data: {
              sourceDocumentId: sd.id,
              storeId: store.id,
              purchasedAt,
              totalAmount: order.total_price ?? 0,
              currency: "EUR",
              paymentStatus: mapStatus(order.status),
            },
          });
        }

        // 4. Delete existing PurchaseItems for this Purchase
        await tx.purchaseItem.deleteMany({
          where: { purchaseId: purchase.id },
        });

        // 5. Process each product
        for (const product of products) {
          // Skip products without matnr
          if (!product.matnr) continue;

          // 5a. Upsert StoreProduct
          const sp = await tx.storeProduct.upsert({
            where: {
              storeId_externalId: {
                storeId: store.id,
                externalId: product.matnr,
              },
            },
            create: {
              storeId: store.id,
              externalId: product.matnr,
              name: product.title || "",
              rawData: product,
              normalizationStatus: "pending",
              unitPrice: new Prisma.Decimal(product.unit_price_number ?? 0),
              currency: "EUR",
              isActive: true,
              firstSeenAt: purchasedAt,
              lastSeenAt: purchasedAt,
            },
            update: {
              name: product.title || "",
              rawData: product,
              lastSeenAt: purchasedAt,
            },
          });

          // 5b. Upsert StoreProductPrice
          const validFrom = new Date(purchasedAt.getTime());
          validFrom.setMilliseconds(0);
          validFrom.setSeconds(0);

          await tx.storeProductPrice.upsert({
            where: {
              storeProductId_validFrom: {
                storeProductId: sp.id,
                validFrom,
              },
            },
            create: {
              storeProductId: sp.id,
              price: new Prisma.Decimal(product.unit_price_number ?? 0),
              currency: "EUR",
              validFrom,
              isPromo: false,
            },
            update: {},
          });

          // 5c. Create PurchaseItem
          await tx.purchaseItem.create({
            data: {
              purchaseId: purchase.id,
              storeProductId: sp.id,
              productId: null,
              canonicalCategoryId: null,
              rawName: product.title || "",
              eanCodes: [],
              orderedQuantity: new Prisma.Decimal(
                product.quantity_number ?? 0
              ),
              collectedQuantity: new Prisma.Decimal(
                product.quantity_number ?? 0
              ),
              unit: extractUnit(product.quantity),
              unitPrice: new Prisma.Decimal(
                product.unit_price_number ?? 0
              ),
              lineTotal: new Prisma.Decimal(
                product.total_price_number ?? 0
              ),
              discountAmount: null,
            },
          });

          stats.itemsCreated++;
          stats.productsUpserted++;
          stats.pricesUpserted++;
        }

        stats.documentsUpserted++;
        stats.purchases++;
      });

      stats.processed++;
      console.log(`  ✓ ${file}`);
    } catch (err: any) {
      stats.failed++;
      errors.push({
        file,
        error: err.message || String(err),
        timestamp: new Date().toISOString(),
      });
      console.error(`  ✗ ${file}: ${err.message}`);
    }
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log("\n═══════════════════════════════════════");
  console.log("  Import Complete");
  console.log("═══════════════════════════════════════");
  console.log(`  Total files:       ${stats.totalFiles}`);
  console.log(`  Processed:         ${stats.processed}`);
  console.log(`  Failed:            ${stats.failed}`);
  console.log(`  Documents:         ${stats.documentsUpserted}`);
  console.log(`  Purchases:         ${stats.purchases}`);
  console.log(`  Products:          ${stats.productsUpserted}`);
  console.log(`  Prices:            ${stats.pricesUpserted}`);
  console.log(`  Items:             ${stats.itemsCreated}`);

  if (errors.length > 0) {
    console.log("\n── Errors ─────────────────────────────");
    for (const e of errors) {
      console.log(`  ${e.file}: ${e.error}`);
    }
  }

  console.log("═══════════════════════════════════════\n");

  // Exit with error code if any failures
  if (stats.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
