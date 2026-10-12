import { formatTerm, type ParseResponse } from '@easy-grades/core';
import { TriangleAlert } from 'lucide-react';
import { lazy, Suspense } from 'react';
import type { Analysis } from '@/lib/use-analysis';
import { formatCr, formatHours } from '@/lib/format';
import { AaccCard } from './AaccCard';
import { EnadeSection } from './EnadeSection';
import { IntegrationTable } from './IntegrationTable';
import { PaceSection } from './PaceSection';
import { PerformanceSection } from './PerformanceSection';
import { usePendingAacc } from './use-pending-aacc';
import { WatersBand } from './WatersBand';

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
  const graduation = forecast.graduationTerm ? formatTerm(forecast.graduationTerm) : 'sem previsão';

  const { aacc, pendingPercent, countedHours, officialAacc } = usePendingAacc(curriculum, transcript, progress);

  return (
    <div className="grid gap-14">
      <WatersBand progress={progress} pendingPercent={pendingPercent} reveal={reveal} onRevealed={onRevealed} />

      <section aria-label="Resumo" className="grid gap-8 border-y border-border py-8 sm:grid-cols-3">
        <div>
          <h2 className="font-sans text-sm font-normal tracking-normal text-muted-foreground">
            Coeficiente de rendimento
          </h2>
          <p className="mt-1 font-heading text-display font-semibold leading-none">{formatCr(officialCr ?? cr)}</p>
          {officialCr !== null && cr !== null && officialCr !== cr && (
            <p className="mt-2 text-sm text-muted-foreground">Pelas notas do histórico: {formatCr(cr)}.</p>
          )}
          {performance.mandatoryCr !== null && (
            <p className="mt-2 text-sm text-muted-foreground">CR nas obrigatórias: {formatCr(performance.mandatoryCr)}.</p>
          )}
        </div>
        <div>
          <h2 className="font-sans text-sm font-normal tracking-normal text-muted-foreground">
            Previsão de formatura
          </h2>
          <p className="mt-1 font-heading text-display font-semibold leading-none">{graduation}</p>
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
          <p className="mt-1 font-heading text-display font-semibold leading-none">
            {formatHours(forecast.pendingHours.aacc + forecast.pendingHours.extensao)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            de atividades complementares e extensão ainda por cumprir.
          </p>
        </div>
      </section>

      {unknownStatuses.length > 0 && (
        <p role="status" className="flex gap-2 rounded-lg border border-urucum/40 bg-urucum/10 p-3 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-urucum" />
          <span>
            {unknownStatuses.length === 1 ? 'Uma disciplina tem' : `${unknownStatuses.length} disciplinas têm`} situação que
            não reconhecemos ({[...new Set(unknownStatuses.map((e) => e.rawStatus || 'vazia'))].join(', ')}) e ficaram fora
            das contas.
          </span>
        </p>
      )}

      <IntegrationTable components={transcript.officialComponents} />

      <div className="grid gap-12 lg:grid-cols-2">
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

      <div className="grid gap-12 lg:grid-cols-2">
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
