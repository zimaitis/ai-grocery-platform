"use client";

import { useCallback, useEffect, useState } from "react";

interface Product {
  id: string;
  name: string;
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
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
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
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create product");
      }

      setNewName("");
      await fetchData(); // refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setCreating(false);
    }
  }

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

      <section style={{ marginBottom: 32 }}>
        <h2>Add Product</h2>
        <form onSubmit={handleCreate} style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Product name…"
            disabled={creating}
            style={{
              flex: 1,
              padding: "8px 12px",
              fontSize: 16,
              border: "1px solid #ccc",
              borderRadius: 6,
            }}
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            style={{
              padding: "8px 16px",
              fontSize: 16,
              background: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            {creating ? "Adding…" : "Add"}
          </button>
        </form>
      </section>

      <section>
        <h2>Products</h2>
        {products.length === 0 && !error ? (
          <p>No products yet. Add one above!</p>
        ) : (
          <ul style={{ paddingLeft: 20 }}>
            {products.map((p) => (
              <li key={p.id} style={{ padding: "4px 0" }}>
                {p.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
