import { describe, expect, it } from 'vitest';
import { sampleCurriculum, sampleTranscript } from './__fixtures__/sample';
import { paceInsights, performanceInsights, progressWithPendingAacc } from './insights';
import type { Curriculum, Transcript, TranscriptEntry } from './schemas';

const entry = (over: Partial<TranscriptEntry>): TranscriptEntry => ({
  code: 'ICC001', name: 'DISCIPLINA', category: 'obrigatoria', term: '2024.1', credits: 4, hours: 60,
  grade: 8, status: 'aprovado', rawStatus: 'Aprovado', ...over,
});
const withEntries = (entries: TranscriptEntry[], extra: Partial<Transcript> = {}): Transcript => ({
  ...sampleTranscript, entries, pending: [], ...extra,
});
const withTotalHours = (totalHours: number, minPeriods = 8, maxPeriods = 12): Curriculum => ({
  ...sampleCurriculum,
  requirements: { ...sampleCurriculum.requirements, totalHours, minPeriods, maxPeriods },
});

describe('paceInsights', () => {
  it('counts 6 terms elapsed from 2024.1 to 2026.2, minus the one still in progress', () => {
    const p = paceInsights(sampleCurriculum, sampleTranscript);
    expect(p).toMatchObject({ termsElapsed: 6, completedTerms: 5 });
  });

  it('computes remaining hours, average per term and the pace needed to finish', () => {
    // 3200 - 2070 = 1130 h left; 3 ideal terms (8 - 5) → ceil(1130/3) = 377; 7 max terms (12 - 5) → ceil(1130/7) = 162.
    expect(paceInsights(sampleCurriculum, sampleTranscript)).toEqual({
      termsElapsed: 6,
      completedTerms: 5,
      avgHoursPerTerm: 414,
      remainingHours: 1130,
      idealTermsLeft: 3,
      maxTermsLeft: 7,
      requiredPaceIdeal: 377,
      requiredPaceMax: 162,
      status: 'no_ritmo',
    });
  });

  it('uses the lowest entry term when admissionTerm is missing', () => {
    const p = paceInsights(sampleCurriculum, { ...sampleTranscript, admissionTerm: null });
    expect(p).toMatchObject({ termsElapsed: 6, completedTerms: 5, status: 'no_ritmo' });
  });

  it('does not subtract a term when the last term has no enrolment in progress', () => {
    const noEnrolment = sampleTranscript.entries.filter((e) => e.status !== 'matriculado');
    const p = paceInsights(sampleCurriculum, { ...sampleTranscript, entries: noEnrolment });
    expect(p).toMatchObject({ termsElapsed: 5, completedTerms: 5 });
  });

  it('is concluido when nothing remains, even with zero terms left', () => {
    const p = paceInsights(withTotalHours(2070), sampleTranscript);
    expect(p).toMatchObject({ remainingHours: 0, status: 'concluido' });
  });

  it('is atrasado when the average is below the ideal pace but above the maximum pace', () => {
    // minPeriods 6 → 1 ideal term left → needs 1130 h/term; maximum still reachable at 162 h/term.
    const p = paceInsights(withTotalHours(3200, 6, 12), sampleTranscript);
    expect(p).toMatchObject({ idealTermsLeft: 1, requiredPaceIdeal: 1130, requiredPaceMax: 162, status: 'atrasado' });
  });

  it('is risco_prazo_maximo when no term is left before the maximum period', () => {
    const p = paceInsights(withTotalHours(3200, 8, 5), sampleTranscript);
    expect(p).toMatchObject({ maxTermsLeft: 0, requiredPaceMax: null, status: 'risco_prazo_maximo' });
  });

  it('is risco_prazo_maximo when the average is below the maximum pace', () => {
    // 1130 h over 1 remaining term is 1130 h/term; average 414 is below it.
    const p = paceInsights(withTotalHours(3200, 6, 6), sampleTranscript);
    expect(p).toMatchObject({ maxTermsLeft: 1, requiredPaceMax: 1130, status: 'risco_prazo_maximo' });
  });
});

describe('performanceInsights', () => {
  const p = performanceInsights(sampleTranscript);

  it('sums taken and failed hours over statuses that count in the CR', () => {
    expect(p).toMatchObject({ takenHours: 2280, failedHours: 120, passRate: 94.74, failures: 2 });
  });

  it('lists failures that were never passed afterwards', () => {
    expect(p.unresolvedFailures).toEqual(['OPT202', 'OPT203']);
  });

  it('reads the trend from the last two cumulative CRs (7.757 - 7.700 = +0.057)', () => {
    expect(p.lastTerm).toEqual({ term: '2026.1', termCr: 8.13, cumulativeCr: 7.757 });
    expect(p.previousCumulativeCr).toBe(7.7);
    expect(p.trend).toBe('subindo');
  });

  it('finds the best and worst term by term CR', () => {
    expect(p.bestTerm).toEqual({ term: '2026.1', termCr: 8.13, cumulativeCr: 7.757 });
    expect(p.worstTerm).toEqual({ term: '2025.2', termCr: 7.133, cumulativeCr: 7.7 });
  });

  it('computes the obrigatórias CR and the credited (aproveitamento) entries', () => {
    // 10696.5 / 1380 h = 7.751 (truncated); 20 credited entries worth 1290 h.
    expect(p).toMatchObject({ mandatoryCr: 7.751, creditedCount: 20, creditedHours: 1290 });
  });

  it('reports no failures and a 100% pass rate when nothing was failed', () => {
    const q = performanceInsights(withEntries([entry({ term: '2024.1', grade: 8 }), entry({ term: '2024.2', grade: 9 })]));
    expect(q).toMatchObject({ failures: 0, failedHours: 0, passRate: 100, unresolvedFailures: [] });
  });

  it('treats a later passing entry as resolving the failure', () => {
    const q = performanceInsights(
      withEntries([
        entry({ code: 'ICC120', term: '2024.2', grade: 3.9, status: 'reprovado_nota', rawStatus: 'Repro Nota' }),
        entry({ code: 'ICC120', term: '2025.1', grade: 7, status: 'aprovado' }),
      ]),
    );
    expect(q).toMatchObject({ failures: 1, unresolvedFailures: [] });
  });

  it('returns nulls and zeros when nothing counts', () => {
    expect(performanceInsights(withEntries([]))).toEqual({
      takenHours: 0, failedHours: 0, passRate: null, failures: 0, unresolvedFailures: [],
      lastTerm: null, previousCumulativeCr: null, trend: null, bestTerm: null, worstTerm: null,
      mandatoryCr: null, creditedCount: 0, creditedHours: 0,
    });
  });

  it('has no trend with a single term', () => {
    const q = performanceInsights(withEntries([entry({ term: '2024.1', grade: 8 })]));
    expect(q).toMatchObject({ trend: null, previousCumulativeCr: null });
  });

  it('reads a stable trend within ±0.05 and a falling one beyond it', () => {
    const stable = performanceInsights(
      withEntries([entry({ term: '2024.1', grade: 8 }), entry({ term: '2024.2', grade: 8.04 })]),
    );
    expect(stable.trend).toBe('estavel');
    const falling = performanceInsights(
      withEntries([entry({ term: '2024.1', grade: 8 }), entry({ term: '2024.2', grade: 7 })]),
    );
    expect(falling.trend).toBe('caindo');
  });

  it('breaks best/worst ties in favour of the most recent term', () => {
    const best = performanceInsights(
      withEntries([entry({ term: '2024.1', grade: 8 }), entry({ term: '2024.2', grade: 8 }), entry({ term: '2025.1', grade: 6 })]),
    );
    expect(best.bestTerm?.term).toBe('2024.2');
    const worst = performanceInsights(
      withEntries([entry({ term: '2024.1', grade: 6 }), entry({ term: '2024.2', grade: 8 }), entry({ term: '2025.1', grade: 6 })]),
    );
    expect(worst.worstTerm?.term).toBe('2025.1');
  });

  it('ignores terms without a computable CR when picking best and worst', () => {
    const q = performanceInsights(
      withEntries([
        entry({ term: '2024.1', grade: null, status: 'aprovado' }),
        entry({ term: '2024.2', grade: 8 }),
        entry({ term: '2025.1', grade: 6 }),
      ]),
    );
    expect(q.bestTerm?.term).toBe('2024.2');
    expect(q.worstTerm?.term).toBe('2025.1');
  });
});

describe('progressWithPendingAacc', () => {
  it('adds pending AACC hours on top of the official progress', () => {
    // 2070 + 50 = 2120 of 3200 h
    expect(progressWithPendingAacc(sampleCurriculum, sampleTranscript, 50)).toEqual({
      percent: 66.25, aaccHours: 50, addedHours: 50,
    });
  });

  it('caps pending AACC at the required 210 h', () => {
    expect(progressWithPendingAacc(sampleCurriculum, sampleTranscript, 300)).toEqual({
      percent: 71.25, aaccHours: 210, addedHours: 210,
    });
  });

  it('adds nothing for zero or negative pending hours', () => {
    expect(progressWithPendingAacc(sampleCurriculum, sampleTranscript, 0)).toEqual({
      percent: 64.69, aaccHours: 0, addedHours: 0,
    });
    expect(progressWithPendingAacc(sampleCurriculum, sampleTranscript, -20)).toMatchObject({ addedHours: 0 });
  });

  it('only adds the difference to AACC hours already recorded officially', () => {
    // official AACC 30 h is already in the 2100 h base; 30 + 100 = 130 h → adds 100 → (2100 + 100) / 3200
    const q = progressWithPendingAacc(sampleCurriculum, { ...sampleTranscript, aaccDoneHours: 30 }, 100);
    expect(q).toEqual({ percent: 68.75, aaccHours: 130, addedHours: 100 });
  });
});
