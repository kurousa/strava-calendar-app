import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['main.js', 'api.js', 'auth.js', 'manual_import.js', 'formatters/**/*.js']
    },
  },
});
