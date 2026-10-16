import { useCallback, useEffect, useRef, useState } from 'react';

export interface ScrollState {
  minimized: boolean;
  anchorY: number;
  lastY: number;
}

export const MINIMIZE_THRESHOLD = 48;
export const MINIMIZE_HYSTERESIS = 16;
export const INITIAL_SCROLL_STATE: ScrollState = { minimized: false, anchorY: 0, lastY: 0 };

export function reduceScroll(state: ScrollState, y: number): ScrollState {
  if (y < MINIMIZE_THRESHOLD) return { minimized: false, anchorY: y, lastY: y };
  const goingDown = y > state.lastY;
  const wasGoingDown = state.lastY >= state.anchorY;
  // Travel counts from the last turning point, so inertia and 1–2 px jitter never flip the state.
  const anchorY = goingDown === wasGoingDown ? state.anchorY : state.lastY;
  const travel = y - anchorY;
  if (travel > MINIMIZE_HYSTERESIS) return { minimized: true, anchorY, lastY: y };
  if (travel < -MINIMIZE_HYSTERESIS) return { minimized: false, anchorY, lastY: y };
  return { minimized: state.minimized, anchorY, lastY: y };
}

export function useScrollMinimize(enabled: boolean): { minimized: boolean; expand: () => void } {
  const [minimized, setMinimized] = useState(false);
  const state = useRef(INITIAL_SCROLL_STATE);

  useEffect(() => {
    const y = window.scrollY;
    state.current = { minimized: false, anchorY: y, lastY: y };
    if (!enabled) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        state.current = reduceScroll(state.current, window.scrollY);
        setMinimized(state.current.minimized);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [enabled]);

  const expand = useCallback(() => {
    const y = window.scrollY;
    state.current = { minimized: false, anchorY: y, lastY: y };
    setMinimized(false);
  }, []);

  return { minimized: enabled && minimized, expand };
}
