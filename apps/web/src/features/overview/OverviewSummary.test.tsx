import { crProjectionInsights, forecastGraduation, performanceInsights } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OverviewSummary } from './OverviewSummary';

const forecast = forecastGraduation(sampleCurriculum, sampleTranscript);
const performance = performanceInsights(sampleCurriculum, sampleTranscript);
const projection = crProjectionInsights(sampleCurriculum, sampleTranscript);

function renderSummary(over: Partial<Parameters<typeof OverviewSummary>[0]> = {}) {
  return render(
    <OverviewSummary
      cr={7.757}
      officialCr={7.757}
      performance={performance}
      forecast={forecast}
      projection={projection}
      outsideHours={forecast.pendingHours.aacc + forecast.pendingHours.extensao}
      {...over}
    />,
  );
}

describe('OverviewSummary', () => {
  it('shows the CR, the graduation forecast and the hours outside the courses', () => {
    renderSummary();
    expect(screen.getByText('7,757')).toBeInTheDocument();
    expect(screen.getByText('2027/1')).toBeInTheDocument();
    expect(screen.getByText('1 semestre de obrigatórias pela frente.')).toBeInTheDocument();
    expect(screen.getByText('530 h')).toBeInTheDocument();
  });

  it('projects the CR range over the mandatory courses left', () => {
    renderSummary();
    expect(screen.getByText('Na formatura: entre 7,229 e 8,186.')).toBeInTheDocument();
  });

  it('explains a CR that diverges from the printed one', () => {
    renderSummary({ officialCr: 7 });
    expect(screen.getByText('Pelas notas do histórico: 7,757.')).toBeInTheDocument();
  });

  it('has no projection without remaining courses', () => {
    renderSummary({ projection: { remainingCourses: 0, remainingHours: 0, best: null, worst: null } });
    expect(screen.queryByText(/Na formatura/)).not.toBeInTheDocument();
  });

  it('falls back to no forecast and warns when the maximum is exceeded', () => {
    renderSummary({ forecast: { ...forecast, graduationTerm: null } });
    expect(screen.getByText('sem previsão')).toBeInTheDocument();
    renderSummary({ forecast: { ...forecast, exceedsMax: true, maxTerm: '2029.2' } });
    expect(screen.getByText(/Passa do prazo máximo \(2029\/2\)\./)).toBeInTheDocument();
  });
});
