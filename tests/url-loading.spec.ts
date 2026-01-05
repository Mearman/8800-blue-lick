import { test, expect } from '@playwright/test'

test.describe('URL Parameter Loading', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for all console messages
    page.on('console', msg => {
      console.log(`[Browser Console ${msg.type()}]`, msg.text())
    })

    // Listen for all requests
    page.on('request', request => {
      if (request.url().includes('jpg')) {
        console.log(`[Image Request] ${request.url()}`)
      }
    })

    // Listen for all responses
    page.on('response', response => {
      if (response.url().includes('jpg')) {
        console.log(`[Image Response ${response.status()}] ${response.url()}`)
      }
    })
  })

  test('should load panorama from URL parameters', async ({ page }) => {
    const testSweep = '02a80ff3-1d6e-4f7e-8d9f-250114b790ee' // First sweep (correct UUID)

    // Track panorama texture requests BEFORE navigation
    const requests: string[] = []
    page.on('request', request => {
      if (request.url().includes(testSweep.replace(/-/g, ''))) {
        requests.push(request.url())
      }
    })

    // Navigate to app with URL parameters
    await page.goto(`http://localhost:5180/?sweep=${testSweep}&x=0&y=0&z=0&pitch=0&yaw=0`)

    // Wait for page to be loaded
    await page.waitForLoadState('networkidle')

    // Wait for textures to load
    await page.waitForTimeout(3000)

    console.log('Total texture requests for sweep:', requests.length)
    console.log('First 3 requests:', requests.slice(0, 3))

    // Take screenshot for visual inspection
    await page.screenshot({ path: 'test-screenshot.png', fullPage: true })

    // Check if canvas exists (target main panorama canvas, not minimap)
    const canvas = page.locator('[data-testid="panorama-viewer"] canvas')
    await expect(canvas).toBeVisible()

    // Check if any textures were loaded
    expect(requests.length, 'Should have loaded panorama textures').toBeGreaterThan(0)
  })

  test('debug: inspect page state', async ({ page }) => {
    const testSweep = '02a80ff3-1d6e-4f7e-8d9f-250114b790ee' // First sweep (correct UUID)

    await page.goto(`http://localhost:5180/?sweep=${testSweep}&x=0&y=0&z=0&pitch=0&yaw=0`)

    // Wait for initial render
    await page.waitForTimeout(1000)

    // Get page state
    const state = await page.evaluate(() => {
      // Check React state via window if available, or inspect DOM
      const canvas = document.querySelector('canvas')
      const hasCanvas = !!canvas

      // Check if WebGL context exists
      let hasWebGL = false
      if (canvas) {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
        hasWebGL = !!gl
      }

      // Check for sweep indicator
      const sweepElements = document.querySelectorAll('*')
      let sweepText = ''
      for (const el of sweepElements) {
        if (el.textContent?.includes('Sweep') || el.textContent?.includes('UUID')) {
          sweepText = el.textContent || ''
          break
        }
      }

      return {
        hasCanvas,
        hasWebGL,
        sweepText,
        url: window.location.href,
        bodyHTML: document.body.innerHTML.substring(0, 500)
      }
    })

    console.log('Page State:', JSON.stringify(state, null, 2))

    await page.screenshot({ path: 'debug-screenshot.png' })
  })
})
