import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DETENT_FRACTION, resolveDetent, type Detent } from '@/lib/detents';

export interface DetentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  detents?: readonly Detent[];
  initialDetent?: Detent;
  headerAction?: ReactNode;
  children: ReactNode;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

const DEFAULT_DETENTS = ['medium', 'large'] as const;
const DRAG_THRESHOLD_PX = 8;
const VELOCITY_WINDOW_MS = 100;
const IDLE_BEFORE_RELEASE_MS = 80;

interface ViewportMetrics {
  height: number;
  bottomInset: number;
}

interface PointerSample {
  time: number;
  y: number;
}

interface GestureState {
  pointerId: number;
  startY: number;
  lastY: number;
  lastTime: number;
  samples: PointerSample[];
  velocity: number;
  active: boolean;
  captured: boolean;
  element: HTMLElement;
  sheetHeight: number;
}

interface DragBounds {
  restOffset: number;
  minOffset: number;
  maxOffset: number;
  dimDistance: number;
}

type DetentSheetStyle = CSSProperties & { '--detent-offset': string };

function orderedDetents(detents: readonly Detent[] | undefined): readonly Detent[] {
  const available = detents && detents.length > 0 ? detents : DEFAULT_DETENTS;
  const unique = [...new Set(available)].sort((a, b) => DETENT_FRACTION[a] - DETENT_FRACTION[b]);
  return unique.length > 0 ? unique : DEFAULT_DETENTS;
}

function initialDetentFor(detents: readonly Detent[], requested: Detent | undefined): Detent {
  return requested && detents.includes(requested) ? requested : detents[0]!;
}

function readViewportMetrics(): ViewportMetrics {
  const viewport = window.visualViewport;
  if (viewport && viewport.height > 0) {
    const visibleBottom = viewport.offsetTop + viewport.height;
    return {
      height: viewport.height,
      bottomInset: Math.max(0, window.innerHeight - visibleBottom),
    };
  }
  return { height: window.innerHeight, bottomInset: 0 };
}

function useViewportMetrics(onGeometryChange: () => void): ViewportMetrics {
  const [metrics, setMetrics] = useState<ViewportMetrics>(readViewportMetrics);

  useEffect(() => {
    const update = () => {
      onGeometryChange();
      setMetrics(readViewportMetrics());
    };
    const viewport = window.visualViewport;
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
    };
  }, [onGeometryChange]);

  return metrics;
}

function isDisabled(element: HTMLElement): boolean {
  return (element as HTMLButtonElement).disabled === true || element.getAttribute('aria-disabled') === 'true';
}

function canRestoreFocus(element: HTMLElement | null | undefined): element is HTMLElement {
  return (
    element !== null &&
    element !== undefined &&
    element !== document.body &&
    element.isConnected &&
    !isDisabled(element) &&
    element.tabIndex >= 0
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function px(value: number): string {
  return `${Math.round(value * 1000) / 1000}px`;
}

function velocityFromSamples(samples: readonly PointerSample[]): number {
  if (samples.length < 2) return 0;
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  const elapsed = last.time - first.time;
  return elapsed > 0 ? (last.y - first.y) / elapsed : 0;
}

function dragBounds(
  detent: Detent,
  detents: readonly Detent[],
  metrics: ViewportMetrics,
  contentSized: boolean,
  sheetHeight: number,
): DragBounds {
  const fraction = DETENT_FRACTION[detent];
  if (contentSized) {
    const height = sheetHeight > 0 ? sheetHeight : metrics.height * fraction;
    return { restOffset: 0, minOffset: 0, maxOffset: height, dimDistance: height };
  }
  const largest = Math.max(...detents.map((candidate) => DETENT_FRACTION[candidate]));
  const restOffset = Math.max(0, (largest - fraction) * metrics.height);
  return {
    restOffset,
    minOffset: -restOffset,
    maxOffset: fraction * metrics.height,
    dimDistance: fraction * metrics.height,
  };
}

export function DetentSheet({
  open,
  onOpenChange,
  title,
  description,
  detents: detentsProp,
  initialDetent,
  headerAction,
  children,
  returnFocusRef,
}: DetentSheetProps) {
  const detents = orderedDetents(detentsProp);
  const contentSized = detents.length === 1 && detents[0] === 'medium';
  const largestDetent = detents[detents.length - 1]!;
  const toggleable = detents.length > 1;

  const [detent, setDetent] = useState<Detent>(() => initialDetentFor(detents, initialDetent));
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const gestureRef = useRef<GestureState | null>(null);
  const suppressClickRef = useRef(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const previousOpenRef = useRef(false);

  const clearGesture = useCallback((gesture: GestureState | null) => {
    if (gesture?.captured) {
      try {
        gesture.element.releasePointerCapture(gesture.pointerId);
      } catch {
        gesture.captured = false;
      }
    }
    document.body.style.removeProperty('--sheet-drag');
    setDragging(false);
    setDragOffset(0);
  }, []);

  const cancelGesture = useCallback(() => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    suppressClickRef.current = false;
    clearGesture(gesture);
  }, [clearGesture]);

  const metrics = useViewportMetrics(cancelGesture);

  useLayoutEffect(() => {
    if (open && !previousOpenRef.current) {
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        !active.closest('[data-slot="sheet-content"]') &&
        canRestoreFocus(active)
      ) {
        openerRef.current = active;
      }
      setDetent(initialDetentFor(detents, initialDetent));
      cancelGesture();
    }
    if (!open) cancelGesture();
    previousOpenRef.current = open;
  }, [open, detents, initialDetent, cancelGesture]);

  useEffect(() => {
    return () => {
      const gesture = gestureRef.current;
      if (gesture?.captured) {
        try {
          gesture.element.releasePointerCapture(gesture.pointerId);
        } catch {
          gesture.captured = false;
        }
      }
      gestureRef.current = null;
      document.body.style.removeProperty('--sheet-drag');
    };
  }, []);

  function handleOpenChange(next: boolean) {
    if (!next) cancelGesture();
    onOpenChange(next);
  }

  function handleCloseAutoFocus(event: Event) {
    const target = [returnFocusRef?.current, openerRef.current].find(canRestoreFocus);
    if (!target) return;
    event.preventDefault();
    target.focus();
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    suppressClickRef.current = false;
    if (!event.isPrimary || event.button !== 0 || gestureRef.current) return;

    const target = event.target;
    if (target instanceof Element) {
      const interactive = target.closest(
        'button, a, input, textarea, select, [role="button"], [contenteditable="true"]',
      );
      if (interactive && !interactive.closest('[data-sheet-grabber]')) return;
    }

    const now = performance.now();
    const content = event.currentTarget.closest<HTMLElement>('[data-slot="sheet-content"]');
    const measured = content?.getBoundingClientRect().height ?? 0;
    const fallbackHeight =
      (contentSized ? DETENT_FRACTION.medium : DETENT_FRACTION[largestDetent]) * metrics.height;
    gestureRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: now,
      samples: [{ time: now, y: event.clientY }],
      velocity: 0,
      active: false,
      captured: false,
      element: event.currentTarget,
      sheetHeight: measured > 0 ? measured : fallbackHeight,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || !event.isPrimary) return;

    const offsetFromStart = event.clientY - gesture.startY;
    if (!gesture.active) {
      if (Math.abs(offsetFromStart) < DRAG_THRESHOLD_PX) return;
      gesture.active = true;
      setDragging(true);
      try {
        gesture.element.setPointerCapture(event.pointerId);
        gesture.captured = true;
      } catch {
        gesture.captured = false;
      }
    }

    const now = performance.now();
    gesture.lastY = event.clientY;
    gesture.lastTime = now;
    gesture.samples.push({ time: now, y: event.clientY });
    gesture.samples = gesture.samples.filter((sample) => now - sample.time <= VELOCITY_WINDOW_MS);
    gesture.velocity = velocityFromSamples(gesture.samples);

    const bounds = dragBounds(detent, detents, metrics, contentSized, gesture.sheetHeight);
    const offset = clamp(offsetFromStart, bounds.minOffset, bounds.maxOffset);
    setDragOffset(offset);
    document.body.style.setProperty(
      '--sheet-drag',
      String(clamp(offset / Math.max(1, bounds.dimDistance), 0, 1)),
    );
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const active = gesture.active;
    const bounds = dragBounds(detent, detents, metrics, contentSized, gesture.sheetHeight);
    const offset = clamp(event.clientY - gesture.startY, bounds.minOffset, bounds.maxOffset);
    const now = performance.now();
    const velocity = now - gesture.lastTime > IDLE_BEFORE_RELEASE_MS ? 0 : gesture.velocity;

    gestureRef.current = null;
    clearGesture(gesture);
    if (!active) return;

    suppressClickRef.current = true;
    const viewportHeight = contentSized
      ? Math.max(1, gesture.sheetHeight) / DETENT_FRACTION[detent]
      : metrics.height;
    const result = resolveDetent({
      current: detent,
      offset,
      velocity,
      viewportHeight,
      detents,
    });
    if (result === 'close') {
      onOpenChange(false);
      return;
    }
    setDetent(result);
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    cancelGesture();
  }

  function handleClickCapture(event: ReactMouseEvent<HTMLElement>) {
    if (!suppressClickRef.current || event.detail === 0) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  function toggleDetent() {
    setDragOffset(0);
    setDetent(detent === largestDetent ? detents[0]! : largestDetent);
  }

  const atLargest = detent === largestDetent;
  const bounds = dragBounds(detent, detents, metrics, contentSized, metrics.height * DETENT_FRACTION[detent]);
  const style: DetentSheetStyle = {
    bottom: px(metrics.bottomInset),
    '--detent-offset': px(bounds.restOffset + dragOffset),
    ...(contentSized
      ? { maxHeight: px(metrics.height * DETENT_FRACTION.medium) }
      : {
          height: px(DETENT_FRACTION[largestDetent] * metrics.height),
          paddingBottom: px(bounds.restOffset),
        }),
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        data-detent={detent}
        data-dragging={dragging || undefined}
        style={style}
        className="glass gap-0 rounded-t-sheet border-x-0 border-b-0 p-0 shadow-none"
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        <div
          data-sheet-handle
          className="shrink-0 touch-none select-none px-5 pt-2 pb-3"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onLostPointerCapture={handlePointerCancel}
        >
          {toggleable ? (
            <button
              type="button"
              data-sheet-grabber
              aria-label={atLargest ? 'Reduzir' : 'Expandir'}
              onClick={toggleDetent}
              onClickCapture={handleClickCapture}
              className="mx-auto flex h-11 w-24 touch-none items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-ink-muted/40" />
            </button>
          ) : (
            <span aria-hidden="true" className="mx-auto my-2 block h-1.5 w-10 rounded-full bg-ink-muted/40" />
          )}
          <div className="mt-1 flex items-start justify-between gap-3">
            <SheetHeader className="p-0">
              <SheetTitle className="text-title3">{title}</SheetTitle>
              {description ? <SheetDescription>{description}</SheetDescription> : null}
            </SheetHeader>
            {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
