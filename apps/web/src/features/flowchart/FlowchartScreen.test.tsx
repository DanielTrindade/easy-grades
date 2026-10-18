import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COURSE_NODE_HEIGHT, COURSE_NODE_WIDTH } from './CourseNode';
import FlowchartScreen from './FlowchartScreen';

// Records the `nodes` prop of every render, so a test can check whether the array identity changes.
const seen = vi.hoisted(() => ({ nodes: [] as unknown[] }));
const readiness = vi.hoisted(() => ({ ready: true }));

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  function SpyReactFlow(props: ComponentProps<typeof actual.ReactFlow>) {
    seen.nodes.push(props.nodes);
    return <actual.ReactFlow {...props} />;
  }
  return { ...actual, ReactFlow: SpyReactFlow };
});

// Controllable PNG export: each test decides when html-to-image settles.
const png = vi.hoisted(() => ({ toBlob: vi.fn(async (_node: HTMLElement) => new Blob(['png'], { type: 'image/png' })) }));
vi.mock('html-to-image', () => ({ toBlob: png.toBlob }));

vi.mock('./export-readiness', () => ({ isExportGraphReady: () => readiness.ready }));

const data = { curriculum: sampleCurriculum, transcript: sampleTranscript };

/** A touch screen: the export opens the share sheet instead of downloading the file. */
function mockTouchScreen(matches = true) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

function stubShareSheet(canShare = true) {
  const share = vi.fn(async (_data: ShareData) => {});
  Object.defineProperty(navigator, 'canShare', { value: () => canShare, configurable: true });
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  return share;
}

beforeEach(() => {
  seen.nodes.length = 0;
  readiness.ready = true;
  // The view choice is remembered across visits, so each test starts from the width default.
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'canShare');
  Reflect.deleteProperty(navigator, 'share');
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
    const user = userEvent.setup({ delay: null });
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

  // The flowchart is about progression, not grades: the card carries credits only; grades live in Disciplinas.
  it('shows the credits without the grade on the card', () => {
    render(<FlowchartScreen data={data} />);

    const text = visibleTextOf(nodeOf('ICC431'));
    expect(text).toMatch(/créditos?/);
    expect(text).not.toMatch(/nota/i);
  });

  it('disables the export button and shows progress while the PNG is being generated', async () => {
    let finish!: (blob: Blob) => void;
    png.toBlob.mockReturnValueOnce(new Promise<Blob>((resolve) => (finish = resolve)));
    render(<FlowchartScreen data={data} />);
    const exportButton = screen.getByRole('button', { name: 'Exportar PNG' });

    fireEvent.click(exportButton);
    const busy = await screen.findByRole('button', { name: 'Exportando…' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');

    finish(new Blob(['png'], { type: 'image/png' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar PNG' })).toBeEnabled());
  });

  it('exports in export mode with no course dimmed, even when a course is pinned', async () => {
    let captured: { exporting: boolean; dimmed: number } | undefined;
    png.toBlob.mockImplementationOnce(async (node) => {
      captured = {
        exporting: node.closest('.is-exporting') !== null,
        dimmed: document.querySelectorAll('[data-dimmed]').length,
      };
      return new Blob(['png'], { type: 'image/png' });
    });
    render(<FlowchartScreen data={data} />);

    fireEvent.click(nodeOf('ICC431'));
    expect(isDimmed('IEM075')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar PNG' }));
    await waitFor(() => expect(captured).toBeDefined());
    expect(captured).toEqual({ exporting: true, dimmed: 0 });
  });

  // The image is always the graph, whatever view the student is reading: the button never depends on the view.
  it('exports the flowchart image from the list view and comes back to the list', async () => {
    const user = userEvent.setup({ delay: null });
    let captured: { exporting: boolean } | undefined;
    png.toBlob.mockImplementationOnce(async (node) => {
      captured = { exporting: node.closest('.is-exporting') !== null };
      return new Blob(['png'], { type: 'image/png' });
    });
    const { container } = render(<FlowchartScreen data={data} />);

    const toggle = screen.getByRole('switch', { name: 'Ver como lista' });
    toggle.focus();
    await user.keyboard(' ');
    expect(container.querySelector('.react-flow')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Exportar PNG' }));
    await waitFor(() => expect(captured).toBeDefined());
    expect(captured).toEqual({ exporting: true });
    await waitFor(() => expect(container.querySelector('.react-flow')).toBeNull());
    expect(screen.getAllByRole('heading', { name: /º período$/ }).length).toBeGreaterThan(0);
  });

  it('waits for graph readiness before capturing an export started from the list', async () => {
    readiness.ready = false;
    const user = userEvent.setup({ delay: null });
    render(<FlowchartScreen data={data} />);

    const toggle = screen.getByRole('switch', { name: 'Ver como lista' });
    toggle.focus();
    await user.keyboard(' ');
    fireEvent.click(screen.getByRole('button', { name: 'Exportar PNG' }));

    await waitFor(() => expect(document.querySelector('.is-exporting')).not.toBeNull());
    expect(png.toBlob).not.toHaveBeenCalled();

    readiness.ready = true;
    await waitFor(() => expect(png.toBlob).toHaveBeenCalledTimes(1));
  });

  it('restores the list and skips the image when graph readiness times out', async () => {
    readiness.ready = false;
    const user = userEvent.setup({ delay: null });
    const { container } = render(<FlowchartScreen data={data} />);

    const toggle = screen.getByRole('switch', { name: 'Ver como lista' });
    toggle.focus();
    await user.keyboard(' ');
    fireEvent.click(screen.getByRole('button', { name: 'Exportar PNG' }));

    await waitFor(() => expect(container.querySelector('.is-exporting')).not.toBeNull());
    await waitFor(() => expect(container.querySelector('.is-exporting')).toBeNull(), { timeout: 4000 });

    expect(png.toBlob).not.toHaveBeenCalled();
    expect(container.querySelector('.react-flow')).toBeNull();
    expect(screen.getByRole('button', { name: 'Exportar PNG' })).toBeEnabled();
  });

  it('downloads the PNG on a mouse screen, without the share sheet', async () => {
    const share = stubShareSheet();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<FlowchartScreen data={data} />);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar PNG' }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    const link = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(link.download).toBe('fluxograma.png');
    expect(share).not.toHaveBeenCalled();
    expect(screen.queryByAltText('Fluxograma do curso')).toBeNull();
  });

  // On a phone there is no downloads folder to land in: the sheet previews the image and hands it to the share sheet.
  it('opens the export sheet on a touch screen and shares the PNG from it', async () => {
    mockTouchScreen();
    const share = stubShareSheet();
    render(<FlowchartScreen data={data} />);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar PNG' }));

    expect(await screen.findByAltText('Fluxograma do curso')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar ou compartilhar' }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const shared = share.mock.calls[0]?.[0];
    expect(shared?.files?.[0]?.name).toBe('fluxograma.png');
    expect(shared?.files?.[0]?.type).toBe('image/png');
    await waitFor(() => expect(screen.queryByAltText('Fluxograma do curso')).toBeNull());
  });

  it('offers the download inside the sheet when the browser cannot share files', async () => {
    mockTouchScreen();
    stubShareSheet(false);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<FlowchartScreen data={data} />);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar PNG' }));
    expect(await screen.findByText(/toque e segure a imagem/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Baixar imagem' }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect((click.mock.instances[0] as unknown as HTMLAnchorElement).download).toBe('fluxograma.png');
  });

  it('switches between the graph and the list with the keyboard', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = render(<FlowchartScreen data={data} />);
    const exportButton = screen.getByRole('button', { name: 'Exportar PNG' });
    const toggle = screen.getByRole('switch', { name: 'Ver como lista' });

    toggle.focus();
    await user.keyboard(' ');
    expect(toggle).toBeChecked();
    expect(container.querySelector('.react-flow')).toBeNull();
    expect(screen.getAllByRole('heading', { name: /º período$/ }).length).toBeGreaterThan(0);
    // The export stays available: it captures the graph even while the list is on screen.
    expect(exportButton).toBeEnabled();

    await user.keyboard(' ');
    expect(container.querySelector('.react-flow')).not.toBeNull();
    expect(exportButton).toBeEnabled();
  });

  it('floats glass zoom controls and the legend over the canvas instead of React Flow controls', async () => {
    render(<FlowchartScreen data={data} />);
    expect(await screen.findByRole('group', { name: 'Zoom' })).toHaveClass('glass');
    expect(screen.getByRole('button', { name: 'Legenda' })).toBeInTheDocument();
    expect(document.querySelector('.react-flow__controls')).toBeNull();
  });

  it('keeps the export button as a capsule in the toolbar', async () => {
    render(<FlowchartScreen data={data} />);
    expect(await screen.findByRole('button', { name: 'Exportar PNG' })).toHaveClass('rounded-full');
  });
});
