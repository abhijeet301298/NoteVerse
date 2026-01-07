import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Your Flask backend URL
        changeOrigin: true,
        // No rewrite needed if your Flask routes already include /api
      },
    },
  },
});