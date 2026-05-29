# Barbora Orders API to Files (Stage 2)

> **Stage 2 — Raw API Collection Only.** No database writes, no product parsing, no AI models, no BullMQ queues, no PDF downloads.

## Pipeline Overview

The Barbora integration runs in stages to decouple concerns:

| Stage | Command | Status |
|---|---|---|
| 1 — Categories JSON to DB | `pnpm barbora:categories-json-to-db` | ✅ Implemented |
| 2 — Orders API to Files | `pnpm barbora:orders-api-to-files` | ✅ Implemented |
| 3 — Orders Files to DB | `pnpm barbora:orders-files-to-db` | 📋 Planned |
| 4 — Products API to DB | `pnpm barbora:products-api-to-db` | 📋 Planned |
| 5 — Documents API to Files | `pnpm barbora:documents-api-to-files` | 📋 Planned |

## Purpose

This worker collects raw JSON data from the Barbora.lt e-grocery API and saves it as local JSON files. It exists solely to decouple API-scraping logic from database-import logic.

Downstream processes (Stage 3+) will read the saved JSON files and handle DB writes, normalization, and enrichment independently.

## Prerequisites

- Node.js 20+
- pnpm 9.x
- An active Barbora.lt account (with order history)

## Getting Credentials

### Getting the Cookie

1. Open Barbora.lt in your browser
2. Log in to your account
3. Open **DevTools** (F12) → **Network** tab
4. Filter for `order/list` or any XHR request to `barbora.lt`
5. Find the request, copy the full **Cookie** header value
6. Set it as `BARBORA_COOKIE` in your `.env` file

### Getting the Customer ID

1. In DevTools → Network, find a request to `/api/eshop/v1/order/info`
2. Look for the `customerId` query parameter in the URL
3. It's a UUID (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
4. Set it as `BARBORA_CUSTOMER_ID` in your `.env` file

## Setup

```bash
# From platform root
cp .env.example .env
# Edit .env with your BARBORA_COOKIE and BARBORA_CUSTOMER_ID

pnpm install
```

## Commands

### Check Session

Tests that your cookie and customer ID work with the Barbora API:

```bash
pnpm barbora:check-session
```

On success:
```
HTTP Status: 200
JSON parse: OK
Count: 42
First order ID: ABC123
```

On failure (invalid cookie):
```
HTTP Status: 401
JSON parse: FAILED — ...
```

### Collect Orders

Fetches the order list (paginated) and optionally fetches each order's details:

```bash
pnpm barbora:orders-api-to-files
```

This will:
1. Fetch order list pages (up to `BARBORA_MAX_PAGES`)
2. Save each page as `page-NNN.json` in `.tmp/barbora/order-list/`
3. If `BARBORA_FETCH_DETAILS=true`, fetch each order's detail
4. Save each detail as `{orderId}.json` in `.tmp/barbora/orders/`
5. Write `manifest.json` with collection metadata
6. Write `errors.json` if any requests failed

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `BARBORA_COOKIE` | **Yes** | — | Full browser cookie string from Barbora session |
| `BARBORA_CUSTOMER_ID` | **Yes** | — | Your Barbora customer UUID |
| `BARBORA_API_BASE_URL` | No | `https://barbora.lt` | API base URL |
| `BARBORA_LIMIT` | No | `5` | Orders per page |
| `BARBORA_MAX_PAGES` | No | `1` | Maximum pages to fetch |
| `BARBORA_FETCH_DETAILS` | No | `true` | Fetch individual order details |
| `BARBORA_OUTPUT_DIR` | No | `.tmp/barbora` | Output directory for collected data |
| `BARBORA_REQUEST_DELAY_MS` | No | `500` | Delay between requests (ms) |
| `BARBORA_AUTH_HEADER` | No | — | Raw Authorization header value (takes priority over AUTH_TOKEN) |
| `BARBORA_AUTH_TOKEN` | No | — | Used as "Bearer {token}" Authorization header |

## Output Structure

```
.tmp/barbora/
├── manifest.json        # Collection metadata
├── errors.json          # Failed requests (only if errors occurred)
├── validation/
│   └── session.json     # check-session response
├── order-list/
│   ├── page-001.json    # Order list page 1
│   ├── page-002.json    # Order list page 2
│   └── ...
└── orders/
    ├── {orderId}.json   # Order detail
    └── ...
```

### manifest.json

```json
{
  "collectedAt": "2026-05-29T12:00:00.000Z",
  "pagesFetched": 3,
  "ordersDiscovered": 42,
  "detailsFetched": 42,
  "failedRequests": 0,
  "source": "BARBORA",
  "apiBaseUrl": "https://barbora.lt",
  "limit": 5,
  "maxPages": 1,
  "fetchDetails": true
}
```

## Security

- **NEVER commit your `.env` file** — it's in `.gitignore`
- The script prints `***` instead of cookie/token values in logs
- `BARBORA_COOKIE` contains your full browser session — treat it like a password
- Raw JSON output may contain personal order data — don't commit `.tmp/` either

## Next Phase

Stage 3 (Orders Files to DB) will read from `.tmp/barbora/orders/` and:
- Parse the raw JSON into structured records
- Create `source_document`, `purchase`, and `purchase_item` records
- Link to `external_categories`
- Be fully idempotent (skip already-imported orders)
