import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandMark } from './BrandMark';

describe('BrandMark', () => {
  it('shows the wordmark next to the symbol, and the symbol is decorative', () => {
    const { container } = render(<BrandMark />);
    expect(screen.getByText('Easy Grades')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('sizes the symbol with the size prop', () => {
    const { container } = render(<BrandMark size={32} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
  });
});
