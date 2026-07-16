import { defineConfig } from 'vite';

export default defineConfig({
  // itch.io hosts HTML5 games inside a generated subdirectory. Relative build
  // URLs ensure index.html, JavaScript, CSS, and assets all resolve correctly.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
