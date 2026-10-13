import { COURSE_STATE_LABELS, type CourseState, type FlowNode } from '@easy-grades/core';
import { STATE_STYLE } from '@/components/state-style';
import { cn } from '@/lib/utils';

const ORDER: CourseState[] = ['concluida', 'em_curso', 'disponivel', 'bloqueada', 'reprovada'];

export function FlowLegend({ nodes }: { nodes: FlowNode[] }) {
  const counts = new Map<CourseState, number>();
  for (const node of nodes) counts.set(node.state, (counts.get(node.state) ?? 0) + 1);
  return (
    <ul aria-label="Legenda" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      {ORDER.filter((state) => counts.has(state)).map((state) => {
        const { icon: Icon, iconColor, surface, accent } = STATE_STYLE[state];
        return (
          <li key={state} className="flex items-center gap-1.5">
            <span aria-hidden className={cn('inline-block h-4 w-5 rounded-sm border border-l-4', surface, accent)} />
            <Icon aria-hidden className={cn('size-4', iconColor)} />
            {COURSE_STATE_LABELS[state]}
            <span className="text-muted-foreground">{counts.get(state)}</span>
          </li>
        );
      })}
    </ul>
  );
}
