import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'index.css'), 'utf8');

function declaration(name: string): string | undefined {
  return new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim();
}

function utility(name: string): string {
  const start = css.indexOf(`@utility ${name} {`);
  if (start === -1) throw new Error(`Missing @utility ${name}`);
  return css.slice(start, css.indexOf('\n}', start));
}

describe('typography', () => {
  it('sets the body in the system font and keeps Mona Sans for headings', () => {
    expect(declaration('--font-sans')).toBe('-apple-system, system-ui, "Segoe UI", Roboto, sans-serif');
    expect(declaration('--font-heading')).toMatch(/^"Mona Sans Variable",/);
  });

  it.each([
    ['large-title', '2.125rem', '2.5625rem'],
    ['title1', '1.75rem', '2.125rem'],
    ['title2', '1.375rem', '1.75rem'],
    ['title3', '1.25rem', '1.5625rem'],
    ['headline', '1.0625rem', '1.375rem'],
    ['body', '1.0625rem', '1.375rem'],
    ['callout', '1rem', '1.3125rem'],
    ['subhead', '0.9375rem', '1.25rem'],
    ['footnote', '0.8125rem', '1.125rem'],
    ['caption', '0.75rem', '1rem'],
  ])('defines text-%s with a fixed line height', (step, size, lineHeight) => {
    expect(declaration(`--text-${step}`)).toBe(size);
    expect(declaration(`--text-${step}--line-height`)).toBe(lineHeight);
  });

  it('drops the old display step', () => {
    expect(declaration('--text-display')).toBeUndefined();
  });

  it('tunes heading-ink toward the iOS large title', () => {
    const rules = utility('heading-ink');
    expect(rules).toContain('font-weight: 750;');
    expect(rules).toContain('font-stretch: 106%;');
    expect(rules).toContain('letter-spacing: -0.015em;');
  });
});
