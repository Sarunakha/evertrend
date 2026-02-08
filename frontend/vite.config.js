import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            // Only log actual errors, not connection refused (backend not running)
            if (err.code !== 'ECONNREFUSED') {
              console.error('Proxy error:', err.message);
            }
          });
          // Remove verbose request logging - it's too noisy
        }
      }
    }
  }
})

