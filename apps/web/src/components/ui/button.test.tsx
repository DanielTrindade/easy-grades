import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it.each(['default', 'outline', 'secondary', 'ghost', 'destructive', 'accent'] as const)(
    'renders the %s variant as a capsule',
    (variant) => {
      render(<Button variant={variant}>Salvar</Button>);
      expect(screen.getByRole('button', { name: 'Salvar' })).toHaveClass('rounded-full');
    },
  );

  it.each(['xs', 'sm', 'icon-xs', 'icon-sm'] as const)('keeps the %s size a capsule', (size) => {
    render(<Button size={size}>Salvar</Button>);
    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button.className).not.toMatch(/rounded-\[|rounded-lg/);
  });

  it('fills the accent variant with the pen blue', () => {
    render(<Button variant="accent">Usar sugestão</Button>);
    expect(screen.getByRole('button', { name: 'Usar sugestão' })).toHaveClass('bg-pen', 'text-pen-foreground');
  });
});
