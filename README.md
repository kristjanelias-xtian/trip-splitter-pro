# Trip Splitter Pro

A modern, mobile-first web application for splitting costs among groups on trips, with real-time collaboration features, meal planning, and shopping list management.

## Tech Stack

- **Frontend:** React 18+ with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** React Context API
- **Database:** Supabase (PostgreSQL)
- **Real-time:** Supabase Subscriptions (shopping list)
- **Deployment:** Cloudflare Pages

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd trip-splitter-pro
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Set up the database:
   - Go to your Supabase project
   - Navigate to SQL Editor
   - Run the migration file: `supabase/migrations/001_initial_schema.sql`

5. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Type checking
npm run type-check
```

## Database Setup

The application uses Supabase for the database. The schema includes:

### Core Tables
- **trips** - Trip metadata with start_date, end_date, tracking_mode
- **families** - Family groups with adults and children counts
- **participants** - Individual participants linked to families or standalone
- **expenses** - Expense records with distribution logic
- **settlements** - Payment transfers between participants

### Feature Tables
- **meals** - Meal planning with calendar grid (breakfast/lunch/dinner)
- **shopping_items** - Shopping list items with category and completion status
- **meal_shopping_items** - Junction table linking meals to shopping items

### Running Migrations

**Option 1: Supabase CLI (Recommended)**
```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Apply all migrations
supabase db push

# Regenerate TypeScript types
supabase gen types typescript --linked > src/lib/database.types.generated.ts
```

**Option 2: Manual via Dashboard**
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Run migrations in order: `001_initial_schema.sql`, `002_fix_expenses_schema.sql`, etc.

**Current Migrations:** 4 applied, 1 pending (see STATUS.md for details)

### Real-time Features

The shopping list uses Supabase real-time subscriptions. Real-time is enabled for the `shopping_items` table.

## Deployment

### Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages
2. Configure build settings:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

The app will automatically deploy on push to the main branch.

## Project Structure

```
trip-splitter-pro/
├── src/
│   ├── components/     # Reusable components (forms, cards, etc.)
│   ├── contexts/       # React Context providers (Trip, Expense, Meal, etc.)
│   ├── pages/          # Page components (Dashboard, Expenses, Meals, etc.)
│   ├── services/       # Business logic (balance calculator, settlement optimizer)
│   ├── types/          # TypeScript type definitions
│   ├── lib/            # Supabase client and utilities
│   ├── App.tsx         # Main app component
│   ├── main.tsx        # App entry point
│   └── routes.tsx      # Route definitions
├── supabase/
│   └── migrations/     # Database migrations (001-005)
├── docs/
│   └── phases/         # Phase completion summaries
├── .claude/            # Claude Code configuration
├── public/             # Static assets
├── STATUS.md           # Quick project status reference
├── DEVELOPMENT_PLAN.md # Phased development roadmap
└── CLAUDE.md           # Instructions for Claude Code
```

## Features

**Current Status:** Phases 1-6 Complete ✅ | See `STATUS.md` for quick overview | `DEVELOPMENT_PLAN.md` for full roadmap

### ✅ Implemented Features

**Trip Management**
- Create and manage multiple trips with date ranges
- Switch between trips with header dropdown
- Two tracking modes: Individuals only or Individuals + Families

**Participant & Family Setup**
- Add individual participants or family groups
- Track adults and children counts per family
- Flexible setup that adapts to tracking mode

**Expense Tracking**
- Mobile-optimized expense entry with smart distribution
- Filter and search expenses
- Support for individuals, families, or mixed distributions
- Smart payer suggestion based on current balances

**Balance & Settlements**
- Real-time balance calculation (who owes whom)
- Optimal settlement algorithm (minimize transactions)
- Custom settlement payment recording
- Dedicated settlements page with history

**Meal Planning**
- Calendar grid view (breakfast/lunch/dinner per day)
- Assign meals to specific dates and times
- Assign responsible participants to meals
- Mobile-first responsive design

**Shopping List**
- Real-time collaborative shopping list
- Optimistic UI updates for instant feedback
- Category organization (produce, dairy, meat, etc.)
- Multiple view modes (all, by category, by meal, general)
- Check off items as you shop

### 📋 Upcoming Features

See `DEVELOPMENT_PLAN.md` for the complete phased implementation plan:
- Phase 8: Meal-shopping integration (link ingredients to meals)
- Phase 9: Dashboard analytics with charts
- Phase 10: Enhanced settlement features
- Phase 11: Export to PDF and Excel
- Phase 12: Performance optimizations and accessibility

## Contributing

This project follows a phased development approach. See `DEVELOPMENT_PLAN.md` for the roadmap and current status.

## License

MIT
