import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: '/8800-blue-lick/',
  plugins: [react()],
  // Don't copy public folder during build (command === 'build')
  // Assets served from raw GitHub URLs in production
  publicDir: command === 'build' ? false : undefined,
}))
