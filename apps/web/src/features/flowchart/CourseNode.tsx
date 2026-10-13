import { COURSE_STATE_LABELS, type FlowNode } from '@easy-grades/core';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { memo, useContext, type CSSProperties } from 'react';
import { STATE_STYLE } from '@/components/state-style';
import { pluralize, toTitleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import { HighlightContext } from './HighlightContext';

export type CourseNodeData = { course: FlowNode };
export type CourseNodeType = Node<CourseNodeData, 'course'>;

export const COURSE_NODE_WIDTH = 232;
/** Tall enough for a two-line name with the credits line pinned to the bottom. */
export const COURSE_NODE_HEIGHT = 96;

function CourseNodeView({ data }: NodeProps<CourseNodeType>) {
  const { course } = data;
  const highlighted = useContext(HighlightContext);
  const dimmed = highlighted !== null && !highlighted.has(course.code);
  const style = STATE_STYLE[course.state];
  const Icon = style.icon;
  return (
    <div
      data-dimmed={dimmed || undefined}
      style={{ '--col': course.column, width: COURSE_NODE_WIDTH, height: COURSE_NODE_HEIGHT } as CSSProperties}
      className={cn(
        // overflow-hidden + a clamped name keep every text inside the fixed card, however long the course name is.
        'course-node flex flex-col overflow-hidden rounded-lg border border-l-4 px-3 py-2 text-left transition-opacity duration-150 data-[dimmed]:opacity-25',
        style.surface,
        style.accent,
      )}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} className="!size-1.5 !border-0 !bg-suave" />
      <div className="flex items-center justify-between gap-2">
        <span className="code-label text-xs font-semibold">{course.code}</span>
        <span className="flex items-center gap-1 text-xs font-medium">
          <Icon aria-hidden className={cn('size-3.5 shrink-0', style.iconColor)} />
          {COURSE_STATE_LABELS[course.state]}
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-tight break-words">{toTitleCase(course.name)}</p>
      <p className="mt-auto pt-1 text-xs text-muted-foreground">{pluralize(course.credits, 'crédito', 'créditos')}</p>
      <Handle type="source" position={Position.Right} isConnectable={false} className="!size-1.5 !border-0 !bg-suave" />
    </div>
  );
}

export const CourseNode = memo(CourseNodeView);
