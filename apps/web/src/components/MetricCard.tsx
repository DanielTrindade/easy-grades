import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { Card } from '@/components/Card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  children?: ReactNode;
  targetId?: string;
  className?: string;
}

// The app routes on #/<view>, so the card scrolls by hand instead of letting the anchor rewrite the hash.
function revealSection(event: MouseEvent<HTMLAnchorElement>, targetId: string) {
  const target = document.getElementById(targetId);
  if (!target) return;
  event.preventDefault();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  const heading = target.querySelector<HTMLElement>('h2');
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
}

export function MetricCard({ icon: Icon, label, value, children, targetId, className }: MetricCardProps) {
  const body = (
    <>
      <div className="flex items-center gap-1.5 text-caption font-semibold text-pen-ink">
        <Icon aria-hidden className="size-4 shrink-0" />
        <h2 className="font-sans text-caption font-semibold tracking-normal font-stretch-normal">{label}</h2>
        {targetId && <ChevronRight aria-hidden className="ml-auto size-4 shrink-0 text-ink-muted" />}
      </div>
      <p className="mt-2 heading-ink text-[1.75rem] leading-none tabular-nums md:text-[2.5rem]">{value}</p>
      {children && <div className="mt-2 grid gap-1 text-footnote text-ink-muted">{children}</div>}
    </>
  );

  if (!targetId) return <Card className={cn('min-w-0', className)}>{body}</Card>;

  return (
    <Card className={cn('min-w-0 p-0', className)}>
      <a
        href={`#${targetId}`}
        onClick={(event) => revealSection(event, targetId)}
        className="block h-full rounded-card p-4 outline-none transition-colors duration-150 ease-snap hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {body}
      </a>
    </Card>
  );
}
