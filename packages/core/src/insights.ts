import { computeCr, crByTerm, type TermCr } from './cr';
import { computeProgress } from './progress';
import type { Category, Curriculum, Transcript } from './schemas';
import { countsInCr, isCompleted, isFailed, isInProgress } from './status';
import { compareTerms, termIndex } from './terms';
import { latestTerm } from './suggestions';

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
