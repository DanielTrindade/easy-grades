import { describe, expect, it } from 'vitest';
import { isExportGraphReady } from './export-readiness';

describe('isExportGraphReady', () => {
  it('waits until every visible node and expected edge path is rendered', () => {
    expect(
      isExportGraphReady(
        ['A', 'B'],
        new Set(['A', 'B']),
        ['A-B'],
        new Set(),
      ),
    ).toBe(false);
    expect(
      isExportGraphReady(
        ['A', 'B'],
        new Set(['A']),
        ['A-B'],
        new Set(['A-B']),
      ),
    ).toBe(false);
    expect(
      isExportGraphReady(
        ['A', 'B'],
        new Set(['A', 'B']),
        ['A-B'],
        new Set(['A-B']),
      ),
    ).toBe(true);
  });

  it('treats a graph without edges as ready once its nodes are rendered', () => {
    expect(isExportGraphReady(['A'], new Set(['A']), [], new Set())).toBe(true);
  });
});
