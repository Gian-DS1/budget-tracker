# FinTrack — Smart Budgeting 🇩🇴

A personal-finance web app built for the Dominican Republic. It replaces spreadsheets with **zero-based budgeting**, debt and credit-card tracking, savings goals, recurring transactions, smart analysis, and reminders — all synced to the cloud.

> Data is stored in **Supabase** (Postgres + Auth) and cached locally so the app loads instantly and works without friction.

---

## ✨ Features

- **Budget** — progressive levels: Tracking (just log), the 50/30/20 rule, and **zero-based** (assign every dollar by category until "To Assign" reaches 0). Includes **auto-suggestion** from your last 3-month average and a one-click copy of the previous month.
- **Transactions** — fast entry with auto-categorization (it learns from your history) and **recurring transactions** that create themselves.
- **Credit cards** — automatic statement/payment cycles, rule-based cashback, partial payments, **statement history**, and a card catalog with predefined cashback.
- **Debts** — balances, interest, payment history with a linked transaction, avalanche strategy, and an estimate of months to payoff.
- **Savings & goals** — goals with logged contributions (each contribution creates its own linked transaction), projected completion date, optional time horizon (short/medium/long), and history with undo.
- **Dashboard** — bento grid with KPIs, monthly cash flow, financial-health ring, spending donut, net worth, and reminders. Month selector to review the past.
- **My Finances** — a unified net-worth view: a net-worth summary over **cards**, **savings**, and **debts** tabs, so you can reconcile everything from one place.
- **Calendar** — monthly view with past movements and **upcoming due dates** (debt installments, card payments, goals, and recurring items) plus an upcoming-due-dates panel.
- **Profile currency** — each user picks a currency on first login (onboarding) and the whole app formats amounts with it (`Intl`).
- **Settings** — budget level, currency, language (es/en), CSV/Excel import/export, and category management.

---

## 🧱 Tech stack

| Layer | Technology |
|------|-----------|
| Frontend | React 19 + Vite 8 (Rolldown) |
| Routing | React Router v7 |
| State | Zustand 5 (persisted to `localStorage`) |
| Backend / Data | Supabase (PostgreSQL + Auth + RLS) |
| Styling | Tailwind CSS v4 (`@theme` with tokens, dark "Stitch" periwinkle theme) |
| Charts | Recharts |
| Icons | Material Symbols (UI) + JoyPixels v10 via emoji-toolkit (category emojis) |
| Animation | Framer Motion |
| Serverless | Vercel functions (`/api/parse-pdf` imports statements; `/api/feedback` receives feedback) |
| Tests | Vitest |

---

## 🚀 Run the project from scratch

### 1. Clone and install
```bash
git clone https://github.com/Gian-DS1/budget-tracker.git
cd budget-tracker
npm install
```
> Note: the `xlsx` dependency is installed from the **official SheetJS CDN** (a maintained build, free of the vulnerabilities in the npm-published package). `npm install` downloads it automatically — it only needs access to `cdn.sheetjs.com`.

### 2. Create the Supabase project
1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run the full contents of [`supabase/schema.sql`](supabase/schema.sql). This creates the tables, enables **Row Level Security**, and sets up policies and permissions. **It is required**: without RLS, the anon key would let anyone read other users' data.
3. Under **Authentication → Providers**, enable **Email** (and optionally **Google**; set the redirect to your domain / `http://localhost:5173`).

> **Migrations:** a fresh database created from `schema.sql` is already complete. For an **existing** database that predates the redesign, run the migrations in order — see [`supabase/MIGRATIONS.md`](supabase/MIGRATIONS.md).

### 3. Environment variables
```bash
cp .env.example .env
```
Fill `.env` with the values from **Supabase → Project Settings → API**:
```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```
> The `/api` serverless functions accept **optional** variables without the `VITE_` prefix (they live only on the server): `WEB3FORMS_ACCESS_KEY` for the feedback form and `STATEMENT_SKIP_PATTERNS` for the PDF importer. The web app works without them. See [`.env.example`](.env.example).

### 4. Run locally
```bash
npm run dev      # http://localhost:5173
```
On first sign-up, the app asks for your **currency** (onboarding) and you start with **no categories**: you create them yourself, or the auto-categorizer suggests them as you import/log movements.

### 5. Available scripts
```bash
npm run dev        # development server
npm run build      # production build (dist/ folder)
npm run preview    # preview the build
npm run lint       # ESLint
npm run test       # tests (Vitest)
```

---

## ☁️ Deployment (Vercel)

1. Import the repo into Vercel.
2. Add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` variables (Production + Preview).
3. The [`vercel.json`](vercel.json) file already configures the SPA rewrite (excluding `/api`).

---

## 🔒 Security & privacy

- **Data isolation via RLS.** Every query filters by `user_id`, and the database enforces it with Row Level Security (`auth.uid() = user_id`). Running `supabase/schema.sql` sets this up.
- **Secrets.** The `.env` file is in `.gitignore` and is never committed. The `anon key` is public by design (safe thanks to RLS).
- **Local cache.** For speed, data is cached in `localStorage`. On **sign-out**, sensitive caches are cleared.
- **Feedback.** The Feedback page sends messages to the developer's email via the external **Web3Forms** service (it stores no data in your database).

---

## 📁 Project structure

```
budget-tracker/
├── api/                  # Vercel serverless functions (parse-pdf: imports statements; feedback)
├── supabase/
│   ├── schema.sql        # Full schema (source of truth, idempotent)
│   ├── MIGRATIONS.md     # Migration order for existing databases
│   └── *.sql             # One-off migrations + validation scripts
├── src/
│   ├── stitch/           # The whole UI: shell, screens (screens/), components, and stitch.css
│   ├── contexts/         # AuthContext (Supabase session)
│   ├── data/             # Default categories (DR) + auto-categorization
│   ├── lib/              # Supabase client
│   ├── stores/           # Global Zustand state (one per domain)
│   └── utils/            # Financial calculations, formatting, card cycles
├── docs/                 # SECURITY.md — security measures and design decisions
├── .env.example
└── vercel.json
```

> The UI lives entirely in `src/stitch/`. Each screen with sub-components uses the "thin shell + `screens/<page>/` folder" pattern with pure, testable selectors.

### Tables (see `supabase/schema.sql`)
`categories` · `transactions` · `budgets` · `savings` · `savings_contributions` · `debts` · `debt_payments` · `plans` *(legacy; merged into `savings`)* · `credit_cards` · `recurring_transactions`

> `profiles` (user preferences, e.g. budget level) is created by its own migration [`supabase/add_profiles_table.sql`](supabase/add_profiles_table.sql), not in `schema.sql`.

---

## 🧪 Tests

Financial logic and pure UI selectors are covered with Vitest (zero-based budgeting, accumulating sinking funds, savings capacity, card cycles and cashback, recurrence, goal projection, currency formatting, calendar):
```bash
npm run test
```

---

## 📄 License

[MIT](LICENSE) © Giancarlos Estévez
