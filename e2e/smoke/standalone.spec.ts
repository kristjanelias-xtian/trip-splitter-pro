import { test, expect, waitForLoadingToFinish } from '../fixtures/test-fixtures'

test.describe('Standalone pages — smoke tests', () => {
  let pageErrors: Error[]

  test.beforeEach(async () => {
    pageErrors = []
  })

  function trackErrors(page: import('@playwright/test').Page) {
    page.on('pageerror', (err) => pageErrors.push(err))
  }

  test('/trip-not-found/:code — 404 page loads', async ({ fullModePage: page }) => {
    trackErrors(page)
    await page.goto('/trip-not-found/nonexistent-trip')
    await waitForLoadingToFinish(page)
    await expect(page.getByText('Trip Not Found')).toBeVisible({ timeout: 10_000 })
    expect(pageErrors).toHaveLength(0)
  })

  test('/join/:token — join page loads', async ({ fullModePage: page }) => {
    trackErrors(page)
    await page.goto('/join/mock-invite-token')
    await waitForLoadingToFinish(page)
    // Join page renders content — check for any visible text content
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 10_000 })
    expect(pageErrors).toHaveLength(0)
  })
})
