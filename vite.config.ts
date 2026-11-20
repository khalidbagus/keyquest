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
});
