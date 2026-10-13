import type { ParseResponse, TranscriptEntry } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CoursesScreen } from './CoursesScreen';

function entry(overrides: Partial<TranscriptEntry>): TranscriptEntry {
  return {
    code: 'DO001',
    name: 'DISCIPLINA',
    category: 'obrigatoria',
    term: '2024.1',
    credits: 4,
    hours: 60,
    grade: 8,
    status: 'aprovado',
    rawStatus: 'Aprovado',
    ...overrides,
  };
}

const data: ParseResponse = {
  curriculum: sampleCurriculum,
  transcript: {
    ...sampleTranscript,
    entries: [
      entry({ code: 'DO001', name: 'ÁLGEBRA LINEAR', term: '2024.1', status: 'aprovado', grade: 8 }),
      entry({ code: 'DO002', name: 'CÁLCULO I', term: '2024.1', status: 'reprovado_nota', grade: 3 }),
      entry({ code: 'DO003', name: 'ESTRUTURAS DE DADOS', term: '2024.2', category: 'eletiva', status: 'matriculado', grade: null }),
      entry({ code: 'DO004', name: 'INTRODUÇÃO À COMPUTAÇÃO', term: '2023.1', status: 'trancado', grade: null, hours: 30 }),
      entry({ code: 'DO005', name: 'REDES', term: '2023.2', status: 'reprovado_freq', grade: null }),
    ],
  },
};

describe('CoursesScreen', () => {
  it('shows a status chip per filter with its count, all in one radiogroup', () => {
    render(<CoursesScreen data={data} />);
    const group = screen.getByRole('radiogroup', { name: 'Filtrar por situação' });
    const chips = within(group).getAllByRole('radio');
    expect(chips.map((chip) => chip.textContent)).toEqual([
      'Todas5',
      'Concluídas1',
      'Em curso1',
      'Reprovadas2',
      'Outras1',
    ]);
    expect(chips[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('filters the list when a status chip is chosen', async () => {
    render(<CoursesScreen data={data} />);
    await userEvent.click(screen.getByRole('radio', { name: /Reprovadas/ }));
    expect(screen.getByRole('radio', { name: /Reprovadas/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('2 de 5 registros com os filtros atuais.')).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByText('Álgebra Linear')).not.toBeInTheDocument();
    expect(screen.getAllByText('Cálculo I').length).toBeGreaterThan(0);
  });

  it('labels the search "Buscar disciplina" and ignores accents and case', async () => {
    render(<CoursesScreen data={data} />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar disciplina' }), 'introducao');
    expect(screen.getAllByText('Introdução à Computação').length).toBeGreaterThan(0);
    expect(screen.queryByText('Redes')).not.toBeInTheDocument();
  });

  it('shows "Limpar filtros" only while a filter is active, and clears them', async () => {
    render(<CoursesScreen data={data} />);
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: /Em curso/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(screen.getByRole('radio', { name: /Todas/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
  });

  it('groups by period by default, most recent first, with the period CR in each header', () => {
    render(<CoursesScreen data={data} />);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings[0]).toMatch(/^2024\/2/);
    expect(headings[1]).toMatch(/^2024\/1/);
    expect(headings[1]).toContain('CR 5,500');
    expect(headings[2]).toMatch(/^2023\/2/);
    expect(headings[3]).toMatch(/^2023\/1/);
  });

  it('switches to grouping by category from the segmented control', async () => {
    render(<CoursesScreen data={data} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Por categoria' }));
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings[0]).toMatch(/^Obrigatória/);
    expect(headings[1]).toMatch(/^Eletiva/);
    expect(headings.join(' ')).not.toContain('CR');
  });

  it('shows the desktop table columns for each group', () => {
    render(<CoursesScreen data={data} />);
    const table = screen.getByRole('table', { name: 'Disciplinas de 2024/1' });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Disciplina',
      'Categoria',
      'CH',
      'Nota',
      'Situação',
    ]);
  });

  it('keeps an instruction in the empty state', async () => {
    render(<CoursesScreen data={data} />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar disciplina' }), 'zzzz');
    expect(screen.getByText(/Nenhuma disciplina com esses filtros/)).toBeInTheDocument();
  });
});
