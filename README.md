# Spl1t

**Spl1t costs, not friendships.** A mobile-first web app for splitting trip and event costs with real-time collaboration, AI receipt scanning, and meal/activity planning.

**Live app:** https://split.xtian.me
**Demo trip:** https://split.xtian.me/t/livigno-2025

---

## Features

- **Shared link access** — no signup required; trip URL is the access token
- **AI receipt scanning** — photo → Claude extracts line items → assign to participants → expense created
- **Dark mode** — system preference detection with manual light/dark/system toggle
- **Two UI modes** — Quick (streamlined single-page) + Full (multi-page dashboard with tabs)
- **Wallet groups** — shared wallets with per-expense equal-split toggle and within-group balances
- **Multi-currency** — default currency per trip with exchange rate tracking
- **Settlement optimizer** — minimizes the number of transactions to settle up
- **Email invitations** — magic link invites + payment reminder emails with receipt breakdown
- **Contact autocomplete** — "people you've tripped with" from past trips
- **Meal + activity planner** — week-based calendar with breakfast/lunch/dinner and morning/afternoon/evening slots
- **Real-time shopping list** — collaborative list with categories, linked to meals
- **Stay tracker** — accommodation with check-in/out dates and map coordinates
- **Events support** — trips (multi-day) and single-day events
- **PWA** — installable, pull-to-refresh, safe-area padding for iPhone
- **Dashboard** — pie/bar charts, top expenses, PDF and Excel export
- **Observability** — Grafana Cloud (Loki logs + OTLP metrics) with offline log buffering

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, Vite 6 |
| Styling | Tailwind CSS + shadcn/ui (dark mode) |
| State | React Context API |
| Database | Supabase (PostgreSQL + RLS + Edge Functions) |
| Auth | Supabase Auth (Google OAuth) |
| AI | Anthropic SDK (Claude — receipt scanning) |
| Observability | Grafana Cloud (Loki + OTLP) |
| Deployment | Cloudflare Pages |
| Tests | Vitest (173 unit) + Playwright (26 E2E) |

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

### Setup

```bash
git clone <repository-url>
cd trip-splitter-pro
npm install
cp .env.example .env
```

Edit `.env` with your credentials:

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `VITE_GOOGLE_CLIENT_ID` | No | Google OAuth |
| `VITE_GRAFANA_*` | No | Observability (Grafana Cloud) |

### Database

```bash
supabase link --project-ref <your-project-ref>
supabase db push    # applies all 33 migrations
```

### Development server

```bash
npm run dev         # http://localhost:5173
```

## Development Commands

```bash
npm run dev          # development server
npm run build        # production build
npm run lint         # ESLint
npm run type-check   # TypeScript (run before every commit)
npm test             # unit tests (Vitest)
npm run test:e2e     # E2E smoke tests (Playwright)
```

## Database Schema

### Core tables
- `trips` — trip metadata, tracking mode, trip code (URL slug), created_by
- `participants` — individuals with optional `wallet_group` for shared-wallet grouping
- `expenses` — expense records with JSONB distribution
- `settlements` — payment transfers between participants

### Planning tables
- `meals` — meal calendar (breakfast/lunch/dinner per day)
- `activities` — activity planner with date, time slot, and responsible participant
- `stays` — accommodation with check-in/out dates and coordinates
- `shopping_items` — shopping list with category, quantity, completion
- `meal_shopping_items` — junction table linking meals to shopping items

### User tables
- `user_profiles` — bank account details (IBAN)
- `user_preferences` — preferred mode (quick/full), default trip
- `invitations` — email invitation tokens

33 migrations in `supabase/migrations/`. 4 Edge Functions: `log-proxy`, `create-github-issue`, `send-email`, `process-receipt`.

## Project Structure

```
trip-splitter-pro/
├── src/
│   ├── components/      # UI components (expenses, quick, receipts, setup, ui)
│   ├── contexts/        # React Context providers (9 domain contexts)
│   ├── hooks/           # Custom hooks (keyboard, media query, contacts, PWA)
│   ├── pages/           # Page components (Home, Dashboard, Expenses, etc.)
│   ├── services/        # Business logic (balance calculator, settlement optimizer)
│   ├── types/           # TypeScript type definitions
│   ├── lib/             # Supabase client, logger, utilities
│   ├── test/            # Test factories and helpers
│   ├── App.tsx          # Root component
│   ├── main.tsx         # Entry point (PWA guard)
│   └── routes.tsx       # Route definitions
├── supabase/
│   ├── functions/       # Edge Functions (log-proxy, send-email, process-receipt, create-github-issue)
│   └── migrations/      # 33 SQL migrations
├── e2e/                 # Playwright E2E tests
├── scripts/             # Utility scripts (demo seeder, balance audit)
├── public/              # Static assets, PWA manifest, service worker
├── docs/                # Release notes, architecture docs, audit logs
├── CLAUDE.md            # Claude Code instructions
└── PLAN.md              # Living planning document
```

## Access Model

Trip URL = access token. The `trips` table has `SELECT USING (true)` — open to all, authenticated and anonymous. Anyone with the URL can read and participate. Authentication gates trip creation, personal features (bank details, balance summary), and email invitations.

## Deployment

**Cloudflare Pages:**
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_CLIENT_ID`, `VITE_GRAFANA_*`

**Supabase Edge Functions:**
```bash
supabase functions deploy send-email
supabase functions deploy process-receipt
supabase functions deploy log-proxy
supabase functions deploy create-github-issue
```

## Documentation

- [`CLAUDE.md`](CLAUDE.md) — architecture, patterns, and conventions for Claude Code
- [`PLAN.md`](PLAN.md) — living planning document with phase history
- [`docs/RELEASE_NOTES.md`](docs/RELEASE_NOTES.md) — changelog by version

## License

Apache 2.0 — see [LICENSE](LICENSE)
