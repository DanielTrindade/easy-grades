const STORAGE_KEY = 'eg:flow-view';

export type FlowView = 'lista' | 'grafo';

/** The view to open with: the student's stored choice wins, otherwise the graph, which is the screen's identity. */
export function pickFlowView(stored: string | null): FlowView {
  if (stored === 'lista' || stored === 'grafo') return stored;
  return 'grafo';
}

// The choice is a convenience: when storage is blocked, the graph default still applies.
export function readStoredFlowView(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeFlowView(view: FlowView): void {
  try {
    localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // Storage blocked or full: the switch still works for this visit.
  }
}
