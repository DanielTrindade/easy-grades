# Visão geral narrativa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Visão geral passa a responder "quando eu termino", "o que falta e o que destrava" e "como estou evoluindo", com métricas puras no core e microcopy em cada número.

**Architecture:** As métricas novas moram em `packages/core/src/insights.ts` (funções puras, testadas, exportadas pelo barrel) e são expostas à web pelo `analyze()` de `apps/web/src/lib/use-analysis.ts`. A Visão geral ganha a seção `TimelineBand`, a seção `PendingSection`, o componente `OverviewSummary` (Resumo extraído e testável), acréscimos em `MarkerBand`, `PaceSection`, `PerformanceSection` e `HoursChart`. Nenhuma dependência nova, nada sai do navegador.

**Tech Stack:** TypeScript estrito, Vitest 5, React 19, Tailwind v4, Recharts 3.8 (via shadcn chart).

**Spec:** `docs/superpowers/specs/2026-10-15-visao-geral-metricas-design.md` — ler antes de começar; a spec é a autoridade e este plano é o argumento dela.

## Global Constraints

Copiadas da spec e do CLAUDE.md; valem para todas as tarefas.

- Copy em **PT-BR**, sentence case, sem ALL-CAPS, sem "→"; voz "você"; status nunca só por cor (ícone + texto).
- CR = `Σ(nota × CH) / Σ CH` sobre `aprovado, disp_nota, transf_real, reprovado_nota, reprovado_freq`, truncado em 3 casas; `equivalencia` não conta. Não alterar.
- Progresso/`pending` usam a categoria do **histórico** e as horas do **histórico** para concluídas; o que falta em disciplinas usa horas do **currículo**.
- ENADE fica fora de todas as métricas novas (`isEnade`).
- Nada de PII: nunca abrir/ler `report.pdf`/`historico.pdf`; não mexer em git config; não fazer push; não trocar de branch.
- TDD: teste que falha primeiro, depois a implementação.
- Core é TS puro (sem React/DOM); a tela não recalcula domínio.
- Antes de terminar cada tarefa: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` passando; se a tarefa toca `apps/web`, também `pnpm react-doctor:changed` com 0 erros (corrigir, nunca suprimir).
- Um commit por tarefa, mensagem convencional (indicada na tarefa).
- Números formatados pelos helpers existentes (`formatCr`, `formatHours`, `formatPercent`, `formatGrade`, `pluralize`, `toTitleCase`) mais o novo `formatOneDecimal`.
- Sem animação nova; reduced motion continua respeitado; hover só via o variant `hover`.

---

### Task 1: Core — linha do tempo, próxima meta e disciplinas em curso

**Files:**
- Modify: `packages/core/src/insights.ts` (imports + três funções novas no fim do arquivo; mantenha `paceInsights`, `performanceInsights` e `progressWithPendingAacc` como estão)
- Test: `packages/core/src/insights.test.ts`

**Interfaces:**
- Consumes: `paceInsights`, `computeProgress`, `latestTerm`, `addTerms`, `termIndex`, `forecastGraduation` (todos já existem no core).
- Produces (usados pelas tarefas 4–6):
  - `MILESTONES: readonly [25, 50, 75, 90, 100]`
  - `interface TimelineInsights { admissionTerm: string | null; currentTerm: string | null; currentPeriod: number | null; minPeriods: number; maxPeriods: number; maxTerm: string | null; usedPercent: number | null; forecastTerm: string | null; forecastSlack: number | null; paceTerm: string | null; pacePeriods: number | null; paceSlack: number | null }`
  - `timelineInsights(c: Curriculum, t: Transcript, forecast?: Forecast): TimelineInsights`
  - `interface MilestoneInsights { target: number; hoursLeft: number; term: string | null }`
  - `milestoneInsights(c: Curriculum, t: Transcript): MilestoneInsights | null`
  - `interface InProgressInsights { courses: number; hours: number; percentIfApproved: number | null }`
  - `inProgressInsights(c: Curriculum, t: Transcript): InProgressInsights | null`

- [ ] **Step 1: Escrever os testes que falham**

Em `packages/core/src/insights.test.ts`, amplie o import e acrescente os três describes no fim do arquivo:

```ts
import {
  inProgressInsights,
  milestoneInsights,
  paceInsights,
  performanceInsights,
  progressWithPendingAacc,
  timelineInsights,
} from './insights';
```

```ts
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
});
```

- [ ] **Step 2: Rodar os testes novos e ver falhar**

Run: `pnpm --filter @easy-grades/core exec vitest run src/insights.test.ts`
Expected: FAIL — `timelineInsights is not a function` (ou erro de import).

- [ ] **Step 3: Implementar**

Em `packages/core/src/insights.ts`, ajuste os imports do topo:

```ts
import { computeCr, crByTerm, type TermCr } from './cr';
import { forecastGraduation, type Forecast } from './forecast';
import { computeProgress } from './progress';
import type { Category, Curriculum, Transcript } from './schemas';
import { countsInCr, isCompleted, isFailed, isInProgress } from './status';
import { isEnade, latestTerm } from './suggestions';
import { addTerms, compareTerms, termIndex } from './terms';
```

Acrescente o helper `round1` perto do `round2`:

```ts
const round1 = (n: number) => Math.round(n * 10) / 10 + 0;
```

E acrescente no fim do arquivo (depois de `progressWithPendingAacc`):

```ts
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
```

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `pnpm --filter @easy-grades/core exec vitest run src/insights.test.ts`
Expected: PASS (todos, incluindo os describes antigos).

- [ ] **Step 5: Checagem completa e commit**

Run: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`
Expected: tudo verde.

```bash
git add packages/core/src/insights.ts packages/core/src/insights.test.ts
git commit -m "feat(core): timeline, next milestone and in-progress insights"
```

---

### Task 2: Core — o que falta, o que está liberado e os gargalos

**Files:**
- Modify: `packages/core/src/insights.ts`
- Test: `packages/core/src/insights.test.ts`

**Interfaces:**
- Consumes: `computeProgress`, `completedCodes`, `inProgressCodes`, `isSatisfied`, `dependentClosure`, `isEnade` (existentes).
- Produces (tarefa 5):
  - `interface PendingInsights { mandatoryTotal: number; mandatoryRemaining: number; mandatoryInProgress: number; mandatoryHoursLeft: number; available: number; blocked: number; hours: { optativa: number; eletiva: number; aacc: number; extensao: number }; bottlenecks: { code: string; name: string; unlocks: number }[] }`
  - `pendingInsights(c: Curriculum, t: Transcript): PendingInsights`

- [ ] **Step 1: Escrever os testes que falham**

Em `packages/core/src/insights.test.ts`, acrescente `pendingInsights` ao import e o describe no fim:

```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @easy-grades/core exec vitest run src/insights.test.ts`
Expected: FAIL — `pendingInsights is not a function`.

- [ ] **Step 3: Implementar**

Em `packages/core/src/insights.ts`, acrescente o import de pré-requisitos (junto aos demais) e a função no fim do arquivo:

```ts
import { completedCodes, dependentClosure, inProgressCodes, isSatisfied } from './prerequisites';
```

```ts
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @easy-grades/core exec vitest run src/insights.test.ts`
Expected: PASS.

- [ ] **Step 5: Checagem completa e commit**

Run: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`
Expected: tudo verde.

```bash
git add packages/core/src/insights.ts packages/core/src/insights.test.ts
git commit -m "feat(core): pending courses, released and blocked, and the bottlenecks"
```

---

### Task 3: Core — CR na formatura, atraso, tentativas, sequência e notas

**Files:**
- Modify: `packages/core/src/insights.ts`
- Test: `packages/core/src/insights.test.ts`

**Interfaces:**
- Consumes: `crScenarios`, `computeCr`, `completedCodes`, `isEnade`, `countsInCr`, `isFailed`, `isCompleted`, `isInProgress`, `compareTerms`, `termIndex`, `addTerms`.
- Produces (tarefas 4 e 6):
  - `interface CrProjectionInsights { remainingCourses: number; remainingHours: number; best: number | null; worst: number | null }` + `crProjectionInsights(c, t)`
  - `interface DelayInsights { courses: number; averageDelay: number; onTime: number; onTimePercent: number }` + `delayInsights(c, t): DelayInsights | null`
  - `interface CourseAttempts { code: string; name: string; attempts: number; approved: boolean; retakingNow: boolean }` + `attemptInsights(t): CourseAttempts[]`
  - `interface StreakInsights { terms: number; judgedTerms: number; lastFailureTerm: string | null; neverFailed: boolean }` + `streakInsights(t)`
  - `const GRADE_BANDS: readonly ['abaixo6', '6a7', '7a8', '8a9', '9a10']`, `type GradeBandKey`, `interface GradeInsights { count: number; median: number; ninePlus: number; bands: { key: GradeBandKey; count: number }[] }` + `gradeInsights(t): GradeInsights | null`
  - `PerformanceInsights` ganha `failedCredits: number` e `crByCategory: { optativa: number | null; eletiva: number | null; extensao: number | null }`.

- [ ] **Step 1: Escrever os testes que falham**

Em `packages/core/src/insights.test.ts`, acrescente ao import `attemptInsights, crProjectionInsights, delayInsights, gradeInsights, streakInsights` (mantendo a ordem alfabética do bloco) e os describes abaixo. Atualize também o teste existente `returns nulls and zeros when nothing counts` do describe `performanceInsights` (ele compara o objeto inteiro) e acrescente o novo teste de `failedCredits`/`crByCategory`:

```ts
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
```

```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @easy-grades/core exec vitest run src/insights.test.ts`
Expected: FAIL — funções novas inexistentes e o teste do objeto inteiro apontando os campos que faltam.

- [ ] **Step 3: Implementar**

Em `packages/core/src/insights.ts`:

1. Imports do topo (ajuste o existente): acrescente `crScenarios` ao import de `./cr` e `type CurriculumCourse, type TranscriptEntry, type Status` ao import de `./schemas`.
2. Em `PerformanceInsights`, acrescente os dois campos:

```ts
  failedCredits: number;
  crByCategory: { optativa: number | null; eletiva: number | null; extensao: number | null };
```

3. Em `performanceInsights`, acrescente ao retorno:

```ts
    failedCredits: failed.reduce((sum, e) => sum + (e.credits ?? 0), 0),
    crByCategory: {
      optativa: computeCr(t.entries.filter((e) => e.category === 'optativa')),
      eletiva: computeCr(t.entries.filter((e) => e.category === 'eletiva')),
      extensao: computeCr(t.entries.filter((e) => e.category === 'extensao')),
    },
```

4. No fim do arquivo:

```ts
/** Enrolments that were actually taken, graded or not: the course history, equivalence aside. */
const TAKEN_STATUSES = new Set<Status>(['aprovado', 'disp_nota', 'reprovado_nota', 'reprovado_freq']);

export interface CrProjectionInsights {
  remainingCourses: number;
  remainingHours: number;
  /** CR at graduation when every remaining mandatory course is worth 10. */
  best: number | null;
  /** CR at graduation when every remaining mandatory course is worth 5 (the minimum pass). */
  worst: number | null;
}

export function crProjectionInsights(c: Curriculum, t: Transcript): CrProjectionInsights {
  const done = completedCodes(t);
  const remaining = c.courses.filter((x) => x.category === 'obrigatoria' && !isEnade(x.code) && !done.has(x.code));
  const planned = remaining.map((x) => ({ code: x.code, hours: x.hours.total }));
  const scenarios = crScenarios(t, planned);
  return {
    remainingCourses: planned.length,
    remainingHours: planned.reduce((sum, p) => sum + p.hours, 0),
    best: scenarios.best,
    worst: scenarios.worst,
  };
}

export interface DelayInsights {
  courses: number;
  /** Mean terms between the ideal term and the term the course was last taken. */
  averageDelay: number;
  onTime: number;
  onTimePercent: number;
}

export function delayInsights(c: Curriculum, t: Transcript): DelayInsights | null {
  const admission = t.admissionTerm;
  if (!admission) return null;
  const byCode = new Map(c.courses.map((x) => [x.code, x]));
  const lastTaken = new Map<string, TranscriptEntry>();
  for (const e of t.entries) {
    if (!TAKEN_STATUSES.has(e.status) || isEnade(e.code)) continue;
    const course = byCode.get(e.code);
    if (!course || course.category !== 'obrigatoria' || course.idealPeriod === null) continue;
    const current = lastTaken.get(e.code);
    if (!current || compareTerms(e.term, current.term) > 0) lastTaken.set(e.code, e);
  }
  if (lastTaken.size === 0) return null;
  let sum = 0;
  let onTime = 0;
  for (const e of lastTaken.values()) {
    const course = byCode.get(e.code)!;
    const ideal = addTerms(admission, course.idealPeriod! - 1);
    const delay = termIndex(e.term) - termIndex(ideal);
    sum += delay;
    if (delay <= 0) onTime += 1;
  }
  return {
    courses: lastTaken.size,
    averageDelay: round1(sum / lastTaken.size),
    onTime,
    onTimePercent: round2((onTime / lastTaken.size) * 100),
  };
}

export interface CourseAttempts {
  code: string;
  name: string;
  /** Historical enrolments that ended in a grade, approvals and failures. */
  attempts: number;
  approved: boolean;
  retakingNow: boolean;
}

export function attemptInsights(t: Transcript): CourseAttempts[] {
  const byCode = new Map<string, CourseAttempts>();
  for (const e of t.entries) {
    if (isEnade(e.code)) continue;
    const item = byCode.get(e.code) ?? { code: e.code, name: e.name, attempts: 0, approved: false, retakingNow: false };
    if (TAKEN_STATUSES.has(e.status)) item.attempts += 1;
    if (isCompleted(e.status)) item.approved = true;
    if (isInProgress(e.status)) item.retakingNow = true;
    byCode.set(e.code, item);
  }
  return [...byCode.values()]
    .filter((x) => x.attempts >= 2)
    .sort((a, b) => Number(a.approved) - Number(b.approved) || b.attempts - a.attempts || a.code.localeCompare(b.code));
}

export interface StreakInsights {
  /** Recent terms in a row without a failure. */
  terms: number;
  /** Terms with at least one graded enrolment; 0 means there is no history to read. */
  judgedTerms: number;
  lastFailureTerm: string | null;
  neverFailed: boolean;
}

export function streakInsights(t: Transcript): StreakInsights {
  const judged = [...new Set(t.entries.filter((e) => TAKEN_STATUSES.has(e.status)).map((e) => e.term))].sort(compareTerms);
  const failedTerms = new Set(t.entries.filter((e) => isFailed(e.status)).map((e) => e.term));
  const lastFailureTerm = [...failedTerms].sort(compareTerms).at(-1) ?? null;
  let terms = 0;
  for (let i = judged.length - 1; i >= 0 && !failedTerms.has(judged[i]!); i -= 1) terms += 1;
  return { terms, judgedTerms: judged.length, lastFailureTerm, neverFailed: failedTerms.size === 0 };
}

export const GRADE_BANDS = ['abaixo6', '6a7', '7a8', '8a9', '9a10'] as const;
export type GradeBandKey = (typeof GRADE_BANDS)[number];

export interface GradeInsights {
  count: number;
  median: number;
  ninePlus: number;
  bands: { key: GradeBandKey; count: number }[];
}

function bandOf(grade: number): GradeBandKey {
  if (grade < 6) return 'abaixo6';
  if (grade < 7) return '6a7';
  if (grade < 8) return '7a8';
  if (grade < 9) return '8a9';
  return '9a10';
}

export function gradeInsights(t: Transcript): GradeInsights | null {
  const grades = t.entries.filter((e) => countsInCr(e.status) && e.grade !== null).map((e) => e.grade!);
  if (grades.length === 0) return null;
  const sorted = [...grades].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1 ? sorted[middle]! : round2((sorted[middle - 1]! + sorted[middle]!) / 2);
  const bands = GRADE_BANDS.map((key) => ({ key, count: grades.filter((grade) => bandOf(grade) === key).length }));
  return { count: grades.length, median, ninePlus: bands.find((b) => b.key === '9a10')?.count ?? 0, bands };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @easy-grades/core exec vitest run src/insights.test.ts`
Expected: PASS.

- [ ] **Step 5: Checagem completa e commit**

Run: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`
Expected: tudo verde.

```bash
git add packages/core/src/insights.ts packages/core/src/insights.test.ts
git commit -m "feat(core): CR projection, course delay, attempts, streak and grade insights"
```

---

### Task 4: Web — linha do tempo, próxima meta e resumo com a projeção

**Files:**
- Modify: `apps/web/src/lib/use-analysis.ts`
- Modify: `apps/web/src/lib/format.ts`, `apps/web/src/lib/format.test.ts`
- Create: `apps/web/src/features/overview/TimelineBand.tsx`, `apps/web/src/features/overview/TimelineBand.test.tsx`
- Create: `apps/web/src/features/overview/OverviewSummary.tsx`, `apps/web/src/features/overview/OverviewSummary.test.tsx`
- Modify: `apps/web/src/features/overview/MarkerBand.tsx`, `apps/web/src/features/overview/MarkerBand.test.tsx`
- Modify: `apps/web/src/features/overview/OverviewScreen.tsx`

**Interfaces:**
- Consumes: tudo das tarefas 1–3 (`timelineInsights`, `milestoneInsights`, `inProgressInsights`, `crProjectionInsights`, `pendingInsights`, `delayInsights`, `attemptInsights`, `streakInsights`, `gradeInsights`), `formatOneDecimal`.
- Produces: `analysis.timeline|milestone|inProgress|pending|projection|delay|attempts|streak|grades` disponíveis para as tarefas 5–7.

- [ ] **Step 1: Escrever os testes que falham**

`apps/web/src/lib/format.ts` — acrescente após `formatGrade`:

```ts
export const formatOneDecimal = (value: number): string => decimals(1).format(value);
```

Em `apps/web/src/lib/format.test.ts`, amplie o import e o primeiro `it`:

```ts
import { formatCr, formatHours, formatOneDecimal, formatPercent, pluralize, toTitleCase } from './format';
```

```ts
    expect(formatOneDecimal(0.29)).toBe('0,3');
    expect(formatOneDecimal(2)).toBe('2,0');
```

`apps/web/src/features/overview/TimelineBand.test.tsx`:

```tsx
import { timelineInsights } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TimelineBand } from './TimelineBand';

const timeline = timelineInsights(sampleCurriculum, sampleTranscript);

describe('TimelineBand', () => {
  it('marks admission, today, the forecast and the limit', () => {
    render(<TimelineBand timeline={timeline} />);
    expect(screen.getByRole('heading', { name: 'Linha do tempo do curso' })).toBeInTheDocument();
    expect(screen.getByText('2024/1')).toBeInTheDocument();
    expect(screen.getByText('2026/2')).toBeInTheDocument();
    expect(screen.getByText('2027/1')).toBeInTheDocument();
    expect(screen.getByText('2029/2')).toBeInTheDocument();
  });

  it('ties the terms together in one sentence with the pace and the slack', () => {
    render(<TimelineBand timeline={timeline} />);
    expect(
      screen.getByText(
        'Você está no 6º período de 8 ideais — 50,00% do prazo máximo de 12. As obrigatórias terminam em 2027/1. No seu ritmo médio, contando as horas fora das disciplinas, o curso fecha em 2028/1, com 3 períodos de folga até 2029/2.',
      ),
    ).toBeInTheDocument();
  });

  it('draws the done stretch up to the current term', () => {
    const { container } = render(<TimelineBand timeline={timeline} />);
    const done = container.querySelector<HTMLElement>('[data-segment="done"]');
    expect(done).not.toBeNull();
    expect(done!.style.width).toBe('45.45%');
  });

  it('warns in the error style when the pace goes past the maximum', () => {
    const { container } = render(<TimelineBand timeline={{ ...timeline, paceSlack: -1 }} />);
    const warning = screen.getByText(/além do prazo máximo/);
    expect(warning).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveClass('text-erro');
  });
});
```

`apps/web/src/features/overview/OverviewSummary.test.tsx`:

```tsx
import { crProjectionInsights, forecastGraduation, performanceInsights } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OverviewSummary } from './OverviewSummary';

const forecast = forecastGraduation(sampleCurriculum, sampleTranscript);
const performance = performanceInsights(sampleCurriculum, sampleTranscript);
const projection = crProjectionInsights(sampleCurriculum, sampleTranscript);

function renderSummary(over: Partial<Parameters<typeof OverviewSummary>[0]> = {}) {
  return render(
    <OverviewSummary
      cr={7.757}
      officialCr={7.757}
      performance={performance}
      forecast={forecast}
      projection={projection}
      outsideHours={forecast.pendingHours.aacc + forecast.pendingHours.extensao}
      {...over}
    />,
  );
}

describe('OverviewSummary', () => {
  it('shows the CR, the graduation forecast and the hours outside the courses', () => {
    renderSummary();
    expect(screen.getByText('7,757')).toBeInTheDocument();
    expect(screen.getByText('2027/1')).toBeInTheDocument();
    expect(screen.getByText('1 semestre de obrigatórias pela frente.')).toBeInTheDocument();
    expect(screen.getByText('530 h')).toBeInTheDocument();
  });

  it('projects the CR range over the mandatory courses left', () => {
    renderSummary();
    expect(screen.getByText('Na formatura: entre 7,229 e 8,187.')).toBeInTheDocument();
  });

  it('explains a CR that diverges from the printed one', () => {
    renderSummary({ officialCr: 7 });
    expect(screen.getByText('Pelas notas do histórico: 7,757.')).toBeInTheDocument();
  });

  it('has no projection without remaining courses', () => {
    renderSummary({ projection: { remainingCourses: 0, remainingHours: 0, best: null, worst: null } });
    expect(screen.queryByText(/Na formatura/)).not.toBeInTheDocument();
  });

  it('falls back to no forecast and warns when the maximum is exceeded', () => {
    renderSummary({ forecast: { ...forecast, graduationTerm: null } });
    expect(screen.getByText('sem previsão')).toBeInTheDocument();
    renderSummary({ forecast: { ...forecast, exceedsMax: true, maxTerm: '2029.2' } });
    expect(screen.getByText(/Passa do prazo máximo \(2029\/2\)\./)).toBeInTheDocument();
  });
});
```

Em `apps/web/src/features/overview/MarkerBand.test.tsx`, acrescente:

```tsx
  it('marks the next milestone inside the band and describes it below', () => {
    const { container } = render(
      <MarkerBand
        progress={progress}
        reveal={false}
        onRevealed={() => {}}
        milestone={{ target: 75, hoursLeft: 330, term: '2027.1' }}
      />,
    );
    const tick = container.querySelector<HTMLElement>('[data-milestone="75"]');
    expect(tick).not.toBeNull();
    expect(tick!.style.left).toBe('75%');
    expect(screen.getByText('Próxima meta: 75%. Faltam 330 h — no seu ritmo, até 2027/1.')).toBeInTheDocument();
  });

  it('adds the projection of the enrolled courses', () => {
    render(
      <MarkerBand
        progress={progress}
        reveal={false}
        onRevealed={() => {}}
        inProgress={{ courses: 5, hours: 420, percentIfApproved: 77.82 }}
      />,
    );
    expect(screen.getByText('Em curso: 5 disciplinas, 420 h. Se aprovar tudo: 77,82% do curso.')).toBeInTheDocument();
  });

  it('omits both lines when the data is missing', () => {
    renderBand();
    expect(screen.queryByText(/Próxima meta/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Em curso/)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/overview/TimelineBand.test.tsx src/features/overview/OverviewSummary.test.tsx src/features/overview/MarkerBand.test.tsx src/lib/format.test.ts`
Expected: FAIL — módulos `TimelineBand` e `OverviewSummary` inexistentes; `formatOneDecimal` inexistente; props novas não aceitas.

- [ ] **Step 3: Implementar**

`apps/web/src/lib/use-analysis.ts` — substitua o corpo por:

```ts
import {
  attemptInsights,
  computeCr,
  computeProgress,
  crByTerm,
  crProjectionInsights,
  delayInsights,
  forecastGraduation,
  gradeInsights,
  inProgressInsights,
  latestTerm,
  milestoneInsights,
  paceInsights,
  pendingInsights,
  performanceInsights,
  streakInsights,
  timelineInsights,
  type ParseResponse,
} from '@easy-grades/core';
import { useMemo } from 'react';

export function analyze({ curriculum, transcript }: ParseResponse) {
  const forecast = forecastGraduation(curriculum, transcript);
  return {
    cr: computeCr(transcript.entries),
    crHistory: crByTerm(transcript),
    progress: computeProgress(curriculum, transcript),
    forecast,
    pace: paceInsights(curriculum, transcript),
    performance: performanceInsights(curriculum, transcript),
    currentTerm: latestTerm(transcript),
    unknownStatuses: transcript.entries.filter((entry) => entry.status === 'desconhecido'),
    timeline: timelineInsights(curriculum, transcript, forecast),
    milestone: milestoneInsights(curriculum, transcript),
    inProgress: inProgressInsights(curriculum, transcript),
    pending: pendingInsights(curriculum, transcript),
    projection: crProjectionInsights(curriculum, transcript),
    delay: delayInsights(curriculum, transcript),
    attempts: attemptInsights(transcript),
    streak: streakInsights(transcript),
    grades: gradeInsights(transcript),
  };
}

export type Analysis = ReturnType<typeof analyze>;

export function useAnalysis(data: ParseResponse): Analysis {
  return useMemo(() => analyze(data), [data]);
}
```

`apps/web/src/features/overview/TimelineBand.tsx` (arquivo novo):

```tsx
import { formatTerm, termIndex, type TimelineInsights } from '@easy-grades/core';
import { TriangleAlert } from 'lucide-react';
import { formatPercent, pluralize } from '@/lib/format';

/** Position of a term on the track: 0% at admission, 100% at the maximum term. */
function position(term: string | null, timeline: TimelineInsights): number | null {
  if (term === null || timeline.admissionTerm === null || timeline.maxTerm === null) return null;
  const scale = termIndex(timeline.maxTerm) - termIndex(timeline.admissionTerm);
  if (scale <= 0) return 0;
  const raw = ((termIndex(term) - termIndex(timeline.admissionTerm)) / scale) * 100;
  return Math.min(100, Math.max(0, raw));
}

interface TimelineBandProps {
  timeline: TimelineInsights;
}

/** Admission, today, forecast and limit on one track, with the sentence that ties them together. */
export function TimelineBand({ timeline }: TimelineBandProps) {
  const current = position(timeline.currentTerm, timeline);
  const forecast = position(timeline.forecastTerm, timeline);
  const late = timeline.paceSlack !== null && timeline.paceSlack < 0;
  const markers = [
    { label: 'Ingresso', term: timeline.admissionTerm },
    { label: 'Hoje', term: timeline.currentTerm },
    { label: 'Previsão', term: timeline.forecastTerm },
    { label: 'Limite', term: timeline.maxTerm },
  ];
  const parts: string[] = [];
  if (timeline.currentPeriod !== null && timeline.usedPercent !== null) {
    parts.push(
      `Você está no ${timeline.currentPeriod}º período de ${timeline.minPeriods} ideais — ${formatPercent(timeline.usedPercent)} do prazo máximo de ${timeline.maxPeriods}.`,
    );
  }
  if (timeline.forecastTerm !== null) {
    parts.push(`As obrigatórias terminam em ${formatTerm(timeline.forecastTerm)}.`);
  }
  if (timeline.paceTerm !== null) {
    const maxTerm = timeline.maxTerm;
    const tail =
      timeline.paceSlack === null || maxTerm === null
        ? ''
        : timeline.paceSlack >= 0
          ? `, com ${pluralize(timeline.paceSlack, 'período', 'períodos')} de folga até ${formatTerm(maxTerm)}`
          : `, ${pluralize(Math.abs(timeline.paceSlack), 'período', 'períodos')} além do prazo máximo de ${formatTerm(maxTerm)}`;
    parts.push(
      `No seu ritmo médio, contando as horas fora das disciplinas, o curso fecha em ${formatTerm(timeline.paceTerm)}${tail}.`,
    );
  }

  return (
    <section aria-labelledby="linha-do-tempo" className="min-w-0">
      <h2 id="linha-do-tempo" className="text-xl">
        Linha do tempo do curso
      </h2>
      <div aria-hidden className="relative mt-4 h-2">
        <span className="absolute inset-0 rounded-full bg-muted" />
        {current !== null && (
          <span
            data-segment="done"
            className="absolute inset-y-0 left-0 rounded-l-full bg-esmeralda"
            style={{ width: `${current.toFixed(2)}%` }}
          />
        )}
        {current !== null && forecast !== null && forecast > current && (
          <span
            data-segment="forecast"
            className="absolute inset-y-0 bg-esmeralda/30"
            style={{ left: `${current.toFixed(2)}%`, width: `${(forecast - current).toFixed(2)}%` }}
          />
        )}
        {current !== null && (
          <span
            data-marker="today"
            className="absolute -top-1 size-4 -translate-x-1/2 rounded-full border-2 border-fundo bg-esmeralda"
            style={{ left: `${current.toFixed(2)}%` }}
          />
        )}
        {forecast !== null && (
          <span
            data-marker="forecast"
            className="absolute -top-1 size-4 -translate-x-1/2 rounded-full border-2 border-esmeralda bg-fundo"
            style={{ left: `${forecast.toFixed(2)}%` }}
          />
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        {markers.map((marker) => (
          <div key={marker.label}>
            <dt className="text-muted-foreground">{marker.label}</dt>
            <dd className="font-medium">{marker.term ? formatTerm(marker.term) : '—'}</dd>
          </div>
        ))}
      </dl>
      {parts.length > 0 && (
        <p
          className={
            late
              ? 'mt-3 flex max-w-[60ch] items-start gap-2 text-sm text-erro'
              : 'mt-3 max-w-[60ch] text-sm text-muted-foreground'
          }
        >
          {late && <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />}
          <span>{parts.join(' ')}</span>
        </p>
      )}
    </section>
  );
}
```

`apps/web/src/features/overview/OverviewSummary.tsx` (arquivo novo; é a seção Resumo de hoje extraída, com a linha da projeção):

```tsx
import {
  formatTerm,
  type CrProjectionInsights,
  type Forecast,
  type PerformanceInsights,
} from '@easy-grades/core';
import { formatCr, formatHours } from '@/lib/format';

interface OverviewSummaryProps {
  cr: number | null;
  officialCr: number | null;
  performance: PerformanceInsights;
  forecast: Forecast;
  projection: CrProjectionInsights;
  /** Hours still missing outside the courses: complementary activities and extension. */
  outsideHours: number;
}

export function OverviewSummary({ cr, officialCr, performance, forecast, projection, outsideHours }: OverviewSummaryProps) {
  const graduation = forecast.graduationTerm ? formatTerm(forecast.graduationTerm) : 'sem previsão';
  const projectionVisible = projection.remainingCourses > 0 && projection.best !== null && projection.worst !== null;

  return (
    <section aria-label="Resumo" className="grid min-w-0 gap-8 border-y border-border py-8 sm:grid-cols-3">
      <div>
        <h2 className="font-sans text-sm font-normal tracking-normal text-muted-foreground">
          Coeficiente de rendimento
        </h2>
        <p className="mt-1 heading-ink text-display leading-none">{formatCr(officialCr ?? cr)}</p>
        {officialCr !== null && cr !== null && officialCr !== cr && (
          <p className="mt-2 text-sm text-muted-foreground">Pelas notas do histórico: {formatCr(cr)}.</p>
        )}
        {performance.mandatoryCr !== null && (
          <p className="mt-2 text-sm text-muted-foreground">CR nas obrigatórias: {formatCr(performance.mandatoryCr)}.</p>
        )}
        {projectionVisible && (
          <p className="mt-2 text-sm text-muted-foreground">
            Na formatura: entre {formatCr(projection.worst)} e {formatCr(projection.best)}.
          </p>
        )}
      </div>
      <div>
        <h2 className="font-sans text-sm font-normal tracking-normal text-muted-foreground">
          Previsão de formatura
        </h2>
        <p className="mt-1 heading-ink text-display leading-none">{graduation}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {forecast.remainingTerms === 0
            ? 'Sem obrigatórias pendentes além das que estão em curso.'
            : `${forecast.remainingTerms} ${forecast.remainingTerms === 1 ? 'semestre' : 'semestres'} de obrigatórias pela frente.`}
          {forecast.exceedsMax && forecast.maxTerm && ` Passa do prazo máximo (${formatTerm(forecast.maxTerm)}).`}
        </p>
      </div>
      <div>
        <h2 className="font-sans text-sm font-normal tracking-normal text-muted-foreground">
          Fora das disciplinas
        </h2>
        <p className="mt-1 heading-ink text-display leading-none">{formatHours(outsideHours)}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          de atividades complementares e extensão ainda por cumprir.
        </p>
      </div>
    </section>
  );
}
```

`apps/web/src/features/overview/MarkerBand.tsx` — acrescente props e as duas linhas. A interface vira:

```tsx
interface MarkerBandProps {
  progress: Progress;
  /** Extra percentage points from activities the student registered and the coordination has not posted yet. */
  pendingPercent?: number;
  /** Next 25/50/75/90/100 milestone, with the hours left and the estimated term. */
  milestone?: MilestoneInsights | null;
  /** Enrolled courses; projected as completed when everything is approved. */
  inProgress?: InProgressInsights | null;
  /** Play the one-time reveal (first time this dataset is shown). */
  reveal: boolean;
  onRevealed: () => void;
}
```

O import do topo vira:

```tsx
import { formatTerm, type InProgressInsights, type MilestoneInsights, type Progress } from '@easy-grades/core';
import { formatHours, formatPercent, pluralize } from '@/lib/format';
```

A assinatura do componente vira `export function MarkerBand({ progress, pendingPercent = 0, milestone = null, inProgress = null, reveal, onRevealed }: MarkerBandProps)`.

Dentro da faixa, depois do segmento `pending`, acrescente o traço da meta:

```tsx
          {milestone && (
            <span
              data-milestone={milestone.target}
              aria-hidden
              className="absolute inset-y-0 border-l border-dashed border-suave"
              style={{ left: `${milestone.target}%` }}
            />
          )}
```

Depois do bloco `hasPending && (...)`, antes do `<dl>`, acrescente as duas linhas:

```tsx
      {inProgress && (
        <p className="mt-1 max-w-[60ch] text-muted-foreground">
          Em curso: {pluralize(inProgress.courses, 'disciplina', 'disciplinas')}, {formatHours(inProgress.hours)}.
          {inProgress.percentIfApproved !== null && ` Se aprovar tudo: ${formatPercent(inProgress.percentIfApproved)} do curso.`}
        </p>
      )}
      {milestone && (
        <p className="mt-1 max-w-[60ch] text-muted-foreground">
          Próxima meta: {milestone.target}%. Faltam {formatHours(milestone.hoursLeft)}
          {milestone.term ? ` — no seu ritmo, até ${formatTerm(milestone.term)}` : ''}.
        </p>
      )}
```

`apps/web/src/features/overview/OverviewScreen.tsx` — novo corpo (o Resumo vira `OverviewSummary` e a linha do tempo entra depois dele; todo o resto fica igual):

```tsx
import { type ParseResponse } from '@easy-grades/core';
import { TriangleAlert } from 'lucide-react';
import { lazy, Suspense } from 'react';
import type { Analysis } from '@/lib/use-analysis';
import { AaccCard } from './AaccCard';
import { EnadeSection } from './EnadeSection';
import { IntegrationTable } from './IntegrationTable';
import { MarkerBand } from './MarkerBand';
import { OverviewSummary } from './OverviewSummary';
import { PaceSection } from './PaceSection';
import { PerformanceSection } from './PerformanceSection';
import { TimelineBand } from './TimelineBand';
import { usePendingAacc } from './use-pending-aacc';

// Recharts is heavy: charts stream in after the numbers are on screen.
const CrChart = lazy(() => import('./CrChart'));
const HoursChart = lazy(() => import('./HoursChart'));
const chartFallback = <div aria-hidden className="h-72 rounded-lg bg-muted/60" />;

interface OverviewScreenProps {
  data: ParseResponse;
  analysis: Analysis;
  reveal: boolean;
  onRevealed: () => void;
}

export function OverviewScreen({ data, analysis, reveal, onRevealed }: OverviewScreenProps) {
  const { cr, crHistory, progress, forecast, unknownStatuses, pace, performance } = analysis;
  const { curriculum, transcript } = data;
  const officialCr = transcript.officialCr;

  const { aacc, pendingPercent, countedHours, officialAacc } = usePendingAacc(curriculum, transcript, progress);

  return (
    <div className="grid gap-14">
      <MarkerBand
        progress={progress}
        pendingPercent={pendingPercent}
        milestone={analysis.milestone}
        inProgress={analysis.inProgress}
        reveal={reveal}
        onRevealed={onRevealed}
      />

      <OverviewSummary
        cr={cr}
        officialCr={officialCr}
        performance={performance}
        forecast={forecast}
        projection={analysis.projection}
        outsideHours={forecast.pendingHours.aacc + forecast.pendingHours.extensao}
      />

      {analysis.timeline.maxTerm !== null && <TimelineBand timeline={analysis.timeline} />}

      {unknownStatuses.length > 0 && (
        <p role="status" className="flex gap-2 rounded-lg border border-erro/40 bg-erro/10 p-3 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-erro" />
          <span>
            {unknownStatuses.length === 1 ? 'Uma disciplina tem' : `${unknownStatuses.length} disciplinas têm`} situação que
            não reconhecemos ({[...new Set(unknownStatuses.map((e) => e.rawStatus || 'vazia'))].join(', ')}) e ficaram fora
            das contas.
          </span>
        </p>
      )}

      <IntegrationTable components={transcript.officialComponents} />

      <div className="grid min-w-0 gap-12 lg:grid-cols-2">
        <PaceSection
          pace={pace}
          minPeriods={curriculum.requirements.minPeriods}
          maxPeriods={curriculum.requirements.maxPeriods}
        />
        <PerformanceSection performance={performance} />
      </div>

      <EnadeSection records={transcript.enade} />

      <AaccCard
        officialHours={officialAacc.doneHours}
        requiredHours={officialAacc.requiredHours}
        countedHours={countedHours}
        activities={aacc.items}
        loading={aacc.loading}
        onAdd={aacc.add}
        onRemove={aacc.remove}
      />

      <div className="grid min-w-0 gap-12 lg:grid-cols-2">
        <Suspense fallback={chartFallback}>
          <CrChart history={crHistory} />
        </Suspense>
        <Suspense fallback={chartFallback}>
          <HoursChart transcript={data.transcript} />
        </Suspense>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/overview src/lib/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Checagem completa e commit**

Run: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm react-doctor:changed`
Expected: tudo verde, 0 erros de react-doctor.

```bash
git add apps/web/src/lib/use-analysis.ts apps/web/src/lib/format.ts apps/web/src/lib/format.test.ts apps/web/src/features/overview
git commit -m "feat(web): course timeline, next milestone and CR at graduation on the overview"
```

---

### Task 5: Web — o que falta para a formatura

**Files:**
- Create: `apps/web/src/features/overview/PendingSection.tsx`, `apps/web/src/features/overview/PendingSection.test.tsx`
- Modify: `apps/web/src/features/overview/OverviewScreen.tsx`

**Interfaces:**
- Consumes: `pendingInsights` (tarefa 2) via `analysis.pending`; `code-label` utility; `formatHours`, `pluralize`, `toTitleCase`.
- Produces: `PendingSection` montada entre a linha do tempo e a tabela de integralização.

- [ ] **Step 1: Escrever os testes que falham**

`apps/web/src/features/overview/PendingSection.test.tsx`:

```tsx
import { pendingInsights } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PendingSection } from './PendingSection';

const pending = pendingInsights(sampleCurriculum, sampleTranscript);

describe('PendingSection', () => {
  it('shows the mandatory courses left, the hours and how many are enrolled', () => {
    render(<PendingSection pending={pending} />);
    expect(screen.getByRole('heading', { name: 'O que falta para a formatura' })).toBeInTheDocument();
    expect(screen.getByText('6 obrigatórias')).toBeInTheDocument();
    expect(screen.getByText('540 h para cumprir, 4 delas em curso.')).toBeInTheDocument();
    expect(screen.getByText('Todas as 6 já cumprem os pré-requisitos.')).toBeInTheDocument();
  });

  it('lists the missing hours outside the mandatory courses, skipping zeros', () => {
    render(<PendingSection pending={pending} />);
    expect(
      screen.getByText('Fora delas, faltam 60 h de eletivas, 210 h de atividades complementares e 320 h de extensão.'),
    ).toBeInTheDocument();
  });

  it('names the courses that hold back the most others', () => {
    render(<PendingSection pending={pending} />);
    expect(screen.getByText('As que mais seguram o avanço:')).toBeInTheDocument();
    expect(screen.getByText(/Processo de Desenvolvimento de Software/)).toBeInTheDocument();
    expect(screen.getByText(/trava 1 disciplina\./)).toBeInTheDocument();
  });

  it('sends the student to the planning with one link', () => {
    render(<PendingSection pending={pending} />);
    expect(screen.getByRole('link', { name: 'Montar o próximo semestre' })).toHaveAttribute('href', '#/planejamento');
  });

  it('counts the blocked courses with the singular label', () => {
    const entries = sampleTranscript.entries.filter((e) => e.code !== 'ICC412');
    render(<PendingSection pending={pendingInsights(sampleCurriculum, { ...sampleTranscript, entries })} />);
    expect(screen.getByText('5 já cumprem os pré-requisitos; 1 ainda bloqueada.')).toBeInTheDocument();
  });

  it('closes the section when nothing is left', () => {
    render(
      <PendingSection
        pending={{ ...pending, mandatoryRemaining: 0, mandatoryInProgress: 0, mandatoryHoursLeft: 0, hours: { optativa: 0, eletiva: 0, aacc: 0, extensao: 0 }, bottlenecks: [] }}
      />,
    );
    expect(screen.getByText('Nenhuma obrigatória')).toBeInTheDocument();
    expect(screen.getByText('Todas as disciplinas obrigatórias do currículo já foram cumpridas.')).toBeInTheDocument();
    expect(screen.queryByText(/Fora delas/)).not.toBeInTheDocument();
  });

  it('uses the singular when only one category is missing hours', () => {
    render(<PendingSection pending={{ ...pending, hours: { optativa: 0, eletiva: 60, aacc: 0, extensao: 0 } }} />);
    expect(screen.getByText('Fora delas, falta 60 h de eletivas.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/overview/PendingSection.test.tsx`
Expected: FAIL — `PendingSection` não existe.

- [ ] **Step 3: Implementar**

`apps/web/src/features/overview/PendingSection.tsx`:

```tsx
import type { PendingInsights } from '@easy-grades/core';
import { formatHours, pluralize, toTitleCase } from '@/lib/format';

const HOURS_LABELS: { key: keyof PendingInsights['hours']; label: string }[] = [
  { key: 'optativa', label: 'optativas' },
  { key: 'eletiva', label: 'eletivas' },
  { key: 'aacc', label: 'atividades complementares' },
  { key: 'extensao', label: 'extensão' },
];

/** "Fora delas, faltam 120 h de eletivas e 320 h de extensão.", skipping the zeros. */
function hoursSentence(hours: PendingInsights['hours']): string | null {
  const parts = HOURS_LABELS.filter(({ key }) => hours[key] > 0).map(({ key, label }) => `${formatHours(hours[key])} de ${label}`);
  if (parts.length === 0) return null;
  if (parts.length === 1) return `Fora delas, falta ${parts[0]}.`;
  return `Fora delas, faltam ${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}.`;
}

export function PendingSection({ pending }: { pending: PendingInsights }) {
  const outside = hoursSentence(pending.hours);

  return (
    <section aria-labelledby="pendente" className="grid min-w-0 gap-4">
      <h2 id="pendente" className="text-xl">
        O que falta para a formatura
      </h2>
      <div>
        <p className="heading-ink text-3xl leading-none">
          {pending.mandatoryRemaining === 0
            ? 'Nenhuma obrigatória'
            : pluralize(pending.mandatoryRemaining, 'obrigatória', 'obrigatórias')}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {pending.mandatoryRemaining === 0
            ? 'Todas as disciplinas obrigatórias do currículo já foram cumpridas.'
            : `${formatHours(pending.mandatoryHoursLeft)} para cumprir${pending.mandatoryInProgress > 0 ? `, ${pending.mandatoryInProgress} delas em curso` : ''}.`}
        </p>
      </div>
      {pending.mandatoryRemaining > 0 && (
        <p className="text-sm">
          {pending.blocked === 0
            ? `Todas as ${pending.mandatoryRemaining} já cumprem os pré-requisitos.`
            : `${pending.available} já cumprem os pré-requisitos; ${pending.blocked} ainda ${pending.blocked === 1 ? 'bloqueada' : 'bloqueadas'}.`}
        </p>
      )}
      {outside !== null && <p className="text-sm text-muted-foreground">{outside}</p>}
      {pending.bottlenecks.length > 0 && (
        <div className="grid gap-1 text-sm">
          <p className="text-muted-foreground">As que mais seguram o avanço:</p>
          <ul className="grid gap-1">
            {pending.bottlenecks.map((course) => (
              <li key={course.code}>
                {toTitleCase(course.name)} <span className="code-label">{course.code}</span> — trava{' '}
                {pluralize(course.unlocks, 'disciplina', 'disciplinas')}.
              </li>
            ))}
          </ul>
        </div>
      )}
      <p>
        <a href="#/planejamento" className="text-sm font-medium text-esmeralda-texto underline-offset-4 hover:underline">
          Montar o próximo semestre
        </a>
      </p>
    </section>
  );
}
```

`OverviewScreen.tsx` — acrescente o import e a seção logo depois do bloco da linha do tempo e do alerta de situações desconhecidas:

```tsx
import { PendingSection } from './PendingSection';
```

```tsx
      <PendingSection pending={analysis.pending} />
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/overview`
Expected: PASS.

- [ ] **Step 5: Checagem completa e commit**

Run: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm react-doctor:changed`
Expected: tudo verde.

```bash
git add apps/web/src/features/overview
git commit -m "feat(web): what is left for graduation, released, blocked and bottlenecks"
```

---

### Task 6: Web — desempenho com contexto (custo, tentativas, sequência e notas)

**Files:**
- Modify: `apps/web/src/features/overview/PaceSection.tsx`, `apps/web/src/features/overview/PaceSection.test.tsx`
- Modify: `apps/web/src/features/overview/PerformanceSection.tsx`, `apps/web/src/features/overview/PerformanceSection.test.tsx`
- Create: `apps/web/src/features/overview/GradeStrip.tsx`, `apps/web/src/features/overview/GradeStrip.test.tsx`
- Modify: `apps/web/src/features/overview/OverviewScreen.tsx`

**Interfaces:**
- Consumes: `delayInsights`, `attemptInsights`, `streakInsights`, `gradeInsights` (tarefa 3), `failedCredits`, `crByCategory` (tarefa 3), `formatOneDecimal` (tarefa 4).
- Produces: `PaceSection` com prop `delay`; `PerformanceSection` com props `attempts`, `streak`, `grades`, `avgHoursPerTerm`; `GradeStrip`.

- [ ] **Step 1: Escrever os testes que falham**

Em `apps/web/src/features/overview/PaceSection.test.tsx`, substitua o arquivo inteiro por (os testes existentes ficam iguais, só ganham a prop `delay`):

```tsx
import { paceInsights, type DelayInsights } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PaceSection } from './PaceSection';

function renderWith(curriculum: typeof sampleCurriculum, delay: DelayInsights | null = null) {
  const { minPeriods, maxPeriods } = curriculum.requirements;
  return render(
    <PaceSection
      pace={paceInsights(curriculum, sampleTranscript)}
      delay={delay}
      minPeriods={minPeriods}
      maxPeriods={maxPeriods}
    />,
  );
}

describe('PaceSection', () => {
  it('shows the sample as on pace, with the terms and hours per term', () => {
    renderWith(sampleCurriculum);
    expect(screen.getByText('No ritmo para o prazo ideal')).toBeInTheDocument();
    expect(screen.getByText('5º período cursado de 8 ideais (máximo 12)')).toBeInTheDocument();
    expect(screen.getByText('Média de 414 h por período')).toBeInTheDocument();
    expect(screen.getByText('Para formar no prazo ideal: 377 h por período')).toBeInTheDocument();
    expect(screen.getByText('No prazo máximo: 162 h por período')).toBeInTheDocument();
  });

  it('warns when the maximum period is at risk', () => {
    renderWith({ ...sampleCurriculum, requirements: { ...sampleCurriculum.requirements, maxPeriods: 6 } });
    expect(screen.getByText('Risco de ultrapassar o prazo máximo')).toBeInTheDocument();
    expect(screen.getByText('No prazo máximo: 1.130 h por período')).toBeInTheDocument();
  });

  it('marks the behind-pace status with the error colour, so it reads as a risk and not as neutral', () => {
    renderWith({ ...sampleCurriculum, requirements: { ...sampleCurriculum.requirements, minPeriods: 5 } });
    const status = screen.getByText('Abaixo do ritmo do prazo ideal');
    expect(status.querySelector('svg')).toHaveClass('text-erro');
  });

  it('says the ideal deadline is over when no ideal period is left', () => {
    renderWith({ ...sampleCurriculum, requirements: { ...sampleCurriculum.requirements, minPeriods: 5 } });
    expect(screen.getByText('Para formar no prazo ideal: prazo encerrado')).toBeInTheDocument();
    expect(screen.getByText('Abaixo do ritmo do prazo ideal')).toBeInTheDocument();
  });

  it('is neutral for a first-period student, with no average to show yet', () => {
    const { container } = render(
      <PaceSection
        pace={paceInsights(sampleCurriculum, { ...sampleTranscript, entries: [] })}
        delay={null}
        minPeriods={8}
        maxPeriods={12}
      />,
    );
    expect(screen.getByText('Ainda sem período concluído para medir o ritmo')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveClass('text-muted-foreground');
    expect(screen.getByText('Nenhum período concluído ainda (ideal 8, máximo 12)')).toBeInTheDocument();
    expect(screen.queryByText(/Média de/)).not.toBeInTheDocument();
    expect(screen.getByText('Para formar no prazo ideal: 400 h por período')).toBeInTheDocument();
    expect(screen.getByText('No prazo máximo: 267 h por período')).toBeInTheDocument();
  });

  it('shows the average delay against the ideal term', () => {
    renderWith(sampleCurriculum, { courses: 2, averageDelay: 1.4, onTime: 1, onTimePercent: 50 });
    expect(
      screen.getByText('Suas obrigatórias acontecem, em média, 1,4 períodos depois do ideal; 50,00% no prazo ou antes.'),
    ).toBeInTheDocument();
  });

  it('says the courses are on time when the average delay is not positive', () => {
    renderWith(sampleCurriculum, { courses: 20, averageDelay: 0, onTime: 13, onTimePercent: 65 });
    expect(
      screen.getByText('Suas obrigatórias acontecem, em média, no período ideal ou antes; 65,00% no prazo.'),
    ).toBeInTheDocument();
  });
});
```

Em `apps/web/src/features/overview/PerformanceSection.test.tsx`, substitua o arquivo inteiro por (os `it`s existentes ficam iguais; `renderWith` e o novo `renderSection` passam o conjunto completo de props):

```tsx
import { gradeInsights, performanceInsights, type Transcript, type TranscriptEntry } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PerformanceSection } from './PerformanceSection';

const entry = (over: Partial<TranscriptEntry>): TranscriptEntry => ({
  code: 'ICC120', name: 'MATEMÁTICA DISCRETA', category: 'obrigatoria', term: '2024.2', credits: 4, hours: 60,
  grade: 3.9, status: 'reprovado_nota', rawStatus: 'Repro Nota', ...over,
});
const withEntries = (entries: TranscriptEntry[]): Transcript => ({ ...sampleTranscript, entries, pending: [] });
const emptyStreak = { terms: 0, judgedTerms: 0, lastFailureTerm: null, neverFailed: true };

const renderWith = (transcript: Transcript) =>
  render(
    <PerformanceSection
      performance={performanceInsights(sampleCurriculum, transcript)}
      attempts={[]}
      streak={emptyStreak}
      grades={null}
      avgHoursPerTerm={414}
    />,
  );

function renderSection(over: Partial<Parameters<typeof PerformanceSection>[0]> = {}) {
  return render(
    <PerformanceSection
      performance={performanceInsights(sampleCurriculum, sampleTranscript)}
      attempts={[]}
      streak={emptyStreak}
      grades={null}
      avgHoursPerTerm={414}
      {...over}
    />,
  );
}

describe('PerformanceSection', () => {
  it('shows the pass rate with the reference study', () => {
    renderWith(sampleTranscript);
    expect(screen.getByText('94,74%')).toBeInTheDocument();
    expect(
      screen.getByText('Em um estudo com 1.124 formados em engenharia, metade reprovou em no máximo 13% das disciplinas.'),
    ).toBeInTheDocument();
  });

  it('counts the failures but lists none to retake, since the sample optativas are already met', () => {
    renderWith(sampleTranscript);
    expect(screen.getByText('2 reprovações')).toBeInTheDocument();
    expect(screen.queryByText(/Ainda por cursar/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Refazendo agora/)).not.toBeInTheDocument();
  });

  it('lists the obrigatória failures still to take, with their names in title case', () => {
    renderWith(withEntries([entry({ code: 'ICC120' }), entry({ code: 'ICC130', name: 'ESTRUTURAS DE DADOS', term: '2025.1' })]));
    expect(screen.getByText('Ainda por cursar: Matemática Discreta (ICC120), Estruturas de Dados (ICC130)')).toBeInTheDocument();
  });

  it('shows the failures being retaken now by code', () => {
    renderWith(withEntries([entry({ code: 'ICC120' }), entry({ code: 'ICC120', term: '2026.2', grade: null, status: 'matriculado', rawStatus: 'Matricula' })]));
    expect(screen.getByText('Refazendo agora: ICC120')).toBeInTheDocument();
    expect(screen.queryByText(/Ainda por cursar/)).not.toBeInTheDocument();
  });

  it('shows the CR trend, best and worst term and credited courses', () => {
    renderWith(sampleTranscript);
    expect(screen.getByText('CR acumulado subiu desde o período anterior (de 7,700 para 7,757).')).toBeInTheDocument();
    expect(screen.getByText('Melhor período: 2026/1, com CR 8,130')).toBeInTheDocument();
    expect(screen.getByText('Pior período: 2025/2, com CR 7,133')).toBeInTheDocument();
    expect(
      screen.getByText('20 disciplinas aproveitadas (1.290 h) por equivalência, dispensa ou transferência'),
    ).toBeInTheDocument();
  });

  it('says there is no pass rate before any course counts', () => {
    renderWith({ ...sampleTranscript, entries: [] });
    expect(screen.getByText('sem disciplinas cursadas ainda')).toBeInTheDocument();
  });
```

e acrescente os testes novos dentro do mesmo describe, antes do `});` final:

```tsx
  it('shows the cost of the failures as hours, credits and periods of study', () => {
    renderSection();
    expect(screen.getByText('Custo: 120 h e 8 créditos — o equivalente a 0,3 período no seu ritmo.')).toBeInTheDocument();
  });

  it('lists the courses with more than one enrolment', () => {
    renderSection({
      attempts: [
        { code: 'ICC130', name: 'ESTRUTURAS DE DADOS', attempts: 2, approved: false, retakingNow: true },
        { code: 'ICC120', name: 'MATEMÁTICA DISCRETA', attempts: 3, approved: true, retakingNow: false },
      ],
    });
    expect(screen.getByText('Mais de uma tentativa')).toBeInTheDocument();
    expect(screen.getByText('Estruturas de Dados (ICC130): 2 matrículas, ainda sem aprovação, refazendo agora.')).toBeInTheDocument();
    expect(screen.getByText('Matemática Discreta (ICC120): 3 matrículas até a aprovação.')).toBeInTheDocument();
  });

  it('reads the current streak of terms without a failure', () => {
    renderSection({ streak: { terms: 3, judgedTerms: 5, lastFailureTerm: '2025.2', neverFailed: false } });
    expect(screen.getByText('Faz 3 períodos sem reprovar nenhuma disciplina.')).toBeInTheDocument();
  });

  it('shows the last failure when the most recent term is not clean', () => {
    renderSection({ streak: { terms: 0, judgedTerms: 4, lastFailureTerm: '2025.2', neverFailed: false } });
    expect(screen.getByText('Última reprovação: 2025/2.')).toBeInTheDocument();
  });

  it('celebrates a history without failures only when there is a history', () => {
    renderSection({ streak: { terms: 4, judgedTerms: 4, lastFailureTerm: null, neverFailed: true } });
    expect(screen.getByText('Você nunca reprovou em uma disciplina.')).toBeInTheDocument();
    renderSection({ streak: { terms: 0, judgedTerms: 0, lastFailureTerm: null, neverFailed: true } });
    expect(screen.queryByText('Você nunca reprovou em uma disciplina.')).not.toBeInTheDocument();
  });

  it('compares the best category with the mandatory CR', () => {
    renderSection();
    expect(screen.getByText('Você rende mais em eletivas (8,650) do que nas obrigatórias (7,751).')).toBeInTheDocument();
  });

  it('adds the grade distribution when there are grades', () => {
    renderSection({ grades: gradeInsights(sampleTranscript) });
    expect(screen.getByText('Notas das disciplinas cursadas')).toBeInTheDocument();
  });
```

`apps/web/src/features/overview/GradeStrip.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GradeStrip } from './GradeStrip';

describe('GradeStrip', () => {
  it('shows the median and one row per band', () => {
    const { container } = render(
      <GradeStrip
        grades={{
          count: 4,
          median: 7.9,
          ninePlus: 1,
          bands: [
            { key: 'abaixo6', count: 1 },
            { key: '6a7', count: 0 },
            { key: '7a8', count: 2 },
            { key: '8a9', count: 0 },
            { key: '9a10', count: 1 },
          ],
        }}
      />,
    );
    expect(screen.getByText('Mediana 7,90 · 1 nota 9 ou mais')).toBeInTheDocument();
    expect(screen.getByText('Abaixo de 6')).toBeInTheDocument();
    expect(screen.getByText('9 a 10')).toBeInTheDocument();
    const rows = container.querySelectorAll('li');
    expect(rows).toHaveLength(5);
    expect(rows[2]!.querySelector('span[aria-hidden]')).toHaveStyle({ width: '100%' });
    expect(rows[4]!.querySelector('span[aria-hidden]')).toHaveStyle({ width: '50%' });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/overview`
Expected: FAIL — props novas não existem e `GradeStrip` não existe.

- [ ] **Step 3: Implementar**

`PaceSection.tsx` — acrescente a prop `delay` e o `li` novo:

```tsx
import type { DelayInsights, PaceInsights } from '@easy-grades/core';
import { CircleCheck, Clock, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react';
import { formatHours, formatOneDecimal, formatPercent } from '@/lib/format';
```

```tsx
interface PaceSectionProps {
  pace: PaceInsights;
  /** Average delay of the mandatory courses against their ideal term; null without data. */
  delay: DelayInsights | null;
  minPeriods: number;
  maxPeriods: number;
}

export function PaceSection({ pace, delay, minPeriods, maxPeriods }: PaceSectionProps) {
```

Dentro do `<ul>` dos períodos, logo depois do bloco condicional de períodos (o ternário de `pace.completedTerms`) e antes do `<li>` "Para formar no prazo ideal", acrescente:

```tsx
        {delay && (
          <li>
            {delay.averageDelay > 0
              ? `Suas obrigatórias acontecem, em média, ${formatOneDecimal(delay.averageDelay)} períodos depois do ideal; ${formatPercent(delay.onTimePercent)} no prazo ou antes.`
              : `Suas obrigatórias acontecem, em média, no período ideal ou antes; ${formatPercent(delay.onTimePercent)} no prazo.`}
          </li>
        )}
```

`GradeStrip.tsx` (arquivo novo):

```tsx
import type { GradeBandKey, GradeInsights } from '@easy-grades/core';
import { formatGrade, pluralize } from '@/lib/format';

const BAND_LABELS: Record<GradeBandKey, string> = {
  abaixo6: 'Abaixo de 6',
  '6a7': '6 a 7',
  '7a8': '7 a 8',
  '8a9': '8 a 9',
  '9a10': '9 a 10',
};

export function GradeStrip({ grades }: { grades: GradeInsights }) {
  const max = Math.max(...grades.bands.map((band) => band.count));
  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">Notas das disciplinas cursadas</p>
      <p>
        Mediana {formatGrade(grades.median)} · {pluralize(grades.ninePlus, 'nota 9 ou mais', 'notas 9 ou mais')}
      </p>
      <ul className="grid gap-1 text-sm">
        {grades.bands.map((band) => (
          <li key={band.key} className="grid grid-cols-[4.5rem_1fr_2rem] items-center gap-2">
            <span className="text-muted-foreground">{BAND_LABELS[band.key]}</span>
            <span
              aria-hidden
              className="h-2 min-w-px rounded-full bg-esmeralda"
              style={{ width: `${max === 0 ? 0 : (band.count / max) * 100}%` }}
            />
            <span className="text-right tabular-nums">{band.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

`PerformanceSection.tsx` — novas props, imports e blocos:

```tsx
import {
  formatTerm,
  type CourseAttempts,
  type GradeInsights,
  type PerformanceInsights,
  type StreakInsights,
} from '@easy-grades/core';
import { Minus, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { formatCr, formatHours, formatOneDecimal, formatPercent, pluralize, toTitleCase } from '@/lib/format';
import { GradeStrip } from './GradeStrip';
```

```tsx
interface PerformanceSectionProps {
  performance: PerformanceInsights;
  /** Courses with more than one enrolment, worst first. */
  attempts: CourseAttempts[];
  streak: StreakInsights;
  grades: GradeInsights | null;
  /** Average hours per completed term, for the cost equivalence; 0 hides the equivalence. */
  avgHoursPerTerm: number;
}

const CATEGORY_LABELS = { optativa: 'optativas', eletiva: 'eletivas', extensao: 'extensão' } as const;

/** The category CRs above the mandatory CR by a visible margin, best first. */
function bestCategoryCr(performance: PerformanceInsights): { label: string; value: number } | null {
  const mandatory = performance.mandatoryCr;
  if (mandatory === null) return null;
  const categories = (['optativa', 'eletiva', 'extensao'] as const)
    .map((key) => ({ label: CATEGORY_LABELS[key], value: performance.crByCategory[key] }))
    .filter((x): x is { label: string; value: number } => x.value !== null && x.value > mandatory + 0.1);
  if (categories.length === 0) return null;
  return categories.sort((a, b) => b.value - a.value)[0]!;
}
```

Dentro do componente, calcule:

```tsx
  const ratio = avgHoursPerTerm > 0 && performance.failedHours > 0 ? performance.failedHours / avgHoursPerTerm : null;
  const costPeriods =
    ratio !== null && ratio >= 0.1 ? `${formatOneDecimal(ratio)} ${ratio < 2 ? 'período' : 'períodos'}` : null;
  const categoryCr = bestCategoryCr(performance);
```

Depois do bloco `<div className="grid gap-1 text-sm">` das reprovações, acrescente o custo e as tentativas:

```tsx
      {failures > 0 && (
        <p className="text-sm text-muted-foreground">
          Custo: {formatHours(performance.failedHours)} e {pluralize(performance.failedCredits, 'crédito', 'créditos')}
          {costPeriods !== null && ` — o equivalente a ${costPeriods} no seu ritmo`}.
        </p>
      )}

      {attempts.length > 0 && (
        <div className="grid gap-1 text-sm">
          <p className="text-muted-foreground">Mais de uma tentativa</p>
          {attempts.slice(0, 3).map((course) => (
            <p key={course.code}>
              {toTitleCase(course.name)} ({course.code}): {pluralize(course.attempts, 'matrícula', 'matrículas')}
              {course.approved ? ' até a aprovação' : ', ainda sem aprovação'}
              {course.retakingNow ? ', refazendo agora' : ''}.
            </p>
          ))}
        </div>
      )}
```

No bloco `<div className="grid gap-2 text-sm">` (tendência, melhor/pior período), acrescente a sequência e a categoria:

```tsx
        {streak.judgedTerms > 0 && (
          <p>
            {streak.neverFailed
              ? 'Você nunca reprovou em uma disciplina.'
              : streak.terms > 0
                ? `Faz ${pluralize(streak.terms, 'período', 'períodos')} sem reprovar nenhuma disciplina.`
                : `Última reprovação: ${formatTerm(streak.lastFailureTerm!)}.`}
          </p>
        )}
        {categoryCr && (
          <p>
            Você rende mais em {categoryCr.label} ({formatCr(categoryCr.value)}) do que nas obrigatórias (
            {formatCr(performance.mandatoryCr)}).
          </p>
        )}
```

Depois do bloco das disciplinas aproveitadas, antes do fim da seção:

```tsx
      {grades && <GradeStrip grades={grades} />}
```

`OverviewScreen.tsx` — passe as props novas:

```tsx
        <PaceSection
          pace={pace}
          delay={analysis.delay}
          minPeriods={curriculum.requirements.minPeriods}
          maxPeriods={curriculum.requirements.maxPeriods}
        />
        <PerformanceSection
          performance={performance}
          attempts={analysis.attempts}
          streak={analysis.streak}
          grades={analysis.grades}
          avgHoursPerTerm={pace.avgHoursPerTerm}
        />
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/overview`
Expected: PASS.

- [ ] **Step 5: Checagem completa e commit**

Run: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm react-doctor:changed`
Expected: tudo verde.

```bash
git add apps/web/src/features/overview
git commit -m "feat(web): failure cost, repeated courses, streak and grades on the overview"
```

---

### Task 7: Web — gráfico de horas com "em curso" e a média, e a documentação

**Files:**
- Modify: `apps/web/src/features/overview/chart-utils.ts`
- Create: `apps/web/src/features/overview/chart-utils.test.ts`
- Modify: `apps/web/src/features/overview/HoursChart.tsx`
- Modify: `README.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: `isCompleted`, `isFailed`, `isInProgress` do core.
- Produces: `hoursByTerm` com `inProgress`; `hoursAverage(rows): number | null`.

- [ ] **Step 1: Escrever os testes que falham**

`apps/web/src/features/overview/chart-utils.test.ts`:

```ts
import type { Transcript, TranscriptEntry } from '@easy-grades/core';
import { describe, expect, it } from 'vitest';
import { hoursAverage, hoursByTerm } from './chart-utils';

const entry = (over: Partial<TranscriptEntry>): TranscriptEntry => ({
  code: 'ICC001', name: 'DISCIPLINA', category: 'obrigatoria', term: '2024.1', credits: 4, hours: 60,
  grade: 8, status: 'aprovado', rawStatus: 'Aprovado', ...over,
});

const transcript: Transcript = {
  courseCode: 'IE17',
  curriculumVersion: '2025/2',
  admissionTerm: '2024.1',
  officialCr: null,
  officialProgressPercent: null,
  aaccDoneHours: null,
  extensaoDoneHours: null,
  officialComponents: null,
  enade: [],
  pending: [],
  entries: [
    entry({ term: '2024.1', hours: 60, status: 'aprovado', grade: 8 }),
    entry({ term: '2024.1', hours: 30, status: 'reprovado_nota', grade: 2 }),
    entry({ term: '2024.2', hours: 90, status: 'matriculado', grade: null }),
  ],
};

describe('hoursByTerm', () => {
  it('splits done, failed and in-progress hours per term', () => {
    expect(hoursByTerm(transcript)).toEqual([
      { term: '2024/1', done: 60, failed: 30, inProgress: 0 },
      { term: '2024/2', done: 0, failed: 0, inProgress: 90 },
    ]);
  });
});

describe('hoursAverage', () => {
  it('averages the finished terms and ignores the term still in progress', () => {
    expect(
      hoursAverage([
        { term: '2024/1', done: 300, failed: 0, inProgress: 0 },
        { term: '2024/2', done: 200, failed: 60, inProgress: 0 },
        { term: '2026/2', done: 0, failed: 0, inProgress: 420 },
      ]),
    ).toBe(280);
  });

  it('has no average without finished terms', () => {
    expect(hoursAverage([{ term: '2026/2', done: 0, failed: 0, inProgress: 420 }])).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/overview/chart-utils.test.ts`
Expected: FAIL — `hoursAverage` não existe e `hoursByTerm` não tem `inProgress`.

- [ ] **Step 3: Implementar**

`chart-utils.ts` — substitua `hoursByTerm` e acrescente `hoursAverage`:

```ts
import { compareTerms, formatTerm, isCompleted, isFailed, isInProgress, type TermCr, type Transcript } from '@easy-grades/core';

export interface HoursTermRow {
  term: string;
  done: number;
  failed: number;
  inProgress: number;
}

export function hoursByTerm(t: Transcript): HoursTermRow[] {
  const terms = [...new Set(t.entries.map((e) => e.term))].sort(compareTerms);
  return terms
    .map((term) => {
      const entries = t.entries.filter((e) => e.term === term);
      const sum = (pick: (s: (typeof entries)[number]['status']) => boolean) =>
        entries.filter((e) => pick(e.status)).reduce((total, e) => total + (e.hours ?? 0), 0);
      return {
        term: formatTerm(term),
        done: sum(isCompleted),
        failed: sum(isFailed),
        inProgress: sum(isInProgress),
      };
    })
    .filter((row) => row.done + row.failed + row.inProgress > 0);
}

/** Mean of the finished terms; the term still in progress does not lower the average. */
export function hoursAverage(rows: readonly HoursTermRow[]): number | null {
  const finished = rows.filter((row) => row.done + row.failed > 0);
  if (finished.length === 0) return null;
  return Math.round(finished.reduce((sum, row) => sum + row.done + row.failed, 0) / finished.length);
}
```

`HoursChart.tsx` — configuração, barras e a linha de referência:

```tsx
import type { Transcript } from '@easy-grades/core';
// Only reached through React.lazy (see OverviewScreen/PlanningScreen), so recharts already loads on demand.
// react-doctor-disable-next-line react-doctor/prefer-dynamic-import
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts';
import { hoursAverage, hoursByTerm } from './chart-utils';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const config = {
  done: { label: 'Horas concluídas', color: 'var(--esmeralda)' },
  failed: { label: 'Horas reprovadas', color: 'var(--erro)' },
  inProgress: { label: 'Em curso', color: 'var(--band-pending)' },
} satisfies ChartConfig;

export default function HoursChart({ transcript }: { transcript: Transcript }) {
  const data = hoursByTerm(transcript);
  const average = hoursAverage(data);

  return (
    <figure>
      <figcaption>
        <h2 className="text-xl">Horas por período</h2>
      </figcaption>
      <ChartContainer config={config} className="mt-4 aspect-auto h-64 w-full">
        <BarChart data={data} margin={{ left: 0, right: 12, top: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="term" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={40} />
          <ChartTooltip content={<ChartTooltipContent className="min-w-44" />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="done" stackId="h" fill="var(--color-done)" radius={[0, 0, 4, 4]} isAnimationActive={false} />
          <Bar dataKey="failed" stackId="h" fill="var(--color-failed)" isAnimationActive={false} />
          <Bar dataKey="inProgress" stackId="h" fill="var(--color-inProgress)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          {average !== null && (
            <ReferenceLine
              y={average}
              stroke="var(--suave)"
              strokeDasharray="4 4"
              label={{ value: 'sua média', position: 'insideTopRight', fill: 'var(--suave)', fontSize: 12 }}
            />
          )}
        </BarChart>
      </ChartContainer>
    </figure>
  );
}
```

Documentação:

`README.md` — no "O que você vê", depois do bullet "Previsão de formatura", acrescente:

```md
- **Trajetória:** linha do tempo do curso (ingresso, hoje, previsão e prazo máximo), próxima meta de conclusão, o que falta e o que ainda bloqueia, atraso médio em relação ao período ideal, tentativas por disciplina, custo das reprovações e faixas de notas.
```

`CLAUDE.md` — na seção "Domain rules (do not change without evidence)", acrescente:

```md
- **Overview trajectory metrics** (`insights.ts`): the pace ETA divides the remaining hours by the average of the completed terms and counts from the latest term; the CR projection covers only the remaining mandatory courses, at 10 (best) and 5 (worst); the delay metric uses the last graded attempt per mandatory course and excludes equivalence/transfer/disp; streaks and judgement ignore terms with only enrolment, lock, equivalence or disp entries.
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/overview`
Expected: PASS.

- [ ] **Step 5: Checagem completa e commit**

Run: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm react-doctor:changed`
Expected: tudo verde.

```bash
git add apps/web/src/features/overview README.md CLAUDE.md
git commit -m "feat(web): hours chart with in-progress and average, docs for the new metrics"
```
