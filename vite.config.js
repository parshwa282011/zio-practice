import { defineConfig } from 'vite';

// Relative base so the static build works from any path (GitHub Pages project sites, local preview, …).
export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 700 },
  test: { environment: 'jsdom', include: ['tests/**/*.test.js'] },
});
