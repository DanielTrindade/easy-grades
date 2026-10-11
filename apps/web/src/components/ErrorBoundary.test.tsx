import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Broken(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  const originalLocation = window.location;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', { value: originalLocation, configurable: true });
  });

  it('shows a recovery message and both buttons when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary onReset={vi.fn()}>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: 'Algo não carregou.' })).toBeInTheDocument();
    expect(
      screen.getByText('Recarregue a página. Se continuar, limpe os dados salvos e envie os PDFs de novo.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar dados e recomeçar' })).toBeInTheDocument();
  });

  it('reloads the page even when clearing the data fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reload = vi.fn();
    Object.defineProperty(window, 'location', { value: { reload }, configurable: true });
    const onReset = vi.fn().mockRejectedValue(new Error('idb down'));
    render(
      <ErrorBoundary onReset={onReset}>
        <Broken />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Limpar dados e recomeçar' }));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
