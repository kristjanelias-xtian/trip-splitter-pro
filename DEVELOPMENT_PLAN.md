# Development Plan - Trip Splitter Pro

This document outlines the phased execution plan for building the Family Trip Cost Splitter application, optimized for context management and incremental delivery.

---

## Phase 1: Foundation & Infrastructure (Project Scaffolding)

**Goal:** Set up development environment and core infrastructure

**Tasks:**
- Initialize Vite + React + TypeScript project
- Configure Tailwind CSS and shadcn/ui components
- Set up Git repository with .gitignore
- Create Supabase project and configure connection
- Design and implement database schema (all tables + migrations)
- Set up Supabase RLS policies
- Configure Cloudflare Pages deployment
- Create basic routing structure and navigation shell
- Implement state management setup (Context API/Zustand)

**Deliverable:** Working dev environment with database ready

**Success Criteria:**
- `npm run dev` starts development server
- Database schema deployed to Supabase
- Basic app shell with routing loads in browser

---

## Phase 2: Trip Management Core

**Goal:** Basic trip CRUD operations

**Tasks:**
- Trip creation form (name + date)
- Trip listing/dashboard view
- Trip selector in header (dropdown)
- Trip switching logic
- Archive/delete trip functionality
- Trip context provider

**Deliverable:** Users can create and switch between trips

**Success Criteria:**
- Can create new trip with name and date
- Can view list of all trips
- Can switch between trips
- Can delete a trip

---

## Phase 3: Trip Setup Flow (Participants/Families)

**Goal:** Onboarding interface for configuring participants

**Tasks:**
- Step 1: Trip name and date entry
- Step 2: Tracking mode selection (individuals vs families radio buttons)
- Step 3a: Add individual participants (dynamic form)
- Step 3b: Add families with adults/children validation
- Edit setup later functionality
- Participant/family context provider
- Validation: at least one adult per family

**Deliverable:** Complete trip setup with flexible tracking modes

**Success Criteria:**
- Can select between "Individuals only" or "Individuals + Families" mode
- Can add participants in individuals mode
- Can add families with adults/children in families mode
- Cannot proceed without at least one adult per family
- Can return to edit setup later

---

## Phase 4: Expense Entry & Management

**Goal:** Core expense tracking functionality

**Tasks:**
- Mobile-optimized expense entry form with large touch targets
- Expense fields: name, amount, who paid, split between
- Smart split selection based on tracking mode (individuals/families/mixed)
- Collapsible "More details" (date, category, comment)
- Expense list view with filtering (category, date, payer)
- Search functionality
- Edit/delete expense with confirmation
- Expense context provider
- Form validation with Zod schemas

**Deliverable:** Users can add, view, edit, and delete expenses

**Success Criteria:**
- Can add expense with name, amount, payer, and split
- Form adapts based on tracking mode
- Can view list of all expenses
- Can filter expenses by category, date, payer
- Can search expenses
- Can edit and delete expenses
- Form validates properly (no negative amounts, required fields)

---

## Phase 5: Balance Calculation & Smart Payer

**Goal:** Real-time balance tracking and suggestions

**Tasks:**
- Implement balance calculation algorithm (share vs paid)
- Display running balances for each participant/family
- Visual indicators (green for owed, red for owes)
- Smart payer suggestion algorithm
- Display suggested payer prominently in expense form
- Settlement payment recording (special expense type)
- Balance tracking hooks and utilities

**Deliverable:** Accurate balance tracking with smart payer suggestions

**Success Criteria:**
- Balance calculations are accurate to 2 decimal places
- Each participant/family shows correct: total share, amount paid, current balance
- Visual indicators correctly show who owes vs is owed
- Smart payer suggestion shows person who's furthest behind
- Can record settlement payments between participants
- Balances update in real-time as expenses are added

---

## Phase 6: Meal Planner Calendar

**Goal:** Meal planning interface

**Tasks:**
- Calendar grid view (trip duration with breakfast/lunch/dinner rows)
- Mobile: scrollable vertical list
- Desktop: week view or full grid
- Click meal slot to add/edit
- Meal form: name, responsible person, status, notes
- Meal icons (🍳🍽️🍕)
- Copy meal to another slot
- Meal context provider
- Empty states for unplanned meals

**Deliverable:** Users can plan meals across trip duration

**Success Criteria:**
- Calendar displays correct number of days based on trip duration
- Three meal slots per day (breakfast, lunch, dinner)
- Can click any slot to add/edit meal
- Can assign responsible person to each meal
- Can mark meal status (Planned/In Progress/Done)
- Mobile view is scrollable and touch-friendly
- Desktop view shows week or full trip at a glance

---

## Phase 7: Shopping List (Basic + Real-time)

**Goal:** Real-time collaborative shopping list

**Tasks:**
- Simple list interface with quick add input
- Checkbox + description + delete per item
- Real-time sync with Supabase subscriptions
- Automatic sorting (unchecked top, checked bottom)
- Optimistic UI updates
- Uncheck functionality
- Shopping list context provider

**Deliverable:** Real-time shopping list that syncs across devices

**Success Criteria:**
- Can add items with quick input (submit on enter)
- Items appear instantly (optimistic UI)
- Checking/unchecking items updates immediately
- Items auto-sort (unchecked first, checked last)
- Changes sync in real-time across multiple browser tabs/devices
- Updates feel instant (< 100ms perceived latency)

---

## Phase 8: Meal-Shopping Integration

**Goal:** Link meals and shopping items

**Tasks:**
- Add ingredients from meal form → creates shopping items
- Tag shopping items with meal references
- Bidirectional linking (meal_shopping_items junction table)
- Shopping list view modes: all/by meal/by category/general only
- Display meal tags on shopping items (e.g., "🌮 Tacos - Dinner Day 2")
- Filter shopping list by meal or day
- Ingredient aggregation for duplicate items
- Meal card shows ingredient completion status (X/Y ingredients ready)

**Deliverable:** Seamless integration between meal planning and shopping

**Success Criteria:**
- Can add ingredients while creating/editing a meal
- Ingredients automatically appear in shopping list with meal tag
- Shopping list can be filtered by meal, category, or show general items
- Duplicate ingredients across meals are aggregated
- Meal cards show how many ingredients are purchased
- Can tap meal tag on shopping item to view meal details

---

## Phase 9: Dashboard Analytics

**Goal:** Visual analytics and insights

**Tasks:**
- Total trip cost display (prominent)
- Cost breakdown per family/individual (bar chart with Recharts)
- Top 5 biggest expenses list
- Expense breakdown by category (pie chart)
- Running balance summary (sorted)
- Lazy loading for chart components
- Dashboard layout (mobile vs desktop)

**Deliverable:** Visual dashboard with trip analytics

**Success Criteria:**
- Dashboard shows total trip cost prominently
- Bar chart displays cost per participant/family
- Pie chart shows expense breakdown by category
- Top 5 expenses list is accurate
- Balance summary sorted from most owed to most owing
- Charts load quickly with lazy loading
- Layout adapts well to mobile and desktop

---

## Phase 10: Settlement Summary

**Goal:** Optimal debt settlement calculator

**Tasks:**
- Final balances view
- Implement optimal settlement algorithm (minimize transactions)
- Display settlement actions: "Person A pays Person B: €X"
- Mark settlements as completed
- Settlement summary UI

**Deliverable:** Clear settlement instructions minimizing transactions

**Success Criteria:**
- Settlement algorithm minimizes number of transactions
- Clear display of who owes whom and how much
- Can mark settlements as completed
- Balances update when settlements are marked complete
- Algorithm handles complex debt webs correctly

---

## Phase 11: Export & Sharing

**Goal:** Data export capabilities

**Tasks:**
- PDF export with jsPDF (trip summary)
- Excel export with SheetJS (expense details)
- Shareable summary view (public link option)
- Export formatting and styling

**Deliverable:** Users can export trip data in multiple formats

**Success Criteria:**
- Can generate and download PDF trip summary
- Can export expense details to Excel
- PDF formatting is clean and readable
- Excel export includes all relevant expense data
- Shareable link generates correctly (if implemented)

---

## Phase 12: Polish & Performance

**Goal:** Optimize and refine user experience

**Tasks:**
- Virtual scrolling for long lists
- Debounce search inputs
- Loading states and skeletons throughout
- Toast notifications for all actions
- Empty states with helpful messaging
- Error boundaries
- Responsive testing across breakpoints
- Accessibility improvements (keyboard nav, screen readers)
- Service worker for offline viewing (progressive enhancement)
- Performance audit and optimization
- Final UI/UX polish

**Deliverable:** Production-ready, performant, accessible application

**Success Criteria:**
- App loads in < 2 seconds on 3G
- All lists with > 50 items use virtual scrolling
- Search inputs debounced at 300ms
- All actions show appropriate loading states
- Toast notifications appear for all user actions
- Empty states guide users to next action
- Works with keyboard navigation
- Screen reader friendly
- Passes accessibility audit
- Service worker enables offline viewing
- All responsive breakpoints tested

---

## Context Management Strategy

**Small, focused phases** - Each phase targets 1-2 related features to minimize context switching and keep implementation focused.

**Clear deliverables** - Each phase has concrete, testable outcomes that provide value.

**Incremental value** - Users get working features after each phase, allowing for early testing and feedback.

**Dependency order** - Later phases build on earlier foundations (e.g., meal-shopping integration requires both meal planner and shopping list to be complete first).

**Testing points** - Test thoroughly at the end of each phase before moving to the next to catch issues early.

**Modular implementation** - Each phase should be self-contained enough that future Claude instances can pick up from any phase with minimal context loading.

---

## Current Status

- [x] Phase 0: Documentation and planning
- [x] Phase 1: Foundation & Infrastructure ✅ COMPLETED
  - Project scaffolding with Vite + React + TypeScript
  - Tailwind CSS configuration
  - Database schema deployed to Supabase
  - Navigation shell (mobile bottom nav, desktop sidebar)
  - Deployed to Cloudflare Pages
- [ ] Phase 2: Trip Management Core (NEXT)
- [ ] Phase 3: Trip Setup Flow
- [ ] Phase 4: Expense Entry & Management
- [ ] Phase 5: Balance Calculation & Smart Payer
- [ ] Phase 6: Meal Planner Calendar
- [ ] Phase 7: Shopping List
- [ ] Phase 8: Meal-Shopping Integration
- [ ] Phase 9: Dashboard Analytics
- [ ] Phase 10: Settlement Summary
- [ ] Phase 11: Export & Sharing
- [ ] Phase 12: Polish & Performance

---

## Notes for Future Development

- Update the checklist above as phases are completed
- Document any deviations from the plan in this section
- Note any technical decisions or architecture changes
- Track any blockers or issues that arise
