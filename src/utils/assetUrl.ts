/**
 * Get the base URL for loading Matterport assets
 *
 * In production, uses raw GitHub URLs to serve large assets (823MB) separately
 * from the GitHub Pages deployment. In development, uses the local public folder.
 *
 * @returns The base URL for asset loading
 */
export function getAssetsBaseUrl(): string {
  // Use production environment variable if set (raw GitHub URLs)
  if (import.meta.env.VITE_ASSETS_BASE_URL) {
    return import.meta.env.VITE_ASSETS_BASE_URL
  }

  // Fall back to Vite's BASE_URL + assets (local development)
  return import.meta.env.BASE_URL + 'assets/'
}
