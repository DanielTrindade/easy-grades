import { lazy, Suspense, useRef, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { ClearDataDialog } from '@/components/ClearDataDialog';
import { CompactHeader } from '@/components/CompactHeader';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { InstallAppButton, IosInstallDialog } from '@/components/InstallApp';
import { OptionsMenu } from '@/components/OptionsMenu';
import { PageTitle } from '@/components/PageTitle';
import { SectionNav } from '@/components/SectionNav';
import { TabBar } from '@/components/TabBar';
import { Button } from '@/components/ui/button';
import { CoursesScreen } from '@/features/courses/CoursesScreen';
import { OverviewScreen } from '@/features/overview/OverviewScreen';
import { PlanningScreen } from '@/features/planning/PlanningScreen';
import type { Dataset } from '@/lib/storage';
import { useAnalysis } from '@/lib/use-analysis';
import { VIEW_LABELS, useHashView } from '@/lib/use-hash-view';
import { useInView } from '@/lib/use-in-view';
import { useInstallApp } from '@/lib/use-install-app';
import { useMediaQuery } from '@/lib/use-media-query';

const FlowchartScreen = lazy(() => import('@/features/flowchart/FlowchartScreen'));

interface DashboardProps {
  dataset: Dataset;
  onRevealed: () => void;
  onNewUpload: () => void;
  onClear: () => void;
  onResetDataset: () => void | Promise<void>;
}

export function Dashboard({ dataset, onRevealed, onNewUpload, onClear, onResetDataset }: DashboardProps) {
  const view = useHashView();
  const desktop = useMediaQuery('(min-width: 768px)');
  const wide = useMediaQuery('(min-width: 1024px)');
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleInView = useInView(titleRef);
  const title = VIEW_LABELS[view];
  const { curriculum } = dataset.data;
  const analysis = useAnalysis(dataset.data);
  const context = `${curriculum.courseName}, currículo ${curriculum.version}`;
  const compactOnly = !desktop && view === 'fluxograma';
  const [clearOpen, setClearOpen] = useState(false);
  const clearOpenerRef = useRef<HTMLElement | null>(null);
  const install = useInstallApp();
  const [iosInstallOpen, setIosInstallOpen] = useState(false);
  const iosInstallOpenerRef = useRef<HTMLElement | null>(null);

  function openClear(opener: HTMLElement) {
    clearOpenerRef.current = opener;
    setClearOpen(true);
  }

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

  const optionsMenu = (
    <OptionsMenu
      onNewUpload={onNewUpload}
      onClearData={openClear}
      install={installOption}
      showActions={!wide}
      className={desktop ? undefined : 'glass size-11'}
    />
  );

  return (
    <div className="min-h-dvh pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {desktop ? (
        <header className="glass sticky top-0 z-30 rounded-none border-x-0 border-t-0 pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-2.5">
            <BrandMark className="shrink-0" />
            <SectionNav view={view} />
            <div className="ml-auto flex items-center gap-1">
              {wide && (
                <>
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
                </>
              )}
              {optionsMenu}
            </div>
          </div>
        </header>
      ) : (
        <>
          <CompactHeader title={title} visible={compactOnly || !titleInView} asHeading={compactOnly} />
          <div className="fixed top-[calc(env(safe-area-inset-top)+0.25rem)] right-[max(0.75rem,env(safe-area-inset-right))] z-40">
            {optionsMenu}
          </div>
        </>
      )}
      <ClearDataDialog open={clearOpen} onOpenChange={setClearOpen} onConfirm={onClear} openerRef={clearOpenerRef} />
      <IosInstallDialog open={iosInstallOpen} onOpenChange={setIosInstallOpen} openerRef={iosInstallOpenerRef} />

      <main className="mx-auto max-w-6xl px-4 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-[calc(var(--bottom-chrome)+2rem+env(safe-area-inset-bottom))] md:pt-8">
        {!compactOnly && <PageTitle title={title} context={context} titleRef={titleRef} className="mb-8 pr-14 md:pr-0" />}
        {view === 'visao-geral' && (
          <OverviewScreen data={dataset.data} analysis={analysis} reveal={!dataset.revealed} onRevealed={onRevealed} />
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

      {!desktop && <TabBar view={view} />}
    </div>
  );
}
