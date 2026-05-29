# Barbora Orders Files to DB

## Purpose

Imports collected Barbora order JSON files from `.tmp/barbora/orders/*.json` into PostgreSQL.
No API calls, no AI, no product/category normalization.

## Prerequisites

1. Database running with migrations applied:
   ```bash
   pnpm db:migrate
   ```

2. Seed data loaded (creates Source "BARBORA" + Store "Barbora"):
   ```bash
   pnpm db:seed
   ```

3. Orders collected by the API-to-files stage:
   ```bash
   pnpm barbora:orders-api-to-files
   ```
   This populates `.tmp/barbora/orders/` with JSON files.

## Usage

```bash
pnpm barbora:orders-files-to-db
```

## What It Does

For each `.json` file in `.tmp/barbora/orders/`:

| Entity | Operation | Key |
|---|---|---|
| `SourceDocument` | Upsert | `sourceId` + `externalOrderNumber` |
| `Purchase` | findFirst → update or create | `sourceDocumentId` (no unique constraint) |
| `PurchaseItem` | Delete existing + create fresh | `purchaseId` |
| `StoreProduct` | Upsert | `storeId` + `externalId` (matnr) |
| `StoreProductPrice` | Upsert | `storeProductId` + `validFrom` |

## Idempotency

Re-running the script produces identical results with no duplicates:

- `SourceDocument` uses `@@unique([sourceId, externalOrderNumber])` for upsert
- `StoreProduct` uses `@@unique([storeId, externalId])` for upsert
- `StoreProductPrice` uses `@@unique([storeProductId, validFrom])` for upsert
- `Purchase` is found by `sourceDocumentId` then updated
- `PurchaseItem` uses **delete-and-recreate** per purchase — safe because the source is static JSON files, not a live API

To verify idempotency:
```bash
pnpm barbora:orders-files-to-db  # run 1 — imports data
pnpm barbora:orders-files-to-db  # run 2 — should produce same counts
```

## What It Does NOT Do

- ❌ No API calls to Barbora
- ❌ No AI inference or LLM calls
- ❌ No product normalization (no linking `StoreProduct` → `Product`)
- ❌ No category mapping (no linking to `ExternalCategory` or `CanonicalCategory`)
- ❌ No `PurchaseItem.productId` or `PurchaseItem.canonicalCategoryId` — these remain `null`

## Data Flow

```
.tmp/barbora/orders/*.json
  │
  ▼
SourceDocument (BARBORA_ORDER, raw JSON preserved as parsedJson)
  │
  ▼
Purchase (storeId = Barbora, paymentStatus mapped from status string)
  │
  ├── PurchaseItem (linked via storeProductId)
  └── StoreProduct (upserted by matnr)
        └── StoreProductPrice (price fact, upserted by validFrom)
```

## Status Mapping

| Barbora Status | `PaymentStatus` |
|---|---|
| Užbaigtas | PAID |
| Pateiktas | PAID |
| Atšauktas | CANCELLED |
| Laukiama | PENDING |
| (other) | PAID |

## Product Fallback

Most orders have a top-level `products[]` array. If empty/null, the script falls back to `cart.slices[].products[]`.
