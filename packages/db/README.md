# @ai-grocery/db

Database package for the AI Grocery platform — Prisma schema, migrations, seed data, and type exports.

## Schema Layers Overview

The schema is organized into 7 logical layers:

| Layer | Purpose | Key Models |
|-------|---------|------------|
| **1 — Canonical Model** | Normalized product taxonomy | `CanonicalCategory`, `Product`, `ProductAttribute` |
| **2 — External Source & Mapping** | Source-specific categories mapped to canonical | `Source`, `ExternalCategory`, `CategoryMapping` |
| **3 — Stores & Store Products** | Store-specific product listings with prices | `Store`, `StoreProduct`, `StoreProductPrice` |
| **4 — Purchase Facts** | Raw purchase history from receipts/orders | `SourceDocument`, `Purchase`, `PurchaseItem` |
| **5 — User Preferences** | Per-user preferences and recommendation rules | `AppUser`, `UserProductPreference`, `UserRecommendationPolicy` |
| **6 — Recommendations Output** | Generated recommendation lists with explanations | `RecommendationList`, `RecommendationItem`, `RecommendationExplanation` |
| **7 — Support Tables** | Reference data (units, brands, tags, currencies) | `Unit`, `Brand`, `Tag`, `Currency` |

## Canonical vs Store Products

- **Canonical Product** (`Product`): A normalized, platform-owned product concept (e.g., "Milk"). Linked to a `CanonicalCategory`. Attributes describe the canonical form.
- **Store Product** (`StoreProduct`): A specific retailer's listing (e.g., "Barbora Rokiškio Pienas 3.5% 1L"). Optionally linked to a canonical `Product` via `productId`. Has store-specific prices, EAN codes, and package sizes.

This two-tier model allows the platform to:
1. Map different store listings to the same canonical product
2. Compare prices across stores for the same item
3. Build user preferences at the canonical level while executing at the store level

## Migration Flow

```bash
# From repo root:
pnpm db:generate    # Regenerate Prisma Client after schema changes
pnpm db:migrate     # Create and apply a new migration (interactive naming)
pnpm db:seed        # Seed the database with reference data
```

For a fresh start:
```bash
# From packages/db:
npx prisma migrate reset --force   # Drops DB, re-runs all migrations
pnpm db:seed                        # Re-seed
```

## Seed Data

The seed script is idempotent (safe to run multiple times). It creates:

| Entity | Items |
|--------|-------|
| **Currencies** | EUR (€) |
| **Units** | kg, g, l, ml, vnt |
| **Sources** | Barbora (ONLINE_GROCERY) |
| **Stores** | Barbora (linked to Barbora source) |
| **Categories** | 7 canonical categories in Lithuanian (Daržovės, Vaisiai, Pienas, Sūris, Jogurtai, Šokoladas, Mėsa) |
| **Products** | 5 canonical products linked to categories |
| **Users** | Demo User (demo@ai-grocery.lt) |
| **Policies** | Global "explore_allowed" recommendation policy |

### Recommendation Policy Modes

| Mode | Behavior |
|------|----------|
| `preferred_only` | Only products the user has explicitly preferred |
| `prefer_known` | Prefer known products, but allow alternatives |
| `explore_allowed` | Show everything, no restrictions |
| `avoid` | Temporarily avoid this category |
| `must_buy` | Always include products from this category |
