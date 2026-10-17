import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ListGroupProps {
  heading?: ReactNode;
  headingLevel?: 2 | 3;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function ListGroup({ heading, headingLevel = 2, meta, className, children }: ListGroupProps) {
  const headingId = useId();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const list = <ul className="rounded-group bg-surface pl-4">{children}</ul>;

  if (heading === undefined) return <div className={className}>{list}</div>;

  return (
    <section aria-labelledby={headingId} className={cn('grid gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3 px-4 text-footnote">
        <Heading id={headingId} className="font-sans text-footnote font-semibold tracking-normal font-stretch-normal text-ink">
          {heading}
        </Heading>
        {meta !== undefined && <span className="text-ink-muted">{meta}</span>}
      </div>
      {list}
    </section>
  );
}

export function ListGroupRow({ className, ...props }: ComponentProps<'li'>) {
  return (
    <li
      className={cn('flex min-h-11 items-center gap-3 border-hairline py-2.5 pr-4 not-first:border-t', className)}
      {...props}
    />
  );
}
