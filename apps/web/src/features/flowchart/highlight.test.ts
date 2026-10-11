import { layoutFlowchart } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import type { NodeChange } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { highlightSet, nextPinned, visibleGraph } from './highlight';

describe('nextPinned', () => {
  const select = (id: string, selected: boolean): NodeChange => ({ type: 'select', id, selected });

  it('pins the course that becomes selected', () => {
    expect(nextPinned(null, select('ICC431', true))).toBe('ICC431');
  });
  it('moves the pin to the newly selected course', () => {
    expect(nextPinned('ICC431', select('IEM075', true))).toBe('IEM075');
  });
  it('unpins only the course that was deselected', () => {
    expect(nextPinned('ICC431', select('ICC431', false))).toBeNull();
    expect(nextPinned('ICC431', select('IEM075', false))).toBe('ICC431');
  });
  it('ignores changes that are not selection', () => {
    expect(nextPinned('ICC431', { type: 'remove', id: 'ICC431' })).toBe('ICC431');
  });
});

describe('highlightSet', () => {
  it('returns null without focus', () => {
    expect(highlightSet(sampleCurriculum, null)).toBeNull();
  });
  it('includes the course, its prerequisites and what it unlocks', () => {
    const set = highlightSet(sampleCurriculum, 'ICC431')!;
    expect(set.has('ICC431')).toBe(true);
    expect(set.has('ICC430')).toBe(true);
    expect(set.has('ICC001')).toBe(true);
    expect(set.has('ICC404')).toBe(true);
    expect(set.has('ICC150')).toBe(true);
    expect(set.has('IEM075')).toBe(false);
  });
});

describe('visibleGraph', () => {
  it('drops completed courses and their edges when only the remaining path is shown', () => {
    const { nodes, edges } = layoutFlowchart(sampleCurriculum, sampleTranscript);
    const remaining = visibleGraph(nodes, edges, true);
    expect(remaining.nodes.every((n) => n.state !== 'concluida')).toBe(true);
    expect(remaining.nodes.map((n) => n.code)).toContain('ICC418');
    expect(remaining.edges.map((e) => e.id)).toEqual(['ICC412->ICC418']);
    expect(visibleGraph(nodes, edges, false).nodes).toHaveLength(nodes.length);
  });
});
