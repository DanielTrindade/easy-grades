import { useEffect, useState } from 'react';

/** Chrome and Edge fire this once the app is installable. It is not in the DOM typings. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * `native`: the browser's install prompt is ready. `ios`: Safari has no install event, so the user must add the app
 * from the Share sheet. `null`: nothing to offer (not installable, already installed, or running as an app).
 */
export type InstallKind = 'native' | 'ios';

export interface InstallApp {
  kind: InstallKind | null;
  /** Opens the browser's install prompt. Only meaningful when `kind` is `native`. */
  promptInstall: () => Promise<void>;
}

// iPadOS 13+ reports itself as a Mac, so a Mac user agent with touch points is an iPad.
export function isIosSafari(userAgent: string, maxTouchPoints: number): boolean {
  const isIos = /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  // The iOS steps we show are Safari's Share sheet. Chrome, Firefox and Edge on iOS have their own UA tokens and menus, so they get no steps.
  const otherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\//.test(userAgent);
  return isIos && /Safari/.test(userAgent) && !otherIosBrowser;
}

function isStandalone(): boolean {
  // navigator.standalone is the iOS-only flag for an app opened from the Home Screen.
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** What the install menu item should do, and how to run the native prompt. */
export function useInstallApp(): InstallApp {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [standalone] = useState(isStandalone);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      // Keep the event so the app's own button decides when the prompt appears.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }
    function onAppInstalled() {
      setDeferred(null);
      setInstalled(true);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  if (standalone || installed) return { kind: null, promptInstall: async () => {} };

  if (deferred) {
    return {
      kind: 'native',
      promptInstall: async () => {
        // An event can prompt only once; the next install attempt needs a new beforeinstallprompt.
        setDeferred(null);
        await deferred.prompt();
        await deferred.userChoice;
      },
    };
  }

  if (isIosSafari(navigator.userAgent, navigator.maxTouchPoints)) {
    return { kind: 'ios', promptInstall: async () => {} };
  }
  return { kind: null, promptInstall: async () => {} };
}
