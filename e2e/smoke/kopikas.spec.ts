import { test, expect, waitForLoadingToFinish } from '../fixtures/test-fixtures'
import { MOCK_WALLET_CODE } from '../fixtures/mock-data'

test.describe('Kopikas — smoke tests', () => {
  let pageErrors: Error[]

  test.beforeEach(async () => {
    pageErrors = []
  })

  function trackErrors(page: import('@playwright/test').Page) {
    page.on('pageerror', (err) => pageErrors.push(err))
  }

  // --- Kid routes ---

  test('/kopikas/:walletCode — kid home loads', async ({ fullModePage: page }) => {
    trackErrors(page)
    await page.goto(`/kopikas/${MOCK_WALLET_CODE}`)
    await waitForLoadingToFinish(page)
    // Pet name and balance should be visible
    await expect(page.getByText('Blob')).toBeVisible({ timeout: 10_000 })
    // Action buttons
    await expect(page.getByText('Skanni')).toBeVisible()
    await expect(page.getByText('Lisa')).toBeVisible()
    await expect(page.getByText('Ülevaade')).toBeVisible()
    // Recent transactions section
    await expect(page.getByText('Viimased')).toBeVisible()
    expect(pageErrors).toHaveLength(0)
  })

  test('/kopikas/:walletCode/analytics — analytics loads', async ({ fullModePage: page }) => {
    trackErrors(page)
    await page.goto(`/kopikas/${MOCK_WALLET_CODE}/analytics`)
    await waitForLoadingToFinish(page)
    await expect(page.getByText('Ülevaade')).toBeVisible({ timeout: 10_000 })
    // Time range toggle
    await expect(page.getByText('Nädal')).toBeVisible()
    await expect(page.getByText('Kuu')).toBeVisible()
    await expect(page.getByText('Kõik')).toBeVisible()
    expect(pageErrors).toHaveLength(0)
  })

  test('/kopikas/:walletCode/pet — pet detail loads', async ({ fullModePage: page }) => {
    trackErrors(page)
    await page.goto(`/kopikas/${MOCK_WALLET_CODE}/pet`)
    await waitForLoadingToFinish(page)
    await expect(page.getByText('Blob')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Tase 2')).toBeVisible()
    // XP section
    await expect(page.getByText('XP')).toBeVisible()
    expect(pageErrors).toHaveLength(0)
  })

  test('/kopikas/:walletCode/history — history loads', async ({ fullModePage: page }) => {
    trackErrors(page)
    await page.goto(`/kopikas/${MOCK_WALLET_CODE}/history`)
    await waitForLoadingToFinish(page)
    await expect(page.getByText('Ajalugu')).toBeVisible({ timeout: 10_000 })
    // Filter bar with "Kõik" button
    await expect(page.getByRole('button', { name: 'Kõik' })).toBeVisible()
    expect(pageErrors).toHaveLength(0)
  })

  // --- Parent route ---

  test('/kopikas/:walletCode/parent — parent view loads', async ({ fullModePage: page }) => {
    trackErrors(page)
    await page.goto(`/kopikas/${MOCK_WALLET_CODE}/parent`)
    await waitForLoadingToFinish(page)
    // Balance and kid name visible
    await expect(page.getByText('Mari')).toBeVisible({ timeout: 10_000 })
    // Add allowance button
    await expect(page.getByText('Lisa taskuraha')).toBeVisible()
    expect(pageErrors).toHaveLength(0)
  })
})
