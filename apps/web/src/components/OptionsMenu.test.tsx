import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
    expect(within(menu).getAllByRole('separator')).toHaveLength(2);
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

  it('keeps the trigger and every item at 44 px on touch tablets', async () => {
    render(<OptionsMenu onNewUpload={vi.fn()} onClearData={vi.fn()} install={{ kind: 'native', onSelect: vi.fn() }} />);
    const { menu } = await openMenu();
    expect(screen.getByRole('button', { name: 'Mais opções' })).toHaveClass('md:pointer-coarse:size-11');
    for (const item of within(menu).getAllByRole('menuitem')) {
      expect(item).toHaveClass('md:pointer-coarse:min-h-11');
    }
    for (const item of within(menu).getAllByRole('menuitemradio')) {
      expect(item).toHaveClass('md:pointer-coarse:min-h-11');
    }
  });

  it('passes the trigger to the install handler', async () => {
    const onSelect = vi.fn();
    render(<OptionsMenu onNewUpload={vi.fn()} onClearData={vi.fn()} install={{ kind: 'ios', onSelect }} />);
    const { user, menu } = await openMenu();
    await user.click(within(menu).getByRole('menuitem', { name: 'Instalar app' }));
    expect(onSelect).toHaveBeenCalledWith(screen.getByRole('button', { name: 'Mais opções' }));
  });

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.appearance;
  });

  it('offers the glass and solid appearances, with glass checked by default', async () => {
    render(<OptionsMenu onNewUpload={vi.fn()} onClearData={vi.fn()} />);
    const { menu } = await openMenu();
    expect(within(menu).getByText('Aparência')).toBeInTheDocument();
    expect(within(menu).getByRole('menuitemradio', { name: 'Vidro' })).toHaveAttribute('aria-checked', 'true');
    expect(within(menu).getByRole('menuitemradio', { name: 'Sólida' })).toHaveAttribute('aria-checked', 'false');
  });

  it('applies and remembers the solid appearance', async () => {
    render(<OptionsMenu onNewUpload={vi.fn()} onClearData={vi.fn()} />);
    const { user, menu } = await openMenu();
    await user.click(within(menu).getByRole('menuitemradio', { name: 'Sólida' }));
    expect(document.documentElement).toHaveAttribute('data-appearance', 'solid');
    expect(localStorage.getItem('appearance')).toBe('solid');
  });

  it('shows only the appearance when the actions already sit in the header', async () => {
    render(<OptionsMenu onNewUpload={vi.fn()} onClearData={vi.fn()} showActions={false} />);
    const { menu } = await openMenu();
    expect(within(menu).queryByRole('menuitem')).not.toBeInTheDocument();
    expect(within(menu).getAllByRole('menuitemradio')).toHaveLength(2);
  });
});
