import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@keyquest/rive-canvas': resolve(
        import.meta.dirname,
        'vendor/rive-canvas/index.mjs'
      ),
    },
  },
  optimizeDeps: {
    // Phaser is only reached through a dynamic import. Pre-bundling it stops the
    // dev server from discovering it late and reloading the page mid-session.
    include: ['phaser'],
  },
});
