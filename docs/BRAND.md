# Spl1t — Brand & Design System Guide

Comprehensive reference for all visual, tonal, and structural design decisions in the Spl1t codebase.

---

## 1. Logo & Wordmark

### Wordmark

**"Spl1t"** — the digit **1** replaces the letter **i**. The "1" is rendered in coral (`#e8613a`) while the rest is dark charcoal.

### Logo Assets

| File | Size | Purpose |
|------|------|---------|
| `public/logo.png` | 512×512 | PWA icon, email header |
| `public/apple-touch-icon.png` | 180×180 | iOS home screen |
| `public/favicon.png` | 32×32 | Browser tab |
| `public/favicon-16.png` | 16×16 | Small browser tab |
| `public/logo-email.png` | — | Email template header |
| `public/brand/spl1t-logo-transparent.png` | — | Transparent background |
| `public/brand/spl1t-logo-mark-cropped.png` | — | Cropped mark |
| `public/brand/spl1t-logo-source.png` | — | Source file |

### Usage Rules

- The wordmark "Spl1t" uses the digit `1`, not the letter `i`
- In email templates, the "1" is styled with the coral brand color inline
- `localStorage` keys use the `spl1t:` prefix (e.g., `spl1t:user-preferences`, `spl1t:failed-logs`)
- Custom events use the `spl1t:` prefix (e.g., `spl1t:unhandled-error`)
- Functional "split" labels (e.g., "Split equally") are NOT renamed — only the brand name uses `1`

---

## 2. Color Palette

### Brand Colors

| Name | Default | Scale |
|------|---------|-------|
| **Coral** | `#E76F51` | 50: `#FCF1EE` · 100: `#F9E3DD` · 200: `#F4C7BA` · 300: `#EEAB98` · 400: `#E98F75` · **500: `#E76F51`** · 600: `#E2522D` · 700: `#C33D17` · 800: `#923011` · 900: `#61200B` |
| **Sage** | `#6A994E` | 50: `#EFF4EA` · 100: `#DFE9D5` · 200: `#BFD2AB` · 300: `#9FBC81` · 400: `#85AD67` · **500: `#6A994E`** · 600: `#55783E` · 700: `#405A2F` · 800: `#2B3C1F` · 900: `#151E10` |
| **Gold** | `#F4A261` | 50: `#FEF7F0` · 100: `#FDEFE1` · 200: `#FBE7C3` · 300: `#F9CFA6` · 400: `#F7B883` · **500: `#F4A261`** · 600: `#F18633` · 700: `#E76A0B` · 800: `#B05108` · 900: `#793706` |

### Semantic Colors

Two color systems coexist — **Tailwind named colors** (source of truth for components) and **CSS custom properties** (for shadcn/ui compatibility). Components use Tailwind classes like `text-positive` / `bg-negative`; CSS variables exist for the shadcn/ui theming layer.

| Token | Tailwind Value | CSS Variable (light) | CSS Variable (dark) | Usage |
|-------|---------------|---------------------|--------------------:|-------|
| `positive` | `#90BE6D` (light: `#D8ECCC`, dark: `#6D9750`) | `142 71% 45%` | `142 71% 55%` | Money owed to you, positive balances |
| `negative` | `#F77F00` (light: `#FEDFC5`, dark: `#C56500`) | `31 100% 48%` | `31 100% 55%` | Money you owe, debts |

### CSS Custom Properties (Light Mode)

```
--background:          30 17% 98%      /* Warm cream #FAF8F5 */
--foreground:          225 15% 20%     /* Deep charcoal #2D3142 */
--card:                0 0% 100%       /* White */
--primary:             14 77% 62%      /* Coral #E76F51 */
--secondary:           95 34% 46%      /* Sage green #6A994E */
--accent:              25 92% 67%      /* Gold #F4A261 */
--destructive:         30 100% 48%     /* Warm orange #F77F00 */
--muted:               210 40% 96.1%
--muted-foreground:    215.4 16.3% 46.9%
--border:              214.3 31.8% 91.4%
--ring:                14 77% 62%      /* Coral focus ring */
--radius:              16px            /* Friendly, rounded corners */
```

### CSS Custom Properties (Dark Mode)

Not pure black — uses warm dark grays:

```
--background:          240 21% 10%     /* Warm dark gray #1A1A2E */
--foreground:          30 17% 98%
--card:                240 15% 12%
--primary:             14 77% 65%      /* Lighter coral */
--secondary:           95 34% 55%      /* Lighter sage */
--accent:              25 92% 70%
--destructive:         30 100% 55%
--border:              217.9 10.6% 20%
--ring:                14 77% 65%
```

### Balance & Status Colors (CSS Variables)

| Token | Light | Dark |
|-------|-------|------|
| `--positive` | `142 71% 45%` (green) | `142 71% 55%` |
| `--negative` | `31 100% 48%` (warm orange, matches Tailwind `#F77F00`) | `31 100% 55%` |

### Email Brand Colors

Used in `supabase/functions/send-email/index.ts`:

```typescript
const BRAND = {
  coral:       '#e8613a',
  coralDark:   '#c94e28',
  coralLight:  '#fdf1ed',
  textPrimary: '#111827',
  textMuted:   '#6b7280',
  border:      '#e5e7eb',
  background:  '#f9fafb',
  white:       '#ffffff',
}
```

### Email vs App Coral

The email coral (`#e8613a`) is intentionally darker and more saturated than the app coral (`#E76F51`). Email renders on pure white backgrounds where the lighter app coral washes out — the darker variant ensures sufficient contrast in email clients. `RemindPage` also uses `#e8613a` to match the email it links from.

### PWA / Meta Theme Color

`#e8613a` — used in `manifest.webmanifest` and `<meta name="theme-color">`. Matches the email coral for consistency with the PWA splash screen.

---

## 3. Typography

### Font Stack

```
Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
```

Loaded from Google Fonts: `Inter:wght@400;500;600;700` with `display=swap`.

### Base Font Size

`16px` with `line-height: 1.5` (set in `tailwind.config.js`).

### Font Weights

| Weight | Token | Usage |
|--------|-------|-------|
| 400 | `font-normal` | Body text |
| 500 | `font-medium` | Button labels, secondary headings |
| 600 | `font-semibold` | Sheet titles, card headings |
| 700 | `font-bold` | Balance amounts, primary headings |

### Numeric Display

Tabular numbers (`font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1`) via the `.tabular-nums` utility class. Used for amounts, balances, and any aligned numeric columns.

### Text Rendering

```css
font-feature-settings: "rlig" 1, "calt" 1;
font-synthesis: none;
text-rendering: optimizeLegibility;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

---

## 4. Spacing System

### Design Tokens

```
--spacing-xs:   4px
--spacing-sm:   8px
--spacing-md:  16px
--spacing-lg:  24px
--spacing-xl:  32px
--spacing-2xl: 48px
```

These are CSS custom properties defined in `:root`. Standard Tailwind spacing utilities (`p-4`, `gap-3`, etc.) are also used throughout.

### Container

Centered, `2rem` padding, max width `1400px` at `2xl` breakpoint:

```js
container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } }
```

### Header Layout Spacing

- Header container: `max-w-lg lg:max-w-7xl mx-auto px-4 lg:px-8`
- Content padding (two-row mobile header): `pt-[108px] lg:pt-16`
- Content padding (single-row header): `pt-16`

---

## 5. Border Radius

```
--radius: 16px   /* "Friendly, rounded corners" */
```

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-lg` | `var(--radius)` = `16px` | Cards, dialogs |
| `rounded-md` | `calc(var(--radius) - 2px)` = `14px` | Inputs, smaller containers |
| `rounded-sm` | `calc(var(--radius) - 4px)` = `12px` | Badges, tags |
| `rounded-t-2xl` | — | Bottom sheet top corners |
| `rounded-full` | — | Close buttons, avatar, pills |
| `rounded-lg` | — | Buttons (via `buttonVariants` base class) |

---

## 6. Shadows

Three soft shadow tiers — warm and subtle, never harsh:

| Name | Value | Tailwind Class | CSS Variable |
|------|-------|----------------|--------------|
| Soft | `0 2px 8px rgba(0, 0, 0, 0.08)` | `soft-shadow` | `--shadow-soft` |
| Soft MD | `0 4px 12px rgba(0, 0, 0, 0.10)` | `soft-shadow-md` | `--shadow-soft-md` |
| Soft LG | `0 8px 24px rgba(0, 0, 0, 0.12)` | `soft-shadow-lg` | `--shadow-soft-lg` |

Buttons with `default`, `destructive`, `outline`, and `secondary` variants include `soft-shadow` by default.

Card hover state uses `soft-shadow-lg`: `boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)"`.

---

## 7. Animation & Motion

### Duration Tokens

| Token | CSS Variable | Value |
|-------|-------------|-------|
| Fast | `--duration-fast` | `150ms` |
| Normal | `--duration-normal` | `250ms` |
| Slow | `--duration-slow` | `350ms` |

### Easing Curves

| Name | CSS Variable | Bezier |
|------|-------------|--------|
| Ease Out | `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Ease In Out | `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` |

### CSS Keyframe Animations

| Name | Duration | Description |
|------|----------|-------------|
| `accordion-down` | `0.2s ease-out` | Expand accordion content |
| `accordion-up` | `0.2s ease-out` | Collapse accordion content |
| `fade-in` | `0.3s ease-out` | Opacity 0 → 1 |
| `slide-in` | `0.3s ease-out` | translateY(10px) + opacity 0 → visible |

### Framer Motion Presets (`src/lib/animations.ts`)

**Transitions:**

| Preset | Config |
|--------|--------|
| `transition.fast` | `duration: 0.15`, ease out |
| `transition.normal` | `duration: 0.25`, ease out |
| `transition.slow` | `duration: 0.35`, ease out |
| `transition.spring` | `type: "spring"`, stiffness: 400, damping: 30 |
| `transition.bounce` | `type: "spring"`, stiffness: 300, damping: 20 |

**Interaction Presets:**

| Preset | Effect |
|--------|--------|
| `buttonHover` | `scale: 1.02, y: -2` |
| `buttonTap` | `scale: 0.98` |
| `cardHover` | `y: -4` + soft-shadow-lg |
| `hoverLift` | `y: -4` on hover |

**Animation Variants:**

| Variant | Enter | Exit |
|---------|-------|------|
| `fadeIn` | opacity 0 → 1 (normal) | opacity 1 → 0 (fast) |
| `fadeInUp` | y: 20, opacity 0 → visible (normal) | y: -20, opacity 0 (fast) |
| `slideInFromBottom` | y: 100% → 0 (spring) | y: 100% (normal) |
| `slideInFromRight` | x: 100% → 0 (normal) | x: 100% (fast) |
| `modalContent` | scale 0.95 + y: 20 → visible | scale 0.95 + y: 20 |
| `pageTransition` | x: -20 → 0 | x: 20 |
| `listItem` | y: 10, opacity 0 → visible | — |
| `collapse` | height: 0 → auto | — |

**Stagger:** `listContainer` staggers children by `0.05s`. Custom stagger via `staggerContainer(delay)`.

**Special Animations:**

| Variant | Effect |
|---------|--------|
| `checkboxCheck` | scale 0 → 1 (bounce spring) |
| `strikethrough` | width 0% → 100% (delayed 0.1s) |
| `successPulse` | scale 1 → 1.1 → 1 (0.4s) |
| `rotate360` | continuous spin (loading) |
| `pulse` | opacity 0.5↔1, scale 1↔1.1 (1.5s loop) |

### CSS Utility Animations

| Class | Effect |
|-------|--------|
| `transition-smooth` | `all var(--duration-normal) var(--ease-out)` |
| `hover-lift` | `translateY(-2px)` on hover (fast) |

### Reduced Motion

All CSS animations respect `prefers-reduced-motion: reduce` (durations → `0.01ms`). Framer Motion has a `safeAnimate()` wrapper and `prefersReducedMotion` flag.

---

## 8. Buttons

Seven variants and four sizes defined via `class-variance-authority` in `src/components/ui/button.tsx`:

### Variants

| Variant | Appearance | Usage |
|---------|------------|-------|
| `default` | Coral bg, white text, soft shadow, hover lift | Primary CTAs |
| `destructive` | Warm orange bg, white text | Delete, remove actions |
| `outline` | Border, white bg, soft shadow | Secondary actions |
| `secondary` | Sage green bg, white text | Alternative primary actions |
| `ghost` | Transparent, hover shows accent | Tertiary / icon buttons |
| `link` | Coral text, underline on hover | Inline links |
| `soft` | Coral 10% bg, coral text | Soft emphasis buttons |

### Sizes

| Size | Height | Padding | Notes |
|------|--------|---------|-------|
| `default` | `h-10` (40px) | `px-4 py-2` | Standard |
| `sm` | `h-9` (36px) | `px-3` | Compact, `text-xs` |
| `lg` | `h-12` (48px) | `px-8` | Mobile-friendly touch target |
| `icon` | `h-10 w-10` | — | Square icon button |

### Base Styles

All buttons: `rounded-lg`, `text-sm font-medium`, `touch-manipulation`, `transition-smooth`, focus ring (`ring-2 ring-ring ring-offset-2`), disabled state (`opacity-50, pointer-events-none`).

---

## 9. Bottom Sheets

Standard component: `AppSheet` (`src/components/ui/AppSheet.tsx`). All 11 sheets follow this structure.

### Structure

```
SheetContent side="bottom" hideClose className="flex flex-col p-0 rounded-t-2xl"
├── STICKY HEADER (shrink-0)
│   ├── [back ← | spacer w-8] │ SheetTitle │ [close ✕]
│   └── border-b border-border
├── SCROLLABLE CONTENT (flex-1 overflow-y-auto overscroll-contain)
└── STICKY FOOTER (shrink-0, optional)
    └── border-t border-border bg-background
```

### Height Values

| Type | Height |
|------|--------|
| Standard (forms, inputs) | `92dvh` (keyboard: `availableHeight px`) |
| Partial (read-only, pickers) | `75dvh` fixed |

Always `dvh`. Never `vh`. Never `100vh`. Never `h-screen`.

### Close Button (identical on every sheet)

```html
<button class="rounded-full w-8 h-8 flex items-center justify-center
  border border-border hover:bg-muted transition-colors">
  <X class="w-4 h-4 text-muted-foreground" />
</button>
```

### Dismiss Rules

- Single-screen: ✕ close only. Left slot = spacer.
- Multi-step: ← back (left) + ✕ close (right). Step 1: spacer instead of back.
- Never two buttons that both close.

---

## 10. Icons

### Library

**Lucide React** (`lucide-react`) — used exclusively throughout the app.

### Size Conventions

| Context | Size | Example |
|---------|------|---------|
| Empty state illustrations | `48px` | `<Receipt size={48}>` |
| Navigation arrows | `20px` | `<ArrowLeft size={20}>` |
| Standard in-button | `16px` | Inherited via `[&_svg]:size-4` |
| Badges, chips, pills | `14px` | Row 2 header pills |
| Close buttons | `w-4 h-4` | Sheet ✕ button |

### Common Icons by Function

| Function | Icon |
|----------|------|
| Add / Create | `Plus` |
| Delete | `Trash2` |
| Close | `X` |
| Back | `ArrowLeft` |
| Forward / Next | `ArrowRight`, `ChevronRight` |
| Confirm | `Check` |
| Search | `Search` |
| Loading | `Loader2` (spinning) |
| Share | `Share2` |
| Scan receipt | `ScanLine` |
| Export | `FileDown` |
| Filter | `SlidersHorizontal` |
| Error | `AlertTriangle` |
| Celebration | `PartyPopper` |
| Quick mode | `Zap` |
| Full mode | `LayoutGrid` |
| Participants | `Users` |
| Bank / Settlement | `Landmark` |
| Reminder | `Bell` |
| Accommodation | `Building2` |
| Admin | `Shield` |

### Trip Gradient Icons

Themed icons overlay trip cards based on name keywords:

| Theme | Keywords | Icons |
|-------|----------|-------|
| Beach | beach, thailand, bali, hawaii... | `Palmtree`, `Waves`, `Sun`, `Fish`, `Shell` |
| Mountain | mountain, alps, hiking, trek... | `Mountain`, `Trees`, `TreePine` |
| Ski | ski, snow, winter, whistler... | `CloudSnow`, `Snowflake`, `Mountain`, `TreePine` |
| City | city, paris, london, tokyo... | `Building2`, `Landmark`, `Coffee`, `ShoppingBag`, `Camera` |
| Generic | (fallback) | `Plane`, `MapPin`, `Compass`, `Luggage`, `Map`, `Camera` |

Icons render at 80–140px, opacity 0.06–0.14, rotation ±20°.

---

## 11. Trip Header Gradients

Generated by `getTripGradientPattern(tripName)` in `src/services/tripGradientService.ts`.

### How It Works

1. Trip name is matched against theme keywords (beach, mountain, ski, city)
2. A gradient is selected deterministically from the theme's palette (same name = same gradient)
3. 3–4 decorative Lucide icons are placed with seeded-random positions

### Gradient Themes

Each theme has 5–12 multi-stop gradients at varied angles (120°–160°). All gradients use dark, rich colors for text contrast. Examples:

- **Beach:** `linear-gradient(150deg, #0f2027 0%, #203a43 40%, #2c5364 100%)` — "Deep Ocean"
- **Ski:** `linear-gradient(135deg, #0c1445 0%, #0e6ba8 40%, #6b21a8 100%)` — "Northern Lights"
- **City:** `linear-gradient(135deg, #1a1a2e 0%, #6b21a8 50%, #db2777 100%)` — "Neon Noir"
- **Generic:** `linear-gradient(135deg, #1e1b4b 0%, #7c3aed 50%, #c026d3 100%)` — "Ultraviolet"

### Text on Gradients

- Text shadow: `textShadow: '0 1px 4px rgba(0,0,0,0.9)'` (inline style, NOT `drop-shadow-md`)
- Overlay: `from-black/50` gradient for readability

---

## 12. Breakpoints & Responsive Design

### Breakpoint Values

Standard Tailwind defaults with one custom container breakpoint:

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | `640px` | Minor layout adjustments |
| `md` | `768px` | — |
| `lg` | `1024px` | Desktop layout switch |
| `xl` | `1280px` | Wide desktop |
| `2xl` | `1400px` | Container max-width |

### Mobile Detection

`useMediaQuery` hook (`src/hooks/useMediaQuery.ts`) — starts as `false`, updates after mount.

| Pattern | Query | Usage |
|---------|-------|-------|
| Mobile (sheet/dialog switch) | `(max-width: 767px)` | Sheet on mobile, Dialog on desktop |
| Mobile (wizard) | `(max-width: 768px)` | MobileWizard vs ExpenseForm |
| Mobile redirect | `window.innerWidth < 768` | ConditionalHomePage |
| Desktop nav | `lg:` prefix | Side nav, single-row header |

### Responsive Layout Patterns

- **Mobile in-trip:** Two-row header (row 2 = action pills). `pt-[108px]`
- **Desktop in-trip:** Single-row header. `pt-16` / `mt-20`
- **Home page:** Single-row. Logo left, avatar right.
- **Header container:** `max-w-lg lg:max-w-7xl mx-auto px-4 lg:px-8`
- **Quick actions:** Sheet (mobile) → Dialog (desktop)
- **Admin page:** Card layout `< lg`, table `>= lg`

---

## 13. Z-Index Hierarchy

| Layer | Z-Index | Components |
|-------|---------|------------|
| Stale session overlay | `z-[200]` | `StaleSessionOverlay` — blocks all interaction |
| Toast notifications | `z-[100]` | Top-right temporary messages |
| Fixed header | `z-50` | `Layout`, `QuickLayout` headers |
| Sheets & Dialogs | `z-50` | Radix UI default for overlays |
| Dropdowns & Popovers | `z-50` | Autocomplete, menus |
| Bottom nav bar | `z-40` | `Layout` mobile tab bar |
| Page content | default | Normal flow |

---

## 14. Voice & Tone

### Personality

Warm, friendly, concise. The app feels like a helpful travel companion, not enterprise software.

### Copy Patterns

**Empty states:** Icon (48px, muted) + centered message + optional CTA. Encouraging, never blaming.
- "No expenses yet. Add your first expense to get started!"
- "No expenses match your filters."
- "No expenses recorded yet. Add expenses first to see settlement recommendations."

**Toast success:** Short title + optional description.
- `{ title: 'Receipt scanned', description: 'Review it using the banner above.' }`
- `{ title: 'Link copied', description: 'Share this link with your group.' }`
- `{ title: 'Settlement recorded' }`

**Toast error:** `variant: 'destructive'`, descriptive title + recovery hint.
- `{ title: 'Update failed', description: 'Failed to update participant. Please try again.' }`
- `{ title: 'Receipt error', description: receiptError }`

**Buttons / CTAs:** Short, action-oriented verbs.
- Primary: "Add", "Save", "Create", "Done"
- Secondary: "Cancel", "Refresh"
- Destructive: "Delete", "Remove"

**Balance terminology:**
- "Out of pocket" (total paid by a person)
- "Settled" (net settlements sent/received)
- Positive balance: "is owed" / green
- Negative balance: "owes" / red-orange

### Naming

- App: **Spl1t** (with digit 1)
- Tagline: "Split trip costs with friends" (PWA manifest description)
- Sending address: `Spl1t <noreply@xtian.me>`
- Production URL: `https://split.xtian.me`

---

## 15. Formatting Conventions

### Currency

```typescript
new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: currency,          // e.g., 'EUR'
  currencyDisplay: 'narrowSymbol', // € not EUR
}).format(amount)
```

- Balances: `+€50.00` (positive) / `-€50.00` (negative) / `€0.00` (settled)
- Chart labels: `maximumFractionDigits: 0` → `€1,234`
- Locale: `en-US` (always, regardless of user locale)

### Dates

| Context | Format | Example |
|---------|--------|---------|
| Day headers (planner) | `toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })` | `Mon, Nov 23` |
| Long date (manage trip) | `format(date, 'PPP')` (date-fns) | `November 23, 2025` |
| Default | `toLocaleDateString()` | `11/23/2025` |
| Contextual | `getDayContext()` → `'today'` / `'tomorrow'` / `'past'` / `'future'` | — |

### Decimal Input (iOS)

All amount inputs: `inputMode="decimal"` + `onChange` replaces `,` with `.` for European locale comma separators.

---

## 16. PWA Metadata

```json
{
  "name": "Spl1t",
  "short_name": "Spl1t",
  "description": "Split trip costs with friends",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#e8613a"
}
```

### HTML Meta Tags

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Spl1t" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="theme-color" content="#e8613a" />
```

### PWA-Specific CSS

```css
@media (display-mode: standalone) {
  .pwa-safe-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .pwa-safe-bottom-margin {
    margin-bottom: env(safe-area-inset-bottom, 0px);
  }
}
```

`overscroll-behavior-y: none` on body disables Chrome's native pull-to-refresh (app has custom implementation).
