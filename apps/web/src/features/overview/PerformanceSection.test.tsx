import { performanceInsights, type Transcript, type TranscriptEntry } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PerformanceSection } from './PerformanceSection';

const entry = (over: Partial<TranscriptEntry>): TranscriptEntry => ({
  code: 'ICC120', name: 'MATEMÁTICA DISCRETA', category: 'obrigatoria', term: '2024.2', credits: 4, hours: 60,
  grade: 3.9, status: 'reprovado_nota', rawStatus: 'Repro Nota', ...over,
});
const withEntries = (entries: TranscriptEntry[]): Transcript => ({ ...sampleTranscript, entries, pending: [] });
const renderWith = (transcript: Transcript) =>
  render(<PerformanceSection performance={performanceInsights(sampleCurriculum, transcript)} />);

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
});
