import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts', 'src/parser-worker.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  // Core is TS source in the workspace: bundle it. Runtime deps stay external.
  noExternal: ['@easy-grades/core'],
});
