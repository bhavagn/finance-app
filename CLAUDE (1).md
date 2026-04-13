# CLAUDE.md — Personal Finance App

This file is the single source of truth for Claude Code.
Read this fully before writing any code. Follow every instruction here without exception.

---

## What this app does

A personal finance app for two users (me and my wife) with completely separate data.
It parses bank and credit card statements, auto-categorises transactions, shows spending
dashboards, and tracks net worth over time. Google login via Supabase Auth — no public sign-up.

---

## Monorepo structure

```
finance-app/
├── client/          # React frontend
├── server/          # Node.js + Express backend
├── CLAUDE.md        # This file
└── TODO.md          # Module progress tracker — update after every task
```

Never create files outside this structure without asking first.

---

## Tech stack — do not deviate from this

| Layer          | Choice                          |
|----------------|---------------------------------|
| Frontend       | React 18 + Vite                 |
| UI Components  | shadcn/ui                       |
| Styling        | TailwindCSS                     |
| Charts         | Recharts                        |
| Backend        | Node.js + Express               |
| Database       | PostgreSQL via Supabase JS v2   |
| Auth           | Supabase Auth — Google OAuth    |
| AI             | Claude API — claude-haiku-4-5-20251001 |
| PDF extraction | pdf-parse (server-side only)    |
| Hosting later  | Vercel (client) + Railway (server) |

Never suggest alternatives. Never install packages not on this list without asking first.

---

## Environment variables

### client/.env
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:3001
```

### server/.env
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
PORT=3001
```

Always read from env vars. Never hardcode keys, URLs, or secrets anywhere.
Always maintain a `client/.env.example` and `server/.env.example` with empty values.

---

## Auth — Google OAuth via Supabase

### Design
- Two users only (me + wife). No public sign-up.
- Google OAuth via Supabase Auth — users sign in with their Google account.
- All data is scoped by `user_id` (FK → `auth.users`).
- Row Level Security (RLS) enforced at the DB level — users can only see/modify their own rows.
- Server uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS. All server-side queries must manually filter by `user_id` extracted from the JWT.
- Client uses `VITE_SUPABASE_ANON_KEY` for auth session management only — no direct DB queries from client.

### JWT flow (Part 2, not yet implemented)
1. Client signs in with Google → Supabase returns JWT
2. Client sends JWT as `Authorization: Bearer <token>` header on all API requests
3. Server middleware verifies JWT via `supabase.auth.getUser(token)` → extracts `user_id`
4. All DB queries on server include `.eq('user_id', userId)` filter

---

## Database — Supabase PostgreSQL

### Tables (current state)

```sql
-- PDF upload records
create table pdf_uploads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,  -- added for multi-user
  file_name text not null,
  file_size integer,
  storage_path text,
  source text not null,   -- check constraint removed; validated in app via SOURCE_META
  status text check (status in ('pending', 'processing', 'parsed', 'failed', 'superseded')) default 'pending',
  statement_period_start date,
  statement_period_end date,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Parsed transactions
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,  -- added for multi-user
  upload_id uuid references pdf_uploads(id) on delete cascade,
  date date not null,
  description text not null,
  amount numeric(12, 2) not null,
  type text check (type in ('debit', 'credit')) not null,
  balance numeric(12, 2),
  reference_number text,
  source text not null,
  category text,
  parent_category text,
  created_at timestamptz default now()
);

-- Insights cache
create table insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,  -- added for multi-user
  month varchar(7) not null,
  type varchar(10) not null check (type in ('rule', 'ai')),
  category varchar(50),
  title text not null,
  body text,
  severity varchar(10) not null default 'info' check (severity in ('positive', 'warning', 'info')),
  created_at timestamptz default now()
);

-- Net worth snapshots (manual entry)
create table net_worth_snapshots (
  id uuid primary key default uuid_generate_v4(),
  month date not null unique,
  mutual_funds numeric(12, 2) default 0,
  stocks numeric(12, 2) default 0,
  gold numeric(12, 2) default 0,
  chit_fund numeric(12, 2) default 0,
  cash numeric(12, 2) default 0,
  epfo numeric(12, 2) default 0,
  mf_source text check (mf_source in ('parsed', 'manual')) default 'manual',
  stocks_source text check (stocks_source in ('parsed', 'manual')) default 'manual',
  total numeric(12, 2) generated always as
    (mutual_funds + stocks + gold + chit_fund + cash + epfo) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Indexes
```sql
create index idx_pdf_uploads_user_id on pdf_uploads(user_id);
create index idx_transactions_user_id on transactions(user_id);
create index idx_insights_user_id on insights(user_id);
create index idx_transactions_upload_id on transactions(upload_id);
create index idx_transactions_date on transactions(date desc);
create index idx_pdf_uploads_source on pdf_uploads(source);
create index idx_insights_month on insights(month);
```

### Row Level Security
RLS is enabled on `pdf_uploads`, `transactions`, and `insights`.
Policy: `auth.uid() = user_id` for ALL operations.
Server uses service role — bypasses RLS. Must filter by user_id manually.

### Source keys — canonical list (server/config/sourceMeta.js)
```
Bank accounts:    hdfc_savings, sbi_savings, federal_savings, axis_savings, kotak_savings, icici_savings
Credit cards:     hdfc_millennia, hdfc_credit_card, amazon_icici, icici_credit_card,
                  axis_credit_card, kotak_credit_card, sbi_credit_card, bob_scapia, icici_mmt
Legacy (DB only): icici_amazon_credit, icici_mmt_credit, hdfc_millennia_credit, bob_scapia_credit
```
Source keys are validated via `server/config/sourceMeta.js` — NOT DB check constraints (those were dropped).

---

## Supabase Storage

Bucket: `statements`
Path pattern: `{source}/{YYYY-MM}/{timestamp}_{filename}`
Service role key used for all storage operations (server-side only).

---

## Backend conventions (server/)

### Folder structure
```
server/
├── index.js
├── routes/
│   ├── parsePdf.js        # Upload + bank detection + parsing
│   ├── transactions.js    # Categorisation endpoints
│   ├── dashboard.js       # Spending overview
│   ├── networth.js        # Net worth CRUD
│   ├── uploads.js         # Upload history
│   └── insights.js        # Insights cache endpoints
├── services/
│   ├── claudeParser.js    # PDF parsing via Claude
│   ├── categoriser.js     # Auto-categorisation via Claude
│   ├── bankDetector.js    # Detects bank from PDF text (no Claude)
│   ├── insightsService.js # Rule + AI insights engine
│   ├── storage.js         # Supabase Storage
│   └── supabase.js        # Supabase client (service role)
├── config/
│   └── sourceMeta.js      # Source key → label/type/bank map
├── lib/
│   └── categories.js      # Category → parent mapping
├── scripts/
│   ├── migrate-user-data.js   # One-time: assign existing rows to a user
│   └── test-detector.js       # CLI: test bank detection on a PDF
└── middleware/
    └── errorHandler.js
```

### API conventions
- All routes prefixed with `/api`
- Success: `{ data: ... }` — Error: `{ error: "message" }`
- Use express-async-errors. Async/await everywhere.

---

## Frontend conventions (client/)

### Folder structure
```
client/src/
├── components/app/    # App-specific components
├── pages/
│   ├── Upload.jsx         # Queue-based multi-file upload
│   ├── Transactions.jsx
│   ├── Dashboard.jsx
│   ├── Uploads.jsx        # Upload history
│   └── NetWorth.jsx
├── lib/
│   ├── api.js             # fetch wrapper — attaches Auth JWT in Part 2
│   ├── categories.js      # SOURCE_META, SOURCE_OPTIONS, CATEGORIES
│   └── supabase.js        # Supabase client (anon key — auth only)
└── App.jsx                # Upload tab always mounted (preserves queue state)
```

### Key behaviours
- Upload page is always mounted (`display:none` when inactive) — queue state persists across tab switches
- All amounts: `toLocaleString('en-IN', { style: 'currency', currency: 'INR' })`
- All dates: DD MMM YYYY
- Source labels come from `SOURCE_META` / `getSourceLabel()` in `lib/categories.js`

---

## Upload flow (bank-agnostic)

1. User picks **Bank Account** or **Credit Card** (no bank selection)
2. PDF text extracted server-side
3. `bankDetector.js` runs on first 3000 chars → returns source key
4. If undetected → HTTP 422 `{ error: 'bank_undetected', availableSources: [...] }` → client shows manual dropdown
5. If detected (or manual source on retry) → proceed with parsing
6. Claude parses transactions → saved with detected `source` key
7. Auto-categorisation runs (bulk updates grouped by category)

---

## Module status

| # | Module | Status |
|---|---|---|
| 1 | PDF Parser (bank-agnostic) | **DONE** |
| 2 | Auto Categorisation | **DONE** |
| 3 | Spending Dashboard + Insights | **DONE** |
| 4 | Net Worth Tracker | **DONE** |
| 5 | Google Auth + Multi-user | Part 1 done (DB + config) — Part 2 pending |

---

## Current State

> Last updated: 2026-04-13

### Categoriser
- Model: `claude-haiku-4-5-20251001`
- No rules engine. All transactions go directly to Claude in batches of 100.
- DB writes are bulk-grouped by category (one UPDATE per distinct category per batch, not one per row).
- `POST /api/transactions/categorise-all` — resets all categories, re-categorises everything.

### Dashboard exclusions
`Transfers`, `Salary`, `Credit Card Payment`, `Fees & Charges` excluded from all spend totals.
Investment categories: `Gold`, `Mutual Funds`, `Stocks`, `Chit Fund` — tracked separately as "Invested".

### Insights engine (server/services/insightsService.js)
- 9 rule-based insights + AI insights via Claude Haiku
- Cached in `insights` table; regenerated via `POST /api/insights/:month/regenerate`
- Endpoints: `GET /api/insights/:month`, `POST /api/insights/:month/regenerate`

### Auth — Part 1 complete
- `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE` added to `pdf_uploads`, `transactions`, `insights`
- RLS enabled with `auth.uid() = user_id` policy on all three tables
- Existing data migrated: `node scripts/migrate-user-data.js email@gmail.com`
- Part 2 (JWT middleware, login UI, per-user filtering) — NOT YET DONE

### Dependency pins
- **pdf-parse v1.1.4** — do not upgrade. v2 broke callable API.

---

## Development

```bash
# Server (port 3001)
cd server && node -r dotenv/config index.js

# Client (port 5173)
cd client && npm run dev
```

---

## AI usage rules

- PDF parsing: Claude called ONCE per upload, result saved immediately.
- Categorisation: Claude called in batches of 100. Results saved immediately.
- Insights: Claude called once per month per user, cached in DB.
- Dashboards, charts, transaction history: NEVER call Claude. Read from Supabase only.
- Never call Claude API from the frontend.

---

## Rules

**Always:**
- Read this file before writing code
- Filter all DB queries by `user_id` once auth is wired (Part 2)
- Use `SOURCE_META` for all source key lookups — never hardcode source strings
- Add console.log on the server for every major step

**Never:**
- Hardcode any value that belongs in .env
- Call Claude API from the frontend
- Install a new package without listing it here first
- Modify `client/src/components/ui/` — shadcn auto-generated
- Re-add a DB check constraint on `source` — it was intentionally dropped
