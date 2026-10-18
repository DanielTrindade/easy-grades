import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionNav } from './SectionNav';

describe('SectionNav', () => {
  it('renders the four sections as links, in order', () => {
    render(<SectionNav view="visao-geral" />);
    const nav = screen.getByRole('navigation', { name: 'Seções' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Visão geral', 'Fluxograma', 'Disciplinas', 'Planejamento']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '#/visao-geral',
      '#/fluxograma',
      '#/disciplinas',
      '#/planejamento',
    ]);
  });

  it('marks only the active section with aria-current="page"', () => {
    render(<SectionNav view="disciplinas" />);
    expect(screen.getByRole('link', { name: 'Disciplinas' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Visão geral' })).not.toHaveAttribute('aria-current');
  });

  it('keeps the links at 44 px on touch tablets', () => {
    render(<SectionNav view="visao-geral" />);
    const nav = screen.getByRole('navigation', { name: 'Seções' });
    for (const link of within(nav).getAllByRole('link')) {
      expect(link).toHaveClass('pointer-coarse:h-11');
    }
  });

  it('is a capsule segmented control with a sliding pill under the active section', () => {
    const { container } = render(<SectionNav view="fluxograma" />);
    expect(screen.getByRole('navigation', { name: 'Seções' })).toHaveClass('rounded-full');
    expect(container.querySelector('.tab-indicator')).toHaveStyle({ transform: 'translateX(100%)' });
  });
});
