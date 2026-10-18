import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useInView } from './use-in-view';

let notify: (entries: Partial<IntersectionObserverEntry>[]) => void = () => {};
const disconnect = vi.fn();
const observed: Element[] = [];

class IntersectionObserverStub {
  constructor(callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {
    notify = callback;
  }
  observe(element: Element) {
    observed.push(element);
  }
  disconnect = disconnect;
}

afterEach(() => {
  vi.unstubAllGlobals();
  disconnect.mockClear();
  observed.length = 0;
});

describe('useInView', () => {
  it('starts in view and follows the observer', () => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
    const element = document.createElement('h1');
    const { result } = renderHook(() => useInView(element));
    expect(result.current).toBe(true);
    act(() => notify([{ isIntersecting: false }]));
    expect(result.current).toBe(false);
    act(() => notify([{ isIntersecting: true }]));
    expect(result.current).toBe(true);
  });

  it('replaces the observed element when it changes', () => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
    const first = document.createElement('h1');
    const second = document.createElement('h1');
    const { rerender } = renderHook(({ element }: { element: Element | null }) => useInView(element), {
      initialProps: { element: first as Element | null },
    });
    expect(observed).toEqual([first]);
    rerender({ element: second });
    expect(disconnect).toHaveBeenCalled();
    expect(observed).toEqual([first, second]);
  });

  it('disconnects on unmount', () => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
    const element = document.createElement('h1');
    const { unmount } = renderHook(() => useInView(element));
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('stays in view where IntersectionObserver is missing', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const element = document.createElement('h1');
    const { result } = renderHook(() => useInView(element));
    expect(result.current).toBe(true);
  });
});
