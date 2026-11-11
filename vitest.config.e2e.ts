import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import tsconfigPaths from 'vite-tsconfig-paths';

dotenv.config({ path: `${process.cwd()}/.env` });

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
