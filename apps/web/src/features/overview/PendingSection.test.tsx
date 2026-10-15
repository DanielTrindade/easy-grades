import { pendingInsights } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PendingSection } from './PendingSection';

const pending = pendingInsights(sampleCurriculum, sampleTranscript);

describe('PendingSection', () => {
  it('shows the mandatory courses left, the hours and how many are enrolled', () => {
    render(<PendingSection pending={pending} />);
    expect(screen.getByRole('heading', { name: 'O que falta para a formatura' })).toBeInTheDocument();
    expect(screen.getByText('6 obrigatórias')).toBeInTheDocument();
    expect(screen.getByText('540 h para cumprir, 4 delas em curso.')).toBeInTheDocument();
    expect(screen.getByText('Todas as 6 já cumprem os pré-requisitos.')).toBeInTheDocument();
  });

  it('lists the missing hours outside the mandatory courses, skipping zeros', () => {
    render(<PendingSection pending={pending} />);
    expect(
      screen.getByText('Fora delas, faltam 60 h de eletivas, 210 h de atividades complementares e 320 h de extensão.'),
    ).toBeInTheDocument();
  });

  it('names the courses that hold back the most others', () => {
    render(<PendingSection pending={pending} />);
    expect(screen.getByText('As que mais seguram o avanço:')).toBeInTheDocument();
    expect(screen.getByText(/Processo de Desenvolvimento de Software/)).toBeInTheDocument();
    expect(screen.getByText(/trava 1 disciplina\./)).toBeInTheDocument();
  });

  it('sends the student to the planning with one link', () => {
    render(<PendingSection pending={pending} />);
    expect(screen.getByRole('link', { name: 'Montar o próximo semestre' })).toHaveAttribute('href', '#/planejamento');
  });

  it('counts the blocked courses with the singular label', () => {
    const entries = sampleTranscript.entries.filter((e) => e.code !== 'ICC412');
    render(<PendingSection pending={pendingInsights(sampleCurriculum, { ...sampleTranscript, entries })} />);
    expect(screen.getByText('5 já cumprem os pré-requisitos; 1 ainda bloqueada.')).toBeInTheDocument();
  });

  it('closes the section when nothing is left', () => {
    render(
      <PendingSection
        pending={{ ...pending, mandatoryRemaining: 0, mandatoryInProgress: 0, mandatoryHoursLeft: 0, hours: { optativa: 0, eletiva: 0, aacc: 0, extensao: 0 }, bottlenecks: [] }}
      />,
    );
    expect(screen.getByText('Nenhuma obrigatória')).toBeInTheDocument();
    expect(screen.getByText('Todas as disciplinas obrigatórias do currículo já foram cumpridas.')).toBeInTheDocument();
    expect(screen.queryByText(/Fora delas/)).not.toBeInTheDocument();
  });

  it('uses the singular when only one category is missing hours', () => {
    render(<PendingSection pending={{ ...pending, hours: { optativa: 0, eletiva: 60, aacc: 0, extensao: 0 } }} />);
    expect(screen.getByText('Fora delas, falta 60 h de eletivas.')).toBeInTheDocument();
  });
});
