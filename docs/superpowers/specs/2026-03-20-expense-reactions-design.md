# Expense Reactions — Design Spec

## Overview

Add emoji reactions to expenses in Full mode. Reactions are a social, fun feature that also serves as a login incentive — only authenticated users linked to the trip can react.

## Emoji Set

Fixed set of 6 emoji, defined as a frontend constant:

```ts
const REACTION_EMOJI = ['👍', '👎', '😂', '🔥', '😱', '💸'] as const
```

## Data Model

### New table: `expense_reactions`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, `default gen_random_uuid()` |
| `expense_id` | UUID | FK → `expenses.id` ON DELETE CASCADE, NOT NULL |
| `participant_id` | UUID | FK → `participants.id` ON DELETE CASCADE, NOT NULL |
| `emoji` | TEXT | NOT NULL |
| `created_at` | TIMESTAMPTZ | `default now()` |

**Unique constraint:** `(expense_id, participant_id, emoji)` — one reaction per emoji per person per expense. A person can react with multiple different emoji to the same expense.

### RLS Policies

- **SELECT:** `USING (true)` — anyone with the trip URL can see reactions (matches trips table access model)
- **INSERT:** authenticated users only; `participant_id` must have `user_id = auth.uid()` (verified via subquery on `participants`)
- **DELETE:** authenticated users only; same `participant_id` → `user_id = auth.uid()` check (you can only remove your own reactions)
- **No UPDATE policy** — reactions are toggled via insert/delete, never modified

## UI — Full Mode Only

### Placement

Inline reaction bar below the existing metadata row (date + category badge) on `ExpenseCard`. Appears on every card.

### Three Visual States

**1. No reactions, logged-in user with participant link:**
- Single "+" button (dashed border, muted) at the bottom of the card metadata area

**2. Reactions exist:**
- Row of emoji pills, each showing emoji + count
- Pills for emoji the current user has reacted with are highlighted (primary color border/background)
- "+" button at the end of the row to add more reactions
- Pills wrap if needed (`flex-wrap: wrap`)

**3. Not logged in / not linked to trip:**
- Reaction pills visible (read-only) with counts, slightly dimmed
- No "+" button
- Tapping a pill does nothing (or optionally shows a "Sign in to react" nudge)

### Emoji Picker

- Compact horizontal popover anchored to the "+" button
- Shows all 6 emoji in a single row
- Tap an emoji → reaction added (INSERT), popover closes
- If the user already reacted with that emoji, it's dimmed/disabled in the picker
- Click outside → popover closes

### Who Reacted (tooltip)

- **Mobile:** tap a reaction pill → tooltip appears above the pill showing participant short names (from `buildShortNameMap`). If the current user has reacted with that emoji, tooltip includes a "Remove" link. Tap elsewhere → dismisses.
- **Desktop:** hover → tooltip with names. If it's the user's reaction, tooltip includes "Remove" link.

### Interaction Flow

**Adding a reaction:**
1. Tap "+" → picker popover opens
2. Tap emoji → reaction inserted, popover closes
3. Pill appears or count increments; pill gets "yours" highlight

**Viewing who reacted:**
1. Tap (mobile) / hover (desktop) any reaction pill → tooltip with names
2. If it's your reaction, tooltip shows "Remove" link

**Removing a reaction:**
1. Tap pill → tooltip with names + "Remove"
2. Tap "Remove" → reaction deleted, count decrements
3. If count reaches 0, pill disappears

## Frontend Architecture

### ReactionContext

New context: `src/contexts/ReactionContext.tsx`

**Responsibilities:**
- Fetch all reactions for the current trip's expenses in a single query on mount
- Provide reactions grouped by `expense_id`
- `addReaction(expenseId, emoji)` — optimistic insert
- `removeReaction(expenseId, emoji)` — optimistic delete
- Roll back local state on Supabase error

**Data shape:**
```ts
type ReactionMap = Map<string, ExpenseReactions>

interface ExpenseReactions {
  [emoji: string]: {
    count: number
    participants: string[]  // participant IDs
    myReaction: boolean     // current user has reacted with this emoji
  }
}
```

**Query:** Single fetch joining `expense_reactions` with `expenses` filtered by `trip_id`. Wrapped in `withTimeout(..., 15000)`.

**No real-time subscriptions** — reactions are not time-critical. Updated on page load/refresh, consistent with how expenses work.

### Components

**`ReactionBar`** (`src/components/reactions/ReactionBar.tsx`)
- Props: `expenseId: string`
- Reads from `ReactionContext`
- Renders pills + "+" button (or read-only pills for unauthenticated users)
- Uses `useMyParticipant()` to determine if user can react
- Uses `buildShortNameMap` for tooltip names

**`ReactionPicker`** (`src/components/reactions/ReactionPicker.tsx`)
- Popover with the 6 emoji
- Props: `onSelect(emoji)`, `alreadyReacted: string[]`
- Dims emoji the user has already used

**`ReactionTooltip`** (`src/components/reactions/ReactionTooltip.tsx`)
- Shows participant names for a given reaction
- Conditional "Remove" link if current user is in the list

### Integration Point

`ExpenseCard.tsx` — add `<ReactionBar expenseId={expense.id} />` after the date/category row, before the comment block.

`ExpenseContext` provider tree — wrap `ReactionContext` inside it (or as a sibling within the trip route layout).

## Database Migration

Single migration file adding:
1. `expense_reactions` table
2. Unique constraint
3. Foreign keys with CASCADE
4. RLS policies (SELECT open, INSERT/DELETE auth-gated with participant ownership check)
5. Index on `expense_id` for fast lookups

## Scope Boundaries

**In scope:**
- Reactions on ExpenseCard in Full mode ExpensesPage
- ReactionContext with optimistic updates
- Emoji picker popover
- Who-reacted tooltip with remove action
- RLS policies
- Database migration

**Out of scope:**
- Quick mode (explicitly excluded per user request)
- Real-time subscriptions for reactions
- Reaction notifications
- Reaction counts in dashboard/analytics
- Reactions on settlements
