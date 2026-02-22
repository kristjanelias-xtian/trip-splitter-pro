import { test, expect, waitForLoadingToFinish } from '../fixtures/test-fixtures'
import { MOCK_TRIP_CODE } from '../fixtures/mock-data'

test.describe('Full mode — smoke tests', () => {
  let pageErrors: Error[]

  test.beforeEach(async () => {
    pageErrors = []
  })

  function trackErrors(page: import('@playwright/test').Page) {
    page.on('pageerror', (err) => pageErrors.push(err))
  }

  test('/ — home page loads', async ({ fullModePage: page }) => {
    trackErrors(page)
    await page.goto('/')
    await waitForLoadingToFinish(page)
    // In full mode, ConditionalHomePage renders HomePage in-place (no redirect)
    await expect(page.locator('#root')).not.toBeEmpty()
    expect(pageErrors).toHaveLength(0)
  })

  test('/create-trip — create trip page loads', async ({ fullModePage: page }) => {
    trackErrors(page)
    await page.goto('/create-trip')
    await waitForLoadingToFinish(page)
    await expect(page.locator('#root')).not.toBeEmpty()
    expect(pageErrors).toHaveLength(0)
  })

  test('/t/:code/expenses — expenses page loads', async ({ fullModePage: page }) => {
    trackErrors(page)
    await page.goto(`/t/${MOCK_TRIP_CODE}/expenses`)
    await waitForLoadingToFinish(page)
    await expect(page.locator('#root')).not.toBeEmpty()
    expect(pageErrors).toHaveLength(0)
  })

  test('/t/:code/settlements — settlements page loads', async ({ fullModePage: page }) => {
    trackErrors(page)
    await page.goto(`/t/${MOCK_TRIP_CODE}/settlements`)
    await waitForLoadingToFinish(page)
    await expect(page.locator('#root')).not.toBeEmpty()
    expect(pageErrors).toHaveLength(0)
  })

  test('/t/:code/planner — planner page loads', async ({ fullModePage: page }) => {
    trackErrors(page)
    await page.goto(`/t/${MOCK_TRIP_CODE}/planner`)
    await waitForLoadingToFinish(page)
    await expect(page.locator('#root')).not.toBeEmpty()
    expect(pageErrors).toHaveLength(0)
  })

  test('/t/:code/shopping — shopping page loads', async ({ fullModePage: page }) => {
    trackErrors(page)
    await page.goto(`/t/${MOCK_TRIP_CODE}/shopping`)
    await waitForLoadingToFinish(page)
    await expect(page.locator('#root')).not.toBeEmpty()
    expect(pageErrors).toHaveLength(0)
  })

  test('/t/:code/dashboard — dashboard page loads', async ({ fullModePage: page }) => {
    trackErrors(page)
    await page.goto(`/t/${MOCK_TRIP_CODE}/dashboard`)
    await waitForLoadingToFinish(page)
    await expect(page.locator('#root')).not.toBeEmpty()
    expect(pageErrors).toHaveLength(0)
  })

  test('/t/:code/manage — manage trip page loads', async ({ fullModePage: page }) => {
    trackErrors(page)
    await page.goto(`/t/${MOCK_TRIP_CODE}/manage`)
    await waitForLoadingToFinish(page)
    await expect(page.locator('#root')).not.toBeEmpty()
    expect(pageErrors).toHaveLength(0)
  })
})
