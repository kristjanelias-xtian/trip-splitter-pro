# Expense Reactions Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add emoji reactions (👍 👎 😂 🔥 😱 💸) to expense cards in Full mode, with auth-gated participation and optimistic updates.

**Architecture:** New `expense_reactions` Supabase table with RLS. New `ReactionContext` fetches all reactions per trip and provides optimistic add/remove. Three UI components (`ReactionBar`, `ReactionPicker`, `ReactionPopover`) render inline on `ExpenseCard`. Radix Popover used for both the emoji picker and the who-reacted display.

**Tech Stack:** React 18, TypeScript, Supabase (PostgreSQL + RLS), Radix Popover, Tailwind CSS, Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-03-20-expense-reactions-design.md`

---

## Chunk 1: Database, Types, and Context

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/046_expense_reactions.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Expense reactions: emoji reactions on expenses
CREATE TABLE expense_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expense_id, participant_id, emoji)
);

CREATE INDEX idx_expense_reactions_expense_id ON expense_reactions(expense_id);

ALTER TABLE expense_reactions ENABLE ROW LEVEL SECURITY;

-- SELECT: open to all (trip URL = access token)
CREATE POLICY "expense_reactions_select"
  ON expense_reactions FOR SELECT
  USING (true);

-- INSERT: authenticated users, participant must be linked to auth user
CREATE POLICY "expense_reactions_insert"
  ON expense_reactions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = participant_id
        AND participants.user_id = auth.uid()
    )
  );

-- DELETE: authenticated users, can only remove own reactions
CREATE POLICY "expense_reactions_delete"
  ON expense_reactions FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = participant_id
        AND participants.user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Apply migration to Supabase**

Run: `supabase db push` or apply the SQL file manually against the Supabase project.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/046_expense_reactions.sql
git commit -m "feat(reactions): add expense_reactions table with RLS"
```

---

### Task 2: Type Definitions

**Files:**
- Create: `src/types/reaction.ts`

- [ ] **Step 1: Create the type file**

```ts
// SPDX-License-Identifier: Apache-2.0

export const REACTION_EMOJI = ['👍', '👎', '😂', '🔥', '😱', '💸'] as const

export type ReactionEmoji = (typeof REACTION_EMOJI)[number]

export interface Reaction {
  id: string
  expense_id: string
  participant_id: string
  emoji: ReactionEmoji
  created_at: string
}

/** Aggregated reactions for a single expense, keyed by emoji */
export interface ExpenseReactions {
  [emoji: string]: {
    count: number
    participantIds: string[]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/reaction.ts
git commit -m "feat(reactions): add reaction type definitions"
```

---

### Task 3: Install Radix Popover

**Files:**
- Modify: `package.json`
- Create: `src/components/ui/popover.tsx`

- [ ] **Step 1: Install the package**

```bash
npm install @radix-ui/react-popover
```

- [ ] **Step 2: Create the shadcn-style Popover wrapper**

Create `src/components/ui/popover.tsx`:

```tsx
// SPDX-License-Identifier: Apache-2.0
import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/utils'

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
```

- [ ] **Step 3: Verify the build passes**

Run: `npm run type-check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/components/ui/popover.tsx
git commit -m "feat(ui): add Radix Popover component"
```

---

### Task 4: ReactionContext

**Files:**
- Create: `src/contexts/ReactionContext.tsx`
- Create: `src/contexts/ReactionContext.test.tsx`

- [ ] **Step 1: Write the test file**

Create `src/contexts/ReactionContext.test.tsx`:

```tsx
// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { ReactionProvider, useReactionContext } from './ReactionContext'

const mockCurrentTrip = vi.hoisted(() => ({
  currentTrip: null as { id: string } | null,
}))

const mockSupabase = vi.hoisted(() => {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),
    single: vi.fn(),
    then: vi.fn(),
  }
  return {
    from: vi.fn(() => chainable),
    chainable,
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  }
})

vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase }))
vi.mock('@/hooks/useCurrentTrip', () => ({
  useCurrentTrip: () => mockCurrentTrip,
}))
vi.mock('@/contexts/TripContext', () => ({
  useTripContext: () => ({ trips: [], loading: false }),
  TripProvider: ({ children }: { children: React.ReactNode }) => children,
}))

function TestConsumer() {
  const { reactions, loading } = useReactionContext()
  const count = reactions.size
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="count">{count}</span>
    </div>
  )
}

describe('ReactionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentTrip.currentTrip = null
  })

  it('does not fetch when no trip is loaded', () => {
    render(
      <ReactionProvider>
        <TestConsumer />
      </ReactionProvider>
    )
    expect(mockSupabase.from).not.toHaveBeenCalled()
    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })

  it('fetches reactions when trip is loaded', async () => {
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockSupabase.chainable.eq.mockResolvedValueOnce({
      data: [
        { id: 'r1', expense_id: 'e1', participant_id: 'p1', emoji: '🔥', created_at: '2026-01-01' },
        { id: 'r2', expense_id: 'e1', participant_id: 'p2', emoji: '🔥', created_at: '2026-01-01' },
        { id: 'r3', expense_id: 'e1', participant_id: 'p1', emoji: '😂', created_at: '2026-01-01' },
      ],
      error: null,
    })

    render(
      <ReactionProvider>
        <TestConsumer />
      </ReactionProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1') // 1 expense with reactions
    })
  })

  it('groups reactions by expense and emoji', async () => {
    mockCurrentTrip.currentTrip = { id: 'trip-1' }
    mockSupabase.chainable.eq.mockResolvedValueOnce({
      data: [
        { id: 'r1', expense_id: 'e1', participant_id: 'p1', emoji: '🔥', created_at: '2026-01-01' },
        { id: 'r2', expense_id: 'e1', participant_id: 'p2', emoji: '🔥', created_at: '2026-01-01' },
      ],
      error: null,
    })

    function DetailConsumer() {
      const { reactions } = useReactionContext()
      const e1 = reactions.get('e1')
      const fireCount = e1?.['🔥']?.count ?? 0
      const fireParticipants = e1?.['🔥']?.participantIds?.length ?? 0
      return (
        <div>
          <span data-testid="fire-count">{fireCount}</span>
          <span data-testid="fire-participants">{fireParticipants}</span>
        </div>
      )
    }

    render(
      <ReactionProvider>
        <DetailConsumer />
      </ReactionProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('fire-count')).toHaveTextContent('2')
      expect(screen.getByTestId('fire-participants')).toHaveTextContent('2')
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/contexts/ReactionContext.test.tsx`
Expected: FAIL — module `./ReactionContext` not found

- [ ] **Step 3: Implement ReactionContext**

Create `src/contexts/ReactionContext.tsx`:

```tsx
// SPDX-License-Identifier: Apache-2.0
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useAbortController } from '@/hooks/useAbortController'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { logger } from '@/lib/logger'
import type { Reaction, ExpenseReactions } from '@/types/reaction'

type ReactionMap = Map<string, ExpenseReactions>

interface ReactionContextType {
  reactions: ReactionMap
  loading: boolean
  addReaction: (expenseId: string, participantId: string, emoji: string) => Promise<void>
  removeReaction: (expenseId: string, participantId: string, emoji: string) => Promise<void>
}

const ReactionContext = createContext<ReactionContextType | undefined>(undefined)

function groupReactions(rows: Reaction[]): ReactionMap {
  const map: ReactionMap = new Map()
  for (const row of rows) {
    let expenseReactions = map.get(row.expense_id)
    if (!expenseReactions) {
      expenseReactions = {}
      map.set(row.expense_id, expenseReactions)
    }
    if (!expenseReactions[row.emoji]) {
      expenseReactions[row.emoji] = { count: 0, participantIds: [] }
    }
    expenseReactions[row.emoji].count++
    expenseReactions[row.emoji].participantIds.push(row.participant_id)
  }
  return map
}

export function ReactionProvider({ children }: { children: ReactNode }) {
  const { currentTrip } = useCurrentTrip()
  const [reactions, setReactions] = useState<ReactionMap>(new Map())
  const [rawReactions, setRawReactions] = useState<Reaction[]>([])
  const [loading, setLoading] = useState(false)
  const { newSignal, cancel } = useAbortController()

  useEffect(() => {
    if (!currentTrip?.id) {
      setReactions(new Map())
      setRawReactions([])
      return
    }

    const fetchReactions = async () => {
      setLoading(true)
      try {
        const signal = newSignal()
        const { data, error } = await withTimeout(
          supabase
            .from('expense_reactions')
            .select('id, expense_id, participant_id, emoji, created_at, expenses!inner(trip_id)')
            .eq('expenses.trip_id', currentTrip.id)
            .abortSignal(signal),
          15000,
          'Loading reactions timed out'
        )
        if (error) {
          logger.error('Failed to fetch reactions', { error })
          return
        }
        const rows = (data || []) as unknown as Reaction[]
        setRawReactions(rows)
        setReactions(groupReactions(rows))
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          logger.error('Error fetching reactions', { error: err })
        }
      } finally {
        setLoading(false)
      }
    }

    fetchReactions()
    return cancel
  }, [currentTrip?.id])

  const addReaction = useCallback(async (expenseId: string, participantId: string, emoji: string) => {
    // Optimistic update
    const optimisticReaction: Reaction = {
      id: crypto.randomUUID(),
      expense_id: expenseId,
      participant_id: participantId,
      emoji,
      created_at: new Date().toISOString(),
    }
    setRawReactions(prev => {
      const next = [...prev, optimisticReaction]
      setReactions(groupReactions(next))
      return next
    })

    const { error } = await withTimeout(
      supabase.from('expense_reactions').insert({
        expense_id: expenseId,
        participant_id: participantId,
        emoji,
      }),
      15000,
      'Adding reaction timed out'
    )

    if (error) {
      logger.error('Failed to add reaction', { error })
      // Roll back
      setRawReactions(prev => {
        const next = prev.filter(r => r.id !== optimisticReaction.id)
        setReactions(groupReactions(next))
        return next
      })
    }
  }, [])

  const removeReaction = useCallback(async (expenseId: string, participantId: string, emoji: string) => {
    // Use ref-style access via setState updater to avoid stale closure
    let toRemove: Reaction | undefined
    setRawReactions(prev => {
      toRemove = prev.find(
        r => r.expense_id === expenseId && r.participant_id === participantId && r.emoji === emoji
      )
      if (!toRemove) return prev
      const next = prev.filter(r => r.id !== toRemove!.id)
      setReactions(groupReactions(next))
      return next
    })

    if (!toRemove) return

    const removedReaction = toRemove
    const { error } = await withTimeout(
      supabase
        .from('expense_reactions')
        .delete()
        .match({ expense_id: expenseId, participant_id: participantId, emoji }),
      15000,
      'Removing reaction timed out'
    )

    if (error) {
      logger.error('Failed to remove reaction', { error })
      // Roll back
      setRawReactions(prev => {
        const next = [...prev, removedReaction]
        setReactions(groupReactions(next))
        return next
      })
    }
  }, [])

  const value = useMemo(
    () => ({ reactions, loading, addReaction, removeReaction }),
    [reactions, loading, addReaction, removeReaction]
  )

  return <ReactionContext.Provider value={value}>{children}</ReactionContext.Provider>
}

export function useReactionContext() {
  const context = useContext(ReactionContext)
  if (context === undefined) {
    throw new Error('useReactionContext must be used within a ReactionProvider')
  }
  return context
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/contexts/ReactionContext.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Add ReactionProvider to Layout.tsx**

Modify `src/components/Layout.tsx`. Find the provider nesting tree and wrap `ReactionProvider` inside `ExpenseProvider`:

```tsx
import { ReactionProvider } from '@/contexts/ReactionContext'
```

In the provider tree, add `ReactionProvider` wrapping the children of `ExpenseProvider`:

```tsx
<ExpenseProvider>
  <ReactionProvider>
    <SettlementProvider>
      ...
    </SettlementProvider>
  </ReactionProvider>
</ExpenseProvider>
```

- [ ] **Step 6: Run type-check and full test suite**

Run: `npm run type-check && npm test`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add src/types/reaction.ts src/contexts/ReactionContext.tsx src/contexts/ReactionContext.test.tsx src/components/Layout.tsx
git commit -m "feat(reactions): add ReactionContext with optimistic updates"
```

---

## Chunk 2: UI Components and Integration

### Task 5: ReactionPicker Component

**Files:**
- Create: `src/components/reactions/ReactionPicker.tsx`

- [ ] **Step 1: Create the ReactionPicker component**

```tsx
// SPDX-License-Identifier: Apache-2.0
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { REACTION_EMOJI } from '@/types/reaction'
import { useState } from 'react'

interface ReactionPickerProps {
  onSelect: (emoji: string) => void
  alreadyReacted: string[]
}

export function ReactionPicker({ onSelect, alreadyReacted }: ReactionPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="bg-transparent border border-dashed border-border text-muted-foreground px-2 py-0.5 rounded-full text-sm hover:bg-muted/50 transition-colors"
          aria-label="Add reaction"
        >
          +
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-auto p-2 flex gap-1"
      >
        {REACTION_EMOJI.map(emoji => {
          const used = alreadyReacted.includes(emoji)
          return (
            <button
              key={emoji}
              onClick={() => {
                if (!used) {
                  onSelect(emoji)
                  setOpen(false)
                }
              }}
              disabled={used}
              className="text-xl p-1 rounded-md hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 2: Run type-check**

Run: `npm run type-check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/reactions/ReactionPicker.tsx
git commit -m "feat(reactions): add ReactionPicker popover component"
```

---

### Task 6: ReactionPopover Component

**Files:**
- Create: `src/components/reactions/ReactionPopover.tsx`

- [ ] **Step 1: Create the ReactionPopover component**

```tsx
// SPDX-License-Identifier: Apache-2.0
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useMemo, useState } from 'react'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { buildShortNameMap } from '@/lib/participantUtils'

interface ReactionPopoverProps {
  emoji: string
  count: number
  participantIds: string[]
  isMine: boolean
  onRemove: () => void
  children: React.ReactNode
}

export function ReactionPopover({
  emoji,
  count,
  participantIds,
  isMine,
  onRemove,
  children,
}: ReactionPopoverProps) {
  const [open, setOpen] = useState(false)
  const { participants } = useParticipantContext()
  const shortNames = useMemo(() => buildShortNameMap(participants), [participants])

  const names = participantIds
    .map(id => shortNames.get(id))
    .filter(Boolean)
    .join(', ')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="top" className="w-auto p-2 text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">{names}</span>
          {isMine && (
            <button
              onClick={() => {
                onRemove()
                setOpen(false)
              }}
              className="text-xs text-destructive hover:underline text-left"
            >
              Remove
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 2: Run type-check**

Run: `npm run type-check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/reactions/ReactionPopover.tsx
git commit -m "feat(reactions): add ReactionPopover component for who-reacted display"
```

---

### Task 7: ReactionBar Component

**Files:**
- Create: `src/components/reactions/ReactionBar.tsx`

- [ ] **Step 1: Create the ReactionBar component**

```tsx
// SPDX-License-Identifier: Apache-2.0
import { useReactionContext } from '@/contexts/ReactionContext'
import { useMyParticipant } from '@/hooks/useMyParticipant'
import { ReactionPicker } from './ReactionPicker'
import { ReactionPopover } from './ReactionPopover'

interface ReactionBarProps {
  expenseId: string
}

export function ReactionBar({ expenseId }: ReactionBarProps) {
  const { reactions, addReaction, removeReaction } = useReactionContext()
  const myParticipant = useMyParticipant()

  const expenseReactions = reactions.get(expenseId)
  const canReact = !!myParticipant

  // Collect which emoji the current user has already reacted with
  const myReactedEmoji = canReact
    ? Object.entries(expenseReactions || {})
        .filter(([, data]) => data.participantIds.includes(myParticipant.id))
        .map(([emoji]) => emoji)
    : []

  const hasReactions = expenseReactions && Object.keys(expenseReactions).length > 0
  const allUsed = myReactedEmoji.length >= 6

  // State 3: not logged in / not linked — show read-only pills or nothing
  if (!canReact) {
    if (!hasReactions) return null
    return (
      <div className="flex gap-1.5 flex-wrap mt-2">
        {Object.entries(expenseReactions).map(([emoji, data]) => (
          <span
            key={emoji}
            className="bg-muted/50 border border-border px-2 py-0.5 rounded-full text-sm opacity-70"
          >
            {emoji} {data.count}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-1.5 items-center flex-wrap mt-2">
      {expenseReactions &&
        Object.entries(expenseReactions).map(([emoji, data]) => {
          const isMine = data.participantIds.includes(myParticipant.id)
          return (
            <ReactionPopover
              key={emoji}
              emoji={emoji}
              count={data.count}
              participantIds={data.participantIds}
              isMine={isMine}
              onRemove={() => removeReaction(expenseId, myParticipant.id, emoji)}
            >
              <button
                className={`px-2 py-0.5 rounded-full text-sm transition-colors ${
                  isMine
                    ? 'bg-primary/15 border border-primary/30 hover:bg-primary/20'
                    : 'bg-muted/50 border border-border hover:bg-muted'
                }`}
              >
                {emoji} {data.count}
              </button>
            </ReactionPopover>
          )
        })}
      {!allUsed && (
        <ReactionPicker
          onSelect={(emoji) => addReaction(expenseId, myParticipant.id, emoji)}
          alreadyReacted={myReactedEmoji}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run type-check**

Run: `npm run type-check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/reactions/ReactionBar.tsx
git commit -m "feat(reactions): add ReactionBar component with pills and picker"
```

---

### Task 8: Integrate ReactionBar into ExpenseCard

**Files:**
- Modify: `src/components/ExpenseCard.tsx`

- [ ] **Step 1: Add ReactionBar to ExpenseCard**

Add the import at the top of `src/components/ExpenseCard.tsx`:

```tsx
import { ReactionBar } from '@/components/reactions/ReactionBar'
```

Insert `<ReactionBar expenseId={expense.id} />` after the date/category row (the `<div className="flex items-center gap-2 flex-wrap">` block) and before the comment block. Find this section around line 121:

```tsx
                {expense.comment && (
```

Insert just before it:

```tsx
                <ReactionBar expenseId={expense.id} />
```

- [ ] **Step 2: Run type-check and tests**

Run: `npm run type-check && npm test`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add src/components/ExpenseCard.tsx
git commit -m "feat(reactions): integrate ReactionBar into ExpenseCard"
```

---

### Task 9: Add test factory and ReactionBar tests

**Files:**
- Modify: `src/test/factories.ts`
- Create: `src/components/reactions/ReactionBar.test.tsx`

- [ ] **Step 1: Add reaction factory to `src/test/factories.ts`**

Add at the end of the file:

```ts
export function buildReaction(overrides: Partial<Reaction> = {}): Reaction {
  const id = overrides.id ?? nextId()
  return {
    id,
    expense_id: 'expense-1',
    participant_id: 'participant-1',
    emoji: '🔥',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}
```

Add the import at the top:

```ts
import type { Reaction } from '@/types/reaction'
```

- [ ] **Step 2: Write ReactionBar tests**

Create `src/components/reactions/ReactionBar.test.tsx`:

```tsx
// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactionBar } from './ReactionBar'

const mockReactionContext = vi.hoisted(() => ({
  reactions: new Map(),
  loading: false,
  addReaction: vi.fn(),
  removeReaction: vi.fn(),
}))

const mockMyParticipant = vi.hoisted(() => ({
  value: null as { id: string } | null,
}))

vi.mock('@/contexts/ReactionContext', () => ({
  useReactionContext: () => mockReactionContext,
}))

vi.mock('@/hooks/useMyParticipant', () => ({
  useMyParticipant: () => mockMyParticipant.value,
}))

vi.mock('@/contexts/ParticipantContext', () => ({
  useParticipantContext: () => ({ participants: [] }),
}))

describe('ReactionBar', () => {
  it('renders nothing when not logged in and no reactions', () => {
    mockMyParticipant.value = null
    mockReactionContext.reactions = new Map()

    const { container } = render(<ReactionBar expenseId="e1" />)
    expect(container.firstChild).toBeNull()
  })

  it('shows read-only pills when not logged in but reactions exist', () => {
    mockMyParticipant.value = null
    mockReactionContext.reactions = new Map([
      ['e1', { '🔥': { count: 2, participantIds: ['p1', 'p2'] } }],
    ])

    render(<ReactionBar expenseId="e1" />)
    expect(screen.getByText(/🔥 2/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Add reaction')).not.toBeInTheDocument()
  })

  it('shows pills with + button when logged in', () => {
    mockMyParticipant.value = { id: 'p1' }
    mockReactionContext.reactions = new Map([
      ['e1', { '🔥': { count: 1, participantIds: ['p2'] } }],
    ])

    render(<ReactionBar expenseId="e1" />)
    expect(screen.getByText(/🔥 1/)).toBeInTheDocument()
    expect(screen.getByLabelText('Add reaction')).toBeInTheDocument()
  })

  it('highlights pills for own reactions', () => {
    mockMyParticipant.value = { id: 'p1' }
    mockReactionContext.reactions = new Map([
      ['e1', { '🔥': { count: 1, participantIds: ['p1'] } }],
    ])

    render(<ReactionBar expenseId="e1" />)
    const pill = screen.getByText(/🔥 1/)
    expect(pill.className).toContain('bg-primary/15')
  })

  it('hides + button when all 6 emoji are used', () => {
    mockMyParticipant.value = { id: 'p1' }
    mockReactionContext.reactions = new Map([
      ['e1', {
        '👍': { count: 1, participantIds: ['p1'] },
        '👎': { count: 1, participantIds: ['p1'] },
        '😂': { count: 1, participantIds: ['p1'] },
        '🔥': { count: 1, participantIds: ['p1'] },
        '😱': { count: 1, participantIds: ['p1'] },
        '💸': { count: 1, participantIds: ['p1'] },
      }],
    ])

    render(<ReactionBar expenseId="e1" />)
    expect(screen.queryByLabelText('Add reaction')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/components/reactions/ReactionBar.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add src/test/factories.ts src/components/reactions/ReactionBar.test.tsx
git commit -m "test(reactions): add ReactionBar tests and reaction factory"
```

---

### Task 10: Final Verification

- [ ] **Step 1: Run full type-check**

Run: `npm run type-check`
Expected: No errors

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`

1. Navigate to a trip in Full mode → Expenses page
2. Verify "+" button appears on expense cards (when logged in + linked)
3. Click "+" → emoji picker appears with 6 emoji
4. Click an emoji → pill appears with count "1" and primary highlight
5. Click the pill → popover shows your name + "Remove" link
6. Click "Remove" → pill disappears
7. Log out → verify pills are read-only, no "+" button
