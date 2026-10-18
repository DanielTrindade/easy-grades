import { useReactFlow } from '@xyflow/react';
import { ListTree, Maximize, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/lib/use-media-query';
import { cn } from '@/lib/utils';
import type { FlowNode } from '@easy-grades/core';
import { FlowLegend } from './FlowLegend';

export function FlowZoomControls({ className }: { className?: string }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const duration = reduceMotion ? 0 : 200;

  return (
    <div role="group" aria-label="Zoom" className={cn('glass flex flex-col rounded-full p-0.5', className)}>
      <Button variant="ghost" size="icon" aria-label="Aproximar" className="size-11" onClick={() => zoomIn({ duration })}>
        <Plus />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Afastar" className="size-11" onClick={() => zoomOut({ duration })}>
        <Minus />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Ajustar à tela"
        className="size-11"
        onClick={() => fitView({ padding: 0.1, duration })}
      >
        <Maximize />
      </Button>
    </div>
  );
}

export function FlowLegendPanel({ nodes, className }: { nodes: FlowNode[]; className?: string }) {
  const desktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useState<boolean | null>(null);
  const expanded = open ?? desktop;

  return (
    <div className={cn('grid justify-items-start gap-2', className)}>
      <Button
        variant="ghost"
        aria-expanded={expanded}
        onClick={() => setOpen(!expanded)}
        className="glass h-11 rounded-full px-4"
      >
        <ListTree aria-hidden />
        Legenda
      </Button>
      {expanded && (
        <div className="glass max-w-[calc(100vw-2rem)] rounded-group p-3">
          <FlowLegend nodes={nodes} />
        </div>
      )}
    </div>
  );
}
