import { describe, expect, it } from 'vitest';
import { sampleCurriculum as c, sampleTranscript as t } from './__fixtures__/sample';
import { layoutFlowchart } from './flowchart';

describe('layoutFlowchart', () => {
  const layout = layoutFlowchart(c, t);
  const node = (code: string) => layout.nodes.find((n) => n.code === code)!;
  const column = (i: number) => layout.nodes.filter((n) => n.column === i).sort((a, b) => a.row - b.row).map((n) => n.code);

  it('contains only mandatory courses with an ideal period (no ENADE)', () => {
    expect(layout.nodes).toHaveLength(35);
    expect(layout.nodes.some((n) => n.code.startsWith('ENADE'))).toBe(false);
    expect(layout.columns.map((x) => x.period)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('orders the first column by code and later columns by prerequisite barycenter', () => {
    expect(column(0)).toEqual(['ICC001', 'ICC112', 'ICC114', 'ICC120', 'IEM075']);
    expect(column(1)).toEqual(['ICC002', 'ICC040', 'ICC260', 'IEM076', 'ICC107', 'IEM012']);
  });

  it('positions nodes on a grid', () => {
    expect(node('ICC002')).toMatchObject({ x: 280, y: 0, column: 1, row: 0 });
    expect(layout.width).toBe(8 * 280);
  });

  it('carries state and latest grade', () => {
    expect(node('ICC001')).toMatchObject({ state: 'concluida', grade: 8.7 });
    expect(node('ICC006')).toMatchObject({ state: 'em_curso', grade: null });
  });

  it('builds prerequisite edges with satisfaction info', () => {
    const edge = (id: string) => layout.edges.find((e) => e.id === id);
    expect(edge('ICC001->ICC002')).toMatchObject({ satisfied: true, alternative: false });
    expect(edge('ICC412->ICC418')).toMatchObject({ satisfied: false });
    expect(edge('ICC431->ICC150')).toMatchObject({ satisfied: true });
    expect(edge('ICC431->ICC418')).toBeUndefined();
  });
});
