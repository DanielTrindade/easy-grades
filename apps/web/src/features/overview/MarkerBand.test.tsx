import { computeProgress } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkerBand } from './MarkerBand';

const progress = computeProgress(sampleCurriculum, sampleTranscript);

function renderBand(pendingPercent?: number) {
  return render(<MarkerBand progress={progress} pendingPercent={pendingPercent} reveal={false} onRevealed={() => {}} />);
}

describe('MarkerBand', () => {
  it('keeps the official percentage as the headline and says nothing about pending activities without them', () => {
    renderBand();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('64,69%');
    expect(screen.getByRole('img', { name: '64,69% do curso concluído' })).toBeInTheDocument();
    expect(screen.queryByText(/Com as atividades que você registrou/)).not.toBeInTheDocument();
  });

  it('shows the total with the registered activities when there are pending points', () => {
    renderBand(10);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('64,69%');
    expect(screen.getByText('Com as atividades que você registrou: 74,69%.')).toBeInTheDocument();
  });

  it('names both parts in the accessible label of the band', () => {
    renderBand(10);
    expect(
      screen.getByRole('img', { name: '64,69% concluído oficialmente, mais 10,00% em atividades registradas por você' }),
    ).toBeInTheDocument();
  });

  it('fills the official part with a solid highlighter span, so the grid and border stay on the band', () => {
    const { container } = renderBand();
    const band = container.querySelector<HTMLElement>('.marker-band');
    const done = container.querySelector<HTMLElement>('[data-segment="done"]');
    expect(done).not.toBeNull();
    expect(done!.style.width).toBe('64.69%');
    expect(band).not.toBeNull();
    expect(band!.contains(done)).toBe(true);
    expect(band!.style.getPropertyValue('--band-cut')).toBe('');
  });

  it('animates only the fills wrapper, so the band border and grid never hide during the reveal', () => {
    const { container } = render(<MarkerBand progress={progress} reveal onRevealed={() => {}} />);
    const band = container.querySelector<HTMLElement>('.marker-band');
    const fills = container.querySelector<HTMLElement>('.marker-band .marker-fills');
    expect(band).toHaveAttribute('data-reveal');
    expect(fills).not.toBeNull();
    expect(fills!.querySelector('[data-segment="done"]')).not.toBeNull();
  });

  it('ignores a zero pending percentage', () => {
    renderBand(0);
    expect(screen.queryByText(/Com as atividades que você registrou/)).not.toBeInTheDocument();
  });

  it('draws the pending segment after the official part, without going past 100%', () => {
    const { container } = renderBand(60);
    const segment = container.querySelector<HTMLElement>('[data-segment="pending"]');
    expect(segment).not.toBeNull();
    expect(segment!.style.left).toBe('64.69%');
    expect(segment!.style.width).toBe('35.31%');
    expect(screen.getByText('Com as atividades que você registrou: 100,00%.')).toBeInTheDocument();
  });
});
