import { useEffect, useRef, useState } from 'react';
import { SECTION_ICONS } from '@/components/section-icons';
import { useBodyData } from '@/lib/body-data';
import { VIEW_LABELS, VIEWS, type View } from '@/lib/use-hash-view';
import { useScrollMinimize } from '@/lib/use-scroll-minimize';
import { cn } from '@/lib/utils';

export function TabBar({ view }: { view: View }) {
  const [focusWithin, setFocusWithin] = useState(false);
  // Minimizing would unmount the focused link and drop focus to the body, so the bar holds while focus is inside.
  const { minimized, expand } = useScrollMinimize(view !== 'fluxograma' && !focusWithin);
  const currentLink = useRef<HTMLAnchorElement>(null);
  const focusOnExpand = useRef(false);
  const keyboardFocus = useRef(true);
  useBodyData('tabBar', minimized ? 'minimized' : 'expanded');

  useEffect(() => {
    const markKeyboardInput = () => {
      keyboardFocus.current = true;
    };
    const markPointerInput = () => {
      keyboardFocus.current = false;
    };

    document.addEventListener('keydown', markKeyboardInput);
    document.addEventListener('pointerdown', markPointerInput);
    return () => {
      document.removeEventListener('keydown', markKeyboardInput);
      document.removeEventListener('pointerdown', markPointerInput);
    };
  }, []);

  useEffect(() => {
    if (minimized || !focusOnExpand.current) return;
    focusOnExpand.current = false;
    currentLink.current?.focus();
  }, [minimized]);

  function reveal() {
    focusOnExpand.current = true;
    expand();
  }

  const CurrentIcon = SECTION_ICONS[view];

  return (
    <nav
      aria-label="Seções"
      onPointerDown={() => setFocusWithin(false)}
      onFocus={() => setFocusWithin(keyboardFocus.current)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
      }}
      className={cn(
        'glass fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] z-40 rounded-full',
        !minimized && 'right-[max(0.75rem,env(safe-area-inset-right))]',
      )}
    >
      {minimized ? (
        <button
          type="button"
          aria-expanded={false}
          aria-label={`${VIEW_LABELS[view]}: mostrar seções`}
          onClick={expand}
          onFocus={() => {
            if (keyboardFocus.current) reveal();
          }}
          className="flex h-12 animate-in items-center gap-2 rounded-full px-4 text-sm font-semibold text-pen-ink outline-none fade-in zoom-in-95 duration-200 motion-reduce:duration-150 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <CurrentIcon aria-hidden className="size-5 fill-current/15" />
          {VIEW_LABELS[view]}
        </button>
      ) : (
        <div className="relative h-14 animate-in p-1 fade-in duration-200 motion-reduce:duration-150">
          <span
            aria-hidden
            className="tab-indicator absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/4)] rounded-full bg-pen-tint"
            style={{ transform: `translateX(${VIEWS.indexOf(view) * 100}%)` }}
          />
          <ul className="relative grid h-full grid-cols-4">
            {VIEWS.map((v) => {
              const Icon = SECTION_ICONS[v];
              const current = v === view;
              return (
                <li key={v} className="flex">
                  <a
                    ref={current ? currentLink : undefined}
                    href={`#/${v}`}
                    aria-current={current ? 'page' : undefined}
                    className="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[0.6875rem] font-medium text-ink-muted outline-none transition-colors duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:font-semibold aria-[current=page]:text-pen-ink"
                  >
                    <Icon aria-hidden className={cn('size-5', current && 'fill-current/15')} />
                    <span>{VIEW_LABELS[v]}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}
