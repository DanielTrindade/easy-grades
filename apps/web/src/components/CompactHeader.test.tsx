import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompactHeader } from './CompactHeader';

describe('CompactHeader', () => {
  it('repeats the title without exposing it twice to screen readers', () => {
    const { container } = render(<CompactHeader title="Disciplinas" visible />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstElementChild).toHaveClass('glass', 'scroll-edge');
  });

  it('is faded out and not clickable while the large title is on screen', () => {
    const { container } = render(<CompactHeader title="Disciplinas" visible={false} />);
    expect(container.firstElementChild).toHaveClass('opacity-0', 'pointer-events-none');
  });

  it('carries the h1 itself when the screen has no large title (flowchart)', () => {
    const { container } = render(<CompactHeader title="Fluxograma" visible asHeading />);
    expect(screen.getByRole('heading', { level: 1, name: 'Fluxograma' })).toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveAttribute('aria-hidden');
  });
});
