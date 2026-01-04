import type { TextureResolution } from './textureLoader'

/**
 * Calculate required texture resolution based on camera FOV
 * Uses screen pixel coverage to determine optimal texture quality
 *
 * Algorithm:
 * 1. Calculate visible scene dimensions at the face distance
 * 2. Determine how many screen pixels a cube face occupies
 * 3. Select resolution based on pixel coverage thresholds
 *
 * Resolution targets:
 * - 512: up to ~600 screen pixels per face
 * - 1k (1024px): up to ~1200 screen pixels per face
 * - 2k (2048px): larger than ~1200 screen pixels per face
 *
 * @param fov - Camera field of view in degrees
 * @param cubeSize - Size of the cube geometry (default: 10)
 * @returns Required texture resolution for optimal quality
 */
export function calculateRequiredResolution(
  fov: number,
  cubeSize: number = 10
): TextureResolution {
  const screenWidth = window.innerWidth
  const screenHeight = window.innerHeight

  // Camera and scene parameters
  const faceDistance = cubeSize / 2 // Distance to each face

  // Calculate FOV in radians
  const fovRadians = fov * (Math.PI / 180)

  // Calculate visible scene dimensions at the face distance
  // For a perspective camera: visible_size = 2 * distance * tan(FOV / 2)
  const visibleHeight = 2 * faceDistance * Math.tan(fovRadians / 2)
  const aspect = screenWidth / screenHeight
  const visibleWidth = visibleHeight * aspect

  // Calculate what portion of the visible area a cube face occupies
  const faceWidthRatio = cubeSize / visibleWidth
  const faceHeightRatio = cubeSize / visibleHeight

  // Project to screen pixels
  const faceWidthPixels = faceWidthRatio * screenWidth
  const faceHeightPixels = faceHeightRatio * screenHeight

  // Use the larger dimension (conservative estimate for quality)
  const maxFacePixels = Math.max(faceWidthPixels, faceHeightPixels)

  // Select resolution based on pixel coverage
  // Target: ~1 texel per screen pixel for optimal quality
  if (maxFacePixels < 600) {
    return '512'
  } else if (maxFacePixels < 1200) {
    return '1k'
  } else {
    return '2k'
  }
}
