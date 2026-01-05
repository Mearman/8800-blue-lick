import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/8800-blue-lick/',
  plugins: [react()],
  publicDir: 'public-assets', // Use empty/non-existent folder to exclude large assets
})
