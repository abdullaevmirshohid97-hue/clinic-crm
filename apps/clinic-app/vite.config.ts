import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-htaccess',
      closeBundle() {
        try {
          copyFileSync(
            path.resolve(__dirname, '.htaccess'),
            path.resolve(__dirname, 'dist/.htaccess')
          );
          console.log('✅ .htaccess copied to dist/');
        } catch (e) {
          console.log('⚠️ .htaccess not found, skipping...');
        }
      }
    }
  ],
  // Subdomain deployment expects absolute asset paths from root.
  base: '/',
  root: '.',
  envPrefix: 'VITE_',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5000,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api/v1': {
        target: 'https://crm.clary.uz',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  envDir: __dirname,
});
