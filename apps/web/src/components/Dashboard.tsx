import { lazy, Suspense, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { ClearDataDialog } from '@/components/ClearDataDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OptionsMenu } from '@/components/OptionsMenu';
import { SectionNav } from '@/components/SectionNav';
import { Button } from '@/components/ui/button';
import { CoursesScreen } from '@/features/courses/CoursesScreen';
import { OverviewScreen } from '@/features/overview/OverviewScreen';
import { PlanningScreen } from '@/features/planning/PlanningScreen';
import type { Dataset } from '@/lib/storage';
import { useAnalysis } from '@/lib/use-analysis';
import { useHashView } from '@/lib/use-hash-view';

// React Flow is the heaviest dependency: load it only when the flowchart is opened.
const FlowchartScreen = lazy(() => import('@/features/flowchart/FlowchartScreen'));

interface DashboardProps {
  dataset: Dataset;
  onRevealed: () => void;
  onNewUpload: () => void;
  /** Explicit "Limpar dados": removes the dataset and the registered activities. */
  onClear: () => void;
  /** Crash recovery: removes only the parsed PDF data, never the activities the student registered. */
  onResetDataset: () => void | Promise<void>;
}

export function Dashboard({ dataset, onRevealed, onNewUpload, onClear, onResetDataset }: DashboardProps) {
  const view = useHashView();
  const analysis = useAnalysis(dataset.data);
  const { curriculum } = dataset.data;
  const [clearOpen, setClearOpen] = useState(false);

  return (
    <div className="min-h-dvh pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <header className="border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 px-4 py-3">
          <BrandMark />
          <p className="hidden text-sm text-muted-foreground md:block">
            {curriculum.courseName}, currículo {curriculum.version}
          </p>
          <div className="ml-auto hidden gap-2 md:flex">
            <Button variant="ghost" size="sm" onClick={onNewUpload}>
              Novo upload
            </Button>
            <Button variant="ghost" size="sm" className="text-correcao hover:text-correcao" onClick={() => setClearOpen(true)}>
              Limpar dados
            </Button>
          </div>
          <OptionsMenu className="ml-auto md:hidden" onNewUpload={onNewUpload} onClearData={() => setClearOpen(true)} />
          <SectionNav view={view} />
        </div>
      </header>
      <ClearDataDialog open={clearOpen} onOpenChange={setClearOpen} onConfirm={onClear} />

      <main className="mx-auto max-w-6xl px-4 py-8 max-md:pb-[calc(6rem+env(safe-area-inset-bottom))] sm:py-12">
        {view === 'visao-geral' && (
          <OverviewScreen
            data={dataset.data}
            analysis={analysis}
            reveal={!dataset.revealed}
            onRevealed={onRevealed}
          />
        )}
        {view === 'fluxograma' && (
          <ErrorBoundary onReset={onResetDataset}>
            <Suspense fallback={<p className="text-muted-foreground">Montando o fluxograma…</p>}>
              <FlowchartScreen data={dataset.data} />
            </Suspense>
          </ErrorBoundary>
        )}
        {view === 'disciplinas' && <CoursesScreen data={dataset.data} />}
        {view === 'planejamento' && <PlanningScreen data={dataset.data} analysis={analysis} />}
      </main>
    </div>
  );
}
