# Trip Splitter Pro

A modern, mobile-first web application for splitting costs among groups on trips, with real-time collaboration features, meal planning, and shopping list management.

## Tech Stack

- **Frontend:** React 18+ with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Database:** Supabase (PostgreSQL)
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

- **trips** - Trip metadata with tracking mode (individuals/families)
- **families** - Family groups with adults and children counts
- **participants** - Individual participants linked to families or standalone
- **expenses** - Expense records with distribution logic
- **settlements** - Payment transfers between participants/families
- **meals** - Meal planning with calendar grid (breakfast/lunch/dinner)
- **shopping_items** - Shopping list items with category and completion status
- **meal_shopping_items** - Junction table linking meals to shopping items

### Running Migrations

To set up the database schema:

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Run the SQL

### Real-time Features

The shopping list uses Supabase real-time subscriptions. Make sure to enable real-time for the `shopping_items` table in your Supabase project settings.

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
│   ├── components/     # Reusable components
│   ├── pages/          # Page components
│   ├── lib/            # Utilities and configurations
│   ├── store/          # State management
│   ├── App.tsx         # Main app component
│   ├── main.tsx        # App entry point
│   └── routes.tsx      # Route definitions
├── supabase/
│   └── migrations/     # Database migrations
├── public/             # Static assets
└── DEVELOPMENT_PLAN.md # Phased development plan
```

## Features

See `DEVELOPMENT_PLAN.md` for the complete phased implementation plan.

### Current Phase: Phase 1 - Foundation

- ✅ Project scaffolding
- ✅ Database schema
- ✅ Basic routing and navigation
- ✅ State management setup

### Upcoming Phases

- Phase 2: Trip Management
- Phase 3: Trip Setup Flow
- Phase 4: Expense Entry & Management
- Phase 5: Balance Calculation
- Phase 6: Meal Planner
- Phase 7: Shopping List
- And more...

## Contributing

This project follows a phased development approach. See `DEVELOPMENT_PLAN.md` for the roadmap and current status.

## License

MIT
