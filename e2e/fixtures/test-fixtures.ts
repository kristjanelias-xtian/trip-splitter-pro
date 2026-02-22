import { test as base, Page, expect } from '@playwright/test'
import { setupSupabaseInterceptor } from './supabase-interceptor'

/**
 * Custom test fixtures that provide pre-configured pages:
 * - fullModePage: localStorage seeded for "full" mode, Supabase mocked
 * - quickModePage: localStorage seeded for "quick" mode, Supabase mocked
 */
export const test = base.extend<{
  fullModePage: Page
  quickModePage: Page
}>({
  fullModePage: async ({ page }, use) => {
    await setupSupabaseInterceptor(page, 'full')
    await use(page)
  },
  quickModePage: async ({ page }, use) => {
    await setupSupabaseInterceptor(page, 'quick')
    await use(page)
  },
})

export { expect }

/**
 * Helper: wait for loading spinners to disappear (max 10s).
 * Many pages show a spinner while contexts load data.
 */
export async function waitForLoadingToFinish(page: Page) {
  // Give the page a moment to start rendering
  await page.waitForTimeout(500)
  // Wait for all spinners to disappear
  const spinners = page.locator('.animate-spin')
  const count = await spinners.count()
  if (count > 0) {
    await expect(spinners.first()).toBeHidden({ timeout: 10_000 })
  }
}
