import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InstallAppButton, IOS_INSTALL_HINT, IosInstallDialog } from './InstallApp';

describe('InstallAppButton', () => {
  it('passes the button to the install handler as the opener', async () => {
    const onSelect = vi.fn();
    render(<InstallAppButton install={{ kind: 'native', onSelect }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Instalar app' }));
    expect(onSelect).toHaveBeenCalledWith(screen.getByRole('button', { name: 'Instalar app' }));
  });
});

describe('IosInstallDialog', () => {
  it('explains the manual steps for Safari', () => {
    render(<IosInstallDialog open onOpenChange={vi.fn()} openerRef={{ current: null }} />);
    expect(screen.getByRole('alertdialog')).toHaveTextContent(IOS_INSTALL_HINT);
  });

  it('closes when acknowledged', async () => {
    const onOpenChange = vi.fn();
    render(<IosInstallDialog open onOpenChange={onOpenChange} openerRef={{ current: null }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('is a 20 px card (rounded-xl, --radius-xl 1.25rem) with a capsule action', () => {
    render(<IosInstallDialog open onOpenChange={vi.fn()} openerRef={{ current: null }} />);
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveClass('rounded-xl');
    expect(within(dialog).getByRole('button', { name: 'Entendi' })).toHaveClass('rounded-full');
  });
});
