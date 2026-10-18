import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'index.css'), 'utf8');

describe('flowchart styles', () => {
  it('drops the React Flow control button rules', () => {
    expect(css).not.toContain('.react-flow__controls-button');
    expect(css).not.toContain('--xy-controls-button');
  });

  it('gives the minimap an opaque rounded card', () => {
    const start = css.indexOf('.react-flow__minimap {');
    const rule = css.slice(start, css.indexOf('}', start));
    expect(rule).toContain('background: var(--surface);');
    expect(rule).toContain('border-radius: var(--radius-group);');
  });
});
