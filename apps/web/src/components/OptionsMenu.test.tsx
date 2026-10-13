import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OptionsMenu } from './OptionsMenu';

async function openMenu() {
  const user = userEvent.setup({ delay: null });
  await user.click(screen.getByRole('button', { name: 'Mais opções' }));
  return { user, menu: await screen.findByRole('menu') };
}

describe('OptionsMenu', () => {
  it('offers Novo upload, a separator, and Limpar dados in that order', async () => {
    render(<OptionsMenu onNewUpload={vi.fn()} onClearData={vi.fn()} />);
    const { menu } = await openMenu();
    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Novo upload', 'Limpar dados']);
    expect(within(menu).getByRole('separator')).toBeInTheDocument();
  });

  it('calls the matching handler when an item is chosen', async () => {
    const onNewUpload = vi.fn();
    const onClearData = vi.fn();
    render(<OptionsMenu onNewUpload={onNewUpload} onClearData={onClearData} />);
    const { user, menu } = await openMenu();
    await user.click(within(menu).getByRole('menuitem', { name: 'Limpar dados' }));
    expect(onClearData).toHaveBeenCalledOnce();
    expect(onNewUpload).not.toHaveBeenCalled();
  });

  it('places Instalar app between Novo upload and the separator when the app can be installed', async () => {
    render(<OptionsMenu onNewUpload={vi.fn()} onClearData={vi.fn()} install={{ kind: 'native', onSelect: vi.fn() }} />);
    const { menu } = await openMenu();
    const items = within(menu).getAllByRole('menuitem').map((item) => item.textContent);
    expect(items).toEqual(['Novo upload', 'Instalar app', 'Limpar dados']);
  });

  it('hides Instalar app when there is nothing to install', async () => {
    render(<OptionsMenu onNewUpload={vi.fn()} onClearData={vi.fn()} />);
    const { menu } = await openMenu();
    expect(within(menu).queryByRole('menuitem', { name: 'Instalar app' })).not.toBeInTheDocument();
  });

  it('passes the trigger to the install handler', async () => {
    const onSelect = vi.fn();
    render(<OptionsMenu onNewUpload={vi.fn()} onClearData={vi.fn()} install={{ kind: 'ios', onSelect }} />);
    const { user, menu } = await openMenu();
    await user.click(within(menu).getByRole('menuitem', { name: 'Instalar app' }));
    expect(onSelect).toHaveBeenCalledWith(screen.getByRole('button', { name: 'Mais opções' }));
  });
});
