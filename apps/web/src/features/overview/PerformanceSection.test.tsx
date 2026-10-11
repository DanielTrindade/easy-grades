import { performanceInsights } from '@easy-grades/core';
import { sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PerformanceSection } from './PerformanceSection';

describe('PerformanceSection', () => {
  it('shows the pass rate with the reference study', () => {
    render(<PerformanceSection performance={performanceInsights(sampleTranscript)} />);
    expect(screen.getByText('94,74%')).toBeInTheDocument();
    expect(
      screen.getByText('Em um estudo com 1.124 formados em engenharia, metade reprovou em no máximo 13% das disciplinas.'),
    ).toBeInTheDocument();
  });

  it('lists the failures that were not passed afterwards', () => {
    render(<PerformanceSection performance={performanceInsights(sampleTranscript)} />);
    expect(screen.getByText('2 reprovações')).toBeInTheDocument();
    expect(screen.getByText('Ainda por cursar: OPT202, OPT203')).toBeInTheDocument();
  });

  it('shows the CR trend, best and worst term and credited courses', () => {
    render(<PerformanceSection performance={performanceInsights(sampleTranscript)} />);
    expect(screen.getByText('CR acumulado subiu desde o período anterior (de 7,700 para 7,757).')).toBeInTheDocument();
    expect(screen.getByText('Melhor período: 2026/1, com CR 8,130')).toBeInTheDocument();
    expect(screen.getByText('Pior período: 2025/2, com CR 7,133')).toBeInTheDocument();
    expect(
      screen.getByText('20 disciplinas aproveitadas (1.290 h) por equivalência, dispensa ou transferência'),
    ).toBeInTheDocument();
  });

  it('says there is no pass rate before any course counts', () => {
    render(<PerformanceSection performance={performanceInsights({ ...sampleTranscript, entries: [] })} />);
    expect(screen.getByText('sem disciplinas cursadas ainda')).toBeInTheDocument();
  });
});
