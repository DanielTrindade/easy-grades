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

describe('ClearDataDialog shape', () => {
  it('is a 20 px card (rounded-xl, --radius-xl 1.25rem) with capsule buttons and a danger confirm', () => {
    render(<ClearDataDialog open onOpenChange={vi.fn()} onConfirm={vi.fn()} openerRef={{ current: null }} />);
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveClass('rounded-xl');
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveClass('rounded-full');
    expect(within(dialog).getByRole('button', { name: 'Limpar dados' })).toHaveClass(
      'rounded-full',
      'bg-danger',
      'text-danger-foreground',
    );
  });
});

describe('ClearDataDialog focus', () => {
  it('returns focus to the desktop button that opened it when it is cancelled', async () => {
    const user = userEvent.setup({ delay: null });
    render(<DesktopHarness />);
    const opener = screen.getByRole('button', { name: 'Limpar dados' });
    await user.click(opener);
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('returns focus to the "Mais opções" trigger when it was opened from the options menu', async () => {
    const user = userEvent.setup({ delay: null });
    render(<MenuHarness />);
    await user.click(screen.getByRole('button', { name: 'Mais opções' }));
    const menu = await screen.findByRole('menu');
    await user.click(within(menu).getByRole('menuitem', { name: 'Limpar dados' }));
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mais opções' })).toHaveFocus());
  });
});
