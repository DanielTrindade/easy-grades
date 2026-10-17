import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ChipGroup } from './ChipGroup';

const ITEMS = [
  { value: 'todas', content: 'Todas' },
  { value: 'aprovadas', content: 'Aprovadas' },
  { value: 'reprovadas', content: 'Reprovadas' },
] as const;

function Harness() {
  const [value, setValue] = useState<'todas' | 'aprovadas' | 'reprovadas'>('todas');
  return <ChipGroup label="Filtrar por situação" items={ITEMS} value={value} onValueChange={setValue} />;
}

describe('ChipGroup', () => {
  it('renders wrapping capsule chips with the checked one in graphite and 44 px on touch', () => {
    render(<Harness />);
    expect(screen.getByRole('radiogroup', { name: 'Filtrar por situação' })).toHaveClass('flex', 'flex-wrap');
    const chip = screen.getByRole('radio', { name: 'Todas' });
    expect(chip).toHaveClass('rounded-full', 'min-h-11', 'aria-checked:bg-ink', 'aria-checked:text-canvas', 'md:pointer-coarse:min-h-11');
  });

  it('jumps to the ends with Home and End', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard('{End}');
    expect(screen.getByRole('radio', { name: 'Reprovadas' })).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: 'Todas' })).toHaveAttribute('aria-checked', 'true');
  });
});
