# Family Trip Cost Splitter - Full Stack Web Application

Create a modern, mobile-first web application for splitting costs among groups on trips, with real-time collaboration features. This will be deployed on Cloudflare Pages with Supabase as the backend.

## Project Setup & Infrastructure

1. **Initialize Git Repository:**
   - Create a new Git repository with proper .gitignore
   - Set up conventional commit structure
   - Initialize with README.md documenting setup and deployment

2. **Tech Stack:**
   - **Frontend:** React 18+ with TypeScript
   - **Styling:** Tailwind CSS (mobile-first approach)
   - **State Management:** React Context API or Zustand
   - **Database:** Supabase (PostgreSQL)
   - **Authentication:** Supabase Auth (for future multi-user features)
   - **Deployment:** Cloudflare Pages
   - **Build Tool:** Vite

3. **Supabase Configuration:**
   - Set up Supabase project and provide connection instructions
   - Create database schema with migrations for:
     - trips (id, name, date, tracking_mode, created_at)
     - families (id, trip_id, family_name, adults, children)
     - participants (id, trip_id, family_id, name, is_adult)
     - expenses (id, trip_id, name, amount, paid_by, date, category, comment, distribution)
     - settlements (id, trip_id, from_participant, to_participant, amount, date)
     - meals (id, trip_id, date, meal_type, name, description, responsible_participant_id, status, notes, created_at)
     - shopping_items (id, trip_id, description, is_completed, category, quantity, created_at)
     - meal_shopping_items (id, meal_id, shopping_item_id, quantity)
   - Set up Row Level Security (RLS) policies
   - Enable real-time subscriptions for shopping list

4. **Cloudflare Pages Setup:**
   - Configure build settings (build command, output directory)
   - Set up environment variables for Supabase credentials
   - Create deployment instructions in README

## Core Application Features

### 1. Trip Management
- Dashboard showing all trips (current and historical)
- Dropdown/selector to switch between trips
- Create new trip with name and date
- Archive/delete old trips

### 2. Initial Trip Setup Flow
**Separate onboarding interface:**
- Step 1: Trip name and date
- Step 2: Choose tracking mode radio buttons:
  - "Individuals only"
  - "Individuals + Families"
- Step 3a (Individuals only): Add participants by name (dynamic form)
- Step 3b (Families mode):
  - Add families with: family name, 2 adult fields, optional children fields
  - Validate at least one adult per family
  - Mark which individuals are adults vs children
- Ability to return to edit setup later

### 3. Mobile-Optimized Expense Entry
**Primary mobile interface:**
- Large "Add Expense" button as landing action
- Quick entry form:
  - Expense name (text input)
  - Amount (large numeric input with € symbol)
  - Who paid (dropdown of adults)
  - Split between (smart selection based on mode):
    - Individuals mode: Multi-select checkboxes of participants
    - Families mode: Toggle between families/individuals/mixed, then checkboxes
  - Collapsible "More details" section:
    - Date picker (defaults to today)
    - Category dropdown (Accommodation, Food, Activities, Training, Transport, Other)
    - Comment textarea
- Desktop view: Show all fields in two-column layout

### 4. Expense Management
- List view of all expenses (newest first)
- Filter by category, date range, payer
- Search functionality
- Edit expense (opens same form as add)
- Delete with confirmation dialog
- Expense cards showing: name, amount, payer, split info, date

### 5. Settlement Payments
- Special "Record Payment" feature
- Record transfers: From (person/family) → To (person/family) → Amount
- Treated as special expense type that adjusts balances
- Shows in expense list with distinct styling (e.g., transfer icon)

### 6. Balance Tracking & Smart Features
**Real-time calculations:**
- Each participant's/family's total share of costs
- How much each has paid
- Current balance (positive = owed, negative = owes)
- Visual indicators: green for owed, red for owing

**Smart payer suggestion:**
- Algorithm: Suggest who should pay next based on who has paid least relative to their running share
- Display prominently when adding new expense

### 7. Dashboard Analytics
**Separate dashboard screen:**
- Total trip cost (large, prominent)
- Cost breakdown per family/individual (bar chart)
- Top 5 biggest expenses (list)
- Expense breakdown by category (pie chart)
- Running balance summary (sorted by most owed to most owing)
- Use a charting library (e.g., Recharts)

### 8. Settlement Summary
- Final balances view
- Optimal settlement calculator (minimize transactions)
- Algorithm to determine who owes whom
- Display as clear action items: "Person A pays Person B: €X"
- Mark settlements as completed

### 9. Meal Planner (Calendar View)

**Integrated meal planning for trip duration:**

**Calendar/Grid View:**
- Display trip duration as a calendar grid
- Three rows per day: Breakfast, Lunch, Dinner
- Each day shows the date prominently
- Mobile: Scrollable vertical list (one day at a time)
- Desktop: Week view or full trip grid

**Meal Entry/Management:**
- Click/tap any meal slot to add or edit
- Meal details:
  - Meal name/description (e.g., "Spaghetti Carbonara", "Breakfast buffet")
  - Person/family responsible for cooking/organizing
  - Status: Planned / In Progress / Done
  - Notes field (dietary restrictions, prep instructions)
  - Connected shopping items (multiple items can be linked)
- Leave meals blank if not planned yet
- Copy meal to another slot (quick duplicate)
- Quick templates: Common meals that can be reused

**Shopping List Integration:**
- **Two-way linking between meals and shopping items:**
  - When creating/editing a meal, add ingredients directly to shopping list
  - Tag shopping items with which meal(s) they're for
  - Shopping list items show meal tags (e.g., "Tomatoes 🍅 - Dinner Day 3")
  - Filter shopping list by meal or day
  
- **Smart shopping list features:**
  - Group items by meal or by category (user toggle)
  - Quantities automatically aggregate if same item used in multiple meals
  - Mark items as bought → automatically updates related meals' status
  - "What's needed for today's meals" quick filter

**Meal Planning Workflow:**
1. Navigate to Meal Planner tab
2. See trip duration laid out
3. Tap a meal slot → Quick add or detailed form
4. Assign who's responsible (dropdown of participants)
5. Add ingredients → Creates shopping items automatically tagged to this meal
6. Shopping list now shows items grouped/tagged by meal
7. When shopping, check off items
8. Meal card shows ingredient status (3/5 ingredients bought)

**Visual Indicators:**
- Unplanned meals: Empty/gray state with "Add meal" prompt
- Planned meals: Card with meal name, responsible person, ingredient status
- Color coding by person responsible (consistent with expense tracking colors)
- Progress indicator: How many ingredients are purchased for each meal
- Icons for meal type (🍳 breakfast, 🍽️ lunch, 🍕 dinner)

**Mobile Optimization:**
- Swipe between days
- Quick add button for current day's meals
- Compact view showing just meal name and responsible person
- Tap to expand for full details and shopping list connection
- "Today's meals" widget on home screen

**Desktop Features:**
- Drag-and-drop meals between slots
- Week-at-a-glance view
- Side panel showing shopping list filtered to selected meal
- Bulk operations (plan entire week, duplicate day's meals)

**Notifications/Reminders (optional/future):**
- Who's cooking today
- Shopping needed for tomorrow's meals
- Missing ingredients alert

**Integration with Existing Features:**
- Shopping list now has dual purpose: general items + meal ingredients
- Visual distinction between general items and meal-linked items
- Filter toggle: "All items" / "Meal ingredients" / "General items"
- Person responsible for meals shows in participant activity summary
- Optional: Track meal costs as expenses (link expense to meal)

**Example User Flow:**
1. User opens Meal Planner
2. Sees Day 1, Day 2, Day 3 of trip
3. Taps "Dinner - Day 2" (currently blank)
4. Enters "Tacos" as meal name
5. Selects "John" as responsible person
6. Taps "Add ingredients":
   - Ground beef - 1kg
   - Tortillas - 1 pack
   - Lettuce - 1 head
   - Tomatoes - 4
   - Cheese - 200g
7. These automatically appear in shopping list tagged with "🌮 Tacos - Dinner Day 2"
8. Shopping list groups them together
9. When John goes shopping, checks off items
10. Meal card shows "5/5 ingredients ready" with green checkmark

### 10. Shared Shopping List (Enhanced with Meal Integration)

**Separate section with real-time sync:**
- Simple list interface (mobile-optimized)
- Quick add input at top (submit on enter)
- **View modes:**
  - All items
  - By meal (grouped by which meal they're for)
  - By category (produce, dairy, meat, etc.)
  - General items only (not linked to meals)
  
- Each item shows:
  - Checkbox (left)
  - Item description (center)
  - Meal tag(s) if applicable (e.g., "🍝 Dinner Day 3")
  - Quantity if specified
  - Delete button (right)
  
- **Automatic sorting:**
  - Unchecked items at top (active)
  - Can sub-sort by meal/day or category
  - Checked items at bottom (completed)
  - Animation when items move between sections
  
- **Meal-aware features:**
  - Tap meal tag to see full meal details
  - Filter by specific meal or day
  - "What's needed for today" quick filter
  - Aggregate quantities for duplicate items across meals
  
- Instant updates (no save button)
- Ability to uncheck items (moves back to top)
- Real-time updates using Supabase subscriptions
- Add items directly or via meal planner
- Clean, simple interface optimized for quick updates during shopping

### 11. Data Persistence & Export
- All data persists in Supabase
- Export features:
  - PDF export of trip summary (use jsPDF)
  - Excel export of all expenses (use SheetJS)
  - Shareable summary view (public link)

## UI/UX Requirements

### Mobile-First Design:
- Touch-friendly: minimum 44x44px tap targets
- Bottom navigation bar for primary actions
- Sticky headers for context
- Pull-to-refresh on lists
- Swipe actions for delete/edit

### Navigation Structure:
- Bottom nav (mobile) / Side nav (desktop):
  - 🏠 Trips
  - 💰 Expenses
  - 🍽️ Meals
  - 🛒 Shopping
  - 📊 Dashboard
  - ⚙️ Settings
- Trip selector always accessible in header
- Breadcrumb navigation on desktop

### Visual Design:
- Clean, modern interface using Tailwind
- Use shadcn/ui components for consistency
- Color system:
  - Green for positive balances
  - Red for negative balances
  - Blue for neutral/actions
- Loading states and skeletons
- Empty states with helpful messaging
- Toast notifications for actions

### Responsive Breakpoints:
- Mobile: < 768px (single column, bottom nav)
- Tablet: 768px - 1024px (two column where appropriate)
- Desktop: > 1024px (full features, side nav)

## Technical Implementation Details

### State Management:
- Trip context (current trip, switching)
- Expense context (CRUD operations)
- Meal context (calendar, meal management)
- Shopping list context (real-time updates)
- Balance calculation hooks

### Performance:
- Lazy load dashboard charts
- Virtual scrolling for long expense lists
- Debounce search inputs
- Optimistic UI updates for shopping list
- Service worker for offline capability (progressive enhancement)

### Data Validation:
- Zod schemas for form validation
- Supabase schema validation
- Client-side validation with helpful error messages
- Prevent negative amounts
- Required field enforcement

### Key Algorithms to Implement:
1. **Balance calculation:** Track running totals per participant/family
2. **Smart payer suggestion:** Calculate who's furthest behind relative to their share
3. **Optimal settlement:** Minimize transaction count using greedy algorithm
4. **Expense distribution:** Handle mixed family/individual splitting
5. **Meal-shopping linkage:** Maintain bidirectional relationships between meals and shopping items
6. **Ingredient aggregation:** Combine duplicate items across multiple meals

## Deployment Instructions

1. **Initial Setup:**
   - Create Supabase project and note credentials
   - Run database migrations
   - Configure authentication (if needed)

2. **Cloudflare Pages:**
   - Connect GitHub repository
   - Configure build settings:
     - Build command: `npm run build`
     - Output directory: `dist`
   - Add environment variables:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

3. **Continuous Deployment:**
   - Automatic deploys on push to main branch
   - Preview deployments for pull requests

## Development Workflow

- Create feature branches for new features
- Use conventional commits
- Test on mobile viewport before committing
- Document any Supabase schema changes
- Keep README updated with setup instructions

## Success Criteria

- App loads in < 2 seconds on 3G
- Shopping list updates feel instant (< 100ms)
- All calculations are accurate to 2 decimal places
- Works offline for viewing (progressive enhancement)
- Fully responsive from 320px to 4K displays
- Accessible (keyboard navigation, screen reader friendly)
- Meal planning integrates seamlessly with shopping list
- Real-time updates work reliably across all features

## Development Priority Order

**Phase 1 - Core Setup:**
1. Project initialization, Git setup, Supabase schema
2. Basic trip management (create, list, switch)
3. Initial trip setup flow (participants/families)

**Phase 2 - Expenses:**
4. Expense entry (mobile-optimized)
5. Expense list and management
6. Balance tracking and calculations
7. Settlement payments

**Phase 3 - Meal Planning:**
8. Meal planner calendar view
9. Meal entry and management
10. Meal-shopping integration

**Phase 4 - Shopping & Analytics:**
11. Enhanced shopping list with meal tags
12. Dashboard with charts
13. Settlement summary

**Phase 5 - Polish:**
14. Export functionality
15. Performance optimization
16. Offline support
17. Final UI/UX polish

Please start by setting up the project structure, initializing Git, creating the Supabase schema, and building the basic trip management and expense entry features first. Focus on getting the core functionality working before adding advanced features like charts and export.
