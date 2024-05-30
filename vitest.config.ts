import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['tests/setup/threejs-setup.ts'],
    coverage: {
      provider: 'v8'
    }
  }
});
