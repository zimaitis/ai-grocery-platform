"use client";

import { useCallback, useEffect, useState } from "react";

type ThemeMode = "system" | "light" | "dark";

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

function applyTheme(mode: ThemeMode) {
  const resolved =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  document.documentElement.setAttribute("data-theme", resolved);
}

function useTheme(): [ThemeMode, (mode: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const stored = localStorage.getItem("grocery-theme") as ThemeMode | null;
    const initial = stored ?? "system";
    setMode(initial);
    applyTheme(initial);

    // Listen for OS preference changes when mode is "system"
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (initial === "system") {
        applyTheme("system");
      }
    };
    mq.addEventListener("change", handler);

    return () => mq.removeEventListener("change", handler);
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    setMode(next);
    localStorage.setItem("grocery-theme", next);
    applyTheme(next);
  }, []);

  return [mode, setTheme];
}

export default function HomePage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [theme, setTheme] = useTheme();

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

  const themeLabel: Record<ThemeMode, { label: string; icon: string }> = {
    system: { label: "System", icon: "💻" },
    light: { label: "Light", icon: "☀️" },
    dark: { label: "Dark", icon: "🌙" },
  };

  const themeOptions: ThemeMode[] = ["system", "light", "dark"];

  return (
    <main
      style={{
        maxWidth: 640,
        margin: "40px auto",
        padding: "0 20px",
      }}
    >
      {/* Header with title and theme toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <h1 style={{ margin: 0 }}>🛒 AI Grocery</h1>

        <div
          style={{
            display: "flex",
            gap: 4,
            background: "var(--surface)",
            borderRadius: 8,
            padding: 4,
            border: "1px solid var(--border)",
          }}
        >
          {themeOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setTheme(opt)}
              style={{
                padding: "6px 12px",
                fontSize: 13,
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                background: theme === opt ? "var(--primary)" : "transparent",
                color: theme === opt ? "#fff" : "var(--text)",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {themeLabel[opt].icon} {themeLabel[opt].label}
            </button>
          ))}
        </div>
      </div>

      <section
        style={{
          marginBottom: 32,
          background: "var(--surface)",
          padding: 20,
          borderRadius: 12,
          border: "1px solid var(--border)",
        }}
      >
        <h2 style={{ margin: "0 0 8px 0", fontSize: 18 }}>Status</h2>
        {error ? (
          <p style={{ color: "var(--error)", margin: 0 }}>
            ⚠️ {error}
          </p>
        ) : health ? (
          <p style={{ color: "var(--success)", margin: 0 }}>
            ✅ API {health.status} — uptime {Math.floor(health.uptime)}s
          </p>
        ) : (
          <p style={{ color: "var(--muted)", margin: 0 }}>Connecting…</p>
        )}
      </section>

      <section
        style={{
          marginBottom: 32,
          background: "var(--surface)",
          padding: 20,
          borderRadius: 12,
          border: "1px solid var(--border)",
        }}
      >
        <h2 style={{ margin: "0 0 12px 0", fontSize: 18 }}>Add Product</h2>
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
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "var(--input-bg)",
              color: "var(--text)",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            style={{
              padding: "8px 16px",
              fontSize: 16,
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: creating || !newName.trim() ? "not-allowed" : "pointer",
              opacity: !newName.trim() ? 0.5 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {creating ? "Adding…" : "Add"}
          </button>
        </form>
      </section>

      <section
        style={{
          background: "var(--surface)",
          padding: 20,
          borderRadius: 12,
          border: "1px solid var(--border)",
        }}
      >
        <h2 style={{ margin: "0 0 12px 0", fontSize: 18 }}>Products</h2>
        {products.length === 0 && !error ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>
            No products yet. Add one above!
          </p>
        ) : (
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {products.map((p) => (
              <li key={p.id} style={{ padding: "6px 0", color: "var(--text)" }}>
                {p.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
