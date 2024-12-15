import { defineConfig } from 'vite';

export default defineConfig({
  base: '/github-stars-semantic-search/',
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  optimizeDeps: {
    exclude: ['@electric-sql/pglite', '@electric-sql/pglite/vector'],
  },
});
