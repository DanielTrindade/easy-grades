import { layoutFlowchart } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FlowchartList } from './FlowchartList';

const graph = layoutFlowchart(sampleCurriculum, sampleTranscript, { columnWidth: 264, rowHeight: 112 });

describe('FlowchartList', () => {
  it('shows one grouped list per period, each named by its heading', () => {
    render(<FlowchartList nodes={graph.nodes} curriculum={sampleCurriculum} />);
    const first = screen.getByRole('heading', { level: 2, name: /1º período/ });
    const section = first.closest('section')!;
    const list = within(section).getByRole('list');

    expect(list).toHaveClass('rounded-group', 'bg-surface');
    expect(within(list).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('list')).toHaveLength(
      new Set(graph.nodes.map((node) => node.idealPeriod)).size,
    );
  });

  it('keeps period ids and labels every course with its status icon and text', () => {
    render(<FlowchartList nodes={graph.nodes} curriculum={sampleCurriculum} />);

    for (const period of new Set(graph.nodes.map((node) => node.idealPeriod))) {
      expect(document.getElementById(`periodo-${period}`)).toHaveTextContent(`${period}º período`);
    }

    for (const row of screen.getAllByRole('listitem')) {
      expect(row.querySelector('svg')).not.toBeNull();
      expect(row.querySelector('li')).toBeNull();
    }
  });

  it('keeps grades and prerequisite text on their course rows while omitting missing grades', () => {
    render(<FlowchartList nodes={graph.nodes} curriculum={sampleCurriculum} />);
    const list = screen.getAllByRole('list')[0]!;
    const rows = within(list).getAllByRole('listitem');
    const graded = rows.find((row) => row.textContent?.includes('ICC001'))!;
    const noGrade = screen.getAllByRole('listitem').find((row) => row.textContent?.includes('ICC006'))!;
    const prerequisite = screen.getAllByRole('listitem').find((row) => row.textContent?.includes('ICC002'))!;

    expect(graded).toHaveTextContent('nota 8,7');
    expect(noGrade).not.toHaveTextContent(/nota/);
    expect(prerequisite).toHaveTextContent('Pré-requisitos: ICC001');
  });
});
