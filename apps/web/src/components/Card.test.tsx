import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './Card';

describe('Card', () => {
  it('is an opaque rounded surface that keeps extra classes and props', () => {
    render(
      <Card className="grid gap-2" aria-label="Coeficiente">
        8,214
      </Card>,
    );
    const card = screen.getByLabelText('Coeficiente');
    expect(card).toHaveAttribute('data-slot', 'card');
    expect(card).toHaveClass('rounded-card', 'bg-surface', 'p-4', 'grid', 'gap-2');
    expect(card).not.toHaveClass('glass');
  });
});
