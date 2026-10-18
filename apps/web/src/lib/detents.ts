export type Detent = 'medium' | 'large';

export const DETENT_FRACTION: Record<Detent, number> = { medium: 0.5, large: 0.92 };

// How far ahead a release is projected, in ms: a flick carries the sheet past where the finger let go.
const PROJECTION_MS = 150;

export function detentTop(detent: Detent, viewportHeight: number): number {
  return viewportHeight * (1 - DETENT_FRACTION[detent]);
}

interface ResolveInput {
  current: Detent;
  offset: number;
  velocity: number;
  viewportHeight: number;
  detents: readonly Detent[];
}

export function resolveDetent({ current, offset, velocity, viewportHeight, detents }: ResolveInput): Detent | 'close' {
  const projected = detentTop(current, viewportHeight) + offset + velocity * PROJECTION_MS;
  const ordered = [...detents].sort((a, b) => DETENT_FRACTION[b] - DETENT_FRACTION[a]);
  const index = ordered.indexOf(current);
  const reachable = new Set<Detent | 'close'>([
    current,
    ...(index > 0 ? [ordered[index - 1]!] : []),
    ...(index < ordered.length - 1 ? [ordered[index + 1]!] : ['close' as const]),
  ]);

  let best: Detent | 'close' = current;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of reachable) {
    const top = candidate === 'close' ? viewportHeight : detentTop(candidate, viewportHeight);
    const distance = Math.abs(top - projected);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}
