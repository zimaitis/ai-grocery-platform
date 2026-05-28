import { prisma } from "@ai-grocery/db";
import * as fs from "fs";
import * as path from "path";

// ── Types ──

interface BarboraCategory {
  id: string;
  title: string;
  parent_id?: string;
  product_count?: number;
  children_count?: number;
  children?: BarboraCategory[];
  [key: string]: unknown;
}

interface ImportStats {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  maxLevel: number;
  roots: number;
  errors: string[];
}

// ── Helpers ──

/**
 * Load category tree from JSON file.
 * Strips any leading non-JSON bytes (BOM, zero-width spaces, etc.)
 * by scanning for the first '[' or '{' character.
 */
function loadCategoryTree(filePath: string): BarboraCategory[] {
  const buffer = fs.readFileSync(filePath);
  let start = 0;
  while (
    start < buffer.length &&
    buffer[start] !== 0x5b /* [ */ &&
    buffer[start] !== 0x7b /* { */
  ) {
    start++;
  }
  const clean = buffer.subarray(start).toString("utf-8");
  return JSON.parse(clean) as BarboraCategory[];
}

/**
 * Flatten nested tree into a flat array.
 * Each node carries its level and we preserve the parentExternalId chain.
 * children arrays are disposed after flattening — the flat list is the canonical view.
 */
interface FlatNode extends BarboraCategory {
  _level: number;
}

function flattenTree(
  nodes: BarboraCategory[],
  parentExternalId: string | null = null,
  level: number = 0,
  stats: Pick<ImportStats, "maxLevel" | "roots">
): FlatNode[] {
  const result: FlatNode[] = [];

  for (const node of nodes) {
    // Save children reference before stripping
    const children = node.children;

    // Build the flat node — preserve parent_id from JSON or chain from traversal
    const flatNode: FlatNode = {
      ...node,
      parent_id: node.parent_id || parentExternalId || undefined,
      _level: level,
    };
    delete flatNode.children;

    result.push(flatNode);

    stats.maxLevel = Math.max(stats.maxLevel, level);
    if (level === 0) stats.roots++;

    if (children && children.length > 0) {
      result.push(...flattenTree(children, node.id, level + 1, stats));
    }
  }

  return result;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[ą]/g, "a")
    .replace(/[č]/g, "c")
    .replace(/[ę]/g, "e")
    .replace(/[ė]/g, "e")
    .replace(/[į]/g, "i")
    .replace(/[š]/g, "s")
    .replace(/[ų]/g, "u")
    .replace(/[ū]/g, "u")
    .replace(/[ž]/g, "z")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build the rawData JSON blob for a category.
 * Preserves only the non-core fields (banner, URLs, etc.)
 * Excludes core fields that are stored separately.
 */
function buildRawData(node: FlatNode): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  const preserveKeys = [
    "banner",
    "mobileBanner",
    "bannerUrl",
    "externalResourceUrl",
    "BannerModel",
    "rootCategory",
    "url",
    "url_parent",
    "url_root",
    "icon_name",
    "inventory_group_tag",
    "children_count",
  ];
  for (const key of preserveKeys) {
    if (
      key in node &&
      node[key] !== undefined &&
      node[key] !== null
    ) {
      raw[key] = node[key];
    }
  }
  return raw;
}

// ── Main Import ──

async function importCategories(filePath: string): Promise<ImportStats> {
  const stats: ImportStats = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    maxLevel: 0,
    roots: 0,
    errors: [],
  };

    console.log("📂 Loading category tree from:", filePath);
    const tree = loadCategoryTree(filePath);

    const flatCtx = { maxLevel: 0, roots: 0 };
    const flat = flattenTree(tree, null, 0, flatCtx);
    stats.total = flat.length;
    stats.maxLevel = flatCtx.maxLevel;
    stats.roots = flatCtx.roots;

    console.log(
      `📊 Flattened ${flat.length} categories (${flatCtx.roots} roots, max level ${flatCtx.maxLevel})\n`
    );

    // Find Barbora source
    const source = await prisma.source.findUnique({
      where: { code: "BARBORA" },
    });
    if (!source) {
      throw new Error("Barbora source not found in DB. Run db:seed first.");
    }
    console.log(`✅ Source: ${source.name} (${source.id})\n`);

    // Import each category
    const now = new Date();
    let processed = 0;

    for (const node of flat) {
      const externalId = node.id;
      const name = node.title;
      const parentExternalId = node.parent_id || null;
      const productCount = node.product_count || 0;
      const slug = slugify(name);
      const rawData = buildRawData(node);
      const level = node._level;

      try {
        const existing = await prisma.externalCategory.findFirst({
          where: { sourceId: source.id, externalId },
        });

        if (existing) {
          await prisma.externalCategory.update({
            where: { id: existing.id },
            data: {
              name,
              parentExternalId,
              slug,
              level,
              productCount,
              rawData: rawData as unknown as any,
              isActive: true,
              lastSeenAt: now,
            },
          });
          stats.updated++;
        } else {
          await prisma.externalCategory.create({
            data: {
              sourceId: source.id,
              externalId,
              parentExternalId,
              name,
              slug,
              level,
              productCount,
              rawData: rawData as unknown as any,
              isActive: true,
              lastSeenAt: now,
            },
          });
          stats.created++;
        }

        processed++;
        if (processed % 50 === 0) {
          console.log(`  ... ${processed}/${flat.length}`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        stats.errors.push(`Category ${externalId} (${name}): ${msg}`);
      }
    }

    console.log(
      `\n✅ Import complete: ${flat.length} categories processed`
    );

    return stats;
}

// ── CLI Entry ──

const defaultPath = path.resolve(
  __dirname,
  "../../../../ai-grocery-architecture/categoryTree.json"
);
const filePath = process.argv[2] || defaultPath;

console.log("🏪 Barbora Category Tree Importer\n");

importCategories(filePath)
  .then((stats) => {
    console.log("\n┌─────────────────────────────────────┐");
    console.log("│        IMPORT SUMMARY               │");
    console.log("├─────────────────────────────────────┤");
    console.log(
      `│ Total categories:  ${String(stats.total).padStart(6)}            │`
    );
    console.log(
      `│ Created:           ${String(stats.created).padStart(6)}            │`
    );
    console.log(
      `│ Updated:           ${String(stats.updated).padStart(6)}            │`
    );
    console.log(
      `│ Root categories:   ${String(stats.roots).padStart(6)}            │`
    );
    console.log(
      `│ Max level:         ${String(stats.maxLevel).padStart(6)}            │`
    );
    console.log(
      `│ Errors:            ${String(stats.errors.length).padStart(6)}            │`
    );
    console.log("└─────────────────────────────────────┘");

    if (stats.errors.length > 0) {
      console.log("\n⚠️  Errors:");
      stats.errors.forEach((e) => console.log(`  - ${e}`));
    }
    process.exit(stats.errors.length > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
