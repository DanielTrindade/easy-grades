import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GradeStrip } from './GradeStrip';

describe('GradeStrip', () => {
  it('shows the median and one row per band', () => {
    const { container } = render(
      <GradeStrip
        grades={{
          count: 4,
          median: 7.9,
          ninePlus: 1,
          bands: [
            { key: 'abaixo6', count: 1 },
            { key: '6a7', count: 0 },
            { key: '7a8', count: 2 },
            { key: '8a9', count: 0 },
            { key: '9a10', count: 1 },
          ],
        }}
      />,
    );
    expect(screen.getByText('Mediana 7,90 · 1 nota 9 ou mais')).toBeInTheDocument();
    expect(screen.getByText('Abaixo de 6')).toBeInTheDocument();
    expect(screen.getByText('9 a 10')).toBeInTheDocument();
    const rows = container.querySelectorAll('li');
    expect(rows).toHaveLength(5);
    expect(rows[2]!.querySelector('span[aria-hidden]')).toHaveStyle({ width: '100%' });
    expect(rows[4]!.querySelector('span[aria-hidden]')).toHaveStyle({ width: '50%' });
    expect(rows[1]!.querySelector('span[aria-hidden]')).toHaveStyle({ width: '0%' });
    expect(rows[1]!.querySelector('span[aria-hidden]')).not.toHaveClass('min-w-px');
  });
});
