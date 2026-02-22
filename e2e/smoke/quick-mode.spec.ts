import { test, expect, waitForLoadingToFinish } from '../fixtures/test-fixtures'
import { MOCK_TRIP_CODE } from '../fixtures/mock-data'

test.describe('Quick mode — smoke tests', () => {
  let pageErrors: Error[]

  test.beforeEach(async () => {
    pageErrors = []
  })

  function trackErrors(page: import('@playwright/test').Page) {
    page.on('pageerror', (err) => pageErrors.push(err))
  }

  test('/quick — quick home screen loads', async ({ quickModePage: page }) => {
    trackErrors(page)
    await page.goto('/quick')
    await waitForLoadingToFinish(page)
    await expect(page.locator('#root')).not.toBeEmpty()
    expect(pageErrors).toHaveLength(0)
  })

  test('/t/:code/quick — quick group detail loads', async ({ quickModePage: page }) => {
    trackErrors(page)
    await page.goto(`/t/${MOCK_TRIP_CODE}/quick`)
    await waitForLoadingToFinish(page)
    await expect(page.locator('#root')).not.toBeEmpty()
    expect(pageErrors).toHaveLength(0)
  })

  test('/t/:code/quick/history — quick history loads', async ({ quickModePage: page }) => {
    trackErrors(page)
    await page.goto(`/t/${MOCK_TRIP_CODE}/quick/history`)
    await waitForLoadingToFinish(page)
    await expect(page.locator('#root')).not.toBeEmpty()
    expect(pageErrors).toHaveLength(0)
  })
})
