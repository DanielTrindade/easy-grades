import { timelineInsights } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TimelineBand } from './TimelineBand';

const timeline = timelineInsights(sampleCurriculum, sampleTranscript);

describe('TimelineBand', () => {
  it('marks admission, today, the forecast and the limit', () => {
    render(<TimelineBand timeline={timeline} />);
    expect(screen.getByRole('heading', { name: 'Linha do tempo do curso' })).toBeInTheDocument();
    expect(screen.getByText('2024/1')).toBeInTheDocument();
    expect(screen.getByText('2026/2')).toBeInTheDocument();
    expect(screen.getByText('2027/1')).toBeInTheDocument();
    expect(screen.getByText('2029/2')).toBeInTheDocument();
  });

  it('ties the terms together in one sentence with the pace and the slack', () => {
    render(<TimelineBand timeline={timeline} />);
    expect(
      screen.getByText(
        'Você está no 6º período de 8 ideais — 50,00% do prazo máximo de 12. As obrigatórias terminam em 2027/1. No seu ritmo médio, contando as horas fora das disciplinas, o curso fecha em 2028/1, com 3 períodos de folga até 2029/2.',
      ),
    ).toBeInTheDocument();
  });

  it('draws the done stretch up to the current term', () => {
    const { container } = render(<TimelineBand timeline={timeline} />);
    const done = container.querySelector<HTMLElement>('[data-segment="done"]');
    expect(done).not.toBeNull();
    expect(done!.style.width).toBe('45.45%');
  });

  it('warns in the error style when the pace goes past the maximum', () => {
    const { container } = render(<TimelineBand timeline={{ ...timeline, paceSlack: -1 }} />);
    const warning = screen.getByText(/além do prazo máximo/);
    expect(warning).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveClass('text-danger');
  });
});
