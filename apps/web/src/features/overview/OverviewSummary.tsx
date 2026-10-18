import {
  formatTerm,
  type CrProjectionInsights,
  type Forecast,
  type PerformanceInsights,
} from '@easy-grades/core';
import { CalendarCheck, Clock, TrendingUp } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
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
    <section aria-label="Resumo" className="grid min-w-0 gap-3 sm:grid-cols-3">
      <MetricCard icon={TrendingUp} label="Coeficiente de rendimento" value={formatCr(officialCr ?? cr)} targetId="desempenho">
        {officialCr !== null && cr !== null && officialCr !== cr && <p>Pelas notas do histórico: {formatCr(cr)}.</p>}
        {performance.mandatoryCr !== null && <p>CR nas obrigatórias: {formatCr(performance.mandatoryCr)}.</p>}
        {projectionVisible && (
          <p>
            Na formatura: entre {formatCr(projection.worst)} e {formatCr(projection.best)}.
          </p>
        )}
      </MetricCard>
      <MetricCard icon={CalendarCheck} label="Previsão de formatura" value={graduation} targetId="ritmo">
        <p>
          {forecast.remainingTerms === 0
            ? 'Sem obrigatórias pendentes além das que estão em curso.'
            : `${forecast.remainingTerms} ${forecast.remainingTerms === 1 ? 'semestre' : 'semestres'} de obrigatórias pela frente.`}
          {forecast.exceedsMax && forecast.maxTerm && ` Passa do prazo máximo (${formatTerm(forecast.maxTerm)}).`}
        </p>
      </MetricCard>
      <MetricCard
        icon={Clock}
        label="Fora das disciplinas"
        value={formatHours(outsideHours)}
        targetId="atividades-complementares"
      >
        <p>de atividades complementares e extensão ainda por cumprir.</p>
      </MetricCard>
    </section>
  );
}
