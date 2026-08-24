import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Default to localhost for host-based Vite dev.
// Docker runtime can override via VITE_PROXY_TARGET=http://api-gateway:3000.
const apiProxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3006',
        ws: true
      }
    }
  }
})
