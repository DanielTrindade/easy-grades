import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from './use-media-query';

/** A MediaQueryList stand-in whose match can change while the hook is subscribed. */
function mockMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        get matches() {
          return matches;
        },
        media: query,
        addEventListener: (_type: string, listener: () => void) => {
          listeners.add(listener);
        },
        removeEventListener: (_type: string, listener: () => void) => {
          listeners.delete(listener);
        },
      }) as unknown as MediaQueryList,
  );
  return (next: boolean) => {
    matches = next;
    for (const listener of listeners) listener();
  };
}

describe('useMediaQuery', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reports whether the query matches now', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(true);
  });

  it('follows the viewport when the query stops matching', () => {
    const setMatches = mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    act(() => setMatches(false));
    expect(result.current).toBe(false);
  });
});
