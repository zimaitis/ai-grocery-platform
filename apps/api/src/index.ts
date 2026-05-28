import Fastify from "fastify";
import cors from "@fastify/cors";
import { prisma } from "@ai-grocery/db";

const server = Fastify({ logger: true });

await server.register(cors, {
  origin: [
    "http://localhost:3000",
    "http://192.168.32.149:3000",
  ],
});

// GET /health
server.get("/health", async () => {
  return {
    status: "ok" as const,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
});

// GET /products
server.get("/products", async () => {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "asc" },
  });
  return products;
});

// POST /products
server.post("/products", async (request, reply) => {
  const { name } = request.body as { name?: string };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return reply.status(400).send({
      error: "Bad Request",
      message: "name is required and must be a non-empty string",
    });
  }

  const product = await prisma.product.create({
    data: { name: name.trim() },
  });

  return reply.status(201).send(product);
});

try {
  await server.listen({ port: 3001, host: "0.0.0.0" });
  console.log("API server running at http://localhost:3001");
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
