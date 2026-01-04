import * as THREE from 'three'

/**
 * Texture resolution levels
 */
export type TextureResolution = '512' | '1k' | '2k'

/**
 * Get tiles per side for a given resolution
 * 512: 1×1 grid (1 tile)
 * 1k: 2×2 grid (4 tiles)
 * 2k: 4×4 grid (16 tiles)
 */
function getTilesPerSide(resolution: TextureResolution): number {
  switch (resolution) {
    case '512':
      return 1
    case '1k':
      return 2
    case '2k':
      return 4
    default:
      return 1
  }
}

/**
 * Load a single tiled texture for one face
 * Combines multiple tiles into a single canvas texture
 * @param tileUrls - Array of tile URLs to load and combine
 * @param tilesPerSide - Number of tiles per row/column
 * @param faceName - Face name for logging
 * @returns Promise resolving to combined texture
 */
async function loadTiledTexture(
  tileUrls: string[],
  tilesPerSide: number,
  faceName: string
): Promise<THREE.Texture> {
  const tileSize = 512

  // For single tile (512), just load it directly
  if (tilesPerSide === 1) {
    const loader = new THREE.TextureLoader()
    const texture = await loader.loadAsync(tileUrls[0])
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  // For multiple tiles, load and combine them
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get 2D context for tile composition')
  }

  const fullSize = tileSize * tilesPerSide
  canvas.width = fullSize
  canvas.height = fullSize

  // Load all tile images
  const loadResults = await Promise.all(
    tileUrls.map(
      (url) =>
        new Promise<{
          img: HTMLImageElement
          row: number
          col: number
          success: boolean
        }>((resolve) => {
          const img = new Image()
          img.onload = () =>
            resolve({
              img,
              row: Math.floor(tileUrls.indexOf(url) / tilesPerSide),
              col: tileUrls.indexOf(url) % tilesPerSide,
              success: true,
            })
          img.onerror = () => {
            console.warn(`Failed to load tile: ${url}`)
            resolve({
              img,
              row: Math.floor(tileUrls.indexOf(url) / tilesPerSide),
              col: tileUrls.indexOf(url) % tilesPerSide,
              success: false,
            })
          }
          img.src = url
        })
    )
  )

  // Draw successful tiles to canvas
  let loadedCount = 0
  loadResults.forEach(({ img, row, col, success }) => {
    if (success) {
      // Transpose coordinates: swap row and col
      // row maps to X, col maps to Y (diagonal reflection)
      const x = row * tileSize
      const y = col * tileSize
      ctx.drawImage(img, x, y, tileSize, tileSize)
      loadedCount++
    }
  })

  console.log(`Loaded ${loadedCount}/${loadResults.length} tiles for ${faceName}`)

  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  return texture
}

/**
 * Load a tiled cubemap texture for a panorama
 * @param sweepUuid - UUID of the sweep
 * @param resolution - Texture resolution ('512', '1k', '2k')
 * @param basePath - Base path to assets (default: uses Vite base URL + assets/BGMifUnvLxQ)
 * @returns Promise resolving to array of 6 textures (one per cube face)
 */
export async function loadCubemapTextures(
  sweepUuid: string,
  resolution: TextureResolution = '1k',
  basePath: string = `${import.meta.env.BASE_URL}assets/BGMifUnvLxQ`
): Promise<THREE.Texture[]> {
  // Remove hyphens from UUID to match directory naming convention
  const sanitizedUuid = sweepUuid.replace(/-/g, '')

  // Matterport face order mapping to Three.js BoxGeometry faces
  // Three.js order: [right, left, top, bottom, front, back]
  // Matterport files: face4, face2, face0, face5, face1, face3
  const matterportFaceOrder = [4, 2, 0, 5, 1, 3]

  const tilesPerSide = getTilesPerSide(resolution)

  // Load each of the 6 cube faces in correct order
  const textures = await Promise.all(
    matterportFaceOrder.map(async (face) => {
      // Generate tile URLs for this face
      const tileUrls: string[] = []
      for (let row = 0; row < tilesPerSide; row++) {
        for (let col = 0; col < tilesPerSide; col++) {
          tileUrls.push(
            `${basePath}/panoramas/${sanitizedUuid}/${resolution}_face${face}_${row}_${col}.jpg`
          )
        }
      }

      // Load and combine tiles
      const texture = await loadTiledTexture(tileUrls, tilesPerSide, `face${face}`)

      // Flip horizontally to correct mirroring when viewing from inside cube
      texture.center.set(0.5, 0.5)
      texture.repeat.set(-1, 1)
      texture.needsUpdate = true

      return texture
    })
  )

  return textures
}

/**
 * Get all tile paths for a specific resolution and face
 * @param sweepUuid - UUID of the sweep
 * @param resolution - Texture resolution
 * @param face - Cube face index (0-5)
 * @param basePath - Base path to assets (default: uses Vite base URL + assets/BGMifUnvLxQ)
 * @returns Array of tile URLs for the face
 */
export function getTilePaths(
  sweepUuid: string,
  resolution: TextureResolution,
  face: number,
  basePath: string = `${import.meta.env.BASE_URL}assets/BGMifUnvLxQ`
): string[] {
  const tilesPerSide = getTilesPerSide(resolution)
  const tiles: string[] = []

  // Remove hyphens from UUID to match directory naming convention
  const sanitizedUuid = sweepUuid.replace(/-/g, '')

  for (let row = 0; row < tilesPerSide; row++) {
    for (let col = 0; col < tilesPerSide; col++) {
      tiles.push(`${basePath}/panoramas/${sanitizedUuid}/${resolution}_face${face}_${row}_${col}.jpg`)
    }
  }

  return tiles
}
