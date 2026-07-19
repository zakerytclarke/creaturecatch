import { defineConfig } from 'vite';

// Base path is set for GitHub Pages project sites (https://<user>.github.io/creaturecatch/).
// Override with BASE_PATH env if deploying elsewhere.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/creaturecatch/',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
  },
});
