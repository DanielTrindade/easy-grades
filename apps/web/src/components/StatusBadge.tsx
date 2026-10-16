import { COURSE_STATE_LABELS, STATUS_LABELS, isCompleted, isFailed, isInProgress, type CourseState, type Status } from '@easy-grades/core';
import { CircleHelp } from 'lucide-react';
import { STATE_STYLE } from '@/components/state-style';
import { cn } from '@/lib/utils';

const badgeBase = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium';

export function StateBadge({ state, className }: { state: CourseState; className?: string }) {
  const { icon: Icon, badge } = STATE_STYLE[state];
  return (
    <span className={cn(badgeBase, badge, className)}>
      <Icon aria-hidden className="size-3.5" />
      {COURSE_STATE_LABELS[state]}
    </span>
  );
}

function stateForStatus(status: Status): CourseState | null {
  if (isCompleted(status)) return 'concluida';
  if (isInProgress(status)) return 'em_curso';
  if (isFailed(status)) return 'reprovada';
  return null;
}

/** Badge for a transcript entry: keeps the precise label (e.g. "Equivalência"). */
export function EntryStatusBadge({ status, rawStatus }: { status: Status; rawStatus: string }) {
  const state = stateForStatus(status);
  if (!state) {
    return (
      <span className={cn(badgeBase, 'border-dashed border-danger text-danger')} title={`No histórico: ${rawStatus || 'vazio'}`}>
        <CircleHelp aria-hidden className="size-3.5" />
        {status === 'trancado' ? STATUS_LABELS.trancado : STATUS_LABELS.desconhecido}
      </span>
    );
  }
  const { icon: Icon, badge } = STATE_STYLE[state];
  return (
    <span className={cn(badgeBase, badge)}>
      <Icon aria-hidden className="size-3.5" />
      {STATUS_LABELS[status]}
    </span>
  );
}
