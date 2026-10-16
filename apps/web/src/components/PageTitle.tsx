import type { ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';

interface PageTitleProps {
  title: string;
  context: ReactNode;
  titleRef?: Ref<HTMLHeadingElement>;
  className?: string;
}

export function PageTitle({ title, context, titleRef, className }: PageTitleProps) {
  return (
    <div className={cn('grid gap-1', className)}>
      <p className="text-footnote text-ink-muted">{context}</p>
      <h1 ref={titleRef} className="text-large-title">
        {title}
      </h1>
    </div>
  );
}
