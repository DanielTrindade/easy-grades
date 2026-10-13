import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '@/components/ui/sonner';
import { PwaUpdatePrompt } from './PwaUpdatePrompt';

const pwa = vi.hoisted(() => ({
  options: undefined as undefined | { onNeedRefresh?: () => void },
  updateServiceWorker: vi.fn(() => Promise.resolve()),
}));

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options: { onNeedRefresh?: () => void }) => {
    pwa.options = options;
    return { needRefresh: [false, vi.fn()], offlineReady: [false, vi.fn()], updateServiceWorker: pwa.updateServiceWorker };
  },
}));

beforeEach(() => {
  pwa.options = undefined;
  pwa.updateServiceWorker.mockClear();
});

describe('PwaUpdatePrompt', () => {
  it('offers the new version in a toast that stays until dismissed', async () => {
    render(
      <>
        <PwaUpdatePrompt />
        <Toaster />
      </>,
    );
    expect(screen.queryByText('Nova versão disponível')).not.toBeInTheDocument();

    act(() => {
      pwa.options?.onNeedRefresh?.();
    });
    expect(await screen.findByText('Nova versão disponível')).toBeInTheDocument();
  });

  it('can be dismissed from the keyboard with its close button', async () => {
    render(
      <>
        <PwaUpdatePrompt />
        <Toaster />
      </>,
    );
    act(() => {
      pwa.options?.onNeedRefresh?.();
    });
    const close = await screen.findByRole('button', { name: 'Close toast' });
    act(() => {
      close.focus();
    });
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByText('Nova versão disponível')).not.toBeInTheDocument());
    expect(pwa.updateServiceWorker).not.toHaveBeenCalled();
  });

  it('activates the waiting worker only when the user presses Atualizar', async () => {
    render(
      <>
        <PwaUpdatePrompt />
        <Toaster />
      </>,
    );
    act(() => {
      pwa.options?.onNeedRefresh?.();
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Atualizar' }));
    expect(pwa.updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
