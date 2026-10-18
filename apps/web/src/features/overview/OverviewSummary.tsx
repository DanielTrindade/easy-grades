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
        <p className="mt-1 heading-ink text-[2.75rem] leading-none">{formatCr(officialCr ?? cr)}</p>
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
        <p className="mt-1 heading-ink text-[2.75rem] leading-none">{graduation}</p>
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
        <p className="mt-1 heading-ink text-[2.75rem] leading-none">{formatHours(outsideHours)}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          de atividades complementares e extensão ainda por cumprir.
        </p>
      </div>
    </section>
  );
}
