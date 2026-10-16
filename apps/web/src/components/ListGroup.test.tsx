import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ListGroup, ListGroupRow } from './ListGroup';

describe('ListGroup', () => {
  it('labels the group by its heading and lists its rows', () => {
    render(
      <ListGroup heading="2025/1" meta="CR 8,0 · 360 h">
        <ListGroupRow>Banco de dados</ListGroupRow>
        <ListGroupRow>Compiladores</ListGroupRow>
      </ListGroup>,
    );
    const group = screen.getByRole('region', { name: '2025/1' });
    expect(within(group).getByRole('heading', { level: 2, name: '2025/1' })).toBeInTheDocument();
    expect(within(group).getByText('CR 8,0 · 360 h')).toHaveClass('text-ink-muted');
    expect(within(group).getAllByRole('listitem')).toHaveLength(2);
  });

  it('uses the requested heading level', () => {
    render(
      <ListGroup heading="Optativas" headingLevel={3}>
        <ListGroupRow>Visão computacional</ListGroupRow>
      </ListGroup>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Optativas' })).toBeInTheDocument();
  });

  it('renders a plain list without a heading', () => {
    render(
      <ListGroup>
        <ListGroupRow>Redes</ListGroupRow>
      </ListGroup>,
    );
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByRole('list')).toHaveClass('rounded-group', 'bg-surface');
  });

  it('gives each row a 44 px minimum and an inset separator after the first', () => {
    render(
      <ListGroup>
        <ListGroupRow>Redes</ListGroupRow>
      </ListGroup>,
    );
    expect(screen.getByRole('listitem')).toHaveClass('min-h-11', 'border-hairline', 'not-first:border-t');
    expect(screen.getByRole('list')).toHaveClass('pl-4');
  });
});
