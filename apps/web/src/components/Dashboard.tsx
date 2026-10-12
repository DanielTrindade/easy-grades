import { lazy, Suspense } from 'react';
import { ClearDataButton } from '@/components/ClearDataButton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { CoursesScreen } from '@/features/courses/CoursesScreen';
import { OverviewScreen } from '@/features/overview/OverviewScreen';
import { PlanningScreen } from '@/features/planning/PlanningScreen';
import type { Dataset } from '@/lib/storage';
import { useAnalysis } from '@/lib/use-analysis';
import { useHashView, VIEW_LABELS, VIEWS } from '@/lib/use-hash-view';

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

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 px-4 pt-3 sm:py-3">
          <p className="font-heading text-xl font-semibold">Easy Grades</p>
          <p className="hidden text-sm text-muted-foreground md:block">
            {curriculum.courseName}, currículo {curriculum.version}
          </p>
          <div className="ml-auto flex gap-1">
            <Button variant="ghost" size="sm" onClick={onNewUpload}>
              Novo upload
            </Button>
            <ClearDataButton onConfirm={onClear} />
          </div>
          <nav aria-label="Seções" className="-mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:w-auto sm:px-0">
            <ul className="flex gap-6">
              {VIEWS.map((v) => (
                <li key={v}>
                  <a
                    href={`#/${v}`}
                    aria-current={view === v ? 'page' : undefined}
                    className="block whitespace-nowrap border-b-2 border-transparent py-3 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground aria-[current=page]:border-igapo aria-[current=page]:font-medium aria-[current=page]:text-foreground sm:py-1"
                  >
                    {VIEW_LABELS[v]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
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
