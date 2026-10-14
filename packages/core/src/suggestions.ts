import { completedCodes, dependentClosure, inProgressCodes, isSatisfied } from './prerequisites';
import { computeProgress } from './progress';
import type { Category, Curriculum, RequirementKey, Transcript } from './schemas';
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
  /** Extension courses count as courses to take while the extension hours are still pending (default true). */
  includeExtension?: boolean;
  maxCredits?: number;
  assumeDone?: ReadonlySet<string>;
}

export const isEnade = (code: string): boolean => code.startsWith('ENADE');

export function latestTerm(t: Transcript): string | null {
  return t.entries.map((e) => e.term).sort(compareTerms).at(-1) ?? null;
}

/** Hours a requirement still needs: required minus what the transcript already covers, never below zero. */
function pendingHours(c: Curriculum, t: Transcript, key: RequirementKey): number {
  const category = computeProgress(c, t).categories.find((x) => x.key === key)!;
  return Math.max(0, category.requiredHours - category.rawHours);
}

/** Mandatory or elective courses this one unlocks, directly or not. Optional courses are left out on purpose. */
function relevantUnlocks(c: Curriculum, code: string): number {
  const categories = new Map(c.courses.map((course) => [course.code, course.category]));
  return [...dependentClosure(c, code)].filter((dep) => {
    const category = categories.get(dep);
    return category === 'obrigatoria' || category === 'eletiva';
  }).length;
}

const CATEGORY_REASONS: Record<Category, string> = {
  obrigatoria: 'Obrigatória',
  optativa: 'Optativa',
  eletiva: 'Eletiva',
  extensao: 'Extensão',
  outros: 'Outros',
  externa: 'Aproveitamento externo',
};

function reasonFor(s: Omit<Suggestion, 'reason'>): string {
  const parts = [CATEGORY_REASONS[s.category]];
  if (s.idealPeriod !== null) parts.push(`período ideal ${s.idealPeriod}`);
  if (s.unlocks === 0) parts.push('não é pré-requisito de outras');
  else parts.push(s.unlocks === 1 ? 'libera 1 disciplina' : `libera ${s.unlocks} disciplinas`);
  return parts.join(', ');
}

export function rankCandidates(c: Curriculum, t: Transcript, opts: SuggestOptions = {}): Suggestion[] {
  const countInProgress = opts.countInProgress ?? true;
  const includeElectives = (opts.includeElectives ?? true) && pendingHours(c, t, 'eletiva') > 0;
  const includeExtension = (opts.includeExtension ?? true) && pendingHours(c, t, 'extensao') > 0;
  const inProgress = inProgressCodes(t);
  const effective = new Set([...completedCodes(t), ...(countInProgress ? inProgress : []), ...(opts.assumeDone ?? [])]);

  const candidates = c.courses.filter(
    (course) =>
      (course.category === 'obrigatoria' ||
        (includeElectives && course.category === 'eletiva') ||
        (includeExtension && course.category === 'extensao')) &&
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

/**
 * Courses that fit the credit limit. Electives and extension courses also have an hours ceiling: taking more of them
 * than the requirement still misses would spend credits on hours the curriculum no longer asks for.
 */
export function pickWithinCredits(
  ranked: readonly Suggestion[],
  maxCredits: number,
  electiveHoursLeft: number,
  extensionHoursLeft: number,
): Suggestion[] {
  const picked: Suggestion[] = [];
  let credits = 0;
  let electiveLeft = electiveHoursLeft;
  let extensionLeft = extensionHoursLeft;
  for (const s of ranked) {
    if (s.category === 'eletiva' && electiveLeft <= 0) continue;
    if (s.category === 'extensao' && extensionLeft <= 0) continue;
    if (credits + s.credits > maxCredits) continue;
    picked.push(s);
    credits += s.credits;
    if (s.category === 'eletiva') electiveLeft -= s.hours;
    if (s.category === 'extensao') extensionLeft -= s.hours;
  }
  return picked;
}

export function suggestNextTerm(c: Curriculum, t: Transcript, opts: SuggestOptions = {}): Suggestion[] {
  const maxCredits = opts.maxCredits ?? c.requirements.maxCreditsPerPeriod ?? 30;
  return pickWithinCredits(rankCandidates(c, t, opts), maxCredits, pendingHours(c, t, 'eletiva'), pendingHours(c, t, 'extensao'));
}
