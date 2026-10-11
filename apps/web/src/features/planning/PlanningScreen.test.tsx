import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { analyze } from '@/lib/use-analysis';
import { PlanningScreen } from './PlanningScreen';

const data = { curriculum: sampleCurriculum, transcript: sampleTranscript };

describe('PlanningScreen grade sliders', () => {
  it('gives every grade slider a non-empty accessible name', () => {
    render(<PlanningScreen data={data} analysis={analyze(data)} />);
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThan(0);
    for (const slider of sliders) {
      expect(slider).toHaveAccessibleName(/\S/);
    }
  });

  it('names the next-term slider with the discipline it belongs to', () => {
    render(<PlanningScreen data={data} analysis={analyze(data)} />);
    expect(screen.getByRole('slider', { name: /Trabalho de Conclusão de Curso/ })).toHaveAccessibleName(
      'Nota esperada em Trabalho de Conclusão de Curso',
    );
  });
});
