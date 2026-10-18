import type { ParseResponse } from '@easy-grades/core';
import { lazy, Suspense, useEffect, useState, type CSSProperties } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PwaUpdatePrompt } from '@/components/PwaUpdatePrompt';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UploadScreen } from '@/features/upload/UploadScreen';
import { clearAaccActivities } from '@/lib/aacc-storage';
import { clearPlan } from '@/features/planning/plan-storage';
import { clearDataset, loadDataset, markRevealed, saveDataset, type Dataset } from '@/lib/storage';

// Charts and the dashboard load only after there is data to show; the upload screen stays light.
const Dashboard = lazy(() => import('@/components/Dashboard').then((m) => ({ default: m.Dashboard })));

type AppState =
  | { status: 'loading' }
  | { status: 'upload'; previous: Dataset | null }
  | { status: 'ready'; dataset: Dataset };

export default function App() {
  const [state, setState] = useState<AppState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void loadDataset().then((dataset) => {
      if (!cancelled) setState(dataset ? { status: 'ready', dataset } : { status: 'upload', previous: null });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleParsed(data: ParseResponse) {
    const dataset = await saveDataset(data);
    window.location.hash = '/visao-geral';
    setState({ status: 'ready', dataset });
  }

  async function handleClear() {
    // Registered activities and the saved plan are per browser too, so "Limpar dados" removes them with the dataset.
    await Promise.all([clearDataset(), clearAaccActivities(), clearPlan()]);
    setState({ status: 'upload', previous: null });
  }

  function handleRevealed() {
    void markRevealed();
    setState((s) => (s.status === 'ready' ? { status: 'ready', dataset: { ...s.dataset, revealed: true } } : s));
  }

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={300}>
      {state.status === 'loading' && (
        <div aria-busy="true" className="min-h-dvh">
          <span className="sr-only">Carregando…</span>
        </div>
      )}
      {state.status === 'upload' && (
        <UploadScreen
          onParsed={handleParsed}
          onCancel={state.previous ? () => setState({ status: 'ready', dataset: state.previous! }) : undefined}
        />
      )}
      {state.status === 'ready' && (
        <ErrorBoundary onReset={clearDataset}>
          <Suspense
            fallback={
              <div aria-busy="true" className="min-h-dvh">
                <span className="sr-only">Carregando…</span>
              </div>
            }
          >
            <Dashboard
              dataset={state.dataset}
              onRevealed={handleRevealed}
              onNewUpload={() => setState({ status: 'upload', previous: state.dataset })}
              onClear={handleClear}
              onResetDataset={clearDataset}
            />
          </Suspense>
        </ErrorBoundary>
      )}
      <PwaUpdatePrompt />
      {/* The bottom clearance comes from --bottom-chrome in index.css; these replace the component's own colors. */}
      <Toaster
        position="bottom-right"
        style={
          {
            '--normal-bg': 'var(--glass-tint)',
            '--normal-text': 'var(--ink)',
            '--normal-border': 'var(--glass-edge)',
            '--border-radius': '1.5rem',
          } as CSSProperties
        }
      />
    </TooltipProvider>
  );
}
