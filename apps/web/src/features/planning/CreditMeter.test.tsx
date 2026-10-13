import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CreditMeter } from './CreditMeter';

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
});
