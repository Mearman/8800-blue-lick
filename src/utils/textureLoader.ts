import * as THREE from 'three'

/**
 * Texture resolution levels
 */
export type TextureResolution = '512' | '1k' | '2k'

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
  const loader = new THREE.TextureLoader()
  const textures: THREE.Texture[] = []

  // Remove hyphens from UUID to match directory naming convention
  const sanitizedUuid = sweepUuid.replace(/-/g, '')

  // Matterport face order mapping to Three.js BoxGeometry faces
  // Three.js order: [right, left, top, bottom, front, back]
  // Matterport files: face4, face2, face0, face5, face1, face3
  const matterportFaceOrder = [4, 2, 0, 5, 1, 3]

  // Load each of the 6 cube faces in correct order
  // For now, we'll load a single tile per face (simplified approach)
  // TODO: Implement tiled loading for higher resolutions
  for (let i = 0; i < 6; i++) {
    const face = matterportFaceOrder[i]
    const textureUrl = `${basePath}/panoramas/${sanitizedUuid}/${resolution}_face${face}_0_0.jpg`

    try {
      const texture = await loader.loadAsync(textureUrl)
      texture.colorSpace = THREE.SRGBColorSpace
      textures.push(texture)
    } catch (error) {
      console.error(`Failed to load texture: ${textureUrl}`, error)
      throw error
    }
  }

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
  const tilesPerRow = resolution === '512' ? 1 : resolution === '1k' ? 4 : 8
  const tiles: string[] = []

  // Remove hyphens from UUID to match directory naming convention
  const sanitizedUuid = sweepUuid.replace(/-/g, '')

  for (let row = 0; row < tilesPerRow; row++) {
    for (let col = 0; col < tilesPerRow; col++) {
      tiles.push(`${basePath}/panoramas/${sanitizedUuid}/${resolution}_face${face}_${row}_${col}.jpg`)
    }
  }

  return tiles
}
