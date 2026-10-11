import { courseStates, type CourseState } from './prerequisites';
import type { Curriculum, CurriculumCourse, Transcript } from './schemas';
import { isCompleted } from './status';
import { compareTerms } from './terms';

export interface FlowNode {
  code: string;
  name: string;
  credits: number;
  hours: number;
  idealPeriod: number;
  state: CourseState;
  grade: number | null;
  column: number;
  row: number;
  x: number;
  y: number;
}
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  alternative: boolean;
  satisfied: boolean;
}
export interface FlowLayout {
  nodes: FlowNode[];
  edges: FlowEdge[];
  columns: { period: number; x: number; count: number }[];
  width: number;
  height: number;
}

export function latestGrades(t: Transcript): Map<string, number> {
  const grades = new Map<string, number>();
  const sorted = [...t.entries].filter((e) => isCompleted(e.status) && e.grade !== null).sort((a, b) => compareTerms(a.term, b.term));
  for (const e of sorted) grades.set(e.code, e.grade!);
  return grades;
}

export function layoutFlowchart(
  c: Curriculum,
  t: Transcript,
  opts: { columnWidth?: number; rowHeight?: number; countInProgress?: boolean } = {},
): FlowLayout {
  const columnWidth = opts.columnWidth ?? 280;
  const rowHeight = opts.rowHeight ?? 128;
  const states = courseStates(c, t, { countInProgress: opts.countInProgress ?? false });
  const grades = latestGrades(t);
  const mandatory = c.courses.filter(
    (x): x is CurriculumCourse & { idealPeriod: number } =>
      x.category === 'obrigatoria' && x.idealPeriod !== null && !x.code.startsWith('ENADE'),
  );
  const codes = new Set(mandatory.map((m) => m.code));
  const periods = [...new Set(mandatory.map((m) => m.idealPeriod))].sort((a, b) => a - b);
  const rowOf = new Map<string, number>();
  const nodes: FlowNode[] = [];

  const barycenter = (course: CurriculumCourse): number => {
    const rows = course.prerequisites.flat().map((p) => rowOf.get(p)).filter((r): r is number => r !== undefined);
    return rows.length === 0 ? Number.POSITIVE_INFINITY : rows.reduce((a, b) => a + b, 0) / rows.length;
  };

  const columns = periods.map((period, column) => {
    const sorted = mandatory
      .filter((m) => m.idealPeriod === period)
      .map((m) => ({ m, b: barycenter(m) }))
      .sort((a, b) => {
        const diff = a.b - b.b;
        return Number.isNaN(diff) || diff === 0 ? a.m.code.localeCompare(b.m.code) : diff;
      });
    sorted.forEach(({ m }, row) => {
      rowOf.set(m.code, row);
      nodes.push({
        code: m.code,
        name: m.name,
        credits: m.credits,
        hours: m.hours.total,
        idealPeriod: period,
        state: states.get(m.code) ?? 'bloqueada',
        grade: grades.get(m.code) ?? null,
        column,
        row,
        x: column * columnWidth,
        y: row * rowHeight,
      });
    });
    return { period, x: column * columnWidth, count: sorted.length };
  });

  const edges = new Map<string, FlowEdge>();
  for (const m of mandatory) {
    for (const block of m.prerequisites) {
      for (const source of block) {
        if (!codes.has(source)) continue;
        const id = `${source}->${m.code}`;
        edges.set(id, {
          id,
          source,
          target: m.code,
          alternative: m.prerequisites.length > 1,
          satisfied: states.get(source) === 'concluida',
        });
      }
    }
  }

  return {
    nodes,
    edges: [...edges.values()],
    columns,
    width: periods.length * columnWidth,
    height: Math.max(0, ...columns.map((x) => x.count)) * rowHeight,
  };
}
