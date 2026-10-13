import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import iconSvg from '../../brand/icon.svg?raw';
import { BrandMark } from './BrandMark';

/** Every rect as its attribute map, so the comparison covers geometry, fills and strokes. */
function rectsOf(svg: SVGSVGElement): Record<string, string>[] {
  return Array.from(svg.querySelectorAll('rect')).map((rect) =>
    Object.fromEntries(Array.from(rect.attributes, (attr) => [attr.name, attr.value])),
  );
}

function parseIcon(): SVGSVGElement {
  const host = document.createElement('div');
  host.innerHTML = iconSvg;
  return host.querySelector('svg')!;
}

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

  it('keeps the full wordmark size unless compactOnMobile asks for a smaller one below md', () => {
    render(<BrandMark />);
    expect(screen.getByText('Easy Grades')).toHaveClass('text-xl');
    expect(screen.getByText('Easy Grades')).not.toHaveClass('text-lg');
  });

  it('uses a smaller wordmark below md when compactOnMobile is set', () => {
    render(<BrandMark compactOnMobile />);
    const wordmark = screen.getByText('Easy Grades');
    expect(wordmark).toHaveClass('text-lg', 'md:text-xl');
    expect(wordmark).not.toHaveClass('text-xl');
  });

  it('draws the same viewBox, rects and fills as brand/icon.svg, so the favicon and the app mark cannot drift', () => {
    const { container } = render(<BrandMark />);
    const drawn = container.querySelector('svg')!;
    const source = parseIcon();
    expect(drawn.getAttribute('viewBox')).toBe(source.getAttribute('viewBox'));
    expect(rectsOf(drawn)).toHaveLength(10);
    expect(rectsOf(drawn)).toEqual(rectsOf(source));
  });
});
