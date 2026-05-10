import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Backend may probe ports (5001 -> 5002 ...) if the first is in use.
  // Allow override via VITE_BACKEND_URL, otherwise default to 5002 (common dev probe result).
  const backendUrl = env.VITE_BACKEND_URL || 'http://127.0.0.1:5001';

  return {
    plugins: [react()],
    server: {
      port: 3002,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              if (err.code !== 'ECONNREFUSED') {
                console.error('Proxy error:', err.message);
              }
            });
          }
        }
      }
    }
  };
})

