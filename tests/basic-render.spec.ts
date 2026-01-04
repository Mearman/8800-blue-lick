import { test, expect } from '@playwright/test'

test.describe('Basic Rendering', () => {
  test('should render canvas without URL params', async ({ page }) => {
    // Capture console messages
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
      console.log(`[${msg.type()}]`, msg.text())
    })
    // Navigate to app WITHOUT URL parameters - should default to first sweep
    await page.goto('http://localhost:5180/8800-blue-lick/')

    // Wait for React to mount
    await page.waitForTimeout(2000)

    // Get page state
    const state = await page.evaluate(() => {
      const root = document.querySelector('#root')
      const hasContent = root?.innerHTML.length > 0
      const canvas = document.querySelector('canvas')

      return {
        rootInnerHTML: root?.innerHTML.substring(0, 200),
        hasContent,
        hasCanvas: !!canvas
      }
    })

    console.log('Initial State:', JSON.stringify(state, null, 2))

    // Take screenshot
    await page.screenshot({ path: 'basic-render-screenshot.png' })
  })
})
