import { lazy, Suspense, useRef, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { ClearDataDialog } from '@/components/ClearDataDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { InstallAppButton, IosInstallDialog } from '@/components/InstallApp';
import { OptionsMenu } from '@/components/OptionsMenu';
import { SectionNav } from '@/components/SectionNav';
import { Button } from '@/components/ui/button';
import { CoursesScreen } from '@/features/courses/CoursesScreen';
import { OverviewScreen } from '@/features/overview/OverviewScreen';
import { PlanningScreen } from '@/features/planning/PlanningScreen';
import type { Dataset } from '@/lib/storage';
import { useAnalysis } from '@/lib/use-analysis';
import { useHashView } from '@/lib/use-hash-view';
import { useInstallApp } from '@/lib/use-install-app';

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
  // Whichever control opened the confirmation (desktop button or options menu trigger), so focus can return to it.
  const clearOpenerRef = useRef<HTMLElement | null>(null);
  const install = useInstallApp();
  const [iosInstallOpen, setIosInstallOpen] = useState(false);
  const iosInstallOpenerRef = useRef<HTMLElement | null>(null);

  function openClear(opener: HTMLElement) {
    clearOpenerRef.current = opener;
    setClearOpen(true);
  }

  // Safari cannot prompt, so its "Instalar app" explains the steps; every other browser gets its own install prompt.
  const installOption = install.kind
    ? {
        kind: install.kind,
        onSelect: (opener: HTMLElement) => {
          if (install.kind !== 'ios') {
            void install.promptInstall();
            return;
          }
          iosInstallOpenerRef.current = opener;
          setIosInstallOpen(true);
        },
      }
    : undefined;

  return (
    <div className="min-h-dvh pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <header className="border-b border-border pt-[env(safe-area-inset-top)]">
        {/* One line from lg up: brand, sections, then actions. The course label sits in the page (see below), not here. */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 px-4 py-3 lg:flex-nowrap">
          <BrandMark compactOnMobile className="shrink-0" />
          <SectionNav view={view} />
          <div className="ml-auto hidden gap-2 md:flex">
            <Button variant="ghost" size="sm" onClick={onNewUpload}>
              Novo upload
            </Button>
            {installOption && <InstallAppButton install={installOption} />}
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:text-danger"
              onClick={(event) => openClear(event.currentTarget)}
            >
              Limpar dados
            </Button>
          </div>
          <OptionsMenu
            className="ml-auto md:hidden"
            onNewUpload={onNewUpload}
            onClearData={openClear}
            install={installOption}
          />
        </div>
      </header>
      <ClearDataDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        onConfirm={onClear}
        openerRef={clearOpenerRef}
      />
      <IosInstallDialog open={iosInstallOpen} onOpenChange={setIosInstallOpen} openerRef={iosInstallOpenerRef} />

      {/* Bottom padding clears the fixed tab bar below md. It is set once per breakpoint, so no sm: rule can override it. */}
      <main className="mx-auto max-w-6xl px-4 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pt-12 md:pb-12">
        <p className="mb-6 hidden text-sm text-muted-foreground md:block">
          {curriculum.courseName}, currículo {curriculum.version}
        </p>
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
        {view === 'planejamento' && <PlanningScreen data={dataset.data} analysis={analysis} savedAt={dataset.savedAt} />}
      </main>
    </div>
  );
}
