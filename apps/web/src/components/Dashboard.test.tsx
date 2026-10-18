import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

class IntersectionObserverStub {
  static instances: IntersectionObserverStub[] = [];
  readonly targets = new Set<Element>();
  private readonly callback: ObserverCallback;

  constructor(callback: ObserverCallback) {
    this.callback = callback;
    IntersectionObserverStub.instances.push(this);
  }

  observe = (target: Element) => {
    this.targets.add(target);
  };

  unobserve = (target: Element) => {
    this.targets.delete(target);
  };

  disconnect = () => {
    this.targets.clear();
  };

  report(target: Element, isIntersecting: boolean) {
    this.callback([{ target, isIntersecting }]);
  }
}

function notifyIntersection(target: Element, isIntersecting: boolean) {
  for (const observer of IntersectionObserverStub.instances) {
    if (observer.targets.has(target)) observer.report(target, isIntersecting);
  }
}

function goTo(hash: string) {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new Event('hashchange'));
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  IntersectionObserverStub.instances = [];
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

  it('drops the glass from the floating options trigger while the compact header shows', () => {
    setWidth(false);
    const { container } = renderAt('#/fluxograma');
    expect(container.querySelector('.scroll-edge')).toHaveClass('opacity-100');
    expect(screen.getByRole('button', { name: 'Mais opções' })).not.toHaveClass('glass');
  });

  it('keeps the floating options trigger glassy while the page title is up top', () => {
    setWidth(false);
    renderAt('#/visao-geral');
    expect(screen.getByRole('button', { name: 'Mais opções' })).toHaveClass('glass');
  });

  it('observes the new page title after leaving the flowchart', async () => {
    setWidth(false);
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
    const { container } = renderAt('#/fluxograma');
    const compactHeader = () => container.querySelector('.scroll-edge');

    goTo('#/disciplinas');
    const title = await screen.findByRole('heading', { level: 1, name: 'Disciplinas' });
    act(() => notifyIntersection(title, false));

    expect(compactHeader()).toHaveClass('opacity-100');
  });

  it('keeps the compact header hidden when the title changes at the top', async () => {
    setWidth(false);
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
    const { container } = renderAt('#/visao-geral');
    const compactHeader = () => container.querySelector('.scroll-edge');
    const firstTitle = await screen.findByRole('heading', { level: 1, name: 'Visão geral' });

    goTo('#/fluxograma');
    // The browser reports the removed title as out of view; a stale observer would trust it.
    act(() => notifyIntersection(firstTitle, false));
    goTo('#/disciplinas');
    await screen.findByRole('heading', { level: 1, name: 'Disciplinas' });

    expect(compactHeader()).toHaveClass('opacity-0');
  });

  it('puts the clear action in the wide header, not in the options menu', async () => {
    setWidth(true);
    const user = userEvent.setup({ delay: null });
    renderAt('#/visao-geral');

    await user.click(screen.getByRole('button', { name: 'Limpar dados' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Limpar dados deste navegador?');

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: 'Mais opções' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).queryByRole('menuitem', { name: 'Limpar dados' })).not.toBeInTheDocument();
    expect(within(menu).getAllByRole('menuitemradio').map((item) => item.textContent)).toEqual(['Vidro', 'Sólida']);
  });
});
