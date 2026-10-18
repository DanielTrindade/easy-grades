import { useEffect, useState } from 'react';

export function useInView(element: Element | null): boolean {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? true));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return inView;
}
