import { completedCodes, inProgressCodes } from './prerequisites';
import { computeProgress } from './progress';
import type { Curriculum, Transcript } from './schemas';
import { isEnade, latestTerm, pickWithinCredits, rankCandidates, type Suggestion } from './suggestions';
import { addTerms, compareTerms, nextTerm } from './terms';

export interface ForecastTerm {
  term: string;
  courses: Suggestion[];
  credits: number;
}
export interface Forecast {
  terms: ForecastTerm[];
  graduationTerm: string | null;
  remainingTerms: number;
  maxTerm: string | null;
  exceedsMax: boolean;
  pendingHours: { optativa: number; eletiva: number; aacc: number; extensao: number };
  unschedulable: string[];
}

const MAX_SIMULATED_TERMS = 30;

export function forecastGraduation(c: Curriculum, t: Transcript, opts: { maxCredits?: number } = {}): Forecast {
  const maxCredits = opts.maxCredits ?? c.requirements.maxCreditsPerPeriod ?? 30;
  const latest = latestTerm(t);
  const assumeDone = new Set([...completedCodes(t), ...inProgressCodes(t)]);
  const remaining = () =>
    c.courses.filter((x) => x.category === 'obrigatoria' && !isEnade(x.code) && !assumeDone.has(x.code));

  const terms: ForecastTerm[] = [];
  let term = latest ? nextTerm(latest) : t.admissionTerm;
  for (let i = 0; term && i < MAX_SIMULATED_TERMS && remaining().length > 0; i++) {
    // The forecast schedules the mandatory path only: electives and extension are hour requirements, listed as pending.
    const ranked = rankCandidates(c, t, { includeElectives: false, includeExtension: false, assumeDone, countInProgress: true });
    const picks = pickWithinCredits(ranked, maxCredits, 0, 0);
    if (picks.length === 0) break;
    terms.push({ term, courses: picks, credits: picks.reduce((s, x) => s + x.credits, 0) });
    for (const p of picks) assumeDone.add(p.code);
    term = nextTerm(term);
  }

  const unschedulable = remaining().map((x) => x.code);
  const graduationTerm = unschedulable.length > 0 ? null : (terms.at(-1)?.term ?? latest);
  const maxTerm = t.admissionTerm ? addTerms(t.admissionTerm, c.requirements.maxPeriods - 1) : null;
  const progress = computeProgress(c, t);
  const pending = (key: 'optativa' | 'eletiva' | 'aacc' | 'extensao') => {
    const cat = progress.categories.find((x) => x.key === key)!;
    return Math.max(0, cat.requiredHours - cat.rawHours);
  };

  return {
    terms,
    graduationTerm,
    remainingTerms: terms.length,
    maxTerm,
    exceedsMax: graduationTerm !== null && maxTerm !== null && compareTerms(graduationTerm, maxTerm) > 0,
    pendingHours: { optativa: pending('optativa'), eletiva: pending('eletiva'), aacc: pending('aacc'), extensao: pending('extensao') },
    unschedulable,
  };
}
