import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useInView } from './use-in-view';

let notify: (entries: Partial<IntersectionObserverEntry>[]) => void = () => {};
const disconnect = vi.fn();

class IntersectionObserverStub {
  constructor(callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {
    notify = callback;
  }
  observe() {}
  disconnect = disconnect;
}

afterEach(() => {
  vi.unstubAllGlobals();
  disconnect.mockClear();
});

describe('useInView', () => {
  it('starts in view and follows the observer', () => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
    const ref = { current: document.createElement('h1') };
    const { result } = renderHook(() => useInView(ref));
    expect(result.current).toBe(true);
    act(() => notify([{ isIntersecting: false }]));
    expect(result.current).toBe(false);
    act(() => notify([{ isIntersecting: true }]));
    expect(result.current).toBe(true);
  });

  it('disconnects on unmount', () => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
    const ref = { current: document.createElement('h1') };
    const { unmount } = renderHook(() => useInView(ref));
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('stays in view where IntersectionObserver is missing', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const ref = { current: document.createElement('h1') };
    const { result } = renderHook(() => useInView(ref));
    expect(result.current).toBe(true);
  });
});
