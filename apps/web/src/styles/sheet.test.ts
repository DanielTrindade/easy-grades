import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'index.css'), 'utf8');

function rule(source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Missing rule ${selector}`);
  return source.slice(start, source.indexOf('}', start));
}

function rootIn(source: string, marker: string): string {
  const block = source.indexOf(marker);
  if (block === -1) throw new Error(`Missing block ${marker}`);
  const root = source.indexOf(':root {', block);
  if (root === -1) throw new Error(`Missing :root after ${marker}`);
  return source.slice(root, source.indexOf('}', root));
}

const DETENT = "[data-slot='sheet-content'][data-detent]";
const OPEN = `${DETENT}[data-state='open']`;
const CLOSED = `${DETENT}[data-state='closed']`;
const DRAGGING = `${DETENT}[data-dragging]`;
const LARGE = "[data-slot='sheet-content'][data-detent='large']";
const OVERLAY = "[data-slot='sheet-overlay']";
const EXPANDED_TINT = '--glass-expanded-tint';
const EXPANDED_TINT_VALUE = `${EXPANDED_TINT}: color-mix(in oklab, var(--surface) 97%, transparent);`;

describe('detent sheet motion', () => {
  it('positions the sheet from --detent-offset and settles it with the smooth spring', () => {
    const base = rule(css, DETENT);
    expect(base).toContain('transform: translateY(var(--detent-offset));');
    expect(base).toContain('transition: transform 380ms var(--ease-spring-smooth);');
  });

  it('runs the entrance and exit from data-state with the drawer ease', () => {
    expect(css).toContain('@keyframes detent-in {');
    expect(css).toContain('@keyframes detent-out {');
    expect(rule(css, OPEN)).toContain('animation: detent-in 300ms var(--ease-drawer)');
    expect(rule(css, CLOSED)).toContain('animation: detent-out 200ms var(--ease-drawer)');
  });

  it('follows the finger with no transition and no running entrance animation', () => {
    const dragging = rule(css, DRAGGING);
    expect(dragging).toContain('transition: none;');
    expect(dragging).toContain('animation: none;');
  });

  it('declares the dragging override after the state animations, so it wins the cascade', () => {
    const dragging = css.indexOf(`${DRAGGING} {`);
    expect(dragging).toBeGreaterThan(css.indexOf(`${OPEN} {`));
    expect(dragging).toBeGreaterThan(css.indexOf(`${CLOSED} {`));
  });
});

describe('detent sheet glass', () => {
  it('turns the large sheet almost opaque through the expanded tint token', () => {
    expect(rule(css, ':root')).toContain(EXPANDED_TINT_VALUE);
    expect(rule(css, LARGE)).toContain('--glass-tint: var(--glass-expanded-tint);');
  });

  it('keeps the expanded tint solid wherever the glass has to go solid', () => {
    const base = css.indexOf(EXPANDED_TINT_VALUE);
    expect(base).toBeGreaterThan(-1);
    for (const marker of [
      '@supports not (',
      '@media (prefers-contrast: more), (prefers-reduced-transparency: reduce)',
    ]) {
      expect(css.indexOf(marker)).toBeGreaterThan(base);
      expect(rootIn(css, marker)).toContain(`${EXPANDED_TINT}: var(--surface);`);
    }
    expect(css.indexOf(":root[data-appearance='solid'] {")).toBeGreaterThan(base);
    expect(rule(css, ":root[data-appearance='solid']")).toContain(`${EXPANDED_TINT}: var(--surface);`);
  });
});

describe('sheet overlay', () => {
  it('has a single dimming rule, so the first occurrence is the one in use', () => {
    expect(css.split(`${OVERLAY} {`).length - 1).toBe(1);
  });

  it('dims the background and lightens it as the sheet is dragged down', () => {
    expect(rule(css, OVERLAY)).toContain('background-color: rgb(0 0 0 / calc(0.4 * (1 - var(--sheet-drag, 0))));');
  });

  it('takes the overlay blur off instead of stacking it over the sheet glass', () => {
    const overlay = rule(css, OVERLAY);
    expect(overlay).toContain('-webkit-backdrop-filter: none;');
    expect(overlay).toContain('backdrop-filter: none;');
  });
});

describe('reduced motion', () => {
  const reduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));

  it('switches detents without a spring', () => {
    expect(rule(reduced, DETENT)).toContain('transition: none;');
    expect(reduced).not.toContain('380ms');
    expect(reduced).not.toContain('detent-in');
  });

  it('fades the sheet in and out in at most 150 ms, without touching the blur', () => {
    expect(rule(reduced, OPEN)).toContain('animation: sheet-fade-in 150ms');
    expect(rule(reduced, CLOSED)).toContain('animation: sheet-fade-out 150ms');
    expect(reduced).not.toContain('blur');
  });

  it('keeps the dragging override after the fades, so it still wins the cascade', () => {
    expect(rule(reduced, DRAGGING)).toContain('animation: none;');
    expect(reduced.indexOf(`${DRAGGING} {`)).toBeGreaterThan(reduced.indexOf(`${OPEN} {`));
  });
});
