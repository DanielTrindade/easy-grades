import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CreditMeter } from './CreditMeter';

/** The cells of the grid, in order: one per credit, plus any past the maximum. */
function cellsOf(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-cell]'));
}

describe('CreditMeter', () => {
  it('warns below the minimum, with text and not only colour', () => {
    render(<CreditMeter credits={6} min={12} max={30} />);
    expect(screen.getByText('Abaixo do mínimo de 12 créditos por período.')).toBeInTheDocument();
  });

  it('says the range when the credits are within the limits', () => {
    render(<CreditMeter credits={18} min={12} max={30} />);
    expect(screen.getByText('Entre 12 e 30 créditos por período.')).toBeInTheDocument();
  });

  it('reports an error above the maximum', () => {
    render(<CreditMeter credits={34} min={12} max={30} />);
    expect(screen.getByText('Passa do máximo de 30 créditos por período.')).toBeInTheDocument();
  });

  it('exposes the chosen credits as a native meter, with the limit as the maximum', () => {
    render(<CreditMeter credits={18} min={12} max={30} />);
    const meter = screen.getByRole('meter', { name: 'Créditos no semestre' });
    expect(meter).toHaveAttribute('value', '18');
    expect(meter).toHaveAttribute('max', '30');
  });

  it('draws one cell per credit of the maximum, filling the chosen ones', () => {
    const { container } = render(<CreditMeter credits={18} min={12} max={30} />);
    const cells = cellsOf(container);
    expect(cells).toHaveLength(30);
    expect(cells.filter((cell) => cell.dataset.cell === 'filled')).toHaveLength(18);
    expect(cells.filter((cell) => cell.dataset.cell === 'empty')).toHaveLength(12);
  });

  it('marks the cell that holds the last credit of the minimum', () => {
    const { container } = render(<CreditMeter credits={18} min={12} max={30} />);
    const cells = cellsOf(container);
    const marked = cells.filter((cell) => cell.dataset.min !== undefined);
    expect(marked).toHaveLength(1);
    expect(cells.indexOf(marked[0]!)).toBe(11);
  });

  it('adds error cells past the maximum, one per extra credit', () => {
    const { container } = render(<CreditMeter credits={34} min={12} max={30} />);
    const cells = cellsOf(container);
    expect(cells).toHaveLength(34);
    expect(cells.filter((cell) => cell.dataset.cell === 'over')).toHaveLength(4);
  });

  it('gives one cell per two credits when the maximum is above 40', () => {
    const { container } = render(<CreditMeter credits={10} min={20} max={60} />);
    const cells = cellsOf(container);
    expect(cells).toHaveLength(30);
    expect(cells.filter((cell) => cell.dataset.cell === 'filled')).toHaveLength(5);
  });
});
