import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInstallApp } from './use-install-app';

const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IOS_CHROME_UA = IOS_SAFARI_UA.replace('Version/18.0', '').replace('Safari/604.1', 'CriOS/130.0 Safari/604.1');
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const originalUserAgent = navigator.userAgent;
const originalMatchMedia = window.matchMedia;

function setUserAgent(userAgent: string) {
  Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true });
}

// Standalone mode is reported through display-mode; everything else is "not matching".
function setStandalone(standalone: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: standalone && query === '(display-mode: standalone)',
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList;
}

function fireBeforeInstallPrompt() {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };
  event.prompt = vi.fn(() => Promise.resolve());
  event.userChoice = Promise.resolve({ outcome: 'accepted' });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

beforeEach(() => {
  setUserAgent(DESKTOP_UA);
  setStandalone(false);
});

afterEach(() => {
  setUserAgent(originalUserAgent);
  window.matchMedia = originalMatchMedia;
});

describe('useInstallApp', () => {
  it('offers nothing in a desktop browser that has not sent the install event', () => {
    const { result } = renderHook(() => useInstallApp());
    expect(result.current.kind).toBeNull();
  });

  it('offers the browser install prompt once beforeinstallprompt fires, and suppresses the mini-infobar', () => {
    const { result } = renderHook(() => useInstallApp());
    const event = fireBeforeInstallPrompt();
    expect(result.current.kind).toBe('native');
    expect(event.defaultPrevented).toBe(true);
  });

  it('shows the native prompt when asked, then stops offering it', async () => {
    const { result } = renderHook(() => useInstallApp());
    const event = fireBeforeInstallPrompt();
    await act(async () => {
      await result.current.promptInstall();
    });
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(result.current.kind).toBeNull();
  });

  it('stops offering the install after appinstalled', () => {
    const { result } = renderHook(() => useInstallApp());
    fireBeforeInstallPrompt();
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(result.current.kind).toBeNull();
  });

  it('offers the manual steps on iOS Safari, where no install event exists', () => {
    setUserAgent(IOS_SAFARI_UA);
    const { result } = renderHook(() => useInstallApp());
    expect(result.current.kind).toBe('ios');
  });

  it('does not offer the iOS steps in other iOS browsers, which cannot add to the Home Screen', () => {
    setUserAgent(IOS_CHROME_UA);
    const { result } = renderHook(() => useInstallApp());
    expect(result.current.kind).toBeNull();
  });

  it('offers nothing when the app already runs installed', () => {
    setUserAgent(IOS_SAFARI_UA);
    setStandalone(true);
    const { result } = renderHook(() => useInstallApp());
    expect(result.current.kind).toBeNull();
  });
});
