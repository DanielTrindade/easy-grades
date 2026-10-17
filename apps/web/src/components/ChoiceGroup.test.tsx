import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChoiceGroup } from './ChoiceGroup';

const items = [
  { value: 'a', content: 'Alfa' },
  { value: 'b', content: 'Beta' },
  { value: 'c', content: 'Gama' },
] as const;

function Harness({ onChange, initial = 'a' }: { onChange: (value: string) => void; initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <ChoiceGroup
      label="Letras"
      items={items}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe('ChoiceGroup', () => {
  it('renders a labelled radiogroup whose only checked radio is the current value', () => {
    render(<Harness onChange={() => {}} initial="b" />);
    expect(screen.getByRole('radiogroup', { name: 'Letras' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.textContent)).toEqual(['Alfa', 'Beta', 'Gama']);
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
  });

  it('uses a roving tabindex: only the checked radio is in the tab order', () => {
    render(<Harness onChange={() => {}} initial="b" />);
    expect(screen.getByRole('radio', { name: 'Beta' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Alfa' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('radio', { name: 'Gama' })).toHaveAttribute('tabindex', '-1');
  });

  it('keeps the first radio in the tab order when the value matches no item', () => {
    render(<Harness onChange={() => {}} initial="zzz" />);
    expect(screen.getByRole('radio', { name: 'Alfa' })).toHaveAttribute('tabindex', '0');
  });

  it('selects a radio on click', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Gama' }));
    expect(onChange).toHaveBeenCalledWith('c');
    expect(screen.getByRole('radio', { name: 'Gama' })).toHaveAttribute('aria-checked', 'true');
  });

  it('moves focus and selection with the arrow keys, wrapping at both ends', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    screen.getByRole('radio', { name: 'Alfa' }).focus();

    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Beta' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('b');

    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Alfa' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('a');

    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Gama' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('c');

    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('radio', { name: 'Beta' })).toHaveFocus();
  });

  it('jumps to the first and last radio with Home and End', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} initial="b" />);
    screen.getByRole('radio', { name: 'Beta' }).focus();

    await userEvent.keyboard('{End}');
    expect(screen.getByRole('radio', { name: 'Gama' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('c');

    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: 'Alfa' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('a');
  });
});
