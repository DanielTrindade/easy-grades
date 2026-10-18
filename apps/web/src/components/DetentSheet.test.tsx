import { createRef, useState, type RefObject } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Detent } from '@/lib/detents';
import { DetentSheet } from './DetentSheet';

interface HarnessProps {
  detents?: readonly Detent[];
  initialDetent?: Detent;
  initialOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onHeaderAction?: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  attachReturnRef?: boolean;
  returnTargetNonFocusable?: boolean;
  returnTargetDisabled?: boolean;
}

function Harness({
  detents,
  initialDetent,
  initialOpen = true,
  onOpenChange,
  onHeaderAction,
  returnFocusRef,
  attachReturnRef = true,
  returnTargetNonFocusable = false,
  returnTargetDisabled = false,
}: HarnessProps) {
  const [open, setOpen] = useState(initialOpen);

  function changeOpen(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  return (
    <>
      <button type="button" onClick={() => changeOpen(true)}>
        Abrir
      </button>
      <button type="button" onClick={() => changeOpen(false)}>
        Fechar externo
      </button>
      {returnTargetNonFocusable ? (
        <div ref={attachReturnRef ? (returnFocusRef as RefObject<HTMLDivElement | null>) : undefined}>
          Retorno
        </div>
      ) : (
        <button
          ref={attachReturnRef ? (returnFocusRef as RefObject<HTMLButtonElement | null>) : undefined}
          type="button"
          disabled={returnTargetDisabled}
        >
          Retorno
        </button>
      )}
      <DetentSheet
        open={open}
        onOpenChange={changeOpen}
        title="Meu semestre"
        description="3 disciplinas, 12 créditos"
        detents={detents}
        initialDetent={initialDetent}
        returnFocusRef={returnFocusRef}
        headerAction={
          <button type="button" onClick={onHeaderAction}>
            Concluir
          </button>
        }
      >
        <ul aria-label="Escolhidas">
          <li>Cálculo II</li>
          <li>Física I</li>
        </ul>
      </DetentSheet>
    </>
  );
}

function MountedOpenHarness() {
  const [mounted, setMounted] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setMounted(true)}>
        Abrir agora
      </button>
      {mounted ? (
        <DetentSheet
          open
          onOpenChange={(open) => {
            if (!open) setMounted(false);
          }}
          title="Meu semestre"
          description="3 disciplinas, 12 créditos"
        >
          <p>Conteúdo</p>
        </DetentSheet>
      ) : null}
    </>
  );
}

function sheet() {
  return screen.getByRole('dialog', { name: 'Meu semestre' });
}

function handle() {
  return screen.getByText('Meu semestre').closest('[data-sheet-handle]') as HTMLElement;
}

function bodyDrag() {
  return document.body.style.getPropertyValue('--sheet-drag');
}

interface DragOptions {
  pointerId?: number;
  isPrimary?: boolean;
  pauseBeforeReleaseMs?: number;
  startTime?: number;
}

function drag(target: Element, from: number, to: number, durationMs: number, options: DragOptions = {}) {
  const { pointerId = 1, isPrimary = true, pauseBeforeReleaseMs = 0, startTime = 1000 } = options;
  const now = vi.spyOn(performance, 'now');
  const base = { pointerId, isPrimary, button: 0 };
  now.mockReturnValue(startTime);
  fireEvent.pointerDown(target, { ...base, clientY: from });
  now.mockReturnValue(startTime + durationMs / 2);
  fireEvent.pointerMove(target, { ...base, clientY: (from + to) / 2 });
  now.mockReturnValue(startTime + durationMs);
  fireEvent.pointerMove(target, { ...base, clientY: to });
  now.mockReturnValue(startTime + durationMs + pauseBeforeReleaseMs);
  fireEvent.pointerUp(target, { ...base, clientY: to });
  now.mockRestore();
}

function startDrag(target: Element, from: number, to: number) {
  const base = { pointerId: 1, isPrimary: true, button: 0 };
  fireEvent.pointerDown(target, { ...base, clientY: from });
  fireEvent.pointerMove(target, { ...base, clientY: to });
}

function finishDrag(target: Element, clientY: number) {
  fireEvent.pointerUp(target, { pointerId: 1, isPrimary: true, button: 0, clientY });
}

beforeEach(() => {
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
});

afterEach(() => {
  document.body.style.removeProperty('--sheet-drag');
  vi.restoreAllMocks();
});

describe('DetentSheet', () => {
  it('opens at medium as a glass dialog with its title and description', () => {
    render(<Harness />);

    expect(sheet()).toHaveAttribute('data-detent', 'medium');
    expect(sheet()).toHaveClass('glass', 'rounded-t-sheet');
    expect(screen.getByText('3 disciplinas, 12 créditos')).toBeInTheDocument();
    expect(sheet().style.height).toBe('736px');
    expect(sheet().style.paddingBottom).toBe('336px');
    expect(sheet().style.getPropertyValue('--detent-offset')).toBe('336px');
  });

  it('toggles the detent from the grabber with Enter and Space', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const grabber = screen.getByRole('button', { name: 'Expandir' });

    grabber.focus();
    await user.keyboard('{Enter}');
    expect(sheet()).toHaveAttribute('data-detent', 'large');
    expect(screen.getByRole('button', { name: 'Reduzir' })).toBeInTheDocument();

    await user.keyboard(' ');
    expect(sheet()).toHaveAttribute('data-detent', 'medium');
  });

  it('keeps a simple tap on the grabber as a click', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Expandir' }));

    expect(sheet()).toHaveAttribute('data-detent', 'large');
  });

  it('gives the grabber a real target of at least 44 by 44 pixels', () => {
    render(<Harness />);

    const grabber = screen.getByRole('button', { name: 'Expandir' });

    expect(grabber.className).toContain('h-11');
    expect(grabber.className).toContain('w-24');
  });

  it('uses a decorative grabber with a single detent and still drags the header', () => {
    const onOpenChange = vi.fn();
    render(<Harness detents={['medium']} onOpenChange={onOpenChange} />);

    expect(screen.queryByRole('button', { name: /Expandir|Reduzir/ })).not.toBeInTheDocument();
    expect(sheet()).toHaveAttribute('data-detent', 'medium');
    expect(sheet().style.getPropertyValue('--detent-offset')).toBe('0px');

    drag(handle(), 500, 760, 200, { pauseBeforeReleaseMs: 500 });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('has no grabber button and sits at large with a single large detent', () => {
    render(<Harness detents={['large']} />);

    expect(screen.queryByRole('button', { name: /Expandir|Reduzir/ })).not.toBeInTheDocument();
    expect(sheet()).toHaveAttribute('data-detent', 'large');
  });

  it('sizes a single medium detent to its content with a visible half-screen cap', () => {
    render(<Harness detents={['medium']} />);

    expect(sheet().style.maxHeight).toBe('400px');
    expect(sheet().style.height).toBe('');
    expect(sheet().style.getPropertyValue('--detent-offset')).toBe('0px');
  });

  it('keeps the header out of the scrollport and the content body scrollable', () => {
    render(<Harness />);

    const body = screen.getByRole('list', { name: 'Escolhidas' }).parentElement!;

    expect(handle().className).toContain('shrink-0');
    expect(body.className).toContain('min-h-0');
    expect(body.className).toContain('flex-1');
    expect(body.className).toContain('overflow-y-auto');
  });

  it('uses the measured height of a content-sized sheet to decide when it closes', () => {
    const onOpenChange = vi.fn();
    render(<Harness detents={['medium']} onOpenChange={onOpenChange} />);
    const dialog = sheet();
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 500,
      top: 500,
      left: 0,
      right: 390,
      bottom: 800,
      width: 390,
      height: 300,
      toJSON: () => ({}),
    });

    drag(handle(), 500, 660, 100, { pauseBeforeReleaseMs: 500 });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('stays open when the measured content-sized sheet is dragged less than half its height', () => {
    const onOpenChange = vi.fn();
    render(<Harness detents={['medium']} onOpenChange={onOpenChange} />);
    const dialog = sheet();
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 500,
      top: 500,
      left: 0,
      right: 390,
      bottom: 800,
      width: 390,
      height: 300,
      toJSON: () => ({}),
    });

    drag(handle(), 500, 620, 100, { pauseBeforeReleaseMs: 500 });

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(sheet()).toHaveAttribute('data-detent', 'medium');
  });

  it('expands when the header is dragged up and closes on a fast flick down', () => {
    const onOpenChange = vi.fn();
    render(<Harness onOpenChange={onOpenChange} />);

    drag(handle(), 500, 220, 300);
    expect(sheet()).toHaveAttribute('data-detent', 'large');
    expect(sheet().style.paddingBottom).toBe('0px');
    expect(sheet().style.getPropertyValue('--detent-offset')).toBe('0px');

    drag(handle(), 120, 260, 60);
    expect(sheet()).toHaveAttribute('data-detent', 'medium');

    drag(handle(), 420, 500, 40);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('never changes the detent compensation during pointermove', () => {
    render(<Harness />);

    startDrag(handle(), 400, 300);

    expect(sheet().style.getPropertyValue('--detent-offset')).toBe('236px');
    expect(sheet().style.paddingBottom).toBe('336px');
    expect(sheet().style.height).toBe('736px');
    finishDrag(handle(), 300);
  });

  it('settles back to medium on a flick down from large without skipping it', () => {
    render(<Harness />);

    drag(handle(), 500, 220, 300);
    expect(sheet()).toHaveAttribute('data-detent', 'large');

    drag(handle(), 120, 260, 60);
    expect(sheet()).toHaveAttribute('data-detent', 'medium');
  });

  it('does not reuse an old flick after a pause before releasing', () => {
    const onOpenChange = vi.fn();
    render(<Harness onOpenChange={onOpenChange} />);
    const now = vi.spyOn(performance, 'now');

    now.mockReturnValue(1000);
    fireEvent.pointerDown(handle(), { pointerId: 1, isPrimary: true, button: 0, clientY: 500 });
    now.mockReturnValue(1010);
    fireEvent.pointerMove(handle(), { pointerId: 1, isPrimary: true, button: 0, clientY: 520 });
    now.mockReturnValue(1510);
    fireEvent.pointerUp(handle(), { pointerId: 1, isPrimary: true, button: 0, clientY: 520 });

    now.mockRestore();

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(sheet()).toHaveAttribute('data-detent', 'medium');
  });

  it('never drags above the largest detent', () => {
    render(<Harness />);

    startDrag(handle(), 400, -800);

    expect(sheet().style.getPropertyValue('--detent-offset')).toBe('0px');
    expect(parseFloat(bodyDrag())).toBe(0);
    finishDrag(handle(), -800);
  });

  it('clamps the drag dimming between zero and one', () => {
    render(<Harness />);

    startDrag(handle(), 400, 2400);

    expect(sheet().style.getPropertyValue('--detent-offset')).toBe('736px');
    expect(parseFloat(bodyDrag())).toBe(1);
    finishDrag(handle(), 2400);
  });

  it('lets the content scroll instead of moving the sheet', () => {
    render(<Harness />);
    const list = screen.getByRole('list', { name: 'Escolhidas' });

    drag(list, 500, 200, 300);
    fireEvent.scroll(list);

    expect(sheet()).toHaveAttribute('data-detent', 'medium');
    expect(sheet()).not.toHaveAttribute('data-dragging');
    expect(bodyDrag()).toBe('');
  });

  it('ignores header actions when starting a drag', () => {
    const onHeaderAction = vi.fn();
    render(<Harness onHeaderAction={onHeaderAction} />);
    const action = screen.getByRole('button', { name: 'Concluir' });

    drag(action, 500, 200, 300);
    fireEvent.click(action);

    expect(sheet()).toHaveAttribute('data-detent', 'medium');
    expect(bodyDrag()).toBe('');
    expect(onHeaderAction).toHaveBeenCalledOnce();
  });

  it('suppresses only the click produced by the drag and keeps keyboard and later clicks', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    drag(handle(), 500, 220, 300);
    expect(sheet()).toHaveAttribute('data-detent', 'large');

    fireEvent.click(screen.getByRole('button', { name: 'Reduzir' }), { detail: 1 });
    expect(sheet()).toHaveAttribute('data-detent', 'large');

    screen.getByRole('button', { name: 'Reduzir' }).focus();
    await user.keyboard('{Enter}');
    expect(sheet()).toHaveAttribute('data-detent', 'medium');

    await user.click(screen.getByRole('button', { name: 'Expandir' }));
    expect(sheet()).toHaveAttribute('data-detent', 'large');
  });

  it('ignores secondary pointers', () => {
    render(<Harness />);

    fireEvent.pointerDown(handle(), { pointerId: 2, isPrimary: false, button: 0, clientY: 500 });
    fireEvent.pointerMove(handle(), { pointerId: 2, isPrimary: false, clientY: 200 });
    fireEvent.pointerUp(handle(), { pointerId: 2, isPrimary: false, clientY: 200 });

    expect(sheet()).toHaveAttribute('data-detent', 'medium');
    expect(bodyDrag()).toBe('');
  });

  it('ignores a second pointer while a gesture is active', () => {
    render(<Harness />);
    const target = handle();

    fireEvent.pointerDown(target, { pointerId: 1, isPrimary: true, button: 0, clientY: 500 });
    fireEvent.pointerDown(target, { pointerId: 2, isPrimary: true, button: 0, clientY: 500 });
    fireEvent.pointerMove(target, { pointerId: 2, isPrimary: true, clientY: 100 });
    fireEvent.pointerUp(target, { pointerId: 2, isPrimary: true, clientY: 100 });
    fireEvent.pointerUp(target, { pointerId: 1, isPrimary: true, clientY: 500 });

    expect(sheet()).toHaveAttribute('data-detent', 'medium');
  });

  it('cancels the gesture without resolving a release on pointercancel', () => {
    const onOpenChange = vi.fn();
    render(<Harness onOpenChange={onOpenChange} />);
    const target = handle();

    startDrag(target, 500, 200);
    expect(sheet()).toHaveAttribute('data-dragging');

    fireEvent.pointerCancel(target, { pointerId: 1, isPrimary: true, clientY: 200 });

    expect(sheet()).toHaveAttribute('data-detent', 'medium');
    expect(sheet()).not.toHaveAttribute('data-dragging');
    expect(bodyDrag()).toBe('');
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('cancels the gesture on lost pointer capture', () => {
    const onOpenChange = vi.fn();
    render(<Harness onOpenChange={onOpenChange} />);
    const target = handle();

    startDrag(target, 500, 200);
    fireEvent.lostPointerCapture(target, { pointerId: 1, isPrimary: true });

    expect(sheet()).toHaveAttribute('data-detent', 'medium');
    expect(sheet()).not.toHaveAttribute('data-dragging');
    expect(bodyDrag()).toBe('');
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('reopens at the initial detent after expanding and closing', async () => {
    const user = userEvent.setup();
    render(<Harness initialOpen={false} />);

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.click(screen.getByRole('button', { name: 'Expandir' }));
    expect(sheet()).toHaveAttribute('data-detent', 'large');

    fireEvent.click(screen.getByText('Fechar externo'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(sheet()).toHaveAttribute('data-detent', 'medium');
  });

  it('reopens at a custom initial detent', async () => {
    const user = userEvent.setup();
    render(<Harness initialOpen={false} initialDetent="large" />);

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(sheet()).toHaveAttribute('data-detent', 'large');

    await user.click(screen.getByRole('button', { name: 'Reduzir' }));
    expect(sheet()).toHaveAttribute('data-detent', 'medium');

    fireEvent.click(screen.getByText('Fechar externo'));
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(sheet()).toHaveAttribute('data-detent', 'large');
  });

  it('clears a drag when the sheet closes externally', () => {
    render(<Harness />);

    startDrag(handle(), 500, 300);
    expect(bodyDrag()).not.toBe('');

    fireEvent.click(screen.getByText('Fechar externo'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(bodyDrag()).toBe('');
  });

  it('clears the drag state on unmount', () => {
    const { unmount } = render(<Harness />);

    startDrag(handle(), 500, 300);
    expect(bodyDrag()).not.toBe('');

    unmount();

    expect(bodyDrag()).toBe('');
  });

  it('closes with Escape and returns focus to the opener', async () => {
    const user = userEvent.setup();
    render(<Harness initialOpen={false} />);
    const opener = screen.getByRole('button', { name: 'Abrir' });

    await user.click(opener);
    expect(sheet()).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('restores focus to the explicit return target', async () => {
    const user = userEvent.setup();
    const returnFocusRef = createRef<HTMLButtonElement>();
    render(<Harness initialOpen={false} returnFocusRef={returnFocusRef} />);

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.keyboard('{Escape}');

    await waitFor(() => expect(returnFocusRef.current).toHaveFocus());
  });

  it('captures the opener when it mounts already open', async () => {
    const user = userEvent.setup();
    render(<MountedOpenHarness />);
    const opener = screen.getByRole('button', { name: 'Abrir agora' });

    await user.click(opener);
    expect(sheet()).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('does not restore focus to a non-focusable return target', async () => {
    const user = userEvent.setup();
    const returnFocusRef = createRef<HTMLDivElement>();
    render(<Harness initialOpen={false} returnFocusRef={returnFocusRef} returnTargetNonFocusable />);
    const opener = screen.getByRole('button', { name: 'Abrir' });

    await user.click(opener);
    await user.keyboard('{Escape}');

    await waitFor(() => expect(opener).toHaveFocus());
    expect(returnFocusRef.current).not.toHaveFocus();
  });

  it('does not restore focus to the body', async () => {
    const user = userEvent.setup();
    const returnFocusRef = { current: document.body };
    render(<Harness initialOpen={false} returnFocusRef={returnFocusRef} attachReturnRef={false} />);
    const opener = screen.getByRole('button', { name: 'Abrir' });

    await user.click(opener);
    await user.keyboard('{Escape}');

    await waitFor(() => expect(opener).toHaveFocus());
    expect(document.body).not.toHaveFocus();
  });

  it('falls back to a valid opener when the explicit target is disabled', async () => {
    const user = userEvent.setup();
    const returnFocusRef = createRef<HTMLButtonElement>();
    render(<Harness initialOpen={false} returnFocusRef={returnFocusRef} returnTargetDisabled />);
    const opener = screen.getByRole('button', { name: 'Abrir' });

    await user.click(opener);
    await user.keyboard('{Escape}');

    await waitFor(() => expect(opener).toHaveFocus());
    expect(returnFocusRef.current).not.toHaveFocus();
  });

  it('does not restore focus to a disconnected return target', async () => {
    const user = userEvent.setup();
    const detached = document.createElement('button');
    detached.textContent = 'Desconectado';
    const returnFocusRef = { current: detached };
    render(<Harness initialOpen={false} returnFocusRef={returnFocusRef} attachReturnRef={false} />);
    const opener = screen.getByRole('button', { name: 'Abrir' });

    await user.click(opener);
    await user.keyboard('{Escape}');

    await waitFor(() => expect(opener).toHaveFocus());
    expect(detached.isConnected).toBe(false);
  });

  it('clears an active drag and follows the new geometry on resize', () => {
    render(<Harness />);
    const target = handle();

    startDrag(target, 500, 300);
    expect(bodyDrag()).not.toBe('');

    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
    fireEvent(window, new Event('resize'));

    expect(sheet()).toHaveAttribute('data-detent', 'medium');
    expect(sheet()).not.toHaveAttribute('data-dragging');
    expect(bodyDrag()).toBe('');
    expect(sheet().style.height).toBe('552px');
    expect(sheet().style.getPropertyValue('--detent-offset')).toBe('252px');
  });

  it('uses the visual viewport for height and compensates the visible bottom', () => {
    const listeners = new Map<string, Set<() => void>>();
    const viewport = {
      height: 600,
      offsetTop: 100,
      addEventListener(type: string, listener: () => void) {
        const set = listeners.get(type) ?? new Set();
        set.add(listener);
        listeners.set(type, set);
      },
      removeEventListener(type: string, listener: () => void) {
        listeners.get(type)?.delete(listener);
      },
    };
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });

    try {
      render(<Harness />);

      expect(sheet().style.height).toBe('552px');
      expect(sheet().style.bottom).toBe('100px');
      expect(sheet().style.getPropertyValue('--detent-offset')).toBe('252px');

      viewport.offsetTop = 0;
      act(() => {
        for (const listener of listeners.get('scroll') ?? []) listener();
      });

      expect(sheet().style.bottom).toBe('200px');
    } finally {
      Reflect.deleteProperty(window, 'visualViewport');
    }
  });

  it('uses the explicit initial detent while both detents are available', () => {
    render(<Harness initialDetent="large" />);

    expect(sheet()).toHaveAttribute('data-detent', 'large');
    expect(screen.getByRole('button', { name: 'Reduzir' })).toBeInTheDocument();
  });

  it('marks data-dragging only while a real drag is active', () => {
    render(<Harness />);

    startDrag(handle(), 500, 300);
    expect(sheet()).toHaveAttribute('data-dragging');

    finishDrag(handle(), 300);
    expect(sheet()).not.toHaveAttribute('data-dragging');
  });
});
