import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { analyze } from '@/lib/use-analysis';
import { OverviewScreen } from './OverviewScreen';

const data = { curriculum: sampleCurriculum, transcript: sampleTranscript };

function renderOverview() {
  return render(<OverviewScreen data={data} analysis={analyze(data)} reveal={false} onRevealed={vi.fn()} />);
}

describe('OverviewScreen', () => {
  it('puts the progress band in a highlighted card', () => {
    renderOverview();
    const progress = screen.getByRole('heading', { level: 2, name: '64,69%' });
    expect(progress.closest('[data-slot="card"]')).toHaveClass('rounded-card', 'bg-surface');
  });

  it.each(['ritmo', 'desempenho', 'pendente', 'atividades-complementares'])(
    'renders the %s section as a card that clears the fixed header when scrolled to',
    (id) => {
      const { container } = renderOverview();
      const heading = container.querySelector(`#${id}`);
      expect(heading).not.toBeNull();
      const section = heading!.closest('section');
      expect(section).toHaveClass('rounded-card', 'bg-surface', 'scroll-mt-20', 'md:scroll-mt-24');
      expect(heading).toHaveClass('text-title3');
    },
  );
});
