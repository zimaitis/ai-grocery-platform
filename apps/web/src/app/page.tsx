"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <main className="mx-auto max-w-[640px] px-5 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="m-0 text-2xl font-bold">🛒 AI Grocery</h1>

        {/* Theme toggle group */}
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
          {themeOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setTheme(opt)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                theme === opt
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {themeLabel[opt].icon} {themeLabel[opt].label}
            </button>
          ))}
        </div>
      </div>

      {/* Status Card */}
      <section className="mb-8 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="m-0 mb-2 text-lg font-semibold">Status</h2>
        {error ? (
          <p className="m-0 text-destructive">
            ⚠️ {error}
          </p>
        ) : health ? (
          <p className="m-0 text-success">
            ✅ API {health.status} &mdash; uptime {Math.floor(health.uptime)}s
          </p>
        ) : (
          <p className="m-0 text-muted-foreground">Connecting&hellip;</p>
        )}
      </section>

      {/* Add Product Card */}
      <section className="mb-8 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="m-0 mb-3 text-lg font-semibold">Add Product</h2>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Product name&hellip;"
            disabled={creating}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={creating || !newName.trim()}
          >
            {creating ? "Adding&hellip;" : "Add"}
          </Button>
        </form>
      </section>

      {/* Products Card */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="m-0 mb-3 text-lg font-semibold">Products</h2>
        {products.length === 0 && !error ? (
          <p className="m-0 text-muted-foreground">
            No products yet. Add one above!
          </p>
        ) : (
          <ul className="m-0 space-y-1 pl-5">
            {products.map((p) => (
              <li key={p.id} className="py-1 text-foreground">
                {p.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
