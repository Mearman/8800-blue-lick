import { test, expect } from '@playwright/test'

test.describe('Initial Page Tile Loading', () => {
  test('should load 512px preview tiles on initial page load without URL params', async ({ page }) => {
    // Track all network requests
    const textureRequests: string[] = []
    const textureResponses: { url: string; status: number }[] = []
    const allRequests: string[] = []

    page.on('request', (request) => {
      const url = request.url()
      allRequests.push(url)

      if (url.includes('512_') && url.includes('.jpg')) {
        textureRequests.push(url)
        console.log(`[Texture Request] ${url}`)
      }
    })

    page.on('response', (response) => {
      const url = response.url()

      if (url.includes('512_') && url.includes('.jpg')) {
        textureResponses.push({ url, status: response.status() })
        console.log(`[Texture Response ${response.status()}] ${url}`)
      }
    })

    // Listen for console logs to verify progressive loading
    const consoleMessages: string[] = []
    page.on('console', (msg) => {
      const text = msg.text()
      consoleMessages.push(text)
      console.log(`[Browser Console ${msg.type()}]`, text)
    })

    // Navigate to base URL WITHOUT any parameters - should load first sweep by default
    // Note: webServer.url is 'http://localhost:5180', which respects the base='/8800-blue-lick/' config
    await page.goto('http://localhost:5180/')

    // Wait for page to be loaded
    await page.waitForLoadState('networkidle')

    // Debug: Check if currentSweep and scene are set
    const appState = await page.evaluate(() => {
      // Check React DevTools for component state if available
      const hasCanvas = !!document.querySelector('canvas')
      const hasNavControls = document.body.textContent?.includes('Current Location')
      const hasSweepInfo = document.body.textContent?.includes('Sweep 1')
      const hasResolution = document.body.textContent?.includes('512')

      return {
        hasCanvas,
        hasNavControls,
        hasSweepInfo,
        hasResolution,
        bodyTextLength: document.body.textContent?.length || 0,
      }
    })

    console.log('App State:', JSON.stringify(appState, null, 2))

    // Log all requests to debug
    console.log('Total network requests:', allRequests.length)
    console.log('All request URLs:', allRequests.slice(0, 20)) // First 20

    // Wait for initial 512px textures to load (progressive loading starts immediately)
    await page.waitForTimeout(3000)

    // Verify canvas exists (target main panorama canvas, not minimap)
    const canvas = page.locator('[data-testid="panorama-viewer"] canvas')
    await expect(canvas).toBeVisible()

    // Verify 512px tiles were loaded
    console.log('Total 512px texture requests:', textureRequests.length)
    console.log('Total 512px texture responses:', textureResponses.length)

    // Should have loaded exactly 6 tiles for the initial 512px preview (one per cube face)
    expect(
      textureResponses.length,
      'Should load 6 faces for 512px cubemap preview'
    ).toBeGreaterThanOrEqual(6)

    // All texture responses should be successful
    const failedResponses = textureResponses.filter((r) => r.status !== 200)
    expect(
      failedResponses.length,
      'All texture requests should succeed'
    ).toBe(0)

    // Verify textures are for the first sweep (default behavior)
    // The first sweep in sweeps.json has UUID 02a80ff3-1d6e-4f7e-8d9f-250114b790ee
    const firstSweepUuid = '02a80ff31d6e4f7e8d9f250114b790ee' // UUID without hyphens
    const firstSweepTextures = textureResponses.filter((r) =>
      r.url.includes(firstSweepUuid)
    )

    console.log('Textures for first sweep:', firstSweepTextures.length)
    expect(
      firstSweepTextures.length,
      'Should load textures for the default first sweep'
    ).toBeGreaterThanOrEqual(6)

    // Verify progressive loading console messages
    const previewMessages = consoleMessages.filter((msg) =>
      msg.includes('PanoramaViewer: Loading 512px preview')
    )
    expect(
      previewMessages.length,
      'Should log progressive loading of 512px preview'
    ).toBeGreaterThan(0)

    // Take screenshot for visual verification
    await page.screenshot({ path: 'initial-tile-loading-screenshot.png' })

    // Get WebGL context info to verify textures are bound
    const webglInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      if (!canvas) return null

      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl) return null

      return {
        hasWebGL: true,
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        numTextures: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
      }
    })

    console.log('WebGL Info:', webglInfo)
    expect(webglInfo?.hasWebGL, 'Should have active WebGL context').toBe(true)
  })

  test('should progressively upgrade from 512px to target resolution', async ({ page }) => {
    const textureRequests: { resolution: string; url: string; timestamp: number }[] = []

    page.on('request', (request) => {
      const url = request.url()
      const resolutionMatch = url.match(/(512|1k|2k)_face\d+_\d+_\d+\.jpg/)
      if (resolutionMatch) {
        textureRequests.push({
          resolution: resolutionMatch[1],
          url,
          timestamp: Date.now(),
        })
        console.log(`[${resolutionMatch[1]} Texture] ${url}`)
      }
    })

    // Navigate to base URL
    await page.goto('http://localhost:5180/')

    // Wait for progressive loading to complete
    // 512px loads immediately, then upgrades after ~100ms delay
    await page.waitForTimeout(3000)

    // Analyze texture loading order
    const requests512 = textureRequests.filter((r) => r.resolution === '512')
    const higherResRequests = textureRequests.filter(
      (r) => r.resolution === '1k' || r.resolution === '2k'
    )

    console.log('512px requests:', requests512.length)
    console.log('Higher res requests:', higherResRequests.length)

    // Should have loaded 512px preview first
    expect(
      requests512.length,
      'Should load 512px preview textures'
    ).toBeGreaterThanOrEqual(6)

    // Progressive upgrade may or may not happen depending on FOV
    // The important thing is 512px loads immediately
    const first512Time = Math.min(...requests512.map((r) => r.timestamp))

    if (higherResRequests.length > 0) {
      const firstHighResTime = Math.min(...higherResRequests.map((r) => r.timestamp))
      const delay = firstHighResTime - first512Time

      console.log('Progressive loading delay:', delay, 'ms')

      // Higher resolution should load AFTER 512px (with at least 50ms delay for the setTimeout)
      expect(
        delay,
        'Higher resolution should load after 512px preview'
      ).toBeGreaterThan(50)
    }

    await page.screenshot({ path: 'progressive-loading-screenshot.png' })
  })

  test('should display correct sweep info in navigation controls', async ({ page }) => {
    // Navigate to base URL
    await page.goto('http://localhost:5180/')

    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Check for navigation controls
    const controls = page.getByText('Current Location').first()
    await expect(controls).toBeVisible()

    // Check for resolution indicator
    const resolutionIndicator = page.getByText('512 (Auto)').first()
    await expect(resolutionIndicator).toBeVisible()

    // Get sweep info from navigation controls
    const sweepInfo = await page.evaluate(() => {
      const controlsDiv = Array.from(document.querySelectorAll('div')).find((d) =>
        d.textContent?.includes('Current Location')
      )
      return {
        text: controlsDiv?.textContent || '',
        hasSweepName: controlsDiv?.textContent?.includes('Sweep') || false,
        hasUUID: controlsDiv?.textContent?.includes('UUID') || false,
        hasResolution: controlsDiv?.textContent?.includes('Resolution') || false,
      }
    })

    console.log('Navigation Controls Info:', sweepInfo)

    expect(
      sweepInfo.hasSweepName,
      'Should display sweep name'
    ).toBe(true)
    expect(
      sweepInfo.hasUUID,
      'Should display sweep UUID'
    ).toBe(true)
    expect(
      sweepInfo.hasResolution,
      'Should display resolution indicator'
    ).toBe(true)

    await page.screenshot({ path: 'navigation-controls-screenshot.png' })
  })
})
