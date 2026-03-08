# Plan: i18n System with English + Estonian Support

## Context

All user-facing strings in Spl1t are hardcoded in English. There is no internationalization system. This plan adds i18next + react-i18next from scratch, extracts all English strings into `en.json`, provides complete Estonian translations in `et.json`, and adds a language switcher.

**Scope:** String replacement only. No logic, layout, or style changes.

---

## Step 1: Install dependencies

```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

## Step 2: Create i18n infrastructure

### `src/i18n/index.ts`
- Init i18next with `react-i18next`
- `i18next-browser-languagedetector` with detection order: `['localStorage', 'navigator']`
- localStorage key: `spl1t_lang`
- Default/fallback: `en`
- Single namespace: `translation`
- Import `en.json` and `et.json` as resources

### `src/i18n/locales/en.json`
All English strings grouped by screen/feature (max 3 levels deep):
- `home.*` — HomePage
- `dashboard.*` — DashboardPage
- `expenses.*` — ExpensesPage, ExpenseForm, ExpenseCard, ExpenseWizard
- `settlements.*` — SettlementsPage, SettlementForm
- `manage.*` — ManageTripPage
- `planner.*` — PlannerPage, MealForm, ActivityForm, StayForm
- `shopping.*` — ShoppingPage, ShoppingItemForm
- `quick.*` — QuickGroupDetailPage, QuickSettlementSheet, QuickHistorySheet, etc.
- `receipt.*` — ReceiptCaptureSheet, ReceiptReviewSheet, PendingReceiptBanner
- `participants.*` — ParticipantsSetup, IndividualsSetup, LinkParticipantDialog
- `wizard.*` — WizardStep1-4, WizardNavigation, WizardProgress
- `balance.*` — BalanceCard, QuickBalanceHero, CostBreakdownDialog
- `share.*` — ShareTripDialog
- `auth.*` — SignIn, JoinPage, StaleSessionOverlay
- `admin.*` — AdminAllTripsPage
- `trip.*` — TripForm, EventForm, TripCard, TripNotFoundPage
- `report.*` — ReportIssueDialog
- `bank.*` — BankDetailsDialog
- `settings.*` — ThemeToggle, UserMenu, language switcher
- `common.*` — Cancel, Save, Delete, Loading, errors, etc.
- `export.*` — Excel/PDF column headers and labels
- `errors.*` — Timeout messages, context error states
- `toast.*` — Common toast patterns

### `src/i18n/locales/et.json`
Complete Estonian translation — every key from `en.json` translated. No English fallbacks.

## Step 3: Wire up `src/main.tsx` or `src/App.tsx`

Import `src/i18n/index.ts` at the app entry point (before React renders). This initializes i18next globally.

## Step 4: Replace hardcoded strings in components

Work through files systematically. For each file:
1. `import { useTranslation } from 'react-i18next'`
2. `const { t } = useTranslation()`
3. Replace each hardcoded string with `t('key')`
4. For dynamic strings: `t('key', { name, amount })` with `{{name}}` interpolation in JSON
5. For plurals: `_one` / `_other` suffix convention
6. Verify `npm run type-check` passes after each batch

### Order of files (by directory):

**Pages (~17 files):**
- HomePage.tsx, DashboardPage.tsx, ExpensesPage.tsx, SettlementsPage.tsx
- ManageTripPage.tsx, ShoppingPage.tsx, PlannerPage.tsx, MealsPage.tsx
- QuickGroupDetailPage.tsx, QuickHistoryPage.tsx
- TripsPage.tsx, JoinPage.tsx, RemindPage.tsx, TripNotFoundPage.tsx
- AdminAllTripsPage.tsx

**Components (~60+ files):**
- Layout.tsx, QuickLayout.tsx
- ExpenseForm.tsx, ExpenseCard.tsx, ExpenseWizard.tsx
- WizardStep1-4.tsx, WizardNavigation.tsx, WizardProgress.tsx
- SettlementForm.tsx
- BalanceCard.tsx, QuickBalanceHero.tsx, CostBreakdownDialog.tsx
- ShareTripDialog.tsx, LinkParticipantDialog.tsx, BankDetailsDialog.tsx
- ParticipantsSetup.tsx, IndividualsSetup.tsx
- QuickCreateSheet.tsx, QuickExpenseSheet.tsx, QuickSettlementSheet.tsx
- QuickGroupMembersSheet.tsx, QuickHistorySheet.tsx, QuickParticipantPicker.tsx
- QuickParticipantSetupSheet.tsx, QuickScanContextSheet.tsx, QuickScanCreateFlow.tsx
- ReceiptCaptureSheet.tsx, ReceiptReviewSheet.tsx, ReceiptDetailsSheet.tsx
- PendingReceiptBanner.tsx
- MealCard.tsx, MealForm.tsx, MealGrid.tsx
- ActivityCard.tsx, ActivityForm.tsx
- StayCard.tsx, StayForm.tsx
- ShoppingItemForm.tsx, ShoppingItemRow.tsx
- TripForm.tsx, EventForm.tsx, TripCard.tsx, TripBanner.tsx
- ErrorBoundary.tsx, StaleSessionOverlay.tsx, PageErrorState.tsx, PageLoadingState.tsx
- OnboardingPrompts.tsx, InstallGuide.tsx
- ReportIssueDialog.tsx, ReportIssueButton.tsx
- ThemeToggle.tsx, UserMenu.tsx
- TopExpensesList.tsx, CostPerParticipantChart.tsx, ExpenseByCategoryChart.tsx
- PlannerGrid.tsx, TimeSlotGrid.tsx, DayBanner.tsx, DayDetailSheet.tsx

**Contexts (~10 files) — timeout/error messages:**
- TripContext.tsx, ExpenseContext.tsx, SettlementContext.tsx
- ParticipantContext.tsx, ShoppingContext.tsx, MealContext.tsx
- ActivityContext.tsx, StayContext.tsx, ReceiptContext.tsx
- AuthContext.tsx, UserPreferencesContext.tsx

Note: Context files don't have hooks — use `i18next.t()` directly (import `i18n` instance).

**Services (~2 files) — export labels:**
- excelExport.ts, pdfExport.ts

**Lib:**
- fetchWithTimeout.ts (default timeout message)

**App.tsx:**
- Easter egg strings, unhandled error toast

## Step 5: Language Switcher

Add to `UserMenu` dropdown (in `src/components/UserMenu.tsx`):
- Simple two-option toggle: "English" / "Eesti"
- Calls `i18n.changeLanguage('en')` or `i18n.changeLanguage('et')`
- Persisted automatically via the language detector (localStorage `spl1t_lang`)
- Instant UI update, no page reload

Also add to `ManageTripPage.tsx` in the Appearance card (alongside ThemeToggle):
- Same toggle pattern
- Matches existing settings UI patterns

Use existing UI patterns from the codebase — no new components needed. Follow BRAND.md colors (coral primary).

## Step 6: Verification

1. `npm run type-check` — must pass clean
2. `npm run build` — must succeed
3. `npm test` — all 182 tests pass (some may need `t()` mocking)
4. Verify `en.json` and `et.json` have identical key sets (write a quick script or grep)
5. Manual spot-check: 10 strings across 5 screens in both languages
6. Grep for remaining hardcoded strings in `src/` that should be translated
7. Confirm "Spl1t" is never translated anywhere

## Key Files to Modify

- **New:** `src/i18n/index.ts`, `src/i18n/locales/en.json`, `src/i18n/locales/et.json`
- **Entry:** `src/App.tsx` or `src/main.tsx` (add i18n import)
- **~90 component/page/context/service files** (string replacement)
- **Test files** may need i18n mock setup in `src/test/setup.ts`

## Test Mock Setup

Add to `src/test/setup.ts` or create `src/test/i18nMock.ts`:
```ts
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))
```

## Estimated String Count

~800–1000 unique translatable strings across the entire app.

## What NOT to touch

- Email templates in `supabase/functions/` (Edge Functions, Deno runtime — separate i18n concern)
- Component logic, layout, or styling
- No new UI components beyond the language toggle
- Brand name "Spl1t" — never translated

## Estonian Translation Notes

- Formal "teie" for instructional text and error messages
- Informal "sina/sa" for social/action prompts ("Alusta reisi", "Lisa kulu")
- Currency symbols (€) kept as-is, surrounding text translated
- "Spl1t" is a proper noun — never translated
- Key vocabulary: Trip = reis, Event = üritus, Expense = kulu, Settle/Settlement = arveldus, Split (verb) = jaga, Receipt = kviitung, Members = liikmed, Organiser = korraldaja

## PR

- Branch: `feat/i18n-estonian`
- Title: `feat: add i18n system with English and Estonian support`
- Do not merge without manual review
