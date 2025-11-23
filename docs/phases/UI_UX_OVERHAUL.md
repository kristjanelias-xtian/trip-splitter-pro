# UI/UX Overhaul - Trip Splitter Pro

**Started:** November 23, 2025
**Design System:** Warm & Earthy (Option A from STYLE_PROMPT.md)
**Status:** Phase 1 Complete ✅

---

## Design Decisions

### Color Palette Choice
**Selected: Option A - Warm & Earthy**
- Primary: Coral #E76F51
- Secondary: Sage Green #6A994E
- Accent: Gold #F4A261
- Success: Soft Green #90BE6D
- Warning: Warm Orange #F77F00 (not aggressive red)
- Background: Warm Cream #FAF8F5
- Foreground: Deep Charcoal #2D3142

**Rationale:** Best for family trip vibes - warm, inviting, friendly

### Technology Stack Choices
- **Component Library:** shadcn/ui (chose this over building from scratch)
- **Animations:** Framer Motion (chose this over react-spring or CSS-only)
- **Icons:** Lucide React (replacing emojis throughout)
- **Typography:** Inter font family from Google Fonts

### Key Design Principles
1. **Rounded corners:** 16px default (friendly, modern, not sharp)
2. **Soft shadows:** No hard borders, use elevation instead
3. **Generous spacing:** 4px, 8px, 16px, 24px, 32px, 48px scale
4. **Large touch targets:** Minimum 44-48px for mobile
5. **Warm dark mode:** #1A1A2E (not pure black)
6. **Tabular numbers:** For all amounts and balances
7. **Accessibility:** Prefers-reduced-motion support, WCAG AA contrast

---

## Phase 1: Foundation & Design System Setup ✅

**Completed:** November 23, 2025
**Commit:** `22a4a32` - Phase 1 Complete: Foundation & Design System Setup

### What Was Built

#### 1. Dependencies Installed
```json
{
  "framer-motion": "^11.x",
  "lucide-react": "^0.x",
  "clsx": "^2.x",
  "tailwind-merge": "^2.x",
  "class-variance-authority": "^0.x",
  "tailwindcss-animate": "^1.x"
}
```

#### 2. Files Created

**components.json** - shadcn/ui configuration
```json
{
  "style": "new-york",
  "tailwind": {
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

**src/lib/utils.ts** - Class name utility
- Exports `cn()` function for merging Tailwind classes
- Uses clsx + tailwind-merge

**src/lib/animations.ts** - Framer Motion presets
- All animation variants for the design system
- Button interactions (hover, tap)
- Card hover effects
- List stagger animations
- Modal/dialog animations
- Shopping checkbox bounce
- Success celebrations
- Page transitions
- Prefers-reduced-motion support

#### 3. Configuration Updates

**tailwind.config.js**
- Complete Warm & Earthy color system (coral, sage, gold with 50-900 shades)
- Kept existing semantic colors (positive, negative) but updated values
- Added shadcn/ui semantic tokens (primary, secondary, destructive, etc.)
- Custom border radius scale (--radius: 16px)
- Inter font family
- Custom shadows: soft, soft-md, soft-lg
- Animation keyframes (accordion, fade-in, slide-in)
- Container max-width: 1400px

**src/index.css**
- Google Fonts import for Inter (400, 500, 600, 700)
- CSS custom properties for all colors (light + dark mode)
- Design tokens:
  - Spacing: --spacing-xs to --spacing-2xl
  - Shadows: --shadow-soft, --shadow-soft-md, --shadow-soft-lg
  - Animation: --duration-fast/normal/slow, --ease-out, --ease-in-out
- Dark mode with warm gray background (#1A1A2E)
- Tabular numbers utility class
- Prefers-reduced-motion media query
- Custom utility classes (soft-shadow, hover-lift, transition-smooth)

#### 4. Directory Structure
```
src/
├── components/
│   └── ui/              # NEW - shadcn/ui components (empty, ready for Phase 2)
├── lib/
│   ├── animations.ts    # NEW - Framer Motion presets
│   ├── utils.ts         # NEW - cn() utility
│   └── supabase.ts      # Existing
components.json          # NEW - shadcn/ui config
```

### Build Status
- ✅ TypeScript: No errors
- ✅ Build: 449KB JS, 23KB CSS
- ✅ All tests passing

### Key Implementation Notes

**Color System:**
- All colors use HSL format in CSS variables for shadcn/ui compatibility
- Brand colors (coral, sage, gold) available as Tailwind utilities
- Semantic colors map to shadcn tokens:
  - `primary` → Coral (main actions)
  - `secondary` → Sage (secondary actions)
  - `accent` → Gold (highlights)
  - `destructive` → Warm Orange (not red!)

**Animation System:**
- All animations respect prefers-reduced-motion
- Standard durations: 150ms (fast), 250ms (normal), 350ms (slow)
- Easing: Custom bezier curves for smooth, natural motion
- Spring animations for playful interactions

**Typography:**
- Base size: 16px (comfortable reading)
- Font weights: 400 (body), 500 (emphasis), 600-700 (headings)
- Tabular figures enabled for numbers
- Line height: 1.5 (readable)

---

## Phase 2: Core shadcn/ui Components Setup

**Status:** Ready to start
**Goal:** Install and customize essential shadcn/ui components

### Components to Install

Base components:
```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add checkbox
npx shadcn@latest add badge
npx shadcn@latest add textarea
npx shadcn@latest add separator
npx shadcn@latest add tabs
```

### Customizations Needed

**Button variants:**
- Add "soft" variant (subtle background, not solid)
- Ensure 16px border radius
- Add hover lift effect (Framer Motion)

**Card:**
- Default to soft shadows
- 16px corners
- Hover effect for interactive cards

**Input:**
- Large size variant (48px height for mobile)
- Coral focus ring
- Icons inside inputs

**Badge:**
- Pill shape for meal tags
- Color variants for categories

### Tasks
1. Install all base components
2. Customize default styles in each component file
3. Add Framer Motion wrappers where needed
4. Create animation variants file
5. Test each component in isolation

**Estimated:** 1 session

---

## Phase 3: Layout & Navigation Refresh

**Status:** Pending
**Goal:** Redesign app shell, header, and navigation

### Current State Analysis

**Existing Layout (Layout.tsx):**
- Desktop: Fixed sidebar (w-64) on left
- Mobile: Bottom navigation bar (h-16)
- Uses emojis for icons (🏠 💰 🍽️ etc.)
- Hard-coded nav items
- No animations

### Planned Changes

**Navigation:**
- Replace emojis with Lucide icons
- Add sliding pill background for active state (Framer Motion)
- Generous spacing (24px gaps)
- Hover effects on nav items
- Desktop: Icon + text, smooth transitions
- Mobile: Large icons with labels

**Header/Trip Selector:**
- Use shadcn/ui DropdownMenu
- Trip "thumbnail" colors (hash-based from name)
- Recent trips as preview cards
- Soft shadow on dropdown

**Background:**
- Main: Warm cream (#FAF8F5)
- Dark mode: Warm dark gray (#1A1A2E)
- Cards: White with soft shadow

**Files to Update:**
- src/components/Layout.tsx
- Create: src/components/NavItem.tsx
- Create: src/components/TripSelector.tsx

**Icon Mapping:**
```typescript
Trips → Home
Setup → Users
Expenses → DollarSign
Settlements → CreditCard
Meals → UtensilsCrossed
Shopping → ShoppingCart
Dashboard → BarChart3
Settings → Settings2
```

**Estimated:** 1 session

---

## Phase 4: Form Components Overhaul

**Status:** Pending
**Goal:** Rebuild all forms with shadcn/ui components

### Forms to Update

1. **TripForm.tsx** - Trip creation/editing
2. **ExpenseForm.tsx** - Large, complex form
3. **MealForm.tsx** - Meal planning
4. **ShoppingItemForm.tsx** - Quick add
5. **SettlementForm.tsx** - Payment recording
6. **setup/FamiliesSetup.tsx** - Family configuration
7. **setup/IndividualsSetup.tsx** - Participant setup

### Reusable Components to Create

**FormField.tsx**
- Wrapper: label + input + error message
- Consistent spacing
- Error state styling

**CurrencyInput.tsx**
- Large, friendly amount input
- Currency symbol prefix
- Tabular numbers
- Text-2xl on mobile

**ParticipantSelect.tsx**
- Searchable dropdown
- Avatar/initials display
- Family badge in families mode

### Pattern to Follow

```tsx
// Before: Hard-coded inputs
<input type="text" className="w-full px-3 py-2..." />

// After: shadcn/ui components
<div className="space-y-2">
  <Label htmlFor="name">Trip Name</Label>
  <Input id="name" placeholder="e.g., Summer Vacation" />
</div>
```

**Key Features:**
- All forms use shadcn/ui Input, Label, Select
- 20-24px padding on forms
- 16px rounded corners
- Coral focus ring
- Floating labels or clear placeholders
- Inline validation with friendly messages
- Framer Motion submit feedback
- Smart payer box: Soft sage background

**Estimated:** 1-2 sessions

---

## Phase 5: Card Components Redesign

**Status:** Pending
**Goal:** Update all display cards with soft shadows, rounded corners, hover effects

### Cards to Update

1. **TripCard.tsx** - Trip display with edit/delete
2. **ExpenseCard.tsx** - Expense with category
3. **BalanceCard.tsx** - Balance display
4. **MealCard.tsx** - Meal with ingredients
5. **ShoppingItemCard.tsx** - Shopping item checkbox

### Design Patterns

**TripCard:**
- shadcn/ui Card base
- Soft shadow, 16px corners
- Hover: Shadow increase + lift (Framer Motion)
- Selected: Coral border + light background
- Replace emoji buttons with Lucide icons (Pencil, Trash2)

**ExpenseCard:**
- Left colored border for category (not full card)
- Amount: text-xl, semibold, tabular-nums
- Avatar/initials for "who paid"
- Split indicator with icons
- Swipe reveal actions (Framer Motion drag)

**BalanceCard:**
- Large number with subtle glow
- Positive: Soft green glow (#90BE6D background)
- Negative: Warm orange (#F77F00)
- Avatar with balance
- Progress bar or visual indicator

**MealCard:**
- Dashed border when empty (inviting)
- Meal type icon with color tint:
  - Breakfast: Sun icon, yellow tint
  - Lunch: CloudSun icon, orange tint
  - Dinner: Moon icon, purple tint
- Ingredient progress: shadcn/ui Progress
- Responsible person: small Badge

**ShoppingItemCard:**
- Custom checkbox with bounce animation
- Strikethrough animation on complete
- Meal tags: colored Pills (shadcn Badge)
- Completed: Slight blur/fade
- Smooth reorder (Framer Motion layout)

### New Component Needed

**Avatar.tsx**
- Initials-based with color hash
- Fallback to User icon
- Sizes: xs, sm, md, lg (24, 32, 40, 48px)
- Circular, soft shadow

**Estimated:** 1-2 sessions

---

## Phase 6: Page-Specific Redesigns

**Status:** Pending
**Goal:** Update each major page with new design system

### Pages to Update (in order)

1. **TripsPage.tsx** - Trip list
2. **DashboardPage.tsx** - Overview
3. **ExpensesPage.tsx** - Expense list
4. **SettlementsPage.tsx** - Settlements
5. **MealsPage.tsx** - Calendar grid
6. **ShoppingPage.tsx** - Shopping list

### Design Patterns per Page

**TripsPage:**
- Hero: "Your Trips" heading
- Empty state: Suitcase illustration + encouraging copy
- Trip grid: 16-24px gaps
- "Create Trip" button: Large, coral, prominent

**DashboardPage:**
- Welcome: "Trip name" at top with greeting
- Hero numbers: Total cost (large, prominent)
- Stats: 4-col grid (desktop), 1-col (mobile)
- Settlement plan: Numbered steps with visual checkmarks
- Confetti animation when all settled

**ExpensesPage:**
- Filter bar: shadcn Select dropdowns
- Search: Input with MagnifyingGlass icon
- List: Stagger animation on load
- FAB: "Add Expense" coral button, hover lift
- Empty: Wallet illustration

**SettlementsPage:**
- Stats cards: 3-col grid at top
- Optimal plan: Large, clear numbered list
- "Record" buttons: Success animation on click
- History: Timeline-style display

**MealsPage:**
- Calendar grid: Each day = soft card
- Empty slots: Dashed border + inviting Plus icon
- Filled: Colorful cards with meal icon
- Mobile: Vertical scrollable list
- Desktop: Week/full trip grid

**ShoppingPage:**
- View switcher: Pill tabs (shadcn Tabs)
- Quick add: Large input at top
- Category groups: Collapsible sections
- Checkbox: Satisfying bounce animation

**Estimated:** 2-3 sessions

---

## Phase 7: Icons & Visual Elements

**Status:** Pending
**Goal:** Replace emojis with Lucide icons, add visual touches

### Icon Mapping (Complete List)

**Navigation:**
- 🏠 Trips → `<Home />`
- 👥 Setup → `<Users />`
- 💰 Expenses → `<DollarSign />`
- 💸 Settlements → `<CreditCard />`
- 🍽️ Meals → `<UtensilsCrossed />`
- 🛒 Shopping → `<ShoppingCart />`
- 📊 Dashboard → `<BarChart3 />`
- ⚙️ Settings → `<Settings2 />`

**Actions:**
- ✏️ Edit → `<Pencil />`
- 🗑️ Delete → `<Trash2 />`
- ➕ Add → `<Plus />`
- ✓ Check → `<Check />`
- ✗ Close → `<X />`
- ↓ Dropdown → `<ChevronDown />`

**Meal Types:**
- 🍳 Breakfast → `<Sun />` (yellow tint)
- 🍽️ Lunch → `<CloudSun />` (orange tint)
- 🍕 Dinner → `<Moon />` (purple tint)

**Status:**
- 📥 Owed → `<TrendingUp />` (green)
- 📤 Owes → `<TrendingDown />` (orange)
- ✅ Settled → `<CheckCircle />` (sage)

### Empty State Illustrations

Create or source simple SVG illustrations:
- No trips: Suitcase
- No expenses: Wallet
- No meals: Plate/fork
- No shopping items: Cart
- Encouraging copy for each

### Loading States

- Custom spinner: Coral + sage rotating
- Skeleton screens: Subtle gradient animation
- Implement in all data-fetching components

**Estimated:** 1 session

---

## Phase 8: Micro-interactions & Animations

**Status:** Pending
**Goal:** Add delightful Framer Motion animations

### Animation Categories

**Button Interactions:**
- Hover: Lift + shadow (translateY(-2px))
- Press: Scale down (0.98)
- Loading: Spinner
- Success: Brief scale + color flash

**Shopping List:**
- Checkbox: Bounce on check (spring)
- Strikethrough: Width animation
- Reorder: Layout animation
- Complete all: Celebration

**Expense/Settlement:**
- Add: Slide in from bottom (mobile)
- Delete: Fade out + collapse
- Record: Success checkmark animation
- Balance update: Count-up numbers

**Page Transitions:**
- Enter: Fade + slide (200ms)
- Modal: Scale + fade from center (300ms)
- Drawer: Slide up from bottom

**Lists:**
- Stagger children (50ms delay each)
- Hover lift on interactive items
- Remove: Collapse height

**Numbers:**
- Balance changes: Count-up
- Dashboard stats: Odometer effect
- Use react-countup or custom Framer Motion

### Files to Update
- All component files (add Framer Motion wrappers)
- Use presets from src/lib/animations.ts
- Create NumberCounter.tsx component

**Estimated:** 1-2 sessions

---

## Phase 9: Dark Mode Enhancement

**Status:** Pending (foundation already in place)
**Goal:** Test and refine warm dark mode

### Current Dark Mode Setup
- Background: #1A1A2E (warm dark gray)
- Cards: Slightly lighter warm gray
- All colors adjusted for dark mode in CSS variables

### Tasks
1. Test each component in dark mode
2. Ensure WCAG AA contrast ratios
3. Adjust shadows (reduce intensity, use borders)
4. Charts remain readable (Recharts colors)
5. Form inputs clearly visible
6. Add theme toggle (shadcn ThemeProvider)
7. Persist preference in localStorage
8. Animate transition between modes

**Files to Create:**
- src/components/ThemeToggle.tsx

**Estimated:** 1 session

---

## Phase 10: Polish & Accessibility

**Status:** Pending
**Goal:** Final touches, accessibility, performance

### Accessibility Audit
- [ ] All interactive elements keyboard accessible
- [ ] Custom focus visible states (coral ring)
- [ ] ARIA labels on icon-only buttons
- [ ] Screen reader testing
- [ ] Prefers-reduced-motion respected (already implemented)
- [ ] Color contrast WCAG AA minimum

### Performance
- [ ] Code split Framer Motion animations
- [ ] Lazy load charts (Recharts)
- [ ] Optimize animation performance (use transforms)
- [ ] Keep animations under 400ms
- [ ] Test on slower devices

### Cross-browser Testing
- [ ] Chrome
- [ ] Safari (desktop + mobile)
- [ ] Firefox
- [ ] Touch interactions smooth on mobile

### Final Polish
- [ ] Consistent spacing throughout
- [ ] All hover states working
- [ ] Loading states everywhere
- [ ] Error states friendly
- [ ] Success feedback on all actions

**Estimated:** 1-2 sessions

---

## Progress Tracking

### Completed Phases
- [x] Phase 1: Foundation & Design System Setup (Nov 23, 2025)

### Current Phase
- [ ] Phase 2: Core shadcn/ui Components Setup

### Remaining Phases
- [ ] Phase 3: Layout & Navigation Refresh
- [ ] Phase 4: Form Components Overhaul
- [ ] Phase 5: Card Components Redesign
- [ ] Phase 6: Page-Specific Redesigns
- [ ] Phase 7: Icons & Visual Elements
- [ ] Phase 8: Micro-interactions & Animations
- [ ] Phase 9: Dark Mode Enhancement
- [ ] Phase 10: Polish & Accessibility

---

## Important Files Reference

**Design System:**
- `tailwind.config.js` - Color system, spacing, shadows, animations
- `src/index.css` - CSS variables, design tokens, utilities
- `src/lib/animations.ts` - Framer Motion presets

**Configuration:**
- `components.json` - shadcn/ui setup
- `src/lib/utils.ts` - Class name utility
- `STYLE_PROMPT.md` - Original design requirements

**Documentation:**
- This file - UI/UX overhaul tracking
- `docs/phases/PHASE_6_COMPLETE.md` - Feature development status
- `STATUS.md` - Overall project status

---

## Context Preservation Notes

**For Future Sessions:**

1. **Color Palette is DECIDED:** Warm & Earthy (coral, sage, gold) - don't ask again
2. **Component Library is DECIDED:** shadcn/ui - don't ask again
3. **Animation Library is DECIDED:** Framer Motion - don't ask again
4. **Phase 1 is COMPLETE:** All foundation work done, don't redo
5. **Build is WORKING:** 449KB, TypeScript clean, don't break it

**Key Implementation Patterns:**
- All colors via CSS variables (HSL format)
- All animations respect prefers-reduced-motion
- All components use cn() utility
- All forms use shadcn/ui components
- All numbers use tabular-nums class
- All shadows use soft/soft-md/soft-lg
- All corners use 16px radius
- All spacing uses 4/8/16/24/32/48 scale

**Don't Change:**
- The color values
- The font (Inter)
- The border radius (16px)
- The shadow system
- The animation durations
- The spacing scale

**Can Customize:**
- Component-specific variants
- Animation timing for specific interactions
- Exact HSL values in dark mode (if contrast issues)
- Icon choices (as long as Lucide)

---

## Success Criteria (from STYLE_PROMPT.md)

The app should feel:
- ✅ Warm and inviting (like planning a trip with friends)
- ✅ Easy and delightful to use
- ✅ Modern but not trendy (won't look dated in 6 months)
- ✅ Unique (someone should recognize "oh that's the trip app")
- ✅ Professional enough for any age group
- ✅ Fun without being gimmicky

---

**Last Updated:** November 23, 2025
**Next Session:** Phase 2 - shadcn/ui component installation
