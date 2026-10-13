import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ClearDataDialog } from './ClearDataDialog';
import { OptionsMenu } from './OptionsMenu';

function DesktopHarness() {
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  return (
    <>
      <button
        onClick={(event) => {
          openerRef.current = event.currentTarget;
          setOpen(true);
        }}
      >
        Limpar dados
      </button>
      <ClearDataDialog open={open} onOpenChange={setOpen} onConfirm={vi.fn()} openerRef={openerRef} />
    </>
  );
}

function MenuHarness() {
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  return (
    <>
      <OptionsMenu
        onNewUpload={vi.fn()}
        onClearData={(opener) => {
          openerRef.current = opener;
          setOpen(true);
        }}
      />
      <ClearDataDialog open={open} onOpenChange={setOpen} onConfirm={vi.fn()} openerRef={openerRef} />
    </>
  );
}

describe('ClearDataDialog focus', () => {
  it('returns focus to the desktop button that opened it when it is cancelled', async () => {
    const user = userEvent.setup();
    render(<DesktopHarness />);
    const opener = screen.getByRole('button', { name: 'Limpar dados' });
    await user.click(opener);
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('returns focus to the "Mais opções" trigger when it was opened from the options menu', async () => {
    const user = userEvent.setup();
    render(<MenuHarness />);
    await user.click(screen.getByRole('button', { name: 'Mais opções' }));
    const menu = await screen.findByRole('menu');
    await user.click(within(menu).getByRole('menuitem', { name: 'Limpar dados' }));
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mais opções' })).toHaveFocus());
  });
});
