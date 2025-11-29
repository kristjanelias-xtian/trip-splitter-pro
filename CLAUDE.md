# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Family Trip Cost Splitter - A mobile-first web application for splitting costs among groups on trips with real-time collaboration, meal planning, and shopping list features.

**Tech Stack:**
- Frontend: React 18+ with TypeScript, Vite
- Styling: Tailwind CSS with shadcn/ui components
- State Management: React Context API or Zustand
- Database: Supabase (PostgreSQL)
- Authentication: Supabase Auth
- Deployment: Cloudflare Pages

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests (when implemented)
npm test

# Run linter
npm run lint

# Run type checking
npm run type-check
```

## Database Schema

The Supabase schema includes these core tables:
- `trips` - Trip metadata with tracking mode (individuals/families)
- `families` - Family groups with adults and children counts
- `participants` - Individual participants linked to families or standalone
- `expenses` - Expense records with distribution logic
- `settlements` - Payment transfers between participants/families
- `meals` - Meal planning with calendar grid (breakfast/lunch/dinner)
- `shopping_items` - Shopping list items with category and completion status
- `meal_shopping_items` - Junction table linking meals to shopping items

**Real-time features:** Shopping list uses Supabase real-time subscriptions for instant updates across devices.

## Architecture & Key Concepts

### Tracking Modes
The app supports two modes set during trip setup:
1. **Individuals only** - Track expenses per person
2. **Individuals + Families** - Track at family level with individual breakdowns

This affects expense splitting logic throughout the app.

### Context Organization
- **Trip Context** - Current trip selection, switching between trips
- **Expense Context** - CRUD operations, balance calculations
- **Meal Context** - Calendar management, meal-shopping linkage
- **Shopping List Context** - Real-time updates with optimistic UI

### Critical Algorithms

**Balance Calculation:**
- Track running totals: total share vs. amount paid per participant/family
- Calculate current balance (positive = owed, negative = owes)
- Must handle mixed family/individual expense distribution

**Smart Payer Suggestion:**
- Calculate who's furthest behind relative to their running share
- Suggest this person as next payer when adding expenses
- Display prominently in expense entry form

**Optimal Settlement:**
- Minimize transaction count using greedy algorithm
- Convert complex web of debts into minimal payment transfers
- Display as actionable "Person A pays Person B: €X" items

**Meal-Shopping Integration:**
- Bidirectional linking: meals → shopping items and vice versa
- Ingredient aggregation: combine duplicate items across multiple meals
- Filter shopping list by meal, day, or show general items only

### Mobile-First Principles

**Touch targets:** Minimum 44x44px for all interactive elements

**Navigation:**
- Bottom nav on mobile (< 768px): Trips, Expenses, Meals, Shopping, Dashboard, Settings
- Side nav on desktop (> 1024px)
- Trip selector always accessible in header

**Responsive breakpoints:**
- Mobile: < 768px (single column, bottom nav)
- Tablet: 768px - 1024px (two column layouts)
- Desktop: > 1024px (full features)

**Key mobile optimizations:**
- Large numeric input for expense amounts
- Pull-to-refresh on lists
- Swipe actions for delete/edit
- Collapsible "More details" sections
- Quick add buttons for common actions

## Form Validation

Use Zod schemas for all forms with client-side validation:
- Prevent negative amounts in expenses
- Enforce at least one adult per family in setup
- Required field enforcement with helpful error messages
- Validate distribution totals match expense amount

## Performance Considerations

- Lazy load dashboard charts (use code splitting)
- Virtual scrolling for long expense lists (react-window or similar)
- Debounce search inputs (300ms recommended)
- Optimistic UI updates for shopping list (update local state immediately, sync with Supabase)
- Service worker for offline viewing (progressive enhancement)

## State Management & Sync Patterns

**Optimistic Updates:**
All contexts implement optimistic updates for instant UX feedback:
- **ExpenseContext**: Immediate state updates for create/update/delete operations
- **SettlementContext**: Immediate state updates for create/update/delete operations
- **ParticipantContext**: Immediate state updates for all CRUD operations on participants and families
- **MealContext**: Immediate state updates for create/update/delete operations
- **TripContext**: Immediate state updates for all CRUD operations
- **ShoppingContext**: Optimistic updates combined with real-time subscriptions for best experience

**Real-time Subscriptions:**
- ShoppingContext uses Supabase real-time subscriptions (INSERT/UPDATE/DELETE events)
- Prevents duplicate items from real-time events with existence checks
- Other contexts use optimistic updates without real-time (sufficient for their single-user-focused use cases)
- Real-time is ideal for collaborative features like shared shopping lists

**Refresh Patterns:**
- MealCard calls `refreshMeals()` after adding ingredients to ensure parent page updates ingredient counts
- ShoppingContext has rollback logic for toggle operations if database updates fail
- No manual page refreshes needed for normal CRUD operations - React state handles re-renders
- Cross-context dependencies (e.g., meal-shopping links) trigger appropriate refresh calls

## Component Patterns

**shadcn/ui usage:** Use shadcn/ui components for consistency (buttons, dialogs, forms, toasts)

**Color system:**
- Green: Positive balances (owed money)
- Red: Negative balances (owes money)
- Blue: Neutral/actions

**Required UI states:**
- Loading states with skeletons
- Empty states with helpful messaging
- Toast notifications for user actions
- Error boundaries for graceful failure

## Meal Planner Specifics

**Calendar Grid Structure:**
- Display trip duration as calendar with three rows per day (breakfast/lunch/dinner)
- Mobile: Scrollable vertical list (one day at a time)
- Desktop: Week view or full trip grid
- Icons for meal types: 🍳 breakfast, 🍽️ lunch, 🍕 dinner

**Meal-Shopping Workflow:**
1. Add meal to calendar slot
2. Assign responsible person
3. Add ingredients → Creates shopping items tagged to meal
4. Shopping list shows items grouped by meal
5. Check off items when shopping
6. Meal card shows ingredient completion status (e.g., "3/5 ingredients ready")

**Shopping List View Modes:**
- All items
- By meal (grouped by meal tags)
- By category (produce, dairy, etc.)
- General items only (not linked to meals)

## Deployment

**Cloudflare Pages build settings:**
- Build command: `npm run build`
- Output directory: `dist`

**Required environment variables:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_UNSPLASH_ACCESS_KEY` - Unsplash API access key (for meal images)

**Supabase setup:**
- Run migrations to create schema
- Configure Row Level Security (RLS) policies
- Enable real-time for shopping_items table

## Development Phase Priority

**Phase 1 (Core Setup):**
1. Project initialization with Vite + React + TypeScript
2. Supabase schema and migrations
3. Basic trip management
4. Trip setup flow with tracking mode selection

**Phase 2 (Expenses):**
5. Mobile-optimized expense entry
6. Expense list with filters
7. Balance tracking and smart payer suggestion
8. Settlement payments

**Phase 3 (Meal Planning):**
9. Calendar view with meal slots
10. Meal CRUD operations
11. Meal-shopping bidirectional linking

**Phase 4 (Shopping & Analytics):**
12. Real-time shopping list with meal tags
13. Dashboard with charts (Recharts)
14. Settlement summary with optimal algorithm

**Phase 5 (Polish):**
15. Export (PDF with jsPDF, Excel with SheetJS)
16. Performance optimization
17. Offline support
18. Accessibility improvements

Focus on completing phases sequentially rather than building all features simultaneously.
