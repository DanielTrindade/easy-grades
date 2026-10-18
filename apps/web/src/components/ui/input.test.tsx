import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('is a capsule with room for the rounded ends', () => {
    render(<Input aria-label="Buscar disciplina" />);
    const input = screen.getByRole('textbox', { name: 'Buscar disciplina' });
    expect(input).toHaveClass('rounded-full', 'px-4');
    expect(input).not.toHaveClass('rounded-lg');
  });
});
