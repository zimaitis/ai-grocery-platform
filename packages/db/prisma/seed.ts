import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const names = ["Milk", "Bread", "Eggs"];

  for (const name of names) {
    const existing = await prisma.product.findFirst({ where: { name } });
    if (!existing) {
      await prisma.product.create({ data: { name } });
      console.log(`Created: ${name}`);
    } else {
      console.log(`Skipped (exists): ${name}`);
    }
  }

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
