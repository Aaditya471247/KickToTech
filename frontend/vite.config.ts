import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, the API and Socket.io live on :4000; proxying keeps the browser on one origin (no CORS fuss).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
});
