import { completedCodes, dependentClosure, inProgressCodes, isSatisfied } from './prerequisites';
import { computeProgress } from './progress';
import type { Category, Curriculum, Transcript } from './schemas';
import { compareTerms } from './terms';

export interface Suggestion {
  code: string;
  name: string;
  category: Category;
  credits: number;
  hours: number;
  idealPeriod: number | null;
  unlocks: number;
  reason: string;
}
export interface SuggestOptions {
  countInProgress?: boolean;
  includeElectives?: boolean;
  maxCredits?: number;
  assumeDone?: ReadonlySet<string>;
}

export const isEnade = (code: string): boolean => code.startsWith('ENADE');

export function latestTerm(t: Transcript): string | null {
  return t.entries.map((e) => e.term).sort(compareTerms).at(-1) ?? null;
}

function pendingElectiveHours(c: Curriculum, t: Transcript): number {
  const elective = computeProgress(c, t).categories.find((x) => x.key === 'eletiva')!;
  return Math.max(0, elective.requiredHours - elective.rawHours);
}

/** Mandatory or elective courses this one unlocks, directly or not. Optional courses are left out on purpose. */
function relevantUnlocks(c: Curriculum, code: string): number {
  const categories = new Map(c.courses.map((course) => [course.code, course.category]));
  return [...dependentClosure(c, code)].filter((dep) => {
    const category = categories.get(dep);
    return category === 'obrigatoria' || category === 'eletiva';
  }).length;
}

function reasonFor(s: Omit<Suggestion, 'reason'>): string {
  const parts = [s.category === 'obrigatoria' ? 'Obrigatória' : 'Eletiva'];
  if (s.idealPeriod !== null) parts.push(`período ideal ${s.idealPeriod}`);
  if (s.unlocks === 0) parts.push('não é pré-requisito de outras');
  else parts.push(s.unlocks === 1 ? 'libera 1 disciplina' : `libera ${s.unlocks} disciplinas`);
  return parts.join(', ');
}

export function rankCandidates(c: Curriculum, t: Transcript, opts: SuggestOptions = {}): Suggestion[] {
  const countInProgress = opts.countInProgress ?? true;
  const includeElectives = (opts.includeElectives ?? true) && pendingElectiveHours(c, t) > 0;
  const inProgress = inProgressCodes(t);
  const effective = new Set([...completedCodes(t), ...(countInProgress ? inProgress : []), ...(opts.assumeDone ?? [])]);

  const candidates = c.courses.filter(
    (course) =>
      (course.category === 'obrigatoria' || (includeElectives && course.category === 'eletiva')) &&
      !isEnade(course.code) &&
      !effective.has(course.code) &&
      !inProgress.has(course.code) &&
      isSatisfied(course.prerequisites, effective),
  );

  return candidates
    .map((course) => {
      const base = {
        code: course.code,
        name: course.name,
        category: course.category,
        credits: course.credits,
        hours: course.hours.total,
        idealPeriod: course.idealPeriod,
        unlocks: relevantUnlocks(c, course.code),
      };
      return { ...base, reason: reasonFor(base) };
    })
    .sort(
      (a, b) =>
        Number(a.category !== 'obrigatoria') - Number(b.category !== 'obrigatoria') ||
        (a.idealPeriod ?? 99) - (b.idealPeriod ?? 99) ||
        b.unlocks - a.unlocks ||
        b.credits - a.credits ||
        a.code.localeCompare(b.code),
    );
}

export function pickWithinCredits(ranked: readonly Suggestion[], maxCredits: number, electiveHoursLeft: number): Suggestion[] {
  const picked: Suggestion[] = [];
  let credits = 0;
  let electiveLeft = electiveHoursLeft;
  for (const s of ranked) {
    if (s.category === 'eletiva' && electiveLeft <= 0) continue;
    if (credits + s.credits > maxCredits) continue;
    picked.push(s);
    credits += s.credits;
    if (s.category === 'eletiva') electiveLeft -= s.hours;
  }
  return picked;
}

export function suggestNextTerm(c: Curriculum, t: Transcript, opts: SuggestOptions = {}): Suggestion[] {
  const maxCredits = opts.maxCredits ?? c.requirements.maxCreditsPerPeriod ?? 30;
  return pickWithinCredits(rankCandidates(c, t, opts), maxCredits, pendingElectiveHours(c, t));
}
