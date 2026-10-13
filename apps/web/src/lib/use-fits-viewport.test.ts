import { act, renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { useFitsViewport } from './use-fits-viewport';

/** An element whose offsetHeight is fixed, since jsdom has no layout. */
function elementOf(height: number): RefObject<HTMLElement | null> {
  const element = document.createElement('div');
  Object.defineProperty(element, 'offsetHeight', { configurable: true, get: () => height });
  return { current: element };
}

function setViewportHeight(height: number) {
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
}

describe('useFitsViewport', () => {
  afterEach(() => setViewportHeight(768));

  it('is false when the element is taller than the viewport minus the margin', () => {
    setViewportHeight(800);
    const { result } = renderHook(() => useFitsViewport(elementOf(780), 48, true));
    expect(result.current).toBe(false);
  });

  it('is true when the element leaves the margin free', () => {
    setViewportHeight(800);
    const { result } = renderHook(() => useFitsViewport(elementOf(752), 48, true));
    expect(result.current).toBe(true);
  });

  it('checks again when the window is resized', () => {
    setViewportHeight(900);
    const { result } = renderHook(() => useFitsViewport(elementOf(700), 48, true));
    expect(result.current).toBe(true);

    act(() => {
      setViewportHeight(600);
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe(false);
  });

  it('reports true without measuring while disabled', () => {
    setViewportHeight(400);
    const { result } = renderHook(() => useFitsViewport(elementOf(2000), 48, false));
    expect(result.current).toBe(true);
  });
});
