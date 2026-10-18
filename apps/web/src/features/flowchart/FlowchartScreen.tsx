import { COURSE_STATE_LABELS, layoutFlowchart, type ParseResponse } from '@easy-grades/core';
import { Background, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow, type Edge } from '@xyflow/react';
import { toBlob } from 'html-to-image';
import { Download, LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/lib/use-media-query';
import { COURSE_NODE_HEIGHT, COURSE_NODE_WIDTH, CourseNode, type CourseNodeType } from './CourseNode';
import { downloadImage } from './export-image';
import { exportFrame, exportPixelRatio } from './export-frame';
import { isExportGraphReady } from './export-readiness';
import { ExportSheet, type ExportImage } from './ExportSheet';
import { FlowchartList } from './FlowchartList';
import { FlowLegendPanel, FlowZoomControls } from './FlowControls';
import { type FlowView, pickFlowView, readStoredFlowView, writeFlowView } from './flow-view';
import { HighlightContext } from './HighlightContext';
import { highlightSet, nextPinned, visibleGraph } from './highlight';
import { useHoverFocus } from './hoverFocus';

const nodeTypes = { course: CourseNode };

/**
 * One paint, or a short wait when the browser is throttled (backgrounded tab, locked screen, occluded window).
 * A bare requestAnimationFrame can stay pending forever there, which would freeze the export mid-flight.
 */
function nextPaint(timeout = 150): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeout);
    requestAnimationFrame(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/** Longest the export waits for running animations to settle; in export mode there should be none. */
const ANIMATIONS_SETTLE_MS = 500;

/**
 * Runs the capture on timer-backed frames. html-to-image waits for a requestAnimationFrame right after decoding
 * its image, and a throttled page (backgrounded tab, locked screen, occluded window) can go minutes without
 * painting one — the export would hang with the button stuck on "Exportando…". The real frame comes back after.
 */
async function withTimerFrames<T>(capture: () => Promise<T>): Promise<T> {
  const real = window.requestAnimationFrame;
  window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(performance.now()), 16);
  try {
    return await capture();
  } finally {
    window.requestAnimationFrame = real;
  }
}

function Graph({ data }: { data: ParseResponse }) {
  const { curriculum, transcript } = data;
  const hover = useHoverFocus();
  const [pinned, setPinned] = useState<string | null>(null);
  const [onlyRemaining, setOnlyRemaining] = useState(false);
  // The graph is the default view; the student's last choice (kept in localStorage) wins over it.
  const [flowView, setFlowView] = useState<FlowView>(() => pickFlowView(readStoredFlowView()));
  const asList = flowView === 'lista';
  const [exporting, setExporting] = useState(false);
  const [exportImage, setExportImage] = useState<ExportImage | null>(null);
  // A touch screen gets the image in a sheet: on iOS a download has no place to go, especially as an installed PWA.
  const touchScreen = useMediaQuery('(pointer: coarse)');
  const { fitView, setViewport } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  // The sheet owns the image: release the previous object URL when a new export replaces it, and on unmount.
  useEffect(() => {
    const url = exportImage?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [exportImage]);

  const layout = useMemo(() => layoutFlowchart(curriculum, transcript, { columnWidth: 264, rowHeight: 112 }), [curriculum, transcript]);
  const graph = useMemo(() => visibleGraph(layout.nodes, layout.edges, onlyRemaining), [layout, onlyRemaining]);
  // A pinned course hidden by "Mostrar só o que falta" no longer drives the focus.
  const activePinned = pinned !== null && graph.nodes.some((n) => n.code === pinned) ? pinned : null;
  const focus = hover.hovered ?? activePinned;
  const highlighted = useMemo(() => highlightSet(curriculum, focus), [curriculum, focus]);

  // Depends only on the graph and the pin: hovering must not rebuild nodes, or React Flow re-measures and hides them.
  // The dimming reaches each CourseNode through HighlightContext instead.
  // The explicit width and height let React Flow show a node at once, without waiting for its first measurement.
  // `measured` keeps React Flow's handle positions when the pin rebuilds this array: without it every edge leaves the DOM for a couple of frames.
  const nodes = useMemo<CourseNodeType[]>(
    () =>
      graph.nodes.map((course) => ({
        id: course.code,
        type: 'course',
        position: { x: course.x, y: course.y },
        width: COURSE_NODE_WIDTH,
        height: COURSE_NODE_HEIGHT,
        measured: { width: COURSE_NODE_WIDTH, height: COURSE_NODE_HEIGHT },
        data: { course },
        selected: course.code === activePinned,
        draggable: false,
        connectable: false,
        ariaLabel: `${course.code} ${course.name}, ${COURSE_STATE_LABELS[course.state]}`,
      })),
    [graph.nodes, activePinned],
  );

  const edges = useMemo<Edge[]>(
    () =>
      graph.edges.map((edge) => {
        const inChain = highlighted !== null && highlighted.has(edge.source) && highlighted.has(edge.target);
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          focusable: false,
          style: {
            stroke: edge.satisfied ? 'var(--ink)' : 'var(--ink-muted)',
            strokeWidth: inChain ? 2.5 : 1.5,
            strokeDasharray: edge.alternative ? '5 4' : undefined,
            opacity: highlighted === null || inChain ? 1 : 0.15,
            transition: 'opacity 150ms var(--ease-snap), stroke-width 150ms var(--ease-snap)',
          },
        };
      }),
    [graph.edges, highlighted],
  );

  // Fit the whole course only when cards stay readable; otherwise start at the 1st period and let the student pan.
  const onInit = useCallback(() => {
    const width = containerRef.current?.clientWidth ?? 0;
    if ((width - 48) / layout.width >= 0.75) void fitView({ padding: 0.06 });
    else void setViewport({ x: 24, y: 24, zoom: 0.8 });
  }, [fitView, setViewport, layout.width]);

  // The graph mounts a frame after the list is left, so the capture waits for its viewport instead of assuming it.
  // The deadline, not a frame count, bounds the wait: a throttled tab may never paint a frame.
  const waitForViewport = useCallback(async (): Promise<HTMLElement | null> => {
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
      const viewport = containerRef.current?.querySelector<HTMLElement>('.react-flow__viewport');
      if (viewport) return viewport;
      await nextPaint();
    }
    return null;
  }, []);

  const waitForGraphReadiness = useCallback(async (viewport: HTMLElement): Promise<boolean> => {
    const expectedNodeIds = graph.nodes.map((node) => node.code);
    const expectedEdgeIds = graph.edges.map((edge) => edge.id);
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
      const visibleNodeIds = new Set(
        [...viewport.querySelectorAll<HTMLElement>('.react-flow__node')]
          .filter((node) => node.style.visibility !== 'hidden')
          .map((node) => node.dataset.id ?? ''),
      );
      const edgePathIds = new Set(
        [...viewport.querySelectorAll<HTMLElement>('.react-flow__edge')]
          .filter((edge) => edge.querySelector('.react-flow__edge-path'))
          .map((edge) => edge.dataset.id ?? ''),
      );
      if (isExportGraphReady(expectedNodeIds, visibleNodeIds, expectedEdgeIds, edgePathIds)) return true;
      await nextPaint();
    }
    return false;
  }, [graph.edges, graph.nodes]);

  async function exportPng() {
    // The image is always the graph: when the list is on screen, the graph mounts for the capture and leaves right after.
    const fromList = asList;
    if (fromList) flushSync(() => setFlowView('grafo'));
    const viewportEl = await waitForViewport();
    if (!viewportEl) {
      if (fromList) setFlowView('lista');
      toast.error('Não foi possível exportar a imagem. Tente de novo.');
      return;
    }
    try {
      // Enter export mode first (no transitions, no entrance animation, no hidden nodes), then clear the focus,
      // so the dimming and edge fades are cut at once and every course is captured at full opacity.
      flushSync(() => setExporting(true));
      flushSync(() => {
        hover.clear();
        setPinned(null);
      });
      await nextPaint();
      if (!(await waitForGraphReadiness(viewportEl))) throw new Error('O fluxograma ainda está sendo preparado.');
      // Transitions and entrance animations are off in export mode; the race keeps a stuck animation from freezing it.
      await Promise.race([
        Promise.allSettled((viewportEl.getAnimations?.({ subtree: true }) ?? []).map((a) => a.finished)),
        new Promise((resolve) => setTimeout(resolve, ANIMATIONS_SETTLE_MS)),
      ]);
      // Frame the visible cards at 1:1 from the layout, regardless of the current zoom and pan on screen.
      const frame = exportFrame(graph.nodes, COURSE_NODE_WIDTH, COURSE_NODE_HEIGHT, 48);
      const blob = await withTimerFrames(() =>
        toBlob(viewportEl, {
          backgroundColor: getComputedStyle(document.body).backgroundColor,
          width: frame.width,
          height: frame.height,
          pixelRatio: exportPixelRatio(frame),
          style: {
            width: `${frame.width}px`,
            height: `${frame.height}px`,
            transform: `translate(${frame.offsetX}px, ${frame.offsetY}px) scale(1)`,
          },
        }),
      );
      if (!blob) throw new Error('A imagem exportada saiu vazia.');
      if (touchScreen) {
        setExportImage({ url: URL.createObjectURL(blob), blob });
      } else {
        downloadImage(blob);
        toast.success('Fluxograma exportado.');
      }
    } catch {
      toast.error('Não foi possível exportar a imagem. Tente de novo.');
    } finally {
      setExporting(false);
      if (fromList) setFlowView('lista');
    }
  }

  return (
    <div className="grid gap-6">
      <p className="max-w-[60ch] text-footnote text-ink-muted max-md:hidden">
        Passe o mouse ou toque numa disciplina para ver o que ela exige e o que ela libera. Arraste o fundo para
        percorrer os períodos.
      </p>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <Switch id="so-pendentes" checked={onlyRemaining} onCheckedChange={setOnlyRemaining} className="max-md:after:-inset-y-3.5" />
          <Label htmlFor="so-pendentes" className="max-md:min-h-11">
            Mostrar só o que falta
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="como-lista"
            checked={asList}
            onCheckedChange={(checked) => {
              const next: FlowView = checked ? 'lista' : 'grafo';
              writeFlowView(next);
              setFlowView(next);
            }}
            className="max-md:after:-inset-y-3.5"
          />
          <Label htmlFor="como-lista" className="max-md:min-h-11">
            Ver como lista
          </Label>
        </div>
        <Button
          ref={exportButtonRef}
          variant="outline"
          onClick={exportPng}
          disabled={exporting}
          aria-busy={exporting}
          className="ml-auto rounded-full max-md:h-11"
        >
          {exporting ? (
            <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
          ) : (
            <Download aria-hidden />
          )}
          {exporting ? 'Exportando…' : 'Exportar PNG'}
        </Button>
      </div>

      {asList ? (
        <FlowchartList nodes={graph.nodes} curriculum={curriculum} />
      ) : (
        <div
          ref={containerRef}
          className={cn(
            'relative -mx-4 h-[calc(100dvh-env(safe-area-inset-top)-var(--bottom-chrome)-11rem)] min-h-96 bg-canvas md:mx-0 md:h-[min(75dvh,760px)] md:rounded-card md:border md:border-hairline',
            exporting && 'is-exporting',
          )}
        >
          <HighlightContext value={highlighted}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeMouseEnter={(_, node) => hover.enter(node.id)}
              onNodeMouseLeave={hover.leave}
              // Selection is driven by our `selected` prop, so React Flow's changes are folded into `pinned` here.
              onNodesChange={(changes) => {
                for (const change of changes) setPinned((prev) => nextPinned(prev, change));
              }}
              // Toggle on node.selected (render-time), not on prev: React Flow emits the select change before onNodeClick.
              onNodeClick={(_, node) => setPinned(node.selected ? null : node.id)}
              onPaneClick={() => setPinned(null)}
              nodesDraggable={false}
              nodesConnectable={false}
              onInit={onInit}
              minZoom={0.2}
              maxZoom={1.75}
              proOptions={{ hideAttribution: true }}
              aria-label="Fluxograma das disciplinas obrigatórias"
            >
              <Background gap={24} size={1} />
              <MiniMap
                pannable
                zoomable
                className="hidden md:block"
                nodeStrokeWidth={0}
                nodeClassName={(n) => ((n.data as CourseNodeType['data']).course.state === 'concluida' ? 'mini-done' : 'mini-left')}
              />
            </ReactFlow>
            <div className="contents [.is-exporting_&]:hidden">
              <FlowLegendPanel nodes={layout.nodes} className="absolute top-3 left-3 z-10" />
              <FlowZoomControls className="absolute bottom-3 left-3 z-10" />
            </div>
          </HighlightContext>
        </div>
      )}

      <ExportSheet
        image={exportImage}
        onClose={() => setExportImage(null)}
        returnFocusRef={exportButtonRef}
      />
    </div>
  );
}

export default function FlowchartScreen({ data }: { data: ParseResponse }) {
  return (
    <ReactFlowProvider>
      <Graph data={data} />
    </ReactFlowProvider>
  );
}
