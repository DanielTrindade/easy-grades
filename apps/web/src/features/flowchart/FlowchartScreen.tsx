import { COURSE_STATE_LABELS, layoutFlowchart, type ParseResponse } from '@easy-grades/core';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
} from '@xyflow/react';
import { toPng } from 'html-to-image';
import { Download } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { COURSE_NODE_HEIGHT, COURSE_NODE_WIDTH, CourseNode, type CourseNodeType } from './CourseNode';
import { exportFrame } from './export-frame';
import { FlowchartList } from './FlowchartList';
import { FlowLegend } from './FlowLegend';
import { HighlightContext } from './HighlightContext';
import { highlightSet, nextPinned, visibleGraph } from './highlight';
import { useHoverFocus } from './hoverFocus';

const nodeTypes = { course: CourseNode };

function Graph({ data }: { data: ParseResponse }) {
  const { curriculum, transcript } = data;
  const hover = useHoverFocus();
  const [pinned, setPinned] = useState<string | null>(null);
  const [onlyRemaining, setOnlyRemaining] = useState(false);
  const [asList, setAsList] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { fitView, setViewport } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  const layout = useMemo(() => layoutFlowchart(curriculum, transcript, { columnWidth: 264, rowHeight: 104 }), [curriculum, transcript]);
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
            stroke: edge.satisfied ? 'var(--igapo)' : 'var(--neblina)',
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

  async function exportPng() {
    const viewportEl = containerRef.current?.querySelector<HTMLElement>('.react-flow__viewport');
    if (!viewportEl) return;
    try {
      // Enter export mode first (no transitions, no entrance animation, no hidden nodes), then clear the focus,
      // so the dimming and edge fades are cut at once and every course is captured at full opacity.
      flushSync(() => setExporting(true));
      flushSync(() => {
        hover.clear();
        setPinned(null);
      });
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      await Promise.allSettled((viewportEl.getAnimations?.({ subtree: true }) ?? []).map((a) => a.finished));
      // Frame the visible cards at 1:1 from the layout, regardless of the current zoom and pan on screen.
      const frame = exportFrame(graph.nodes, COURSE_NODE_WIDTH, COURSE_NODE_HEIGHT, 48);
      const url = await toPng(viewportEl, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        width: frame.width,
        height: frame.height,
        pixelRatio: 2,
        style: {
          width: `${frame.width}px`,
          height: `${frame.height}px`,
          transform: `translate(${frame.offsetX}px, ${frame.offsetY}px) scale(1)`,
        },
      });
      const link = document.createElement('a');
      link.download = 'fluxograma.png';
      link.href = url;
      link.click();
      toast.success('Fluxograma exportado.');
    } catch {
      toast.error('Não foi possível exportar a imagem. Tente de novo.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-display">Fluxograma do curso</h1>
          <p className="mt-2 max-w-[60ch] text-muted-foreground">
            Passe o mouse ou selecione uma disciplina para ver o que ela exige e o que ela libera. Arraste o fundo para
            percorrer os períodos.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportPng} disabled={asList || exporting}>
          <Download aria-hidden />
          Exportar PNG
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <FlowLegend nodes={layout.nodes} />
        <div className="flex flex-wrap gap-5">
          <div className="flex items-center gap-2">
            <Switch id="so-pendentes" checked={onlyRemaining} onCheckedChange={setOnlyRemaining} />
            <Label htmlFor="so-pendentes">Mostrar só o que falta</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="como-lista" checked={asList} onCheckedChange={setAsList} />
            <Label htmlFor="como-lista">Ver como lista</Label>
          </div>
        </div>
      </div>

      {asList ? (
        <FlowchartList nodes={graph.nodes} curriculum={curriculum} />
      ) : (
        <div
          ref={containerRef}
          className={cn(
            '-mx-4 h-[min(75dvh,760px)] border-y border-border sm:mx-0 sm:rounded-xl sm:border',
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
              <Controls showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                className="hidden sm:block"
                nodeStrokeWidth={0}
                nodeClassName={(n) => ((n.data as CourseNodeType['data']).course.state === 'concluida' ? 'mini-done' : 'mini-left')}
              />
            </ReactFlow>
          </HighlightContext>
        </div>
      )}
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
