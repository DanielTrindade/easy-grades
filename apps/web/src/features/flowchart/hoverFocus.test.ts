import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHoverFocus } from './hoverFocus';

describe('useHoverFocus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('focuses a course at once on enter', () => {
    const { result } = renderHook(() => useHoverFocus());
    act(() => result.current.enter('ICC431'));
    expect(result.current.hovered).toBe('ICC431');
  });

  it('keeps the focus for the delay after leaving, then clears it', () => {
    const { result } = renderHook(() => useHoverFocus(80));
    act(() => result.current.enter('ICC431'));
    act(() => result.current.leave());
    act(() => vi.advanceTimersByTime(79));
    expect(result.current.hovered).toBe('ICC431');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.hovered).toBeNull();
  });

  it('does not flicker when the pointer crosses into a neighbour within the delay', () => {
    const { result } = renderHook(() => useHoverFocus(80));
    act(() => result.current.enter('ICC431'));
    act(() => result.current.leave());
    act(() => vi.advanceTimersByTime(40));
    act(() => result.current.enter('IEM075'));
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.hovered).toBe('IEM075');
  });

  it('clear drops the focus at once and cancels a pending leave', () => {
    const { result } = renderHook(() => useHoverFocus(80));
    act(() => result.current.enter('ICC431'));
    act(() => result.current.leave());
    act(() => result.current.clear());
    expect(result.current.hovered).toBeNull();
    act(() => result.current.enter('IEM075'));
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.hovered).toBe('IEM075');
  });

  it('cancels a pending clear when the component unmounts', () => {
    const { result, unmount } = renderHook(() => useHoverFocus(80));
    act(() => result.current.enter('ICC431'));
    act(() => result.current.leave());
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
