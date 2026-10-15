import { describe, expect, it } from 'vitest';
import { sampleCurriculum, sampleTranscript } from './__fixtures__/sample';
import {
  attemptInsights,
  crProjectionInsights,
  delayInsights,
  gradeInsights,
  inProgressInsights,
  milestoneInsights,
  paceInsights,
  pendingInsights,
  performanceInsights,
  progressWithPendingAacc,
  streakInsights,
  timelineInsights,
} from './insights';
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

  it('is inicio in the first period, when nothing is completed yet, not a deadline risk', () => {
    const firstTerm = withEntries([entry({ term: '2024.1', grade: null, status: 'matriculado', rawStatus: 'Matricula' })]);
    const p = paceInsights(sampleCurriculum, firstTerm);
    expect(p).toMatchObject({ termsElapsed: 1, completedTerms: 0, remainingHours: 3200, status: 'inicio' });
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
  const p = performanceInsights(sampleCurriculum, sampleTranscript);

  it('sums taken and failed hours over statuses that count in the CR', () => {
    expect(p).toMatchObject({ takenHours: 2280, failedHours: 120, passRate: 94.74, failures: 2 });
  });

  it('skips failed electives and optativas whose hour requirement is already met', () => {
    // OPT202 and OPT203 failed, but optativas are already 180/180 h in the sample.
    expect(p.unresolvedFailures).toEqual([]);
    expect(p.retakingNow).toEqual([]);
  });

  it('lists obrigatória failures never passed afterwards, with name and category', () => {
    const q = performanceInsights(
      sampleCurriculum,
      withEntries([entry({ code: 'ICC120', name: 'MATEMÁTICA DISCRETA', term: '2024.2', grade: 3.9, status: 'reprovado_nota', rawStatus: 'Repro Nota' })]),
    );
    expect(q.unresolvedFailures).toEqual([{ code: 'ICC120', name: 'MATEMÁTICA DISCRETA', category: 'obrigatoria' }]);
  });

  it('lists an optativa failure while its hour requirement is still unmet', () => {
    const q = performanceInsights(
      sampleCurriculum,
      withEntries([entry({ code: 'OPT301', name: 'OPTATIVA DE TESTE', category: 'optativa', term: '2024.2', grade: 3, status: 'reprovado_nota', rawStatus: 'Repro Nota' })]),
    );
    expect(q.unresolvedFailures).toEqual([{ code: 'OPT301', name: 'OPTATIVA DE TESTE', category: 'optativa' }]);
  });

  it('separates failures being retaken now (enrolled in a later term) from the ones still to take', () => {
    const q = performanceInsights(
      sampleCurriculum,
      withEntries([
        entry({ code: 'ICC120', term: '2024.2', grade: 3.9, status: 'reprovado_nota', rawStatus: 'Repro Nota' }),
        entry({ code: 'ICC120', term: '2026.2', grade: null, status: 'matriculado', rawStatus: 'Matricula' }),
        entry({ code: 'ICC130', name: 'ESTRUTURAS', term: '2024.2', grade: 2, status: 'reprovado_freq', rawStatus: 'Reprof Freq' }),
      ]),
    );
    expect(q).toMatchObject({ failures: 2, retakingNow: ['ICC120'] });
    expect(q.unresolvedFailures).toEqual([{ code: 'ICC130', name: 'ESTRUTURAS', category: 'obrigatoria' }]);
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
    const q = performanceInsights(sampleCurriculum, withEntries([entry({ term: '2024.1', grade: 8 }), entry({ term: '2024.2', grade: 9 })]));
    expect(q).toMatchObject({ failures: 0, failedHours: 0, passRate: 100, unresolvedFailures: [] });
  });

  it('treats a later passing entry as resolving the failure', () => {
    const q = performanceInsights(
      sampleCurriculum,
      withEntries([
        entry({ code: 'ICC120', term: '2024.2', grade: 3.9, status: 'reprovado_nota', rawStatus: 'Repro Nota' }),
        entry({ code: 'ICC120', term: '2025.1', grade: 7, status: 'aprovado' }),
      ]),
    );
    expect(q).toMatchObject({ failures: 1, unresolvedFailures: [] });
  });

  it('returns nulls and zeros when nothing counts', () => {
    expect(performanceInsights(sampleCurriculum, withEntries([]))).toEqual({
      takenHours: 0, failedHours: 0, failedCredits: 0, passRate: null, failures: 0, unresolvedFailures: [], retakingNow: [],
      lastTerm: null, previousCumulativeCr: null, trend: null, bestTerm: null, worstTerm: null,
      mandatoryCr: null, creditedCount: 0, creditedHours: 0,
      crByCategory: { optativa: null, eletiva: null, extensao: null },
    });
  });

  it('sums the credits of the failures and breaks the CR down by category', () => {
    expect(p).toMatchObject({
      failedCredits: 8,
      crByCategory: { optativa: 7.516, eletiva: 8.65, extensao: null },
    });
  });

  it('has no trend with a single term', () => {
    const q = performanceInsights(sampleCurriculum, withEntries([entry({ term: '2024.1', grade: 8 })]));
    expect(q).toMatchObject({ trend: null, previousCumulativeCr: null });
  });

  it('reads a stable trend within ±0.05 and a falling one beyond it', () => {
    const stable = performanceInsights(
      sampleCurriculum,
      withEntries([entry({ term: '2024.1', grade: 8 }), entry({ term: '2024.2', grade: 8.04 })]),
    );
    expect(stable.trend).toBe('estavel');
    const falling = performanceInsights(
      sampleCurriculum,
      withEntries([entry({ term: '2024.1', grade: 8 }), entry({ term: '2024.2', grade: 7 })]),
    );
    expect(falling.trend).toBe('caindo');
  });

  it('breaks best/worst ties in favour of the most recent term', () => {
    const best = performanceInsights(
      sampleCurriculum,
      withEntries([entry({ term: '2024.1', grade: 8 }), entry({ term: '2024.2', grade: 8 }), entry({ term: '2025.1', grade: 6 })]),
    );
    expect(best.bestTerm?.term).toBe('2024.2');
    const worst = performanceInsights(
      sampleCurriculum,
      withEntries([entry({ term: '2024.1', grade: 6 }), entry({ term: '2024.2', grade: 8 }), entry({ term: '2025.1', grade: 6 })]),
    );
    expect(worst.worstTerm?.term).toBe('2025.1');
  });

  it('ignores terms without a computable CR when picking best and worst', () => {
    const q = performanceInsights(
      sampleCurriculum,
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

describe('timelineInsights', () => {
  it('reads the course timeline from admission to the maximum term, with both graduations', () => {
    expect(timelineInsights(sampleCurriculum, sampleTranscript)).toEqual({
      admissionTerm: '2024.1',
      currentTerm: '2026.2',
      currentPeriod: 6,
      minPeriods: 8,
      maxPeriods: 12,
      maxTerm: '2029.2',
      usedPercent: 50,
      forecastTerm: '2027.1',
      forecastSlack: 5,
      paceTerm: '2028.1',
      pacePeriods: 3,
      paceSlack: 3,
    });
  });

  it('keeps only the forecast when the transcript has no admission term', () => {
    const q = timelineInsights(sampleCurriculum, { ...sampleTranscript, admissionTerm: null });
    expect(q).toMatchObject({
      admissionTerm: null,
      currentPeriod: null,
      maxTerm: null,
      usedPercent: null,
      forecastSlack: null,
      paceSlack: null,
      paceTerm: '2028.1',
    });
  });

  it('has no pace estimate before the first completed term', () => {
    const first = withEntries([entry({ term: '2024.1', grade: null, status: 'matriculado', rawStatus: 'Matricula' })]);
    expect(timelineInsights(sampleCurriculum, first)).toMatchObject({
      paceTerm: null,
      pacePeriods: null,
      paceSlack: null,
      currentPeriod: 1,
    });
  });

  it('marks a finished course with a zero-period pace', () => {
    expect(timelineInsights(withTotalHours(2070), sampleTranscript)).toMatchObject({ pacePeriods: 0, paceTerm: '2026.2' });
  });
});

describe('milestoneInsights', () => {
  it('points at the next milestone with the hours left and the term at the current pace', () => {
    expect(milestoneInsights(sampleCurriculum, sampleTranscript)).toEqual({ target: 75, hoursLeft: 330, term: '2027.1' });
  });

  it('has no milestone once the course is complete', () => {
    expect(milestoneInsights(sampleCurriculum, { ...sampleTranscript, officialProgressPercent: 100 })).toBeNull();
  });

  it('shows the hours left without a term when there is no pace to measure', () => {
    const first = withEntries([entry({ term: '2024.1', grade: null, status: 'matriculado', rawStatus: 'Matricula' })], {
      officialProgressPercent: null,
    });
    expect(milestoneInsights(sampleCurriculum, first)).toEqual({ target: 25, hoursLeft: 800, term: null });
  });
});

describe('inProgressInsights', () => {
  it('sums the enrolled courses and the percentage if they are all approved', () => {
    expect(inProgressInsights(sampleCurriculum, sampleTranscript)).toEqual({ courses: 5, hours: 420, percentIfApproved: 77.82 });
  });

  it('is absent without enrolled courses', () => {
    const done = withEntries(sampleTranscript.entries.filter((e) => e.status !== 'matriculado'));
    expect(inProgressInsights(sampleCurriculum, done)).toBeNull();
  });

  it('keeps the ENADE out of the enrolled courses', () => {
    const enrolled = entry({ code: 'ICC006', term: '2026.2', hours: 60, grade: null, status: 'matriculado', rawStatus: 'Matricula' });
    const enade = entry({ code: 'ENADE02', name: 'ENADE - CONCLUINTE', term: '2026.2', hours: 60, grade: null, status: 'matriculado', rawStatus: 'Matricula' });
    expect(inProgressInsights(sampleCurriculum, withEntries([enrolled, enade]))).toEqual({ courses: 1, hours: 60, percentIfApproved: 66.57 });
  });
});

describe('pendingInsights', () => {
  it('counts what is left, what is released and what is blocked', () => {
    expect(pendingInsights(sampleCurriculum, sampleTranscript)).toEqual({
      mandatoryTotal: 35,
      mandatoryRemaining: 6,
      mandatoryInProgress: 4,
      mandatoryHoursLeft: 540,
      available: 6,
      blocked: 0,
      hours: { optativa: 0, eletiva: 60, aacc: 210, extensao: 320 },
      bottlenecks: [{ code: 'ICC412', name: 'PROCESSO DE DESENVOLVIMENTO DE SOFTWARE', unlocks: 1 }],
    });
  });

  it('blocks the dependent course when its prerequisite is not in progress', () => {
    const entries = sampleTranscript.entries.filter((e) => e.code !== 'ICC412');
    expect(pendingInsights(sampleCurriculum, withEntries(entries))).toMatchObject({ available: 5, blocked: 1 });
  });

  it('orders bottlenecks by how many pending courses they hold back', () => {
    const chain = ['ICC001', 'ICC002', 'ICC003'].map((code) => sampleCurriculum.courses.find((x) => x.code === code)!);
    const q = pendingInsights({ ...sampleCurriculum, courses: chain }, withEntries([]));
    expect(q.bottlenecks).toEqual([
      { code: 'ICC001', name: 'INTRODUÇÃO À COMPUTAÇÃO', unlocks: 2 },
      { code: 'ICC002', name: 'ALGORITMOS E ESTRUTURA DE DADOS I', unlocks: 1 },
    ]);
    expect(q).toMatchObject({ mandatoryTotal: 3, mandatoryRemaining: 3, available: 1, blocked: 2 });
  });
});

describe('crProjectionInsights', () => {
  const tiny = {
    ...sampleCurriculum,
    courses: sampleCurriculum.courses.filter((x) => x.code === 'ICC001' || x.code === 'ICC002'),
  };
  const taken = withEntries([entry({ code: 'ICC001', term: '2024.1', hours: 60, credits: 5, grade: 6 })]);

  it('projects the best and worst CR over the mandatory courses left', () => {
    expect(crProjectionInsights(tiny, taken)).toEqual({ remainingCourses: 1, remainingHours: 90, best: 8.4, worst: 5.4 });
  });

  it('projects nothing when there is no mandatory course left', () => {
    const all = withEntries([entry({ code: 'ICC001', grade: 6 }), entry({ code: 'ICC002', hours: 90, grade: 7 })]);
    expect(crProjectionInsights(tiny, all)).toEqual({ remainingCourses: 0, remainingHours: 0, best: 6.6, worst: 6.6 });
  });

  it('uses the hours from the transcript when the remaining course has an entry', () => {
    const enrolled = withEntries([
      entry({ code: 'ICC001', grade: 6 }),
      entry({ code: 'ICC002', hours: 100, grade: null, status: 'matriculado', rawStatus: 'Matricula' }),
    ]);
    expect(crProjectionInsights(tiny, enrolled)).toEqual({ remainingCourses: 1, remainingHours: 100, best: 8.5, worst: 5.375 });
  });
});

describe('delayInsights', () => {
  it('reads the delay against the ideal term, only for courses actually taken', () => {
    const q = delayInsights(
      sampleCurriculum,
      withEntries([
        entry({ code: 'ICC001', term: '2024.1', grade: 7, status: 'equivalencia', rawStatus: 'Equivalenc' }),
        entry({ code: 'ICC120', term: '2024.1', grade: 7 }),
        entry({ code: 'IEM075', term: '2024.2', grade: 7 }),
        entry({ code: 'ICC120', term: '2025.1', grade: 8 }),
      ]),
    );
    expect(q).toEqual({ courses: 2, averageDelay: 1.5, onTime: 0, onTimePercent: 0 });
  });

  it('is absent without the admission term', () => {
    expect(delayInsights(sampleCurriculum, { ...sampleTranscript, admissionTerm: null })).toBeNull();
  });
});

describe('attemptInsights', () => {
  it('lists courses with more than one enrolment, unresolved first', () => {
    expect(
      attemptInsights(
        withEntries([
          entry({ code: 'ICC120', term: '2024.2', grade: 3, status: 'reprovado_nota', rawStatus: 'Repro Nota' }),
          entry({ code: 'ICC120', term: '2025.1', grade: 7 }),
          entry({ code: 'ICC130', name: 'ESTRUTURAS DE DADOS', term: '2024.2', grade: 2, status: 'reprovado_freq', rawStatus: 'Repro Freq' }),
          entry({ code: 'ICC130', name: 'ESTRUTURAS DE DADOS', term: '2025.1', grade: 4, status: 'reprovado_nota', rawStatus: 'Repro Nota' }),
          entry({ code: 'ICC130', name: 'ESTRUTURAS DE DADOS', term: '2026.2', grade: null, status: 'matriculado', rawStatus: 'Matricula' }),
          entry({ code: 'ICC001' }),
        ]),
      ),
    ).toEqual([
      { code: 'ICC130', name: 'ESTRUTURAS DE DADOS', attempts: 2, approved: false, retakingNow: true },
      { code: 'ICC120', name: 'DISCIPLINA', attempts: 2, approved: true, retakingNow: false },
    ]);
  });

  it('is empty without repeated courses', () => {
    expect(attemptInsights(withEntries([entry({}), entry({ code: 'IEM075' })]))).toEqual([]);
  });
});

describe('streakInsights', () => {
  it('counts the recent terms without failures and remembers the last one', () => {
    expect(streakInsights(sampleTranscript)).toEqual({ terms: 1, judgedTerms: 5, lastFailureTerm: '2025.2', neverFailed: false });
  });

  it('reports a clean history when nothing was failed', () => {
    const q = streakInsights(withEntries([entry({ term: '2024.1', grade: 8 }), entry({ term: '2024.2', grade: 9 })]));
    expect(q).toEqual({ terms: 2, judgedTerms: 2, lastFailureTerm: null, neverFailed: true });
  });

  it('ignores terms without graded enrolments', () => {
    const q = streakInsights(
      withEntries([
        entry({ term: '2024.1', grade: 8 }),
        entry({ term: '2024.2', grade: null, status: 'matriculado', rawStatus: 'Matricula' }),
      ]),
    );
    expect(q).toMatchObject({ terms: 1, judgedTerms: 1 });
  });
});

describe('gradeInsights', () => {
  it('reads the median and the distribution of the graded courses', () => {
    const q = gradeInsights(
      withEntries([
        entry({ code: 'ICC120', grade: 5.5, status: 'reprovado_nota', rawStatus: 'Repro Nota' }),
        entry({ code: 'ICC001', grade: 9.5 }),
        entry({ code: 'IEM075', grade: 8 }),
      ]),
    );
    expect(q).toEqual({
      count: 3,
      median: 8,
      ninePlus: 1,
      bands: [
        { key: 'abaixo6', count: 1 },
        { key: '6a7', count: 0 },
        { key: '7a8', count: 0 },
        { key: '8a9', count: 1 },
        { key: '9a10', count: 1 },
      ],
    });
  });

  it('is absent without grades', () => {
    const enrolled = withEntries([entry({ grade: null, status: 'matriculado', rawStatus: 'Matricula' })]);
    expect(gradeInsights(enrolled)).toBeNull();
  });
});
