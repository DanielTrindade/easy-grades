import { sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EnadeSection } from './EnadeSection';

describe('EnadeSection', () => {
  it('shows the freshman record and the graduating exam still pending', () => {
    render(<EnadeSection records={sampleTranscript.enade} />);
    expect(screen.getByText('Ingressante (2024): Dispensado em razão calendário trienal')).toBeInTheDocument();
    expect(screen.getByText('Concluinte: ainda sem registro no histórico')).toBeInTheDocument();
  });

  it('shows only the pending graduating line when there is no ENADE record', () => {
    render(<EnadeSection records={[]} />);
    expect(screen.getByText('Concluinte: ainda sem registro no histórico')).toBeInTheDocument();
    expect(screen.queryByText(/Ingressante/)).not.toBeInTheDocument();
  });
});
