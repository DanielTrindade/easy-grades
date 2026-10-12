import { sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IntegrationTable } from './IntegrationTable';

const components = sampleTranscript.officialComponents!;

describe('IntegrationTable', () => {
  it('renders the six official rows, without the header row', () => {
    render(<IntegrationTable components={components} />);
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(6);
    expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual([
      'Obrigatórias',
      'Optativas',
      'Eletivas',
      'Atividades complementares',
      'Extensão',
      'Total',
    ]);
  });

  it('shows hours and credits done of required, with their percentages', () => {
    render(<IntegrationTable components={components} />);
    const total = within(screen.getByRole('table')).getAllByRole('row').at(-1)!;
    expect(total).toHaveClass('font-medium');
    // The row label must carry the same weight, not reset it to normal.
    expect(within(total).getByRole('rowheader', { name: 'Total' })).toHaveClass('font-medium');
    expect(within(total).getByRole('rowheader', { name: 'Total' })).not.toHaveClass('font-normal');
    expect(within(total).getByText('2.070 h de 3.200 h')).toBeInTheDocument();
    expect(within(total).getByText('64,69%')).toBeInTheDocument();
    expect(within(total).getByText('122 de 150')).toBeInTheDocument();
    expect(within(total).getByText('81,33%')).toBeInTheDocument();
  });

  it('puts the table in a focusable scroll region named after the section heading', () => {
    render(<IntegrationTable components={components} />);
    const region = screen.getByRole('region', { name: 'Integralização oficial' });
    expect(region).toHaveClass('overflow-x-auto');
    expect(region).toHaveAttribute('tabindex', '0');
    expect(within(region).getByRole('table')).toBeInTheDocument();
  });

  it('names the table after the section heading', () => {
    render(<IntegrationTable components={components} />);
    expect(screen.getByRole('table', { name: 'Integralização oficial' })).toBeInTheDocument();
  });

  it('shows a dash instead of 0 de 0 when a component requires no credits', () => {
    const noCredits = {
      ...components,
      extensao: { hours: { required: 0, done: 0, percent: 100 }, credits: { required: 0, done: 0, percent: 100 } },
    };
    render(<IntegrationTable components={noCredits} />);
    const extension = screen.getByRole('rowheader', { name: 'Extensão' }).closest('tr')!;
    expect(within(extension).queryByText('0 de 0')).not.toBeInTheDocument();
    expect(within(extension).getAllByText('—')).toHaveLength(2);
  });

  it('explains the gap when credit and hour percentages differ by 5 points or more', () => {
    render(<IntegrationTable components={components} />);
    expect(
      screen.getByText(
        'Por créditos você já cumpriu 81,33%; por horas, 64,69%. A diferença vem de disciplinas com muitas horas por crédito, como TCC e projetos.',
      ),
    ).toBeInTheDocument();
  });

  it('does not show the gap note when the difference is under 5 points', () => {
    const close = {
      ...components,
      total: { hours: { required: 3200, done: 2070, percent: 64.69 }, credits: { required: 150, done: 98, percent: 65.5 } },
    };
    render(<IntegrationTable components={close} />);
    expect(screen.queryByText(/Por créditos você já cumpriu/)).not.toBeInTheDocument();
  });

  it('does not show the gap note when hours are ahead of credits', () => {
    const hoursAhead = {
      ...components,
      total: { hours: { required: 3200, done: 2400, percent: 75 }, credits: { required: 150, done: 98, percent: 65.33 } },
    };
    render(<IntegrationTable components={hoursAhead} />);
    expect(screen.queryByText(/Por créditos você já cumpriu/)).not.toBeInTheDocument();
  });

  it('renders nothing when the transcript has no official table', () => {
    const { container } = render(<IntegrationTable components={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
