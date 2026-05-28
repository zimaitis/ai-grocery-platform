import { PrismaClient, SourceType, RecommendationPolicyMode } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...\n");

  // ── Source: Barbora ──────────────────────────────────────────────
  let barboraSource = await prisma.source.findUnique({ where: { code: "BARBORA" } });
  if (!barboraSource) {
    barboraSource = await prisma.source.create({
      data: { code: "BARBORA", name: "Barbora", type: SourceType.ONLINE_GROCERY },
    });
    console.log(`Source: ${barboraSource.name}`);
  } else {
    console.log(`Source (exists): ${barboraSource.name}`);
  }

  // ── Store: Barbora ───────────────────────────────────────────────
  let barboraStore = await prisma.store.findFirst({
    where: { sourceId: barboraSource.id, name: "Barbora" },
  });
  if (!barboraStore) {
    barboraStore = await prisma.store.create({
      data: { sourceId: barboraSource.id, name: "Barbora" },
    });
    console.log(`Store: ${barboraStore.name}`);
  } else {
    console.log(`Store (exists): ${barboraStore.name}`);
  }

  // ── Canonical Categories ─────────────────────────────────────────
  const categoryDefs = [
    { name: "Daržovės ir grybai", slug: "darzoves-ir-grybai", level: 1 },
    { name: "Vaisiai ir uogos", slug: "vaisiai-ir-uogos", level: 1 },
    { name: "Pienas", slug: "pienas", level: 1 },
    { name: "Sūris", slug: "suris", level: 1 },
    { name: "Jogurtai", slug: "jogurtai", level: 1 },
    { name: "Šokoladas", slug: "sokoladas", level: 1 },
    { name: "Mėsa", slug: "mesa", level: 1 },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categoryDefs) {
    const existing = await prisma.canonicalCategory.findFirst({
      where: { slug: cat.slug },
    });
    if (existing) {
      categoryMap[cat.slug] = existing.id;
      console.log(`Category (exists): ${cat.name}`);
    } else {
      const created = await prisma.canonicalCategory.create({
        data: { name: cat.name, slug: cat.slug, level: cat.level },
      });
      categoryMap[cat.slug] = created.id;
      console.log(`Category: ${cat.name}`);
    }
  }

  // ── Products ─────────────────────────────────────────────────────
  const productDefs = [
    { name: "Šokoladas", categorySlug: "sokoladas", defaultUnit: "vnt", description: "Saldus skanėstas iš kakavos" },
    { name: "Pienas", categorySlug: "pienas", defaultUnit: "l", description: "Šviežias karvės pienas" },
    { name: "Graikiškas jogurtas", categorySlug: "jogurtai", defaultUnit: "vnt", description: "Tirštas graikiškas jogurtas" },
    { name: "Pomidorai", categorySlug: "darzoves-ir-grybai", defaultUnit: "kg", description: "Švieži lietuviški pomidorai" },
    { name: "Kiaulienos sprandinė", categorySlug: "mesa", defaultUnit: "kg", description: "Šviežia kiaulienos sprandinė be kaulo" },
  ];

  const productMap: Record<string, string> = {};
  for (const p of productDefs) {
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    if (existing) {
      productMap[p.name] = existing.id;
      console.log(`Product (exists): ${p.name}`);
    } else {
      const created = await prisma.product.create({
        data: {
          name: p.name,
          description: p.description,
          canonicalCategoryId: categoryMap[p.categorySlug],
          defaultUnit: p.defaultUnit,
        },
      });
      productMap[p.name] = created.id;
      console.log(`Product: ${p.name}`);
    }
  }

  // ── AppUser: Demo ────────────────────────────────────────────────
  let demoUser = await prisma.appUser.findUnique({ where: { email: "demo@ai-grocery.lt" } });
  if (!demoUser) {
    demoUser = await prisma.appUser.create({
      data: { name: "Demo User", email: "demo@ai-grocery.lt" },
    });
    console.log(`AppUser: ${demoUser.name}`);
  } else {
    console.log(`AppUser (exists): ${demoUser.name}`);
  }

  // ── Recommendation Policy Modes (seeded as documentation) ────────
  // Available modes for UserRecommendationPolicy:
  //   - preferred_only  → Only products the user has explicitly preferred
  //   - prefer_known    → Prefer known products, but allow alternatives
  //   - explore_allowed → Show everything, no restrictions
  //   - avoid           → Temporarily avoid this category
  //   - must_buy        → Always include products from this category

  // Example: set a global explore_allowed policy for the demo user
  const existingPolicy = await prisma.userRecommendationPolicy.findFirst({
    where: { userId: demoUser.id, canonicalCategoryId: null, mode: RecommendationPolicyMode.explore_allowed },
  });
  if (!existingPolicy) {
    await prisma.userRecommendationPolicy.create({
      data: {
        userId: demoUser.id,
        canonicalCategoryId: null,
        mode: RecommendationPolicyMode.explore_allowed,
        priority: 0,
      },
    });
    console.log("RecommendationPolicy: global explore_allowed");
  } else {
    console.log("RecommendationPolicy (exists): global explore_allowed");
  }

  console.log("\n✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
