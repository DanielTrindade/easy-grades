import { gradeInsights, performanceInsights, type Transcript, type TranscriptEntry } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { cleanup, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PerformanceSection } from './PerformanceSection';

const entry = (over: Partial<TranscriptEntry>): TranscriptEntry => ({
  code: 'ICC120', name: 'MATEMÁTICA DISCRETA', category: 'obrigatoria', term: '2024.2', credits: 4, hours: 60,
  grade: 3.9, status: 'reprovado_nota', rawStatus: 'Repro Nota', ...over,
});
const withEntries = (entries: TranscriptEntry[]): Transcript => ({ ...sampleTranscript, entries, pending: [] });
const emptyStreak = { terms: 0, judgedTerms: 0, lastFailureTerm: null, neverFailed: true };

const renderWith = (transcript: Transcript) =>
  render(
    <PerformanceSection
      performance={performanceInsights(sampleCurriculum, transcript)}
      attempts={[]}
      streak={emptyStreak}
      grades={null}
      avgHoursPerTerm={414}
    />,
  );

function renderSection(over: Partial<Parameters<typeof PerformanceSection>[0]> = {}) {
  return render(
    <PerformanceSection
      performance={performanceInsights(sampleCurriculum, sampleTranscript)}
      attempts={[]}
      streak={emptyStreak}
      grades={null}
      avgHoursPerTerm={414}
      {...over}
    />,
  );
}

describe('PerformanceSection', () => {
  it('shows the pass rate with the reference study', () => {
    renderWith(sampleTranscript);
    expect(screen.getByText('94,74%')).toBeInTheDocument();
    expect(
      screen.getByText('Em um estudo com 1.124 formados em engenharia, metade reprovou em no máximo 13% das disciplinas.'),
    ).toBeInTheDocument();
  });

  it('counts the failures but lists none to retake, since the sample optativas are already met', () => {
    renderWith(sampleTranscript);
    expect(screen.getByText('2 reprovações')).toBeInTheDocument();
    expect(screen.queryByText(/Ainda por cursar/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Refazendo agora/)).not.toBeInTheDocument();
  });

  it('lists the obrigatória failures still to take, with their names in title case', () => {
    renderWith(withEntries([entry({ code: 'ICC120' }), entry({ code: 'ICC130', name: 'ESTRUTURAS DE DADOS', term: '2025.1' })]));
    expect(screen.getByText('Ainda por cursar: Matemática Discreta (ICC120), Estruturas de Dados (ICC130)')).toBeInTheDocument();
  });

  it('shows the failures being retaken now by code', () => {
    renderWith(withEntries([entry({ code: 'ICC120' }), entry({ code: 'ICC120', term: '2026.2', grade: null, status: 'matriculado', rawStatus: 'Matricula' })]));
    expect(screen.getByText('Refazendo agora: ICC120')).toBeInTheDocument();
    expect(screen.queryByText(/Ainda por cursar/)).not.toBeInTheDocument();
  });

  it('shows the CR trend, best and worst term and credited courses', () => {
    renderWith(sampleTranscript);
    expect(screen.getByText('CR acumulado subiu desde o período anterior (de 7,700 para 7,757).')).toBeInTheDocument();
    expect(screen.getByText('Melhor período: 2026/1, com CR 8,130')).toBeInTheDocument();
    expect(screen.getByText('Pior período: 2025/2, com CR 7,133')).toBeInTheDocument();
    expect(
      screen.getByText('20 disciplinas aproveitadas (1.290 h) por equivalência, dispensa ou transferência'),
    ).toBeInTheDocument();
  });

  it('says there is no pass rate before any course counts', () => {
    renderWith({ ...sampleTranscript, entries: [] });
    expect(screen.getByText('sem disciplinas cursadas ainda')).toBeInTheDocument();
  });

  it('shows the cost of the failures as hours, credits and periods of study', () => {
    renderSection();
    expect(screen.getByText('Custo: 120 h e 8 créditos — o equivalente a 0,3 período no seu ritmo.')).toBeInTheDocument();
  });

  it('uses the plural above one period of study', () => {
    renderSection({
      performance: { ...performanceInsights(sampleCurriculum, sampleTranscript), failedHours: 300 },
      avgHoursPerTerm: 200,
    });
    expect(screen.getByText('Custo: 300 h e 8 créditos — o equivalente a 1,5 períodos no seu ritmo.')).toBeInTheDocument();
  });

  it('hides the cost when the failures carry no hours or credits', () => {
    renderSection({
      performance: { ...performanceInsights(sampleCurriculum, sampleTranscript), failedHours: 0, failedCredits: 0 },
    });
    expect(screen.queryByText(/Custo:/)).not.toBeInTheDocument();
  });

  it('lists the courses with more than one enrolment', () => {
    renderSection({
      attempts: [
        { code: 'ICC130', name: 'ESTRUTURAS DE DADOS', attempts: 2, approved: false, retakingNow: true },
        { code: 'ICC120', name: 'MATEMÁTICA DISCRETA', attempts: 3, approved: true, retakingNow: false },
      ],
    });
    expect(screen.getByText('Mais de uma tentativa')).toBeInTheDocument();
    expect(screen.getByText('Estruturas de Dados (ICC130): 2 matrículas, ainda sem aprovação, refazendo agora.')).toBeInTheDocument();
    expect(screen.getByText('Matemática Discreta (ICC120): 3 matrículas até a aprovação.')).toBeInTheDocument();
  });

  it('reads the current streak of terms without a failure', () => {
    renderSection({ streak: { terms: 3, judgedTerms: 5, lastFailureTerm: '2025.2', neverFailed: false } });
    expect(screen.getByText('Faz 3 períodos sem reprovar nenhuma disciplina.')).toBeInTheDocument();
  });

  it('shows the last failure when the most recent term is not clean', () => {
    renderSection({ streak: { terms: 0, judgedTerms: 4, lastFailureTerm: '2025.2', neverFailed: false } });
    expect(screen.getByText('Última reprovação: 2025/2.')).toBeInTheDocument();
  });

  it('celebrates a history without failures only when there is a history', () => {
    renderSection({ streak: { terms: 4, judgedTerms: 4, lastFailureTerm: null, neverFailed: true } });
    expect(screen.getByText('Você nunca reprovou em uma disciplina.')).toBeInTheDocument();
    cleanup();
    renderSection({ streak: { terms: 0, judgedTerms: 0, lastFailureTerm: null, neverFailed: true } });
    expect(screen.queryByText('Você nunca reprovou em uma disciplina.')).not.toBeInTheDocument();
  });

  it('compares the best category with the mandatory CR', () => {
    renderSection();
    expect(screen.getByText('Você rende mais em eletivas (8,650) do que nas obrigatórias (7,751).')).toBeInTheDocument();
  });

  it('adds the grade distribution when there are grades', () => {
    renderSection({ grades: gradeInsights(sampleTranscript) });
    expect(screen.getByText('Notas das disciplinas cursadas')).toBeInTheDocument();
  });
});
