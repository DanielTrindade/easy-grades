import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_SCROLL_STATE, reduceScroll, useScrollMinimize, type ScrollState } from './use-scroll-minimize';

function run(...ys: number[]): ScrollState {
  return ys.reduce(reduceScroll, INITIAL_SCROLL_STATE);
}

describe('reduceScroll', () => {
  it('stays expanded above the 48 px threshold, however it scrolls', () => {
    expect(run(10, 30, 47).minimized).toBe(false);
  });

  it('minimizes after 16 px of downward travel past the threshold', () => {
    expect(run(30, 46).minimized).toBe(false);
    expect(run(30, 60).minimized).toBe(true);
  });

  it('ignores small reversals (iOS inertia, 1–2 px jitter)', () => {
    const minimized = run(30, 200, 400);
    expect(minimized.minimized).toBe(true);
    expect(run(30, 200, 400, 398, 401, 395).minimized).toBe(true);
  });

  it('expands after 16 px of upward travel', () => {
    expect(run(30, 200, 400, 390).minimized).toBe(true);
    expect(run(30, 200, 400, 390, 383).minimized).toBe(false);
  });

  it('expands again near the top', () => {
    expect(run(30, 200, 400, 40).minimized).toBe(false);
  });

  it('measures travel from the last turning point, not from the start', () => {
    const upThenDown = run(30, 400, 380, 370, 380, 390);
    expect(upThenDown.minimized).toBe(true);
  });
});

describe('useScrollMinimize', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
  });

  function scrollTo(y: number) {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
  }

  it('minimizes on a downward scroll and expands on demand', () => {
    const { result } = renderHook(() => useScrollMinimize(true));
    scrollTo(30);
    scrollTo(300);
    expect(result.current.minimized).toBe(true);
    act(() => result.current.expand());
    expect(result.current.minimized).toBe(false);
  });

  it('measures the next minimize from where expand happened', () => {
    const { result } = renderHook(() => useScrollMinimize(true));
    scrollTo(30);
    scrollTo(300);
    act(() => result.current.expand());
    scrollTo(310);
    expect(result.current.minimized).toBe(false);
    scrollTo(320);
    expect(result.current.minimized).toBe(true);
  });

  it('never minimizes when disabled', () => {
    const { result } = renderHook(() => useScrollMinimize(false));
    scrollTo(30);
    scrollTo(600);
    expect(result.current.minimized).toBe(false);
  });

  it('stops listening on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useScrollMinimize(true));
    unmount();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
