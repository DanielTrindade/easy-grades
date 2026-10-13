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

// jsdom lacks pointer capture; Sonner calls it when a toast is pressed (for example its "Desfazer" action).
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.hasPointerCapture = () => false;
}
