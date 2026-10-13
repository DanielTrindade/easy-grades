import { paceInsights } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PaceSection } from './PaceSection';

function renderWith(curriculum: typeof sampleCurriculum) {
  const { minPeriods, maxPeriods } = curriculum.requirements;
  return render(
    <PaceSection pace={paceInsights(curriculum, sampleTranscript)} minPeriods={minPeriods} maxPeriods={maxPeriods} />,
  );
}

describe('PaceSection', () => {
  it('shows the sample as on pace, with the terms and hours per term', () => {
    renderWith(sampleCurriculum);
    expect(screen.getByText('No ritmo para o prazo ideal')).toBeInTheDocument();
    expect(screen.getByText('5º período cursado de 8 ideais (máximo 12)')).toBeInTheDocument();
    expect(screen.getByText('Média de 414 h por período')).toBeInTheDocument();
    expect(screen.getByText('Para formar no prazo ideal: 377 h por período')).toBeInTheDocument();
    expect(screen.getByText('No prazo máximo: 162 h por período')).toBeInTheDocument();
  });

  it('warns when the maximum period is at risk', () => {
    renderWith({ ...sampleCurriculum, requirements: { ...sampleCurriculum.requirements, maxPeriods: 6 } });
    expect(screen.getByText('Risco de ultrapassar o prazo máximo')).toBeInTheDocument();
    expect(screen.getByText('No prazo máximo: 1.130 h por período')).toBeInTheDocument();
  });

  it('marks the behind-pace status with the correction red, so it reads as a risk and not as neutral', () => {
    renderWith({ ...sampleCurriculum, requirements: { ...sampleCurriculum.requirements, minPeriods: 5 } });
    const status = screen.getByText('Abaixo do ritmo do prazo ideal');
    expect(status.querySelector('svg')).toHaveClass('text-erro');
  });

  it('says the ideal deadline is over when no ideal period is left', () => {
    renderWith({ ...sampleCurriculum, requirements: { ...sampleCurriculum.requirements, minPeriods: 5 } });
    expect(screen.getByText('Para formar no prazo ideal: prazo encerrado')).toBeInTheDocument();
    expect(screen.getByText('Abaixo do ritmo do prazo ideal')).toBeInTheDocument();
  });

  it('is neutral for a first-period student, with no average to show yet', () => {
    const { container } = render(
      <PaceSection
        pace={paceInsights(sampleCurriculum, { ...sampleTranscript, entries: [] })}
        minPeriods={8}
        maxPeriods={12}
      />,
    );
    expect(screen.getByText('Ainda sem período concluído para medir o ritmo')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveClass('text-muted-foreground');
    expect(screen.getByText('Nenhum período concluído ainda (ideal 8, máximo 12)')).toBeInTheDocument();
    expect(screen.queryByText(/Média de/)).not.toBeInTheDocument();
    expect(screen.getByText('Para formar no prazo ideal: 400 h por período')).toBeInTheDocument();
    expect(screen.getByText('No prazo máximo: 267 h por período')).toBeInTheDocument();
  });
});
