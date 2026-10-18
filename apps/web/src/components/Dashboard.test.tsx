import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Dataset } from '@/lib/storage';
import { Dashboard } from './Dashboard';

const dataset: Dataset = {
  data: { curriculum: sampleCurriculum, transcript: sampleTranscript },
  savedAt: '2026-10-16T00:00:00.000Z',
  revealed: true,
};

function setWidth(desktop: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: desktop && /min-width/.test(query),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

function renderAt(hash: string) {
  window.location.hash = hash;
  return render(
    <Dashboard dataset={dataset} onRevealed={vi.fn()} onNewUpload={vi.fn()} onClear={vi.fn()} onResetDataset={vi.fn()} />,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  window.location.hash = '';
});

describe('Dashboard shell', () => {
  it.each([
    ['#/visao-geral', 'Visão geral'],
    ['#/disciplinas', 'Disciplinas'],
    ['#/planejamento', 'Planejamento'],
  ])('gives %s exactly one h1, the screen title', async (hash, title) => {
    setWidth(false);
    renderAt(hash);
    expect(await screen.findAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  });

  it('puts the flowchart title in the compact header on mobile', async () => {
    setWidth(false);
    renderAt('#/fluxograma');
    expect(await screen.findByRole('heading', { level: 1, name: 'Fluxograma' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('uses the tab bar on mobile and the segmented nav on desktop, never both', () => {
    setWidth(false);
    const { unmount } = renderAt('#/disciplinas');
    expect(screen.getAllByRole('navigation', { name: 'Seções' })).toHaveLength(1);
    expect(document.body).toHaveAttribute('data-tab-bar', 'expanded');
    unmount();

    setWidth(true);
    renderAt('#/disciplinas');
    expect(screen.getAllByRole('navigation', { name: 'Seções' })).toHaveLength(1);
    expect(screen.getByRole('navigation', { name: 'Seções' })).toHaveClass('rounded-full');
    expect(document.body).not.toHaveAttribute('data-tab-bar');
  });

  it('keeps a single options menu on screen', () => {
    setWidth(false);
    renderAt('#/visao-geral');
    expect(screen.getAllByRole('button', { name: 'Mais opções' })).toHaveLength(1);
  });
});
