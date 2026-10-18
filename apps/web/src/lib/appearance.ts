import { useCallback, useState } from 'react';

export type Appearance = 'glass' | 'solid';

export const APPEARANCE_STORAGE_KEY = 'appearance';

export function readAppearance(): Appearance {
  try {
    return localStorage.getItem(APPEARANCE_STORAGE_KEY) === 'solid' ? 'solid' : 'glass';
  } catch {
    return 'glass';
  }
}

export function applyAppearance(appearance: Appearance): void {
  document.documentElement.dataset.appearance = appearance;
}

export function useAppearance(): readonly [Appearance, (next: Appearance) => void] {
  const [appearance, setAppearance] = useState(readAppearance);

  const choose = useCallback((next: Appearance) => {
    applyAppearance(next);
    try {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, next);
    } catch {
      // The choice still applies for this visit; it just won't be remembered.
    }
    setAppearance(next);
  }, []);

  return [appearance, choose] as const;
}
