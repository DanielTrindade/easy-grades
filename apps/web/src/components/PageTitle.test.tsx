import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageTitle } from './PageTitle';

describe('PageTitle', () => {
  it('renders the screen title as the h1, under a context line', () => {
    render(<PageTitle title="Disciplinas" context="Ciência da Computação, currículo 2019" />);
    const heading = screen.getByRole('heading', { level: 1, name: 'Disciplinas' });
    expect(heading).toHaveClass('text-large-title');
    expect(screen.getByText('Ciência da Computação, currículo 2019')).toHaveClass('text-footnote', 'text-ink-muted');
  });
});
