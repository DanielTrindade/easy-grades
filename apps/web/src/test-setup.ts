import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// jsdom lacks AnimationEvent; without it React maps onAnimationEnd to the wrong DOM event name.
globalThis.AnimationEvent ??= Event as unknown as typeof AnimationEvent;

// jsdom lacks these browser APIs used by Recharts, React Flow, Radix and motion.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
