import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  plugins: [react()],
  build: {
    outDir: path.resolve(root, '..', 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(root, 'index.html'),
        admin: path.resolve(root, 'admin.html')
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
      '/webhooks': 'http://localhost:3000'
    }
  }
});
