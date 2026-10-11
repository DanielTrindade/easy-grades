import type { Status, Transcript } from './schemas';
import { countsInCr } from './status';
import { compareTerms } from './terms';

export interface CrItem {
  grade: number | null;
  hours: number | null;
  status: Status;
}
export interface TermCr {
  term: string;
  termCr: number | null;
  cumulativeCr: number | null;
}
export interface PlannedGrade {
  code: string;
  hours: number;
  grade: number;
}

/** UFAM truncates the CR to 3 decimals (7.4568 → 7.456). The epsilon guards float noise like 7455.9999999. */
export function truncate3(n: number): number {
  return Math.trunc(n * 1000 + 1e-7) / 1000;
}

export function computeCr(items: readonly CrItem[]): number | null {
  let weighted = 0;
  let hours = 0;
  for (const item of items) {
    if (!countsInCr(item.status) || !item.hours) continue;
    const grade = item.grade ?? (item.status === 'reprovado_freq' ? 0 : null);
    if (grade === null) continue;
    weighted += grade * item.hours;
    hours += item.hours;
  }
  return hours === 0 ? null : truncate3(weighted / hours);
}

export function crByTerm(t: Transcript): TermCr[] {
  const terms = [...new Set(t.entries.filter((e) => countsInCr(e.status)).map((e) => e.term))].sort(compareTerms);
  return terms.map((term) => ({
    term,
    termCr: computeCr(t.entries.filter((e) => e.term === term)),
    cumulativeCr: computeCr(t.entries.filter((e) => compareTerms(e.term, term) <= 0)),
  }));
}

export function projectCr(t: Transcript, planned: readonly PlannedGrade[]): number | null {
  return computeCr([
    ...t.entries,
    ...planned.map((p) => ({ grade: p.grade, hours: p.hours, status: 'aprovado' as const })),
  ]);
}

export function crScenarios(
  t: Transcript,
  planned: readonly { code: string; hours: number }[],
): { best: number | null; worst: number | null } {
  return {
    best: projectCr(t, planned.map((p) => ({ ...p, grade: 10 }))),
    worst: projectCr(t, planned.map((p) => ({ ...p, grade: 5 }))),
  };
}
