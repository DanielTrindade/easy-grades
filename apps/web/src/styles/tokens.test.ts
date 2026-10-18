import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { composite, contrastRatio, parseHex, type Rgb } from '@/lib/contrast';

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'index.css'), 'utf8');

type Tokens = Record<string, string>;

function rootTokens(media?: string): Tokens {
  const from = media ? css.indexOf(media) : 0;
  if (from === -1) throw new Error(`Missing block: ${media}`);
  const open = css.indexOf(':root {', from);
  const close = css.indexOf('}', open);
  const body = css.slice(open, close);
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}

function color(tokens: Tokens, name: string): Rgb {
  let value = tokens[name];
  for (let hops = 0; value?.startsWith('var(--') && hops < 5; hops++) value = tokens[value.slice(6, -1)];
  if (!value) throw new Error(`Missing token --${name}`);
  return parseHex(value);
}

const light = rootTokens();
const dark = { ...light, ...rootTokens('@media (prefers-color-scheme: dark) {') };
const highContrastLight = { ...light, ...rootTokens('@media (prefers-contrast: more) {') };
const highContrastDark = { ...dark, ...rootTokens('@media (prefers-contrast: more) and (prefers-color-scheme: dark) {') };

const modes = { light, dark, highContrastLight, highContrastDark } as const;
const TEXT = 4.5;
const NON_TEXT = 3;

describe.each(Object.entries(modes))('%s tokens', (_, tokens) => {
  const ratio = (fg: string, bg: string) => contrastRatio(color(tokens, fg), color(tokens, bg));

  it.each(['ink', 'ink-muted', 'pen-ink', 'danger', 'success'])('keeps --%s readable on canvas and surface', (fg) => {
    expect(ratio(fg, 'canvas')).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(fg, 'surface')).toBeGreaterThanOrEqual(TEXT);
  });

  it('keeps tinted badges and filled buttons readable', () => {
    expect(ratio('pen-ink', 'pen-tint')).toBeGreaterThanOrEqual(TEXT);
    expect(ratio('success', 'success-tint')).toBeGreaterThanOrEqual(TEXT);
    expect(ratio('pen-foreground', 'pen')).toBeGreaterThanOrEqual(TEXT);
    expect(ratio('danger-foreground', 'danger')).toBeGreaterThanOrEqual(TEXT);
  });

  it('keeps field borders at 3:1', () => {
    expect(ratio('field', 'canvas')).toBeGreaterThanOrEqual(NON_TEXT);
    expect(ratio('field', 'surface')).toBeGreaterThanOrEqual(NON_TEXT);
  });
});

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('%s glass', (_, tokens) => {
  const alpha = Number.parseFloat(tokens['glass-opacity']!) / 100;

  it.each(['pen', 'ink', 'danger', 'success'])(
    'keeps text on the glass readable with --%s content scrolling under it (sRGB blend, blur ignored)',
    (under) => {
      const glass = composite(color(tokens, 'surface'), color(tokens, under), alpha);
      for (const fg of ['ink', 'ink-muted', 'pen-ink']) {
        expect(contrastRatio(color(tokens, fg), glass)).toBeGreaterThanOrEqual(TEXT);
      }
    },
  );
});
