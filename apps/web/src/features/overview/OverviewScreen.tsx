import { type ParseResponse } from '@easy-grades/core';
import { TriangleAlert } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Card } from '@/components/Card';
import type { Analysis } from '@/lib/use-analysis';
import { AaccCard } from './AaccCard';
import { EnadeSection } from './EnadeSection';
import { IntegrationTable } from './IntegrationTable';
import { MarkerBand } from './MarkerBand';
import { OverviewSummary } from './OverviewSummary';
import { PaceSection } from './PaceSection';
import { PendingSection } from './PendingSection';
import { PerformanceSection } from './PerformanceSection';
import { TimelineBand } from './TimelineBand';
import { usePendingAacc } from './use-pending-aacc';

// Recharts is heavy: charts stream in after the numbers are on screen.
const CrChart = lazy(() => import('./CrChart'));
const HoursChart = lazy(() => import('./HoursChart'));
const chartFallback = <div aria-hidden className="h-72 rounded-group bg-muted/60" />;

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
    <div className="grid gap-4 md:gap-6">
      <Card className="p-5 md:p-6">
        <MarkerBand
          progress={progress}
          pendingPercent={pendingPercent}
          milestone={analysis.milestone}
          inProgress={analysis.inProgress}
          reveal={reveal}
          onRevealed={onRevealed}
        />
      </Card>

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
        <p role="status" className="flex gap-2 rounded-card border border-danger/40 bg-danger/10 p-4 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
          <span>
            {unknownStatuses.length === 1 ? 'Uma disciplina tem' : `${unknownStatuses.length} disciplinas têm`} situação que
            não reconhecemos ({[...new Set(unknownStatuses.map((e) => e.rawStatus || 'vazia'))].join(', ')}) e ficaram fora
            das contas.
          </span>
        </p>
      )}

      <PendingSection pending={analysis.pending} />

      <IntegrationTable components={transcript.officialComponents} />

      <div className="grid min-w-0 gap-4 md:gap-6 lg:grid-cols-2">
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

      <div className="grid min-w-0 gap-4 md:gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <Suspense fallback={chartFallback}>
            <CrChart history={crHistory} />
          </Suspense>
        </Card>
        <Card className="p-5">
          <Suspense fallback={chartFallback}>
            <HoursChart transcript={data.transcript} />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
