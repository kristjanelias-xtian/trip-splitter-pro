// SPDX-License-Identifier: Apache-2.0
/**
 * E2E happy paths for participant reassignment (replace / remove / add).
 *
 * Drives the ManageMemberFlow wizard end-to-end through the real Supabase mock
 * harness (`fullModePage` fixture). The signed-in user is the trip CREATOR
 * (mockTrip.created_by === mockUser.id), so the creator-only "Manage" and
 * "Add member and split costs" affordances render.
 *
 * The reassign_participant RPC is captured by the interceptor into the
 * `rpcCapture` fixture; its POST body is `{ p_trip_id, p_diff: WriteDiff }`.
 * Assertions check the diff carries the insert / delete / backfill the core
 * (Tasks 1-5) produced.
 *
 * Runs at both viewports via the playwright.config projects (mobile 375x812
 * iPhone 13 / webkit, desktop 1280x720 chromium).
 */
import { test, expect, waitForLoadingToFinish } from './fixtures/test-fixtures'
import type { RpcCapture } from './fixtures/supabase-interceptor'
import { MOCK_TRIP_CODE, MOCK_EXPENSE_ID } from './fixtures/mock-data'

type WriteDiff = {
  insertParticipant?: { id: string; name: string } | null
  deleteParticipantId?: string | null
  updateExpenses?: { id: string; distribution?: unknown }[]
}
type RpcBody = { p_trip_id?: string; p_diff?: WriteDiff }

function reassignDiff(rpcCapture: RpcCapture): WriteDiff | undefined {
  return (rpcCapture['reassign_participant'] as RpcBody | undefined)?.p_diff
}

/**
 * Open the per-row "Manage" wizard for a participant. The affordance differs by
 * viewport: a dropdown menu item on mobile (< 640px, sm:hidden) vs. a titled
 * icon button on desktop (>= 640px). The row is scoped by participant name.
 */
async function openManageForRow(page: import('@playwright/test').Page, name: string) {
  const row = page.locator('.bg-accent\\/5').filter({ hasText: name })
  await expect(row).toBeVisible()
  const isMobile = (page.viewportSize()?.width ?? 0) < 640
  if (isMobile) {
    // Mobile (< 640px): actions live in the `.sm:hidden` dropdown. Open its
    // trigger, then click the Manage menu item.
    await row.locator('.sm\\:hidden button').first().click()
    await page.getByRole('menuitem', { name: 'Manage' }).click()
  } else {
    // Desktop (>= 640px, hidden sm:flex): titled ghost icon button.
    await row.getByRole('button', { name: 'Manage' }).click()
  }
}

test.describe('Participant reassignment - happy paths', () => {
  test.beforeEach(async ({ fullModePage: page }) => {
    await page.goto(`/t/${MOCK_TRIP_CODE}/manage`)
    await waitForLoadingToFinish(page)
    // The creator-only add affordance confirms the page is ready and gated.
    await expect(page.getByRole('button', { name: /add member and split costs/i })).toBeVisible()
  })

  test('replace participant - full handover', async ({ fullModePage: page, rpcCapture }) => {
    await openManageForRow(page, 'Other Person')

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: /add a new person/i }).click()
    await dialog.getByLabel(/new person name/i).fill('Madis Maran')
    await dialog.getByRole('button', { name: /full handover/i }).click()
    await dialog.getByRole('button', { name: /^preview$/i }).click()
    await dialog.getByRole('button', { name: /^confirm$/i }).click()

    await expect.poll(() => reassignDiff(rpcCapture)?.insertParticipant?.name).toBe('Madis Maran')
    expect(reassignDiff(rpcCapture)?.deleteParticipantId).toBeTruthy()
    // Overlay closes after a successful confirm.
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('remove participant - reallocate then confirm', async ({ fullModePage: page, rpcCapture }) => {
    await openManageForRow(page, 'Other Person')

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Enter the remove flow from the replace entry point.
    await dialog.getByRole('button', { name: /remove from trip/i }).click()
    // Reveal the per-bucket destination selects.
    await dialog.getByRole('button', { name: /drop out & reallocate/i }).click()

    const preview = dialog.getByRole('button', { name: /^preview$/i })
    // Confirm path is blocked until the source's settlement destination is set.
    await expect(preview).toBeDisabled()

    // Route every bucket (shares / paid / settlements) to the remaining
    // participant so nothing is left dangling on the removed person.
    await dialog.getByLabel('Shares destination').selectOption({ label: 'Test User' })
    await dialog.getByLabel('Paid expenses destination').selectOption({ label: 'Test User' })
    await dialog.getByLabel('Settlements destination').selectOption({ label: 'Test User' })

    await expect(preview).toBeEnabled()
    await preview.click()
    await dialog.getByRole('button', { name: /^confirm$/i }).click()

    await expect.poll(() => reassignDiff(rpcCapture)?.deleteParticipantId).toBeTruthy()
    // Remove (no replacement target) carries no inserted participant.
    expect(reassignDiff(rpcCapture)?.insertParticipant ?? null).toBeNull()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('add member with backfill', async ({ fullModePage: page, rpcCapture }) => {
    await page.getByRole('button', { name: /add member and split costs/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel(/new person name/i).fill('Liisa Lill')
    // Check the existing expense for backfill.
    await dialog.getByRole('checkbox').first().click()

    await dialog.getByRole('button', { name: /^preview$/i }).click()
    await dialog.getByRole('button', { name: /^confirm$/i }).click()

    await expect.poll(() => reassignDiff(rpcCapture)?.insertParticipant?.name).toBe('Liisa Lill')
    expect(reassignDiff(rpcCapture)?.deleteParticipantId ?? null).toBeNull()
    // Backfill: the checked expense gets an updated distribution.
    const updated = reassignDiff(rpcCapture)?.updateExpenses ?? []
    expect(updated.some((u) => u.id === MOCK_EXPENSE_ID && u.distribution)).toBe(true)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})
