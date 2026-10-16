import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sources = import.meta.glob(['../**/*.{ts,tsx}', '!./legacy-tokens.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const LEGACY = /[a-z-]-(esmeralda|erro|superficie|fundo|texto|suave|linha|campo)(?![\w-])/;
const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'index.css'), 'utf8');

describe('legacy Grafite tokens', () => {
  it('are gone from the stylesheet', () => {
    expect(css).not.toMatch(/var\(--(fundo|superficie|texto|suave|linha|campo|esmeralda|erro)[),]/);
  });

  it.each(Object.entries(sources))('are gone from %s', (_, source) => {
    expect(source).not.toMatch(LEGACY);
  });
});
