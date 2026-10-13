import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OptionsMenu } from './OptionsMenu';

async function openMenu() {
  const user = userEvent.setup();
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

  it('places the install slot above the separator', async () => {
    render(<OptionsMenu onNewUpload={vi.fn()} onClearData={vi.fn()} installItem={<button role="menuitem">Instalar app</button>} />);
    const { menu } = await openMenu();
    const items = within(menu).getAllByRole('menuitem').map((item) => item.textContent);
    expect(items).toEqual(['Novo upload', 'Instalar app', 'Limpar dados']);
  });
});
