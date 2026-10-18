import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GradeInput } from './GradeInput';

function setup(value = 7.5) {
  const onChange = vi.fn();
  render(<GradeInput id="nota-x" courseName="Algoritmos" value={value} onChange={onChange} />);
  return { onChange, input: screen.getByRole('textbox', { name: 'Nota esperada em Algoritmos' }) };
}

describe('GradeInput', () => {
  it('shows the grade with a comma and opens a decimal keypad', () => {
    const { input } = setup(7.5);
    expect(input).toHaveValue('7,5');
    expect(input).toHaveAttribute('inputmode', 'decimal');
  });

  it('commits a typed grade on blur, accepting a comma', async () => {
    const user = userEvent.setup({ delay: null });
    const { input, onChange } = setup(7.5);
    await user.clear(input);
    await user.type(input, '8,4');
    await user.tab();
    expect(onChange).toHaveBeenCalledWith(8.4);
  });

  it('clamps a typed grade above 10 and below 0', async () => {
    const user = userEvent.setup({ delay: null });
    const { input, onChange } = setup(7.5);
    await user.clear(input);
    await user.type(input, '12');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(10);
  });

  it('reverts text that is not a number instead of committing it', async () => {
    const user = userEvent.setup({ delay: null });
    const { input, onChange } = setup(7.5);
    await user.clear(input);
    await user.type(input, 'abc');
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('7,5');
  });

  it('is a capsule field', () => {
    const { input } = setup();
    expect(input.parentElement).toHaveClass('rounded-full');
  });

  it('gives the field little side padding, so "10,0" is not clipped', () => {
    const { input } = setup(10);
    expect(input).toHaveValue('10,0');
    expect(input).toHaveClass('px-1');
  });

  it('steps with the 44 px − and + buttons', async () => {
    const user = userEvent.setup({ delay: null });
    const { onChange } = setup(7.5);
    await user.click(screen.getByRole('button', { name: 'Aumentar nota em Algoritmos' }));
    expect(onChange).toHaveBeenLastCalledWith(7.6);
    await user.click(screen.getByRole('button', { name: 'Diminuir nota em Algoritmos' }));
    expect(onChange).toHaveBeenLastCalledWith(7.4);
  });
});
