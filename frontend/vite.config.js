import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Load environment variables
const API_URL = process.env.VITE_API_URL || 'http://localhost:4000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: API_URL,
        changeOrigin: true,
      },
      '/health': {
        target: API_URL,
        changeOrigin: true,
      },
    },
  },
})
