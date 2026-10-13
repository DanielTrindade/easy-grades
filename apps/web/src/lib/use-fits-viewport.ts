import { useEffect, useState, type RefObject } from 'react';

/**
 * Whether the element is no taller than the viewport minus `margin` px. It is measured on mount, when the element
 * changes size and when the window is resized. While `enabled` is false nothing is measured and the answer is true.
 */
export function useFitsViewport(ref: RefObject<HTMLElement | null>, margin: number, enabled: boolean): boolean {
  const [fits, setFits] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    const check = () => setFits(element.offsetHeight <= window.innerHeight - margin);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(element);
    window.addEventListener('resize', check);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', check);
    };
  }, [ref, margin, enabled]);

  return enabled ? fits : true;
}
