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

  it('keeps course codes in Mona Sans at a narrower width', () => {
    const rules = utility('code-label');
    expect(rules).toContain('font-family: var(--font-heading);');
    expect(rules).toContain('font-stretch: 87.5%;');
  });
});

function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Missing rule ${selector}`);
  return css.slice(start, css.indexOf('}', start));
}

describe('shape', () => {
  it.each([
    ['card', '1.25rem'],
    ['group', '1rem'],
    ['node', '0.75rem'],
    ['sheet', '1.75rem'],
    ['xl', '1.25rem'],
  ])('defines rounded-%s', (name, value) => {
    expect(declaration(`--radius-${name}`)).toBe(value);
  });
});

describe('glass', () => {
  it('reads every visual property from tokens, so a token switch turns it solid', () => {
    const rules = utility('glass');
    expect(rules).toContain('background-color: var(--glass-tint);');
    expect(rules).toContain('-webkit-backdrop-filter: var(--glass-filter);');
    expect(rules).toContain('backdrop-filter: var(--glass-filter);');
    expect(rules).toContain('box-shadow: inset 0 1px 0 var(--glass-edge), var(--glass-shadow);');
  });

  it('turns solid when the user picks the solid appearance', () => {
    const solid = rule(":root[data-appearance='solid']");
    expect(solid).toContain('--glass-tint: var(--surface);');
    expect(solid).toContain('--glass-filter: none;');
  });

  it('keeps the ink edge when the solid appearance meets increased contrast', () => {
    const solid = rule("@media (prefers-contrast: more) {\n  :root[data-appearance='solid']");
    expect(solid).toContain('--glass-edge: var(--ink);');
  });

  it('turns solid with increased contrast or reduced transparency', () => {
    const start = css.indexOf('@media (prefers-contrast: more), (prefers-reduced-transparency: reduce) {');
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf('}', start));
    expect(block).toContain('--glass-tint: var(--surface);');
    expect(block).toContain('--glass-filter: none;');
    expect(block).toContain('--glass-edge: var(--ink);');
  });

  it('falls back to a solid surface where backdrop-filter is missing', () => {
    expect(css).toContain('@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {');
  });
});

describe('motion', () => {
  it('defines the spring easings as linear() curves', () => {
    expect(declaration('--ease-spring-smooth')).toMatch(/^linear\(0, .*, 1\)$/);
    expect(declaration('--ease-spring-snappy')).toMatch(/^linear\(0, .*, 1\)$/);
  });

  it('drops the unused glide easing', () => {
    expect(declaration('--ease-glide')).toBeUndefined();
  });
});
