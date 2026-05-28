"use client";

import { useEffect, useState } from "react";

interface Product {
  id: string;
  name: string;
  category?: string;
  createdAt: string;
}

interface HealthResponse {
  status: "ok" | "error";
  uptime: number;
  timestamp: string;
}

export default function HomePage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [healthRes, productsRes] = await Promise.all([
          fetch("/api/health"),
          fetch("/api/products"),
        ]);
        if (!healthRes.ok || !productsRes.ok) {
          throw new Error("API unavailable");
        }
        setHealth(await healthRes.json());
        setProducts(await productsRes.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch");
      }
    }
    fetchData();
  }, []);

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: "0 20px" }}>
      <h1>🛒 AI Grocery</h1>

      <section style={{ marginBottom: 32 }}>
        <h2>Status</h2>
        {error ? (
          <p style={{ color: "red" }}>⚠️ {error}</p>
        ) : health ? (
          <p style={{ color: "green" }}>
            ✅ API {health.status} — uptime {Math.floor(health.uptime)}s
          </p>
        ) : (
          <p>Connecting…</p>
        )}
      </section>

      <section>
        <h2>Products</h2>
        {products.length === 0 && !error ? (
          <p>Loading…</p>
        ) : (
          <ul style={{ paddingLeft: 20 }}>
            {products.map((p) => (
              <li key={p.id} style={{ padding: "4px 0" }}>
                {p.name}{" "}
                <span style={{ color: "#888", fontSize: 14 }}>
                  — {p.category}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
