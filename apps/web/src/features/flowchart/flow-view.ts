/** Below this width (Tailwind's md breakpoint) the flowchart opens as a list. */
const MD_WIDTH = 768;
const STORAGE_KEY = 'eg:flow-view';

export type FlowView = 'lista' | 'grafo';

/** The view to open with: the student's stored choice wins, otherwise a narrow screen gets the list. */
export function pickFlowView(width: number, stored: string | null): FlowView {
  if (stored === 'lista' || stored === 'grafo') return stored;
  return width < MD_WIDTH ? 'lista' : 'grafo';
}

// The choice is a convenience: when storage is blocked, the default for the width still applies.
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
