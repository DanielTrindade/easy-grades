import { BookOpen, CalendarDays, LayoutDashboard, Workflow, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VIEW_LABELS, VIEWS, type View } from '@/lib/use-hash-view';

const ICONS: Record<View, LucideIcon> = {
  'visao-geral': LayoutDashboard,
  fluxograma: Workflow,
  disciplinas: BookOpen,
  planejamento: CalendarDays,
};

/**
 * Sections of the dashboard. Below md it is a fixed bar at the bottom (icon and label, 56 px tall, each tab 44 px
 * or more). From md up it is the inline top nav. Both layouts share one list, so each section is one link.
 */
export function SectionNav({ view }: { view: View }) {
  return (
    <nav
      aria-label="Seções"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:static md:z-auto md:border-0 md:bg-transparent md:p-0"
    >
      <ul className="grid h-14 grid-cols-4 md:flex md:h-auto md:gap-6">
        {VIEWS.map((v) => {
          const Icon = ICONS[v];
          return (
            <li key={v} className="flex">
              <a
                href={`#/${v}`}
                aria-current={view === v ? 'page' : undefined}
                className={cn(
                  // Mobile: a tab with an icon over its label. The active tab gets a 2 px tinta bar on top, faded in.
                  'relative flex h-full min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground transition-colors duration-150 ease-snap hover:text-foreground aria-[current=page]:text-tinta',
                  'before:absolute before:inset-x-4 before:top-0 before:h-0.5 before:rounded-b-full before:bg-tinta before:opacity-0 before:transition-opacity before:duration-150 before:ease-snap aria-[current=page]:before:opacity-100',
                  // md+: the original top nav, a text link with an underline for the active section.
                  'md:block md:h-auto md:min-h-0 md:flex-none md:py-1 md:text-sm md:whitespace-nowrap md:border-b-2 md:border-transparent md:before:hidden md:aria-[current=page]:border-tinta md:aria-[current=page]:font-medium md:aria-[current=page]:text-foreground',
                )}
              >
                <Icon aria-hidden className="size-5 md:hidden" />
                <span>{VIEW_LABELS[v]}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
