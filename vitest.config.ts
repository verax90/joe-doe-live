import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // i18n and share read location, cookies and navigator at import time
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
});
