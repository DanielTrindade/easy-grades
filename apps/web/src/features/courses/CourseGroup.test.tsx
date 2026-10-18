import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EntryGroup } from './filter-entries';
import { CourseGroup } from './CourseGroup';

type Entry = EntryGroup['entries'][number];

function entry(over: Partial<Entry>): Entry {
  return {
    key: 'ICC001-2024/1',
    code: 'ICC001',
    name: 'INTRODUCAO A COMPUTACAO',
    category: 'obrigatoria',
    hours: 60,
    grade: 9.1,
    status: 'aprovado',
    rawStatus: 'APR',
    ...over,
  } as Entry;
}

const group = {
  id: '2024/1',
  label: '2024/1',
  hours: 120,
  entries: [
    entry({}),
    entry({
      key: 'ICC099-2024/1',
      code: 'ICC099',
      name: 'TRABALHO DE CONCLUSAO DE CURSO II ORIENTACAO E DESENVOLVIMENTO DE PROJETO FINAL',
      hours: null,
      grade: null,
      status: 'matriculado',
      rawStatus: 'MAT',
    }),
  ],
} as unknown as EntryGroup;

describe('CourseGroup', () => {
  it('keeps one named region with one h2, the period CR and the hours', () => {
    render(<CourseGroup group={group} cr={8.2} />);
    const region = screen.getByRole('region', { name: '2024/1' });
    expect(within(region).getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(within(region).getByText('8,2', { exact: false })).toBeInTheDocument();
  });

  it('lists the courses below md as an iOS grouped list', () => {
    render(<CourseGroup group={group} />);
    const list = screen.getByRole('list');
    expect(list).toHaveClass('rounded-group', 'bg-surface', 'md:hidden');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  it('clamps a long name to two lines and keeps grade and status on the row', () => {
    render(<CourseGroup group={group} />);
    const row = within(screen.getByRole('list')).getAllByRole('listitem')[1]!;
    expect(within(row).getByText(/Trabalho de Conclusão|Trabalho De Conclusao/i)).toHaveClass('line-clamp-2');
    expect(within(row).getByText('—')).toBeInTheDocument();
    expect(within(row).getByText('CH —')).toBeInTheDocument();
  });

  it('puts the md+ table in a card', () => {
    render(<CourseGroup group={group} />);
    const table = screen.getByRole('table', { name: 'Disciplinas de 2024/1' });
    expect(table.parentElement).toHaveClass('rounded-card', 'bg-surface');
  });

  it('sticks the group header below the fixed headers', () => {
    render(<CourseGroup group={group} />);
    const header = screen.getByRole('heading', { level: 2 });
    expect(header).toHaveClass(
      'sticky',
      'top-[calc(env(safe-area-inset-top)+2.75rem)]',
      'md:top-[calc(env(safe-area-inset-top)+var(--app-header-height))]',
    );
  });

  it('sticks the table head below the group header', () => {
    render(<CourseGroup group={group} />);
    const table = screen.getByRole('table', { name: 'Disciplinas de 2024/1' });
    expect(table.querySelector('thead')).toHaveClass(
      'sticky',
      'top-[calc(env(safe-area-inset-top)+var(--app-header-height)+2.75rem)]',
    );
  });
});
