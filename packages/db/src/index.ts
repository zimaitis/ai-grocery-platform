import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Layer 1 — Canonical Model
export type {
  CanonicalCategory,
  Product,
  ProductAttribute,
  ProductAttributeValue,
  ProductAttributeLink,
} from "@prisma/client";

// Layer 2 — External Source & Mapping
export type {
  Source,
  ExternalCategory,
  CategoryMapping,
} from "@prisma/client";

// Layer 3 — Stores & Store Products
export type {
  Store,
  StoreProduct,
  StoreProductAttribute,
  StoreProductPrice,
} from "@prisma/client";

// Layer 4 — Purchase Facts
export type {
  SourceDocument,
  Purchase,
  PurchaseItem,
} from "@prisma/client";

// Layer 5 — User Preferences
export type {
  AppUser,
  UserProductPreference,
  UserRecommendationPolicy,
} from "@prisma/client";

// Layer 6 — Recommendations Output
export type {
  RecommendationList,
  RecommendationItem,
  RecommendationExplanation,
} from "@prisma/client";

// Layer 7 — Support Tables
export type {
  Unit,
  Brand,
  Tag,
  ProductTag,
  Currency,
} from "@prisma/client";
