import { compareTerms, formatTerm, isCompleted, isFailed, type TermCr, type Transcript } from '@easy-grades/core';

export function crDomain(values: (number | null)[]): [number, number] {
  const present = values.filter((v): v is number => v !== null);
  const min = present.length ? Math.min(...present) : 0;
  return [Math.max(0, Math.floor(min) - 1), 10];
}

export function crTicks([min, max]: [number, number]): number[] {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

export function hoursByTerm(t: Transcript): { term: string; done: number; failed: number }[] {
  const terms = [...new Set(t.entries.map((e) => e.term))].sort(compareTerms);
  return terms
    .map((term) => {
      const entries = t.entries.filter((e) => e.term === term);
      const sum = (pick: (s: (typeof entries)[number]['status']) => boolean) =>
        entries.filter((e) => pick(e.status)).reduce((total, e) => total + (e.hours ?? 0), 0);
      return { term: formatTerm(term), done: sum(isCompleted), failed: sum(isFailed) };
    })
    .filter((row) => row.done + row.failed > 0);
}

export function projectionData(history: TermCr[], projected: number | null, projectedTerm: string | null) {
  const rows: { term: string; cumulativeCr: number | null; projected: number | null }[] = history.map((h) => ({
    term: formatTerm(h.term),
    cumulativeCr: h.cumulativeCr,
    projected: null,
  }));
  const last = rows.at(-1);
  if (last && projected !== null && projectedTerm) {
    last.projected = last.cumulativeCr; // the dashed line starts where the real one ends
    rows.push({ term: formatTerm(projectedTerm), cumulativeCr: null, projected });
  }
  return rows;
}
