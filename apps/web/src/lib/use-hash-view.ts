import { useSyncExternalStore } from 'react';

export const VIEWS = ['visao-geral', 'fluxograma', 'disciplinas', 'planejamento'] as const;
export type View = (typeof VIEWS)[number];

export const VIEW_LABELS: Record<View, string> = {
  'visao-geral': 'Visão geral',
  fluxograma: 'Fluxograma',
  disciplinas: 'Disciplinas',
  planejamento: 'Planejamento',
};

export function viewFromHash(hash: string): View {
  const name = hash.replace(/^#\/?/, '');
  return (VIEWS as readonly string[]).includes(name) ? (name as View) : 'visao-geral';
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/** Current dashboard view, driven by `#/<view>` links so back/forward work. */
export function useHashView(): View {
  return useSyncExternalStore(
    subscribe,
    () => viewFromHash(window.location.hash),
    () => 'visao-geral',
  );
}
