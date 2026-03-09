import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isDemo = process.env.VITE_DEMO === 'true';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: isDemo ? '/Real-estate-tracker/' : '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
