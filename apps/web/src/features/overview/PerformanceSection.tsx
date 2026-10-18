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

const TREND: Record<NonNullable<PerformanceInsights['trend']>, { icon: LucideIcon; verb: string; iconColor: string }> = {
  subindo: { icon: TrendingUp, verb: 'subiu', iconColor: 'text-success' },
  caindo: { icon: TrendingDown, verb: 'caiu', iconColor: 'text-danger' },
  estavel: { icon: Minus, verb: 'ficou estável', iconColor: 'text-muted-foreground' },
};

interface PerformanceSectionProps {
  performance: PerformanceInsights;
  attempts: CourseAttempts[];
  streak: StreakInsights;
  grades: GradeInsights | null;
  avgHoursPerTerm: number;
}

const CATEGORY_LABELS: Record<'optativa' | 'eletiva' | 'extensao', string> = {
  optativa: 'optativas',
  eletiva: 'eletivas',
  extensao: 'extensão',
};

function bestCategoryCr(performance: PerformanceInsights): { label: string; value: number } | null {
  const mandatory = performance.mandatoryCr;
  if (mandatory === null) return null;
  const categories = (['optativa', 'eletiva', 'extensao'] as const)
    .map((key) => ({ label: CATEGORY_LABELS[key], value: performance.crByCategory[key] }))
    .filter((x): x is { label: string; value: number } => x.value !== null && x.value > mandatory + 0.1);
  if (categories.length === 0) return null;
  return categories.sort((a, b) => b.value - a.value)[0]!;
}

function costSentence(performance: PerformanceInsights, avgHoursPerTerm: number): string {
  const cost = `Custo: ${formatHours(performance.failedHours)} e ${pluralize(performance.failedCredits, 'crédito', 'créditos')}`;
  const ratio = avgHoursPerTerm > 0 && performance.failedHours > 0 ? performance.failedHours / avgHoursPerTerm : null;
  if (ratio === null || ratio < 0.1) return `${cost}.`;
  return `${cost} — o equivalente a ${formatOneDecimal(ratio)} ${ratio < 1 ? 'período' : 'períodos'} no seu ritmo.`;
}

function FailureCost({ performance, avgHoursPerTerm }: { performance: PerformanceInsights; avgHoursPerTerm: number }) {
  if (performance.failures === 0 || performance.failedHours + performance.failedCredits === 0) return null;
  return <p className="text-sm text-muted-foreground">{costSentence(performance, avgHoursPerTerm)}</p>;
}

function streakSentence(streak: StreakInsights): string {
  if (streak.neverFailed) return 'Você nunca reprovou em uma disciplina.';
  if (streak.terms > 0) return `Faz ${pluralize(streak.terms, 'período', 'períodos')} sem reprovar nenhuma disciplina.`;
  return `Última reprovação: ${formatTerm(streak.lastFailureTerm!)}.`;
}

function AttemptsBlock({ attempts }: { attempts: CourseAttempts[] }) {
  if (attempts.length === 0) return null;
  return (
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
  );
}

export function PerformanceSection({ performance, attempts, streak, grades, avgHoursPerTerm }: PerformanceSectionProps) {
  const { passRate, failures, unresolvedFailures, retakingNow, trend, previousCumulativeCr, lastTerm, bestTerm, worstTerm } =
    performance;
  const trendInfo = trend ? TREND[trend] : null;
  const categoryCr = bestCategoryCr(performance);

  return (
    <section aria-labelledby="desempenho" className="grid min-w-0 scroll-mt-20 content-start gap-4 rounded-card bg-surface p-5 md:scroll-mt-24">
      <h2 id="desempenho" className="text-title3">
        Desempenho
      </h2>

      <div>
        <p className="text-sm text-muted-foreground">Taxa de aprovação</p>
        {passRate === null ? (
          <p className="mt-1">sem disciplinas cursadas ainda</p>
        ) : (
          <p className="mt-1 heading-ink text-3xl">{formatPercent(passRate)}</p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          Em um estudo com 1.124 formados em engenharia, metade reprovou em no máximo 13% das disciplinas.
        </p>
      </div>

      <div className="grid gap-1 text-sm">
        <p>{failures === 0 ? 'Nenhuma reprovação' : pluralize(failures, 'reprovação', 'reprovações')}</p>
        {unresolvedFailures.length > 0 && (
          <p>
            Ainda por cursar: {unresolvedFailures.map((f) => `${toTitleCase(f.name)} (${f.code})`).join(', ')}
          </p>
        )}
        {retakingNow.length > 0 && <p>Refazendo agora: {retakingNow.join(', ')}</p>}
      </div>

      <FailureCost performance={performance} avgHoursPerTerm={avgHoursPerTerm} />

      <AttemptsBlock attempts={attempts} />

      <div className="grid gap-2 text-sm">
        {trendInfo && (
          <p className="flex items-start gap-2">
            <trendInfo.icon aria-hidden className={`mt-0.5 size-4 shrink-0 ${trendInfo.iconColor}`} />
            <span>
              CR acumulado {trendInfo.verb} desde o período anterior (de {formatCr(previousCumulativeCr)} para{' '}
              {formatCr(lastTerm?.cumulativeCr ?? null)}).
            </span>
          </p>
        )}
        {bestTerm && <p>Melhor período: {formatTerm(bestTerm.term)}, com CR {formatCr(bestTerm.termCr)}</p>}
        {worstTerm && <p>Pior período: {formatTerm(worstTerm.term)}, com CR {formatCr(worstTerm.termCr)}</p>}
        {streak.judgedTerms > 0 && <p>{streakSentence(streak)}</p>}
        {categoryCr && (
          <p>
            Você rende mais em {categoryCr.label} ({formatCr(categoryCr.value)}) do que nas obrigatórias (
            {formatCr(performance.mandatoryCr)}).
          </p>
        )}
      </div>

      {performance.creditedCount > 0 && (
        <p className="text-sm">
          {pluralize(performance.creditedCount, 'disciplina aproveitada', 'disciplinas aproveitadas')} (
          {formatHours(performance.creditedHours)}) por equivalência, dispensa ou transferência
        </p>
      )}

      {grades && <GradeStrip grades={grades} />}
    </section>
  );
}
