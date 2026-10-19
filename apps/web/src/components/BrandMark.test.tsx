import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import iconSvg from '../../brand/icon.svg?raw';
import { BrandMark } from './BrandMark';

function parseIcon(): SVGSVGElement {
  const host = document.createElement('div');
  host.innerHTML = iconSvg;
  return host.querySelector('svg')!;
}

function attributesOf(element: Element): [string, string][] {
  return Array.from(element.attributes, (attr) => [attr.name, attr.value]);
}

/**
 * The whole drawing of an SVG, with every gradient URL normalized: each BrandMark names its own gradient, so the
 * ids cannot be compared literally, and a fill that points at another instance's gradient stops matching the source.
 */
function drawingOf(svg: SVGSVGElement) {
  const gradient = svg.querySelector('linearGradient')!;
  const normalize = (value: string | null) => value?.replace(/url\(#[^)]*\)/g, 'url(#gradient)') ?? null;
  return {
    viewBox: svg.getAttribute('viewBox'),
    gradient: Object.fromEntries(attributesOf(gradient).filter(([name]) => name !== 'id')),
    stops: Array.from(gradient.querySelectorAll('stop'), (stop) =>
      Object.fromEntries(attributesOf(stop).map(([name, value]) => [name, normalize(value)])),
    ),
    rects: Array.from(svg.querySelectorAll('rect'), (rect) =>
      Object.fromEntries(attributesOf(rect).map(([name, value]) => [name, normalize(value)])),
    ),
  };
}

function stopsOf(svg: SVGSVGElement): [string | null, string | null][] {
  return Array.from(svg.querySelectorAll('linearGradient stop'), (stop) => [
    stop.getAttribute('offset'),
    stop.getAttribute('stop-color'),
  ]);
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

  it('paints the pen blue gradient behind the grid, the same as brand/icon.svg', () => {
    const { container } = render(<BrandMark />);
    const drawn = container.querySelector('svg')!;
    expect(stopsOf(drawn)).toEqual([
      ['0', '#4677EE'],
      ['1', '#1F47B4'],
    ]);
    expect(stopsOf(drawn)).toEqual(stopsOf(parseIcon()));
  });

  it('shows five done cells and four pending cells in white', () => {
    const { container } = render(<BrandMark />);
    const cells = Array.from(container.querySelectorAll('rect')).slice(1);
    expect(
      cells.filter((rect) => rect.getAttribute('fill') === '#FFFFFF' && !rect.hasAttribute('fill-opacity')),
    ).toHaveLength(5);
    expect(cells.filter((rect) => rect.getAttribute('fill-opacity') === '.22')).toHaveLength(4);
  });

  it('draws the same viewBox, gradient and rects as brand/icon.svg, so the favicon and the app mark cannot drift', () => {
    const { container } = render(<BrandMark />);
    expect(drawingOf(container.querySelector('svg')!)).toEqual(drawingOf(parseIcon()));
  });

  it('defines the gradient once per instance, so two marks on a page do not depend on each other', () => {
    const { container } = render(
      <>
        <BrandMark />
        <BrandMark />
      </>,
    );
    const marks = Array.from(container.querySelectorAll('svg'), (svg) => ({
      svg,
      gradientId: svg.querySelector('linearGradient')!.id,
    }));
    expect(marks).toHaveLength(2);
    expect(marks[0]!.gradientId).not.toBe(marks[1]!.gradientId);
    for (const { svg, gradientId } of marks) {
      expect(svg.querySelectorAll('linearGradient')).toHaveLength(1);
      expect(svg.querySelector('rect')!.getAttribute('fill')).toBe(`url(#${gradientId})`);
    }
  });
});
