#!/usr/bin/env tsx

/**
 * Barbora Raw Order Collection Worker
 *
 * Phase 1 — raw API collection only.
 * No database writes, no product parsing, no AI, no BullMQ, no PDFs.
 *
 * Sub-commands:
 *   validate-session  — test the Barbora API session
 *   collect           — fetch order list + optional order details
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FailedRequest {
  url: string;
  status: number | null;
  message: string;
  timestamp: string;
  attempts: number;
}

interface Manifest {
  collectedAt: string;
  pagesFetched: number;
  ordersDiscovered: number;
  detailsFetched: number;
  failedRequests: number;
  source: string;
  apiBaseUrl: string;
  limit: number;
  maxPages: number;
  fetchDetails: boolean;
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const {
  BARBORA_COOKIE,
  BARBORA_CUSTOMER_ID,
  BARBORA_API_BASE_URL = "https://barbora.lt",
  BARBORA_LIMIT = "5",
  BARBORA_MAX_PAGES = "1",
  BARBORA_FETCH_DETAILS = "true",
  BARBORA_OUTPUT_DIR = ".tmp/barbora",
  BARBORA_REQUEST_DELAY_MS = "500",
  BARBORA_AUTH_HEADER,
  BARBORA_AUTH_TOKEN,
} = process.env;

const apiBaseUrl = BARBORA_API_BASE_URL.replace(/\/+$/, "");
const limit = parseInt(BARBORA_LIMIT, 10);
const maxPages = parseInt(BARBORA_MAX_PAGES, 10);
const fetchDetails = BARBORA_FETCH_DETAILS === "true";
const outputDir = BARBORA_OUTPUT_DIR;
const requestDelayMs = parseInt(BARBORA_REQUEST_DELAY_MS, 10);

// ---------------------------------------------------------------------------
// Safety checks
// ---------------------------------------------------------------------------

function fail(message: string): never {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

if (!BARBORA_COOKIE || BARBORA_COOKIE.trim() === "") {
  fail("BARBORA_COOKIE is missing or empty. Set it in your .env file.");
}
if (!BARBORA_CUSTOMER_ID || BARBORA_CUSTOMER_ID.trim() === "") {
  fail("BARBORA_CUSTOMER_ID is missing or empty. Set it in your .env file.");
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const failedRequests: FailedRequest[] = [];

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

function log(...args: unknown[]): void {
  console.log("[barbora]", ...args);
}

function sanitize(val: string | undefined): string {
  if (!val) return "";
  if (val.length > 12) return `${val.slice(0, 4)}...${val.slice(-4)}`;
  return "***";
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/json, text/plain, */*",
    "content-type": "application/json",
    "user-agent": "Mozilla/5.0",
    referer: "https://barbora.lt/",
    origin: "https://barbora.lt",
    cookie: BARBORA_COOKIE!,
  };

  if (BARBORA_AUTH_HEADER) {
    headers["Authorization"] = BARBORA_AUTH_HEADER;
  } else if (BARBORA_AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${BARBORA_AUTH_TOKEN}`;
  }

  return headers;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
): Promise<Response | null> {
  let lastError: Error | null = null;
  let lastStatus: number | null = null;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      lastStatus = response.status;

      if (response.status < 500) {
        // Non-retryable client error
        break;
      }

      if (attempt <= retries) {
        log(`Retry ${attempt}/${retries} for ${url} (status ${response.status})`);
        await sleep(1000 * attempt); // exponential backoff
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt <= retries) {
        log(`Retry ${attempt}/${retries} for ${url} (network error)`);
        await sleep(1000 * attempt);
      }
    }
  }

  failedRequests.push({
    url,
    status: lastStatus,
    message: lastError?.message ?? `HTTP ${lastStatus}`,
    timestamp: new Date().toISOString(),
    attempts: retries + 1,
  });

  return null;
}

async function fetchJson<T>(
  url: string,
  retries = 2,
): Promise<{ ok: true; data: T; status: number } | { ok: false; error: string; status: number | null }> {
  const response = await fetchWithRetry(
    url,
    { method: "GET", headers: buildHeaders() },
    retries,
  );

  if (!response) {
    return { ok: false, error: "Request failed after retries", status: null };
  }

  try {
    const data = (await response.json()) as T;
    return { ok: true, data, status: response.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    failedRequests.push({
      url,
      status: response.status,
      message: `JSON parse failed: ${msg}`,
      timestamp: new Date().toISOString(),
      attempts: 1,
    });
    return { ok: false, error: msg, status: response.status };
  }
}

// ---------------------------------------------------------------------------
// Default filters for order list API
// ---------------------------------------------------------------------------

const DEFAULT_FILTERS = JSON.stringify({
  date: {},
  address: [],
  status: [],
  paymentMethod: [],
  searchString: null,
});

// ---------------------------------------------------------------------------
// Sub-command: validate-session
// ---------------------------------------------------------------------------

async function validateSession(): Promise<void> {
  const filtersEncoded = encodeURIComponent(DEFAULT_FILTERS);
  const url = `${apiBaseUrl}/api/eshop/v1/order/list?limit=1&offset=0&filters=${filtersEncoded}`;

  const response = await fetchWithRetry(url, {
    method: "GET",
    headers: buildHeaders(),
  });

  if (!response) {
    console.log("HTTP Status: N/A");
    console.log("JSON parse: FAILED — Request failed after retries");
    process.exit(1);
  }

  console.log(`HTTP Status: ${response.status}`);

  try {
    const data = (await response.json()) as { count?: number; orders?: Array<{ Id?: string }> };
    console.log("JSON parse: OK");
    console.log(`Count: ${data.count ?? "?"}`);
    if (data.orders && data.orders.length > 0) {
      console.log(`First order ID: ${data.orders[0]?.Id ?? "?"}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`JSON parse: FAILED — ${msg}`);
    process.exit(1);
  }

  process.exit(0);
}

// ---------------------------------------------------------------------------
// Sub-command: collect
// ---------------------------------------------------------------------------

async function collect(): Promise<void> {
  // Ensure output directories
  const fs = await import("fs/promises");
  const path = await import("path");

  const orderListDir = path.join(outputDir, "order-list");
  const ordersDir = path.join(outputDir, "orders");
  const validationDir = path.join(outputDir, "validation");

  await fs.mkdir(orderListDir, { recursive: true });
  await fs.mkdir(ordersDir, { recursive: true });
  await fs.mkdir(validationDir, { recursive: true });

  // -- Paginate order list ------------------------------------------------
  const filtersEncoded = encodeURIComponent(DEFAULT_FILTERS);
  let offset = 0;
  let pageNumber = 0;
  let totalCount = 0;
  const allOrderIds: string[] = [];

  log("Starting order list pagination...");

  while (pageNumber < maxPages) {
    const url = `${apiBaseUrl}/api/eshop/v1/order/list?limit=${limit}&offset=${offset}&filters=${filtersEncoded}`;

    log(`Fetching page ${pageNumber + 1} (offset=${offset})...`);

    const result = await fetchJson<{
      count?: number;
      orders?: Array<{ Id?: string }>;
    }>(url);

    if (!result.ok) {
      log(`Failed to fetch page ${pageNumber + 1}. Stopping pagination.`);
      break;
    }

    pageNumber++;
    const pageFilename = `page-${String(pageNumber).padStart(3, "0")}.json`;
    const pagePath = path.join(orderListDir, pageFilename);

    await fs.writeFile(pagePath, JSON.stringify(result.data, null, 2), "utf-8");
    log(`Saved ${pageFilename}`);

    totalCount = result.data.count ?? 0;

    if (result.data.orders) {
      for (const order of result.data.orders) {
        if (order.Id) {
          allOrderIds.push(order.Id);
        }
      }
    }

    offset += limit;

    if (offset >= totalCount) {
      log("All pages fetched.");
      break;
    }

    if (pageNumber < maxPages) {
      await sleep(requestDelayMs);
    }
  }

  log(`Discovered ${allOrderIds.length} orders across ${pageNumber} pages.`);

  // -- Fetch order details ------------------------------------------------
  let detailsFetched = 0;

  if (fetchDetails) {
    log("Fetching order details...");

    for (let i = 0; i < allOrderIds.length; i++) {
      const orderId = allOrderIds[i];
      const url = `${apiBaseUrl}/api/eshop/v1/order/info?orderid=${orderId}&customerId=${BARBORA_CUSTOMER_ID}`;

      log(`Detail ${i + 1}/${allOrderIds.length}: order ${orderId}...`);

      const result = await fetchJson<Record<string, unknown>>(url);

      if (result.ok) {
        const detailPath = path.join(ordersDir, `${orderId}.json`);
        await fs.writeFile(detailPath, JSON.stringify(result.data, null, 2), "utf-8");
        detailsFetched++;
      } else {
        log(`Failed to fetch detail for order ${orderId}: ${result.error}`);
      }

      if (i < allOrderIds.length - 1) {
        await sleep(requestDelayMs);
      }
    }
  }

  // -- Write manifest -----------------------------------------------------
  const manifest: Manifest = {
    collectedAt: new Date().toISOString(),
    pagesFetched: pageNumber,
    ordersDiscovered: allOrderIds.length,
    detailsFetched,
    failedRequests: failedRequests.length,
    source: "BARBORA",
    apiBaseUrl,
    limit,
    maxPages,
    fetchDetails,
  };

  const manifestPath = path.join(outputDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  log("Manifest written.");

  // -- Write errors -------------------------------------------------------
  if (failedRequests.length > 0) {
    const errorsPath = path.join(outputDir, "errors.json");
    await fs.writeFile(errorsPath, JSON.stringify(failedRequests, null, 2), "utf-8");
    log(`Errors log written (${failedRequests.length} failures).`);
  }

  // -- Print summary ------------------------------------------------------
  console.log("");
  console.log("--- BARBORA COLLECTION SUMMARY ---");
  console.log(`  Pages fetched:      ${pageNumber}`);
  console.log(`  Orders discovered:  ${allOrderIds.length}`);
  console.log(`  Details fetched:    ${detailsFetched}`);
  console.log(`  Failed requests:    ${failedRequests.length}`);
  console.log(`  Output directory:   ${path.resolve(outputDir)}`);
  console.log("---------------------------------");
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const subCommand = process.argv[2] ?? "collect";

  switch (subCommand) {
    case "validate-session":
      await validateSession();
      break;
    case "collect":
      await collect();
      break;
    default:
      console.log("Usage: tsx scripts/barbora/collect-orders.ts [command]");
      console.log("");
      console.log("Commands:");
      console.log("  validate-session    Test Barbora API session cookie");
      console.log("  collect             Fetch orders and details (default)");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
