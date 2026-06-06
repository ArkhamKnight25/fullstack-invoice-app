# Invoice Management Dashboard

Full-stack invoice management app — React + Node.js/Express + MongoDB.

**Stack:** Vite + React 19 · TanStack Query · React Router · Express 5 · Mongoose 9 · TypeScript

---

## Quick start (local)

### Prerequisites
- Node 20+
- MongoDB running locally **or** a MongoDB Atlas connection string

### 1. Clone and install

```bash
# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` at the repo root and fill in values:

```bash
cp .env.example .env
```

Key vars:

| Var | Description |
|-----|-------------|
| `MONGO_URI` | MongoDB connection string (local or Atlas) |
| `PORT` | Express port (default 5000) |
| `CORS_ORIGIN` | Frontend origin(s), comma-separated |

For the frontend, create `frontend/.env`:

```
VITE_API_URL=http://localhost:5000/api
```

### 3. Seed the database

Place `seed-data.json` in the repo root (already there), then:

```bash
cd backend
npm run seed
# Output:
# Connected to MongoDB
# Loaded 2000 records from seed file
# Cleared existing collections
# Inserted 61 customers
# Inserted 2000 invoices
# Seed complete. Disconnected.
```

The seed script is idempotent — safe to re-run, clears and re-inserts each time.

### 4. Run dev servers

**Terminal 1 — backend:**
```bash
cd backend && npm run dev
# API → http://localhost:5000
```

**Terminal 2 — frontend:**
```bash
cd frontend && npm run dev
# UI → http://localhost:5173
```

---

## Docker Compose (stretch goal)

```bash
docker-compose up --build
```

Then seed inside the running container:

```bash
docker-compose exec backend node dist/seed.js
```

UI → http://localhost:5173 · API → http://localhost:5000

---

## Deployment (Atlas + Render + Vercel)

### MongoDB Atlas
1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Add a database user and whitelist `0.0.0.0/0` (or Render's IP range).
3. Copy the connection string: `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/invoice_db?retryWrites=true&w=majority`

### Backend → Render (free tier)
1. Push repo to GitHub.
2. New **Web Service** → connect repo → select `/backend` as root.
3. Build command: `npm install && npm run build`
4. Start command: `node dist/index.js`
5. Set env vars: `MONGO_URI`, `PORT=5000`, `CORS_ORIGIN=https://your-app.vercel.app`
6. After deploy, run seed once via Render shell: `node dist/seed.js`

### Frontend → Vercel
1. New project → import repo → set **Root Directory** to `frontend`.
2. Framework: Vite (auto-detected).
3. Set env var: `VITE_API_URL=https://your-backend.onrender.com/api`
4. Deploy.

---

## API Contract

Base path: `/api`

### `GET /api/invoices`

Paginated, sortable, filterable invoice list. All filtering/sorting/pagination runs in MongoDB.

| Param | Default | Notes |
|-------|---------|-------|
| `page` | 1 | |
| `limit` | 20 | max 100 |
| `sortBy` | `dueDate` | `amount` or `dueDate` |
| `sortOrder` | `asc` | `asc` or `desc` |
| `status` | — | single or comma-separated |
| `taxRate` | — | single or comma-separated |
| `customer` | — | name (regex) or ObjectId |
| `issueDateFrom` / `issueDateTo` | — | ISO date range |
| `dueDateFrom` / `dueDateTo` | — | ISO date range |
| `search` | — | matches `invoiceId` or `customerName` |

Response: `{ data, page, limit, total, totalPages, sortBy, sortOrder }`

### `GET /api/invoices/:id` — single invoice by `invoiceId`
### `POST /api/invoices` — create (server computes tax/total, generates invoiceId)
### `PUT /api/invoices/:id` — edit (always recomputes tax/total)
### `DELETE /api/invoices/:id` — delete

### `GET /api/customers` — list for dropdown
### `GET /api/customers/:idOrName` — full profile with metrics and invoice history

### `GET /api/summary` — global analytics (aggregation pipeline)

```json
{
  "totalBilled": 0,
  "totalTax": 0,
  "invoiceCount": 2000,
  "customerCount": 61,
  "topCustomers": [{ "name": "...", "company": "...", "totalValue": 0 }]
}
```

---

## Data Modeling Rationale

### Two-collection normalized model

**`Customer`** — `name` (unique, indexed), `company`, timestamps  
**`Invoice`** — all invoice fields + `customer` (ObjectId ref) + denormalized `customerName` + `company`

**Why normalize Customer out?**  
The 1:1 customer→company relationship is a property of the customer entity, not each invoice. Embedding `company` as a raw string in 2,000 invoice documents would duplicate data and risk drift if a company name ever changes — a single `Customer.update` would fix it everywhere.

**Why also denormalize `customerName` and `company` onto Invoice?**  
The hot path is the paginated invoice list (`GET /api/invoices`), which renders customer name in every row and supports sorting and searching by customer name. Running a `$lookup` join on every paginated query adds latency and complexity. Since the 1:1 rule means a customer's company never belongs to a different customer, denormalized copies never drift as long as all writes go through the API (which refreshes both fields on `PUT`).

**Why server-computed `tax` and `total`?**  
Client-supplied values could be tampered with. The API ignores any `tax`/`total` in request bodies and always recomputes: `tax = round(amount × taxRate / 100, 2)`, `total = amount + tax`. The seed script also recomputes and logs any mismatches against the pre-computed seed values as a sanity check.

### Indexes

| Collection | Field(s) | Reason |
|------------|----------|--------|
| Customer | `name` unique | customer lookup by name |
| Invoice | `invoiceId` unique | point lookups |
| Invoice | `customer` | join/filter by customer |
| Invoice | `status` | status filter |
| Invoice | `issueDate`, `dueDate` | date range filter + sort |
| Invoice | `amount` | amount sort |
| Invoice | `customerName` | search + sort |

---

## Assumptions

- **"Outstanding"** = sum of `total` for invoices with `status ∈ {Sent, Unpaid, Overdue}`. Paid, Void, and Draft are excluded.
- **`invoiceId` generation** = `INV-` + 7 random digits. Uniqueness is checked with a retry loop (max 10 attempts).
- **Date storage** — `issueDate`/`dueDate` stored as MongoDB `Date` objects (UTC midnight), displayed in `en-IN` locale.
- **Tax precision** — rounded to 2 decimal places using `Math.round(x * 100) / 100`. Seed mismatches within ±0.02 are logged but not blocking.

---

## Stretch Goals Status

- [x] Docker Compose (Mongo + API + frontend)
- [x] Dockerfiles for backend (multi-stage) and frontend (nginx)
- [x] Deployment guide (Atlas + Render + Vercel)
- [ ] Unit/integration tests

## Data Modeling

Normalized two-collection model: Customer + Invoice.
Denormalized customerName and company on Invoice for hot list read path.
See README for full rationale.

## API Reference

See README for full API contract including all query params.

## Deployment

Atlas + Render + Vercel. See README deploy section.

## Assumptions

Outstanding = Sent + Unpaid + Overdue totals.

## Data Modeling

Normalized two-collection model. Denormalized customerName on Invoice for read performance.

## API Reference

Full contract: GET /api/invoices supports page limit sortBy sortOrder status taxRate search date ranges.

## Deployment

Atlas (MongoDB) + Render (backend) + Vercel (frontend). See deployment section above.

## Assumptions

Outstanding = Sent + Unpaid + Overdue. invoiceId = INV- + 7 digits. Tax rounded to 2dp.

## Data Modeling

Normalized two-collection model. Denormalized customerName on Invoice for read performance.

## API Reference

Full contract: GET /api/invoices supports page limit sortBy sortOrder status taxRate search date ranges.

## Deployment

Atlas (MongoDB) + Render (backend) + Vercel (frontend). See deployment section above.

## Assumptions

Outstanding = Sent + Unpaid + Overdue. invoiceId = INV- + 7 digits. Tax rounded to 2dp.

## Data Modeling

Normalized two-collection model. Denormalized customerName on Invoice for read performance.

## API Reference

Full contract: GET /api/invoices supports page limit sortBy sortOrder status taxRate search date ranges.

## Deployment

Atlas (MongoDB) + Render (backend) + Vercel (frontend). See deployment section above.