import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/** Whether the browser reports a connection. Re-renders on the online and offline events. */
export function useOnline(): boolean {
  // Server snapshot: a browser with no navigator is treated as online, so nothing is disabled before hydration.
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
