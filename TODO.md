# Finance App — Module Progress

| # | Module                  | Status   |
|---|-------------------------|----------|
| 1 | PDF Parser              | DONE     |
| 2 | Auto Categorisation     | DONE     |
| 3 | Spending Dashboard      | DONE     |
| 4 | Net Worth Tracker       | DONE     |

---

## Module 1 — PDF Parser
- [x] Supabase Storage upload (`server/services/storage.js`)
- [x] multer file upload endpoint (`POST /api/parse-pdf`)
- [x] pdf-parse text extraction
- [x] Claude API parsing — Prompt 1 HDFC only (`claudeParser.js`)
- [x] Save to `pdf_uploads` (with storage_path, status, statement_period)
- [x] Save transactions to `transactions` table
- [x] Frontend: Upload page with HDFC source selector + drag-drop zone
- [x] Frontend: Parsed transactions table (`TransactionsTable.jsx`)

## Module 2 — Auto Categorisation
- [x] Rule-based matching against `category_rules` table (`categoriser.js`)
- [x] Claude batch call for unmatched transactions (`claude-haiku-4-5-20251001`)
- [x] Save new rules from Claude results (keyword = first word of description)
- [x] Auto-trigger categorisation after PDF upload completes (`parsePdf.js` step 7)
- [x] `GET /api/transactions` with month/source/category filters
- [x] `PATCH /api/transactions/:id/category` — override + save rule
- [x] Transactions page: summary cards, filter bar, table with editable category dropdown
- [x] Shared categories list (`client/src/lib/categories.js`)
- [x] Tab navigation in App.jsx (Upload / Transactions)

## Transactions Page Redesign
- [x] Search bar — real-time client-side description filter, SVG icon, clear button
- [x] Filter row — Month/Source/Category dropdowns using FilterSelect, Clear button
- [x] Quick-filter chips — All/Debits/Credits + per-category, horizontally scrollable, gold active state
- [x] KPI mini cards — Total Debit/Credit updating live from visible rows
- [x] Custom table (`TxTable.jsx`) — no shadcn, alternating row bg, hover, custom type/amount colors
- [x] Empty state — centered text when no rows match
- [x] Chip filter resets when server filters change

## Overview Page Redesign
- [x] `GET /api/dashboard/overview` — single endpoint: spend, income, saved, avg/day, category vs 6-mo avg, trends, savings rate, insights data
- [x] Page header: month name (light weight) + transaction count + parsed date, driven by global month pill
- [x] KPI row (4 cards): Spent, Income, Saved, Avg/day — with delta vs prev month, semantic colors
- [x] Category breakdown panel (60%) — custom div bars, avg marker line, delta column
- [x] Monthly spend mini bars (6-month, right column top) — current month highlighted gold
- [x] Savings donut (right column bottom) — SVG ring + Income/Spent/Saved breakdown
- [x] Insights section — biggest category overage, savings rate vs avg, uncategorised link
- [x] CSS vars added: `--debit`, `--credit`, `--gold`, `--bg-surface`, `--text-muted`
- [x] Component split: KpiCard, CategoryBars, SpendBars, SavingsDonut, Insights (all < 200 lines)

## Nav Redesign
- [x] New `Nav.jsx` component — dark `#080A0E` bg, bottom border, FINN/ wordmark in gold
- [x] 5 tabs with inline SVG icons (Overview, Transactions, Upload, History, Net Worth)
- [x] Month pills (last 3 months + All) on right side — gold active state
- [x] `MonthContext` (`lib/monthContext.jsx`) — global month state via React Context
- [x] ThemeToggle moved into Nav
- [x] "Dashboard" tab renamed to "Overview" in App.jsx

## Dark / Light Theme
- [x] CSS variables for both themes added to `index.css` (`:root` and `.dark`)
- [x] `useTheme` hook — reads localStorage, falls back to system preference, watches `prefers-color-scheme`
- [x] `ThemeToggle` button (Sun/Moon icons via lucide-react) in `client/src/components/app/`
- [x] Toggle placed in tab nav bar (`App.jsx`) — theme applied on first render
- [x] Dashboard charts (bar + line) updated with theme-aware tick/grid/tooltip colors
- [ ] Net Worth charts — deferred (Module 4 out of scope for this task)

## Known Issues
- **Categorisation accuracy**: some merchants miscategorised (e.g. Blinkit → Transfers instead of Groceries). Needs prompt tuning and rule review after Module 4 is complete.

## Module 3 — Spending Dashboard
- [x] `GET /api/dashboard/monthly` — spend by category for a month (debits only, excl. Salary/Transfers)
- [x] `GET /api/dashboard/trends` — 6-month MoM totals (debits only, excl. Salary/Transfers)
- [x] Dashboard page: month picker, source filter, summary cards (Total Spent, Top Category, Tx count)
- [x] Horizontal bar chart — spend by category (Recharts, sorted highest to lowest)
- [x] Line chart — 6-month spending trend (Recharts)
- [x] Dashboard tab added to App.jsx

## Module 4 — Net Worth Tracker
- [x] `GET /api/networth` — all snapshots ordered by month asc
- [x] `GET /api/networth/latest` — most recent snapshot
- [x] `POST /api/networth/:month` — upsert snapshot (YYYY-MM-DD, first of month)
- [x] Summary cards: Total Net Worth, Largest Asset, MoM Change
- [x] Line chart — net worth over time (Recharts)
- [x] Stacked bar chart — asset class breakdown per month (Recharts)
- [x] Add / Edit Month dialog (shadcn Dialog) with ₹ input fields for all 6 asset classes
- [x] "parsed" badge on MF/Stocks fields when mf_source/stocks_source = 'parsed'
- [x] History table with Edit button per row
- [x] Net Worth tab added to App.jsx
