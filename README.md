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

### Real-time & State Management

**Optimistic UI Updates:**
All create, update, and delete operations provide instant feedback with optimistic updates:
- Changes appear immediately in the UI before database confirmation
- No page refreshes needed for any CRUD operations
- Rollback logic in place for failed operations

**Real-time Subscriptions:**
The shopping list uses Supabase real-time subscriptions for collaborative features:
- Real-time enabled for the `shopping_items` table
- Automatic sync across multiple devices/users
- Combines optimistic updates with real-time for best experience

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

## What is Trip Splitter Pro?

Trip Splitter Pro is a **collaborative expense tracking and trip planning app** designed for group trips with families and friends. Instead of complicated spreadsheets or awkward "who owes whom" conversations, get instant clarity on shared costs with smart splitting, automatic balance calculations, and fair settlement recommendations.

### The Problem We Solve

Planning group trips with multiple families or friends creates financial complexity:
- Who paid for groceries? Who covered the rental car?
- Should we split costs equally, or account for family sizes?
- At trip's end, who owes money to whom—and how much?
- How do we track meal planning and shopping for a group?

Trip Splitter Pro handles all of this automatically, letting you focus on enjoying the trip instead of managing spreadsheets.

### How It Works

**1. Create a Trip & Get a Shareable Link**
- Create a trip and get a unique shareable URL (e.g., `split.xtian.me/t/beach-trip-a3x9k2`)
- No signup required—just share the link with your group
- Everyone with the link can access and collaborate in real-time

**2. Set Up Your Group**
- Choose your tracking mode:
  - **Individuals Only**: Split costs per person (e.g., friends on a road trip)
  - **Families Mode**: Track expenses by family units with automatic individual breakdowns
- Add participants or family groups with adult/child counts

**3. Track Expenses as They Happen**
- Log expenses with smart distribution options:
  - Split equally among everyone
  - Split among specific people or families
  - Custom percentage or amount splits
- Instant balance updates show who's ahead and who owes money
- Smart payer suggestion recommends who should pay next

**4. Settle Up Fair & Simple**
- Automatic settlement optimization minimizes the number of transactions
- Example: Instead of 6 people making 15 payments, get down to 3-4 optimized transfers
- Record settlements to update balances in real-time

**5. Bonus: Meal Planning & Shopping**
- Plan meals on a calendar (breakfast, lunch, dinner)
- Assign cooking responsibilities
- Create collaborative shopping lists with real-time sync
- Link ingredients to specific meals for organized shopping

---

## Core Features

### 🎫 Smart Trip Management
- **Multiple trips**: Manage several trips simultaneously, switch between them instantly
- **Shareable links**: Each trip gets a unique URL—no accounts or logins needed
- **Date tracking**: Set trip duration to organize meals and expenses by day
- **Two modes**: Choose individual or family tracking based on your group composition

### 👥 Flexible Participant Setup
- **Individual tracking**: Perfect for friends splitting costs equally
- **Family groups**: Track families as units while seeing individual breakdowns
- **Mixed mode**: Some expenses split by family, others by specific individuals
- **Adult/child tracking**: Account for different costs (e.g., kids eat free)

### 💰 Intelligent Expense Tracking
- **Mobile-optimized entry**: Add expenses quickly with touch-friendly forms
- **Smart distribution**:
  - Equal split (divide evenly among selected people/families)
  - Percentage split (custom percentages for each participant)
  - Amount split (specify exact amounts per person)
- **Mixed participants**: Split one expense among families AND specific individuals
- **Smart payer suggestions**: App suggests who should pay next based on current balances
- **Search & filter**: Find expenses by description, category, or date
- **Category tracking**: Organize by Food, Transport, Accommodation, Activities, Training, Other

**Example Use Cases:**
- Groceries split equally among all families
- Rental car paid by one person, split among adults only
- Restaurant bill split among specific people who attended
- Kids' activities paid by participating families only

### 📊 Real-Time Balance Tracking
- **Instant calculations**: See who's ahead and who owes money after each expense
- **Visual indicators**: Green (owed money) / Red (owes money) / Neutral
- **Running totals**: Track cumulative spending vs. fair share per person/family
- **Balance history**: See how balances evolved throughout the trip

### 💸 Optimal Settlement Algorithm
- **Minimize transactions**: Complex debts simplified to fewest possible payments
- **Example**: 5 people with various debts → 3-4 optimized transfers instead of 10+
- **Settlement recording**: Mark payments as completed to update balances
- **Settlement history**: Track who paid whom and when
- **Fair distribution**: Mathematically guaranteed fair settlements

**How Settlement Works:**
1. Trip ends with 5 people having various positive/negative balances
2. Algorithm calculates optimal payment plan (e.g., "Alice pays Bob €50, Charlie pays Alice €30")
3. Record settlements as payments happen
4. Balances update automatically until everyone's at zero

### 🍽️ Meal Planning & Calendar
- **Visual calendar**: Plan meals across your trip duration (breakfast, lunch, dinner)
- **Meal scheduling**: Assign meals to specific dates and times
- **Cooking assignments**: Designate who's responsible for each meal
- **Ingredient tracking**: See ingredient completion status (e.g., "3/5 items ready")
- **Mobile-responsive**: Works beautifully on phones at the grocery store

### 🛒 Collaborative Shopping List
- **Real-time sync**: Everyone sees updates instantly across all devices
- **Optimistic updates**: Changes appear immediately—no waiting, no page refreshes
- **Category organization**: Organize by produce, dairy, meat, pantry, frozen, etc.
- **Multiple views**:
  - All items (full list)
  - By category (organized shopping)
  - By meal (ingredients for specific meals)
  - General items (not linked to meals)
- **Check-off items**: Mark items complete as you shop
- **Meal integration**: Link shopping items to specific meals for organization

**Workflow Example:**
1. Plan "Pasta Night" meal for Tuesday dinner
2. Click "Add Ingredient" on meal card
3. Add "Fresh Basil" to shopping list (auto-linked to Pasta Night)
4. At grocery store, everyone sees the list in real-time
5. Check off items as you shop
6. Meal card shows "4/5 ingredients ready"

### 📈 Dashboard Analytics
- **Expense breakdown**: Visual pie chart showing spending by category
- **Cost per participant**: Bar chart comparing costs across people/families
- **Top expenses**: See biggest expenses at a glance
- **Export capabilities**: Download reports as Excel or PDF

### 🎨 Modern, Accessible UI
- **Mobile-first design**: Optimized for use on phones during the trip
- **shadcn/ui components**: Professional, consistent design system
- **Smooth animations**: Framer Motion micro-interactions for delightful UX
- **Dark mode support**: Easy on the eyes in all lighting conditions
- **Touch-friendly**: Large tap targets, swipe gestures, intuitive navigation
- **Responsive**: Works perfectly on phones, tablets, and desktops

---

## Key Differentiators

✅ **No signup required** - Share a link, start tracking immediately
✅ **Family-aware splitting** - Handles family groups intelligently, not just individuals
✅ **Mixed splitting** - One expense can split among families AND specific individuals
✅ **Real-time collaboration** - Shopping lists sync instantly across devices
✅ **Smart settlements** - Minimize transactions with optimization algorithm
✅ **Meal planning integrated** - Not just expenses—plan meals and shopping too
✅ **Optimistic UI** - Instant feedback, no waiting for server responses
✅ **Mobile-optimized** - Built for use during the trip, not just after
✅ **Privacy-focused** - No accounts, no tracking, just your trip data

---

## Use Cases

**Family Beach Week**
- 3 families sharing a beach house for a week
- Split groceries, dining out, rental costs, and activities
- Plan meals with cooking rotation
- Collaborative shopping list for group grocery runs
- Fair settlement at trip's end

**Friends Ski Trip**
- 8 friends renting a cabin
- Track lift tickets, gas, food, equipment rentals
- Some expenses split equally, others for specific participants
- Quick settlement before heading home

**Multi-Family Camping**
- Several families on a camping trip
- Track campsite fees, firewood, communal food
- Kids vs. adults pricing for activities
- Meal planning for group dinners
- Shopping list for grocery runs

**Work Retreat / Team Offsite**
- Team trip with mixed personal and shared expenses
- Track who paid for what
- Fair split at the end without spreadsheets
- Meal planning for team dinners

## Contributing

This project follows a phased development approach. See `DEVELOPMENT_PLAN.md` for the roadmap and current status.

## License

MIT
