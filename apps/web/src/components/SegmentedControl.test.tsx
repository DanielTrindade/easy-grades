import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

const ITEMS = [
  { value: 'period', content: 'Por período' },
  { value: 'category', content: 'Por categoria' },
] as const;

function Harness() {
  const [value, setValue] = useState<'period' | 'category'>('period');
  return <SegmentedControl label="Agrupar por" items={ITEMS} value={value} onValueChange={setValue} />;
}

describe('SegmentedControl', () => {
  it('is a capsule radiogroup with the checked segment raised on the surface', () => {
    render(<Harness />);
    const group = screen.getByRole('radiogroup', { name: 'Agrupar por' });
    expect(group).toHaveClass('rounded-full');
    const checked = screen.getByRole('radio', { name: 'Por período' });
    expect(checked).toHaveAttribute('aria-checked', 'true');
    expect(checked).toHaveClass('rounded-full', 'aria-checked:bg-surface', 'min-h-11');
  });

  it('gives the checked segment a field edge, 3:1 against the muted track', () => {
    render(<Harness />);
    const checked = screen.getByRole('radio', { name: 'Por período' });
    expect(checked).toHaveClass('aria-checked:ring-1', 'aria-checked:ring-field');
  });

  it('keeps one tab stop and moves with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    expect(screen.getByRole('radio', { name: 'Por período' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Por categoria' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Por categoria' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Por período' })).toHaveAttribute('tabindex', '-1');
  });
});
