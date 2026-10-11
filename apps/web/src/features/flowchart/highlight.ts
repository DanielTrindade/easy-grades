import { dependentClosure, prerequisiteClosure, type Curriculum, type FlowEdge, type FlowNode } from '@easy-grades/core';
import type { NodeChange } from '@xyflow/react';

/** Pinned course after a React Flow change. Keyboard selection (Enter / Esc) reaches us only as a `select` change. */
export function nextPinned(prev: string | null, change: NodeChange): string | null {
  if (change.type !== 'select') return prev;
  if (change.selected) return change.id;
  return prev === change.id ? null : prev;
}

/** The focused course plus everything it depends on and everything it unlocks; null when nothing is focused. */
export function highlightSet(curriculum: Curriculum, code: string | null): Set<string> | null {
  if (!code) return null;
  return new Set([code, ...prerequisiteClosure(curriculum, code), ...dependentClosure(curriculum, code)]);
}

/** Hides completed courses (and edges touching them) when only the remaining path matters. */
export function visibleGraph(nodes: FlowNode[], edges: FlowEdge[], onlyRemaining: boolean): { nodes: FlowNode[]; edges: FlowEdge[] } {
  if (!onlyRemaining) return { nodes, edges };
  const kept = nodes.filter((n) => n.state !== 'concluida');
  const codes = new Set(kept.map((n) => n.code));
  return { nodes: kept, edges: edges.filter((e) => codes.has(e.source) && codes.has(e.target)) };
}
