import { COURSE_STATE_LABELS, type FlowNode } from '@easy-grades/core';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { memo, type CSSProperties } from 'react';
import { STATE_STYLE } from '@/components/state-style';
import { formatGrade, toTitleCase } from '@/lib/format';
import { cn } from '@/lib/utils';

export type CourseNodeData = { course: FlowNode; dimmed: boolean };
export type CourseNodeType = Node<CourseNodeData, 'course'>;

export const COURSE_NODE_WIDTH = 232;

function CourseNodeView({ data }: NodeProps<CourseNodeType>) {
  const { course, dimmed } = data;
  const style = STATE_STYLE[course.state];
  const Icon = style.icon;
  return (
    <div
      data-dimmed={dimmed || undefined}
      style={{ '--col': course.column, width: COURSE_NODE_WIDTH } as CSSProperties}
      className={cn(
        'course-node h-[84px] rounded-lg border border-l-4 bg-card px-3 py-2 text-left transition-opacity duration-150 data-[dimmed]:opacity-25',
        style.accent,
      )}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} className="!size-1.5 !border-0 !bg-neblina" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{course.code}</span>
        <span className="flex items-center gap-1 text-xs font-medium">
          <Icon aria-hidden className={cn('size-3.5', style.iconColor)} />
          {COURSE_STATE_LABELS[course.state]}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug">{toTitleCase(course.name)}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {course.credits} créditos
        {course.grade !== null && `, nota ${formatGrade(course.grade)}`}
      </p>
      <Handle type="source" position={Position.Right} isConnectable={false} className="!size-1.5 !border-0 !bg-neblina" />
    </div>
  );
}

export const CourseNode = memo(CourseNodeView);
