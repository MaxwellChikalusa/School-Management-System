import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Redirect API calls during local dev to your backend
      '/auth': {
        target: process.env.VITE_API_URL, // https://school-management-api-6i2r.onrender.com
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
