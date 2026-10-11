import { useCallback, useEffect, useRef, useState } from 'react';

/** Hover focus that survives the gap between two nodes: leaving schedules the clear, entering cancels it. */
export function useHoverFocus(clearDelayMs = 80) {
  const [hovered, setHovered] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const cancel = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  const enter = useCallback(
    (code: string) => {
      cancel();
      setHovered(code);
    },
    [cancel],
  );

  const leave = useCallback(() => {
    cancel();
    timer.current = window.setTimeout(() => setHovered(null), clearDelayMs);
  }, [cancel, clearDelayMs]);

  const clear = useCallback(() => {
    cancel();
    setHovered(null);
  }, [cancel]);

  useEffect(() => cancel, [cancel]);

  return { hovered, enter, leave, clear };
}
