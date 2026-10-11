import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import FlowchartScreen from './FlowchartScreen';

const data = { curriculum: sampleCurriculum, transcript: sampleTranscript };

function nodeOf(code: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${code}"]`);
  if (!node) throw new Error(`node ${code} not rendered`);
  return node;
}

function isDimmed(code: string): boolean {
  return nodeOf(code).querySelector('[data-dimmed]') !== null;
}

// Text a sighted user can read: sr-only copies (screen-reader-only) are removed before reading.
function visibleTextOf(node: HTMLElement): string {
  const copy = node.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('.sr-only').forEach((el) => el.remove());
  return copy.textContent ?? '';
}

describe('FlowchartScreen focus', () => {
  // fireEvent.click, not user.click: user-event's mousedown reaches d3-zoom, which reads event.view (null in jsdom).
  it('pins a course on click, dims what is outside its chain and unpins on a second click', () => {
    render(<FlowchartScreen data={data} />);

    fireEvent.click(nodeOf('ICC431'));
    expect(isDimmed('IEM075')).toBe(true);
    expect(isDimmed('ICC430')).toBe(false);

    fireEvent.click(nodeOf('ICC431'));
    expect(isDimmed('IEM075')).toBe(false);
  });

  it('pins a course with the keyboard (Enter) and releases it with Escape', async () => {
    const user = userEvent.setup();
    render(<FlowchartScreen data={data} />);

    nodeOf('ICC431').focus();
    await user.keyboard('{Enter}');
    expect(isDimmed('IEM075')).toBe(true);

    await user.keyboard('{Escape}');
    expect(isDimmed('IEM075')).toBe(false);
  });

  it('makes every course node reachable with Tab and names its status for screen readers', () => {
    render(<FlowchartScreen data={data} />);

    const node = nodeOf('ICC431');
    expect(node.tabIndex).toBe(0);
    expect(node.getAttribute('aria-label')).toMatch(/^ICC431 .+, (Concluída|Em curso|Reprovada|Disponível|Bloqueada)$/);
  });

  it('shows the status as visible text next to the icon, not only as color', () => {
    render(<FlowchartScreen data={data} />);

    expect(visibleTextOf(nodeOf('ICC431'))).toMatch(/(Concluída|Em curso|Reprovada|Disponível|Bloqueada)/);
  });

  it('switches between the graph and the list with the keyboard', async () => {
    const user = userEvent.setup();
    const { container } = render(<FlowchartScreen data={data} />);
    const exportButton = screen.getByRole('button', { name: 'Exportar PNG' });
    const toggle = screen.getByRole('switch', { name: 'Ver como lista' });

    toggle.focus();
    await user.keyboard(' ');
    expect(toggle).toBeChecked();
    expect(container.querySelector('.react-flow')).toBeNull();
    expect(screen.getAllByRole('heading', { name: /º período$/ }).length).toBeGreaterThan(0);
    expect(exportButton).toBeDisabled();

    await user.keyboard(' ');
    expect(container.querySelector('.react-flow')).not.toBeNull();
    expect(exportButton).toBeEnabled();
  });
});
