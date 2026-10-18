import { crProjectionInsights, forecastGraduation, performanceInsights } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PerformanceSection } from './PerformanceSection';
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

  it('shows each metric as a card that leads to its detail section', () => {
    renderSummary();
    const summary = screen.getByRole('region', { name: 'Resumo' });
    expect(summary.querySelectorAll('[data-slot="card"]')).toHaveLength(3);
    expect(screen.getByRole('link', { name: /Coeficiente de rendimento/ })).toHaveAttribute('href', '#desempenho');
    expect(screen.getByRole('link', { name: /Previsão de formatura/ })).toHaveAttribute('href', '#ritmo');
    expect(screen.getByRole('link', { name: /Fora das disciplinas/ })).toHaveAttribute('href', '#atividades-complementares');
  });

  it('moves focus to the real performance heading when the CR card is clicked', async () => {
    const user = userEvent.setup();
    render(
      <>
        <OverviewSummary
          cr={7.757}
          officialCr={7.757}
          performance={performance}
          forecast={forecast}
          projection={projection}
          outsideHours={forecast.pendingHours.aacc + forecast.pendingHours.extensao}
        />
        <PerformanceSection
          performance={performance}
          attempts={[]}
          streak={{ terms: 0, judgedTerms: 0, lastFailureTerm: null, neverFailed: true }}
          grades={null}
          avgHoursPerTerm={414}
        />
      </>,
    );
    const section = screen.getByRole('region', { name: 'Desempenho' });
    section.scrollIntoView = () => {};

    await user.click(screen.getByRole('link', { name: /Coeficiente de rendimento/ }));

    expect(screen.getByRole('heading', { level: 2, name: 'Desempenho' })).toHaveFocus();
  });
});
