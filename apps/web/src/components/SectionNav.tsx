import { VIEW_LABELS, VIEWS, type View } from '@/lib/use-hash-view';
import { cn } from '@/lib/utils';

export function SectionNav({ view, className }: { view: View; className?: string }) {
  return (
    <nav aria-label="Seções" className={cn('relative w-[28rem] rounded-full bg-muted p-1', className)}>
      <span
        aria-hidden
        className="tab-indicator absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/4)] rounded-full bg-surface shadow-sm"
        style={{ transform: `translateX(${VIEWS.indexOf(view) * 100}%)` }}
      />
      <ul className="relative grid grid-cols-4">
        {VIEWS.map((v) => (
          <li key={v} className="flex">
            <a
              href={`#/${v}`}
              aria-current={view === v ? 'page' : undefined}
              className="flex h-8 pointer-coarse:h-11 flex-1 items-center justify-center rounded-full px-3 text-sm whitespace-nowrap text-ink-muted outline-none transition-colors duration-150 ease-snap hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:font-medium aria-[current=page]:text-ink"
            >
              {VIEW_LABELS[v]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
