import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COURSE_NODE_HEIGHT, COURSE_NODE_WIDTH } from './CourseNode';
import FlowchartScreen from './FlowchartScreen';

// Records the `nodes` prop of every render, so a test can check whether the array identity changes.
const seen = vi.hoisted(() => ({ nodes: [] as unknown[] }));

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  function SpyReactFlow(props: ComponentProps<typeof actual.ReactFlow>) {
    seen.nodes.push(props.nodes);
    return <actual.ReactFlow {...props} />;
  }
  return { ...actual, ReactFlow: SpyReactFlow };
});

// Controllable PNG export: each test decides when html-to-image settles.
const png = vi.hoisted(() => ({ toPng: vi.fn(async (_node: HTMLElement) => 'data:image/png;base64,') }));
vi.mock('html-to-image', () => ({ toPng: png.toPng }));

const data = { curriculum: sampleCurriculum, transcript: sampleTranscript };

beforeEach(() => {
  seen.nodes.length = 0;
});

function nodeOf(code: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${code}"]`);
  if (!node) throw new Error(`node ${code} not rendered`);
  return node;
}

function isDimmed(code: string): boolean {
  return nodeOf(code).querySelector('[data-dimmed]') !== null;
}

// Nodes React Flow has not measured yet are rendered with visibility hidden; a visible flowchart has none of them.
function hiddenNodeIds(): string[] {
  return [...document.querySelectorAll<HTMLElement>('.react-flow__node')]
    .filter((n) => n.style.visibility === 'hidden')
    .map((n) => n.dataset.id ?? '');
}

// Text a sighted user can read: sr-only copies (screen-reader-only) are removed before reading.
function visibleTextOf(node: HTMLElement): string {
  const copy = node.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('.sr-only').forEach((el) => el.remove());
  return copy.textContent ?? '';
}

describe('FlowchartScreen focus', () => {
  it('no flowchart node is hidden before or after pinning a course', () => {
    render(<FlowchartScreen data={data} />);
    expect(hiddenNodeIds()).toEqual([]);

    fireEvent.click(nodeOf('ICC431'));
    expect(hiddenNodeIds()).toEqual([]);
  });

  // React Flow keeps a node's handle positions across a rebuild only when the node carries its measured size.
  // Without it, pinning or unpinning removes every edge until the nodes are measured again, and the PNG export can capture that gap.
  it('gives every node its measured size, so a pin change keeps the edges', () => {
    render(<FlowchartScreen data={data} />);
    fireEvent.click(nodeOf('ICC431'));
    const pinned = seen.nodes[seen.nodes.length - 1] as { id: string; measured?: { width: number; height: number } }[];
    expect(pinned.length).toBeGreaterThan(0);
    expect(pinned.filter((n) => n.measured?.width !== COURSE_NODE_WIDTH || n.measured?.height !== COURSE_NODE_HEIGHT).map((n) => n.id)).toEqual([]);
  });

  it('hovering dims the same courses without rebuilding the nodes array', async () => {
    render(<FlowchartScreen data={data} />);
    const before = seen.nodes[seen.nodes.length - 1];

    fireEvent.mouseEnter(nodeOf('ICC431'));
    expect(isDimmed('IEM075')).toBe(true);
    expect(seen.nodes[seen.nodes.length - 1]).toBe(before);

    // The clear waits ~80 ms, so crossing from one node to the next does not blink the highlight.
    fireEvent.mouseLeave(nodeOf('ICC431'));
    expect(isDimmed('IEM075')).toBe(true);
    await waitFor(() => expect(isDimmed('IEM075')).toBe(false));
    expect(seen.nodes[seen.nodes.length - 1]).toBe(before);
  });

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

  it('disables the export button while the PNG is being generated', async () => {
    let finish!: (url: string) => void;
    png.toPng.mockReturnValueOnce(new Promise<string>((resolve) => (finish = resolve)));
    render(<FlowchartScreen data={data} />);
    const exportButton = screen.getByRole('button', { name: 'Exportar PNG' });

    fireEvent.click(exportButton);
    await waitFor(() => expect(exportButton).toBeDisabled());

    finish('data:image/png;base64,');
    await waitFor(() => expect(exportButton).toBeEnabled());
  });

  it('exports in export mode with no course dimmed, even when a course is pinned', async () => {
    let captured: { exporting: boolean; dimmed: number } | undefined;
    png.toPng.mockImplementationOnce(async (node) => {
      captured = {
        exporting: node.closest('.is-exporting') !== null,
        dimmed: document.querySelectorAll('[data-dimmed]').length,
      };
      return 'data:image/png;base64,';
    });
    render(<FlowchartScreen data={data} />);

    fireEvent.click(nodeOf('ICC431'));
    expect(isDimmed('IEM075')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar PNG' }));
    await waitFor(() => expect(captured).toBeDefined());
    expect(captured).toEqual({ exporting: true, dimmed: 0 });
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
