import { computeCr, crByTerm, type TermCr } from './cr';
import { forecastGraduation, type Forecast } from './forecast';
import { completedCodes, dependentClosure, inProgressCodes, isSatisfied } from './prerequisites';
import { computeProgress } from './progress';
import type { Category, Curriculum, Transcript } from './schemas';
import { countsInCr, isCompleted, isFailed, isInProgress } from './status';
import { isEnade, latestTerm } from './suggestions';
import { addTerms, compareTerms, termIndex } from './terms';

export interface PaceInsights {
  termsElapsed: number;
  completedTerms: number;
  avgHoursPerTerm: number;
  remainingHours: number;
  idealTermsLeft: number;
  maxTermsLeft: number;
  requiredPaceIdeal: number | null;
  requiredPaceMax: number | null;
  status: 'concluido' | 'inicio' | 'no_ritmo' | 'atrasado' | 'risco_prazo_maximo';
}

export interface UnresolvedFailure {
  code: string;
  name: string;
  category: Category;
}

export interface PerformanceInsights {
  takenHours: number;
  failedHours: number;
  passRate: number | null;
  failures: number;
  /** Failures never passed afterwards that still matter: obrigatórias, and electives/optativas whose hours are unmet. */
  unresolvedFailures: UnresolvedFailure[];
  /** Codes of the unresolved failures that are being taken again in a later term. */
  retakingNow: string[];
  lastTerm: TermCr | null;
  previousCumulativeCr: number | null;
  trend: 'subindo' | 'caindo' | 'estavel' | null;
  bestTerm: TermCr | null;
  worstTerm: TermCr | null;
  mandatoryCr: number | null;
  creditedCount: number;
  creditedHours: number;
}

const CREDITED_STATUSES = new Set(['equivalencia', 'transf_real', 'disp_nota', 'disp']);
const TREND_THRESHOLD = 0.05;

const round2 = (n: number) => Math.round(n * 100) / 100;
export const round1 = (n: number) => Math.round(n * 10) / 10 + 0;

export function paceInsights(c: Curriculum, t: Transcript): PaceInsights {
  const progress = computeProgress(c, t);
  const last = latestTerm(t);
  const first = t.admissionTerm ?? t.entries.map((e) => e.term).sort(compareTerms)[0] ?? null;
  const termsElapsed = last && first ? Math.max(0, termIndex(last) - termIndex(first) + 1) : 0;
  const enrolledNow = last !== null && t.entries.some((e) => e.term === last && e.status === 'matriculado');
  const completedTerms = Math.max(0, termsElapsed - (enrolledNow ? 1 : 0));

  const remainingHours = Math.max(0, progress.requiredHours - progress.doneHours);
  const avgHoursPerTerm = Math.round(progress.doneHours / Math.max(1, completedTerms));
  const idealTermsLeft = Math.max(0, c.requirements.minPeriods - completedTerms);
  const maxTermsLeft = Math.max(0, c.requirements.maxPeriods - completedTerms);
  const requiredPaceIdeal = idealTermsLeft > 0 ? Math.ceil(remainingHours / idealTermsLeft) : null;
  const requiredPaceMax = maxTermsLeft > 0 ? Math.ceil(remainingHours / maxTermsLeft) : null;

  let status: PaceInsights['status'];
  if (remainingHours === 0) status = 'concluido';
  else if (completedTerms === 0) status = 'inicio';
  else if (requiredPaceMax === null || avgHoursPerTerm < requiredPaceMax) status = 'risco_prazo_maximo';
  else if (requiredPaceIdeal === null || avgHoursPerTerm < requiredPaceIdeal) status = 'atrasado';
  else status = 'no_ritmo';

  return {
    termsElapsed,
    completedTerms,
    avgHoursPerTerm,
    remainingHours,
    idealTermsLeft,
    maxTermsLeft,
    requiredPaceIdeal,
    requiredPaceMax,
    status,
  };
}

export function performanceInsights(c: Curriculum, t: Transcript): PerformanceInsights {
  const counted = t.entries.filter((e) => countsInCr(e.status));
  const takenHours = counted.reduce((sum, e) => sum + (e.hours ?? 0), 0);
  const failed = t.entries.filter((e) => isFailed(e.status));
  const failedHours = failed.reduce((sum, e) => sum + (e.hours ?? 0), 0);

  // Electives and optativas only need retaking while their hour requirement is unmet.
  const unmet = new Set<string>(
    computeProgress(c, t)
      .categories.filter((x) => x.doneHours < x.requiredHours)
      .map((x) => x.key),
  );
  const open = failed.filter(
    (f) =>
      !t.entries.some((e) => e.code === f.code && compareTerms(e.term, f.term) > 0 && isCompleted(e.status)) &&
      (f.category === 'obrigatoria' || ((f.category === 'optativa' || f.category === 'eletiva') && unmet.has(f.category))),
  );
  const retakingCodes = new Set(
    open
      .filter((f) => t.entries.some((e) => e.code === f.code && compareTerms(e.term, f.term) > 0 && isInProgress(e.status)))
      .map((f) => f.code),
  );
  const byCode = new Map<string, UnresolvedFailure>();
  for (const f of open) {
    if (!byCode.has(f.code)) byCode.set(f.code, { code: f.code, name: f.name, category: f.category });
  }
  const unresolvedFailures = [...byCode.values()]
    .filter((f) => !retakingCodes.has(f.code))
    .sort((a, b) => a.code.localeCompare(b.code));
  const retakingNow = [...retakingCodes].sort();

  const terms = crByTerm(t);
  const lastTerm = terms.at(-1) ?? null;
  const previousCumulativeCr = terms.at(-2)?.cumulativeCr ?? null;
  const trend =
    lastTerm?.cumulativeCr != null && previousCumulativeCr !== null ? trendOf(lastTerm.cumulativeCr - previousCumulativeCr) : null;

  // Ties go to the most recent term: terms are chronological, so `>=` / `<=` keep the later one.
  let bestTerm: TermCr | null = null;
  let worstTerm: TermCr | null = null;
  for (const term of terms) {
    if (term.termCr === null) continue;
    if (bestTerm === null || term.termCr >= bestTerm.termCr!) bestTerm = term;
    if (worstTerm === null || term.termCr <= worstTerm.termCr!) worstTerm = term;
  }

  const credited = t.entries.filter((e) => CREDITED_STATUSES.has(e.status));
  return {
    takenHours,
    failedHours,
    passRate: takenHours > 0 ? round2(((takenHours - failedHours) / takenHours) * 100) : null,
    failures: failed.length,
    unresolvedFailures,
    retakingNow,
    lastTerm,
    previousCumulativeCr,
    trend,
    bestTerm,
    worstTerm,
    mandatoryCr: computeCr(t.entries.filter((e) => e.category === 'obrigatoria')),
    creditedCount: credited.length,
    creditedHours: credited.reduce((sum, e) => sum + (e.hours ?? 0), 0),
  };
}

function trendOf(delta: number): NonNullable<PerformanceInsights['trend']> {
  if (delta > TREND_THRESHOLD) return 'subindo';
  if (delta < -TREND_THRESHOLD) return 'caindo';
  return 'estavel';
}

/** Adds AACC hours still pending (e.g. from a certificate in analysis) to the official progress, up to the requirement. */
export function progressWithPendingAacc(
  c: Curriculum,
  t: Transcript,
  pendingHours: number,
): { percent: number; aaccHours: number; addedHours: number } {
  const base = computeProgress(c, t);
  const aacc = base.categories.find((x) => x.key === 'aacc')!;
  const aaccOfficial = aacc.doneHours;
  const aaccHours = Math.min(aacc.requiredHours, aaccOfficial + Math.max(0, pendingHours));
  const addedHours = aaccHours - aaccOfficial;
  const percent = base.requiredHours === 0 ? 100 : round2(((base.doneHours + addedHours) / base.requiredHours) * 100);
  return { percent, aaccHours, addedHours };
}

export interface TimelineInsights {
  admissionTerm: string | null;
  currentTerm: string | null;
  /** Periods between admission and the current term, both included. */
  currentPeriod: number | null;
  minPeriods: number;
  maxPeriods: number;
  /** Last term allowed by the curriculum: admission + maxPeriods - 1. */
  maxTerm: string | null;
  /** How much of the maximum period is already used, capped at 100. */
  usedPercent: number | null;
  /** Term the mandatory courses end (forecast), when there is one. */
  forecastTerm: string | null;
  /** Terms between the forecast and the maximum: negative means it goes past it. */
  forecastSlack: number | null;
  /** Graduation term estimated from the average pace, when it can be measured. */
  paceTerm: string | null;
  /** Periods the remaining hours take at the average pace. */
  pacePeriods: number | null;
  /** Terms between the pace term and the maximum: negative means it goes past it. */
  paceSlack: number | null;
}

export function timelineInsights(
  c: Curriculum,
  t: Transcript,
  forecast: Forecast = forecastGraduation(c, t),
): TimelineInsights {
  const pace = paceInsights(c, t);
  const admission = t.admissionTerm;
  const currentTerm = latestTerm(t);
  const maxTerm = admission ? addTerms(admission, c.requirements.maxPeriods - 1) : null;
  const hasPace = pace.completedTerms > 0 && pace.avgHoursPerTerm > 0;
  const pacePeriods = hasPace
    ? pace.remainingHours === 0
      ? 0
      : Math.ceil(pace.remainingHours / pace.avgHoursPerTerm)
    : null;
  const paceTerm = pacePeriods !== null && currentTerm ? addTerms(currentTerm, pacePeriods) : null;
  const slack = (term: string | null) => (term !== null && maxTerm !== null ? termIndex(maxTerm) - termIndex(term) : null);
  return {
    admissionTerm: admission,
    currentTerm,
    currentPeriod: admission ? pace.termsElapsed : null,
    minPeriods: c.requirements.minPeriods,
    maxPeriods: c.requirements.maxPeriods,
    maxTerm,
    usedPercent: admission ? Math.min(100, round2((pace.termsElapsed / c.requirements.maxPeriods) * 100)) : null,
    forecastTerm: forecast.graduationTerm,
    forecastSlack: slack(forecast.graduationTerm),
    paceTerm,
    pacePeriods,
    paceSlack: slack(paceTerm),
  };
}

export const MILESTONES = [25, 50, 75, 90, 100] as const;

export interface MilestoneInsights {
  target: number;
  hoursLeft: number;
  /** Term the milestone is reached at the current pace, when it can be measured. */
  term: string | null;
}

export function milestoneInsights(c: Curriculum, t: Transcript): MilestoneInsights | null {
  const progress = computeProgress(c, t);
  const percent = progress.officialPercent ?? progress.percent;
  const target = MILESTONES.find((milestone) => milestone > percent);
  if (target === undefined) return null;
  const pace = paceInsights(c, t);
  const hoursLeft = Math.max(0, Math.ceil(((target - percent) / 100) * progress.requiredHours));
  const currentTerm = latestTerm(t);
  const periods =
    pace.completedTerms > 0 && pace.avgHoursPerTerm > 0 ? Math.ceil(hoursLeft / pace.avgHoursPerTerm) : null;
  return { target, hoursLeft, term: periods !== null && currentTerm ? addTerms(currentTerm, periods) : null };
}

export interface InProgressInsights {
  courses: number;
  hours: number;
  /** Percentage of the course if every enrolled course is approved, on top of the displayed progress. */
  percentIfApproved: number | null;
}

export function inProgressInsights(c: Curriculum, t: Transcript): InProgressInsights | null {
  const entries = t.entries.filter((e) => isInProgress(e.status) && !isEnade(e.code));
  if (entries.length === 0) return null;
  const progress = computeProgress(c, t);
  const hours = entries.reduce((sum, e) => sum + (e.hours ?? 0), 0);
  const base = progress.officialPercent ?? progress.percent;
  const added = round2((hours / progress.requiredHours) * 100);
  const percentIfApproved =
    hours <= 0 || progress.requiredHours === 0 ? null : Math.min(100, round2(base + added));
  return { courses: entries.length, hours, percentIfApproved };
}

export interface PendingInsights {
  /** Mandatory courses in the curriculum, ENADE aside. */
  mandatoryTotal: number;
  /** Mandatory courses without a completed entry, enrolled ones included. */
  mandatoryRemaining: number;
  mandatoryInProgress: number;
  /** Hours still to take in the mandatory courses, from the curriculum. */
  mandatoryHoursLeft: number;
  /** Remaining mandatory courses whose prerequisites are already satisfied (enrolments count). */
  available: number;
  blocked: number;
  /** Hours still missing per requirement outside the mandatory path. */
  hours: { optativa: number; eletiva: number; aacc: number; extensao: number };
  /** Pending mandatory courses that hold back the most other pending courses. */
  bottlenecks: { code: string; name: string; unlocks: number }[];
}

export function pendingInsights(c: Curriculum, t: Transcript): PendingInsights {
  const progress = computeProgress(c, t);
  const done = completedCodes(t);
  const inProgress = inProgressCodes(t);
  const effective = new Set([...done, ...inProgress]);
  const remaining = c.courses.filter((x) => x.category === 'obrigatoria' && !isEnade(x.code) && !done.has(x.code));
  const remainingCodes = new Set(remaining.map((x) => x.code));
  const available = remaining.filter((x) => isSatisfied(x.prerequisites, effective)).length;
  const hoursLeft = (key: 'optativa' | 'eletiva' | 'aacc' | 'extensao') => {
    const category = progress.categories.find((x) => x.key === key)!;
    return Math.max(0, category.requiredHours - category.rawHours);
  };
  const bottlenecks = remaining
    .map((x) => ({
      code: x.code,
      name: x.name,
      unlocks: [...dependentClosure(c, x.code)].filter((code) => remainingCodes.has(code)).length,
    }))
    .filter((x) => x.unlocks > 0)
    .sort((a, b) => b.unlocks - a.unlocks || a.code.localeCompare(b.code))
    .slice(0, 3);
  return {
    mandatoryTotal: c.courses.filter((x) => x.category === 'obrigatoria' && !isEnade(x.code)).length,
    mandatoryRemaining: remaining.length,
    mandatoryInProgress: remaining.filter((x) => inProgress.has(x.code)).length,
    mandatoryHoursLeft: remaining.reduce((sum, x) => sum + x.hours.total, 0),
    available,
    blocked: remaining.length - available,
    hours: {
      optativa: hoursLeft('optativa'),
      eletiva: hoursLeft('eletiva'),
      aacc: hoursLeft('aacc'),
      extensao: hoursLeft('extensao'),
    },
    bottlenecks,
  };
}
