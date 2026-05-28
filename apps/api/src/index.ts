import Fastify from "fastify";
import cors from "@fastify/cors";

const server = Fastify({ logger: true });

await server.register(cors, {
  origin: [
    "http://localhost:3000",
    "http://192.168.32.149:3000",
  ],
});

// Mock products
const products = [
  { id: "1", name: "Milk", category: "Dairy", createdAt: new Date().toISOString() },
  { id: "2", name: "Bread", category: "Bakery", createdAt: new Date().toISOString() },
  { id: "3", name: "Eggs", category: "Dairy", createdAt: new Date().toISOString() },
];

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
  return products;
});

try {
  await server.listen({ port: 3001, host: "0.0.0.0" });
  console.log("API server running at http://localhost:3001");
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
