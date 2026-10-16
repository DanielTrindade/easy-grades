import { describe, expect, it } from 'vitest';

const sources = import.meta.glob(['../**/*.{ts,tsx}', '!./legacy-tokens.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const LEGACY = /[a-z-]-(esmeralda|erro|superficie|fundo|texto|suave|linha|campo)(?![\w-])/;

describe('legacy Grafite tokens', () => {
  it.each(Object.entries(sources))('are gone from %s', (_, source) => {
    expect(source).not.toMatch(LEGACY);
  });
});
