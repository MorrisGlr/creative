import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/scripts/__tests__/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/scripts/**/*.ts'],
      exclude: [
        'src/scripts/content.ts',
        'src/scripts/lens-warp.ts',
        'src/scripts/media-visibility.ts',
        'src/scripts/prefetch.ts',
        'src/scripts/__tests__/**',
      ],
    },
  },
});
