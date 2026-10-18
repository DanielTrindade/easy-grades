# Caneta — Fase 5 (sheets arrastáveis) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar as duas bottom sheets do app ("Meu semestre" e "Fluxograma pronto") por uma `DetentSheet` de vidro com alturas fixas (detents `medium` e `large`), grabber acessível e arrasto que assenta com mola ou fecha.

**Architecture:** A decisão de onde a sheet assenta é uma função pura (`resolveDetent`) que projeta a posição pela velocidade e escolhe o candidato mais próximo (cada detent ou "fechar"). A `DetentSheet` embrulha o `Sheet` do shadcn (Radix Dialog cuida de foco, Esc, `aria-modal` e retorno do foco) sem patch em `ui/sheet.tsx`: a posição vem de uma variável CSS (`--detent-offset`) aplicada como `transform`, e o `index.css` dá a transição de mola, a entrada/saída e o escurecimento que acompanha o arrasto. O arrasto só começa no grabber e no cabeçalho; o conteúdo rola normalmente.

**Tech Stack:** React 19, Radix Dialog (via shadcn `Sheet`), Tailwind CSS v4, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-16-caneta-rebranding-design.md` (seção 6 e linha 5 da seção 9).

**Pré-requisito:** fases 1 a 4 mergeadas em `main`. Usa: `glass`, `--glass-tint`, `rounded-sheet`, `--ease-spring-smooth`, `--ease-drawer`, `text-title3`, `Button`.

## Global Constraints

- Escopo: só `apps/web`. Nenhuma sheet nova: só as duas existentes.
- `src/components/ui/sheet.tsx` continua sem patch; o movimento das sheets mora no `index.css`, selecionado por `data-slot`/`data-state`/`data-detent`.
- Vaul não é usado (sem manutenção).
- Nomes em código em inglês; copy em PT-BR.
- Movimento reduzido: troca de detent sem mola (sem transição), entrada/saída só com fade.
- Alvos ≥ 44 px; o grabber é um botão com nome ("Expandir" / "Reduzir").
- Testes: `pnpm --filter @easy-grades/web exec vitest run --maxWorkers=2`; CSS lido com `readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'index.css'), 'utf8')`.
- Branch: `feat/caneta-sheets` a partir de `main`. Commits sem trailer de co-autoria de agente. `pnpm react-doctor:changed` sem erros.

## Review Focus

1. **Arrastar a lista de dentro da sheet** (catálogo de escolhidas, imagem do fluxograma): rola o conteúdo, não move a sheet. Testado no Task 2 (o arrasto no corpo não muda o detent).
2. **Puxão rápido para baixo a partir do `large`**: assenta no `medium`, não fecha de uma vez; um puxão rápido a partir do `medium` fecha. Testado no Task 1.
3. **Teclado e leitor de tela**: o grabber anuncia a ação certa e alterna a altura com Enter/Espaço; Esc fecha e o foco volta a quem abriu. Testado no Task 2.
4. **Soltar no meio do caminho entre dois detents**: assenta no mais próximo, sem ficar parado entre eles. Testado no Task 1.
5. **Reduzir transparência / aparência sólida**: a sheet fica opaca como o resto do vidro. Testado no Task 3 (regra de CSS).

---

### Task 1: `resolveDetent`

**Files:**
- Create: `apps/web/src/lib/detents.ts`
- Test: `apps/web/src/lib/detents.test.ts`

**Interfaces:**
- Produces:
  - `type Detent = 'medium' | 'large'`
  - `DETENT_FRACTION: Record<Detent, number>` = `{ medium: 0.5, large: 0.92 }` (fração da altura visível)
  - `detentTop(detent: Detent, viewportHeight: number): number` = `viewportHeight * (1 - DETENT_FRACTION[detent])`
  - `resolveDetent(input: { current: Detent; offset: number; velocity: number; viewportHeight: number; detents: readonly Detent[] }): Detent | 'close'` — `offset` em px (positivo = para baixo) desde o topo do detent atual; `velocity` em px/ms (positivo = para baixo).

- [ ] **Step 1: Criar a branch**

```bash
git checkout main
git pull --ff-only
git checkout -b feat/caneta-sheets
```

- [ ] **Step 2: Escrever o teste que falha**

`apps/web/src/lib/detents.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { detentTop, resolveDetent } from './detents';

const vh = 800;
const both = ['medium', 'large'] as const;

describe('detentTop', () => {
  it('places medium at half the screen and large near the top', () => {
    expect(detentTop('medium', vh)).toBe(400);
    expect(detentTop('large', vh)).toBeCloseTo(64);
  });
});

describe('resolveDetent', () => {
  it('stays put after a tiny drag', () => {
    expect(resolveDetent({ current: 'medium', offset: 10, velocity: 0, viewportHeight: vh, detents: both })).toBe('medium');
  });

  it('settles on the nearest detent when released between two', () => {
    expect(resolveDetent({ current: 'medium', offset: -250, velocity: 0, viewportHeight: vh, detents: both })).toBe('large');
    expect(resolveDetent({ current: 'medium', offset: -100, velocity: 0, viewportHeight: vh, detents: both })).toBe('medium');
  });

  it('closes when dragged well below the smallest detent', () => {
    expect(resolveDetent({ current: 'medium', offset: 260, velocity: 0, viewportHeight: vh, detents: both })).toBe('close');
  });

  it('closes on a fast downward flick from medium', () => {
    expect(resolveDetent({ current: 'medium', offset: 40, velocity: 1.5, viewportHeight: vh, detents: both })).toBe('close');
  });

  it('drops one detent, not all the way, on a fast flick from large', () => {
    expect(resolveDetent({ current: 'large', offset: 60, velocity: 1.5, viewportHeight: vh, detents: both })).toBe('medium');
  });

  it('expands on a fast upward flick', () => {
    expect(resolveDetent({ current: 'medium', offset: -40, velocity: -1.5, viewportHeight: vh, detents: both })).toBe('large');
  });

  it('only offers the detents the sheet has', () => {
    expect(resolveDetent({ current: 'large', offset: 300, velocity: 0, viewportHeight: vh, detents: ['large'] })).toBe('large');
    expect(resolveDetent({ current: 'large', offset: 450, velocity: 0, viewportHeight: vh, detents: ['large'] })).toBe('close');
  });
});
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/lib/detents.test.ts`
Expected: FAIL (módulo ausente).

- [ ] **Step 3: Implementar**

`apps/web/src/lib/detents.ts`:

```ts
export type Detent = 'medium' | 'large';

export const DETENT_FRACTION: Record<Detent, number> = { medium: 0.5, large: 0.92 };

// How far ahead a release is projected, in ms: a flick carries the sheet past where the finger let go.
const PROJECTION_MS = 150;

export function detentTop(detent: Detent, viewportHeight: number): number {
  return viewportHeight * (1 - DETENT_FRACTION[detent]);
}

interface ResolveInput {
  current: Detent;
  offset: number;
  velocity: number;
  viewportHeight: number;
  detents: readonly Detent[];
}

export function resolveDetent({ current, offset, velocity, viewportHeight, detents }: ResolveInput): Detent | 'close' {
  const projected = detentTop(current, viewportHeight) + offset + velocity * PROJECTION_MS;
  // A flick never skips a detent: from large it can reach medium at most, and only the smallest detent can close.
  const ordered = [...detents].sort((a, b) => DETENT_FRACTION[b] - DETENT_FRACTION[a]);
  const index = ordered.indexOf(current);
  const reachable = new Set<Detent | 'close'>([
    current,
    ...(index > 0 ? [ordered[index - 1]!] : []),
    ...(index < ordered.length - 1 ? [ordered[index + 1]!] : ['close' as const]),
  ]);

  let best: Detent | 'close' = current;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of reachable) {
    const top = candidate === 'close' ? viewportHeight : detentTop(candidate, viewportHeight);
    const distance = Math.abs(top - projected);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/lib/detents.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/detents.ts apps/web/src/lib/detents.test.ts
git commit -m "feat(web): detent resolution for draggable sheets"
```

---

### Task 2: `DetentSheet`

**Files:**
- Create: `apps/web/src/components/DetentSheet.tsx`
- Test: `apps/web/src/components/DetentSheet.test.tsx`

**Interfaces:**
- Consumes: `Detent`, `DETENT_FRACTION`, `resolveDetent` (Task 1); `Sheet`, `SheetContent`, `SheetDescription`, `SheetHeader`, `SheetTitle` de `@/components/ui/sheet`.
- Produces:
  - `DetentSheet(props: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: ReactNode; detents?: readonly Detent[]; initialDetent?: Detent; headerAction?: ReactNode; children: ReactNode })` — padrão `detents = ['medium', 'large']`, `initialDetent = detents[0]`.
  - Atributos no `SheetContent`: `data-detent="medium|large"` e `data-dragging` durante o arrasto; variável inline `--detent-offset` (ex.: `calc(42dvh + 0px)`).
  - Durante o arrasto, `document.body.style` recebe `--sheet-drag` (0 a 1, quanto a sheet desceu rumo a fechar); removido ao soltar.

- [ ] **Step 1: Escrever o teste que falha**

`apps/web/src/components/DetentSheet.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Detent } from '@/lib/detents';
import { DetentSheet } from './DetentSheet';

function Harness({ detents, onOpenChange }: { detents?: readonly Detent[]; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <DetentSheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange?.(next);
        }}
        title="Meu semestre"
        description="3 disciplinas, 12 créditos"
        detents={detents}
      >
        <ul aria-label="Escolhidas">
          <li>Cálculo II</li>
        </ul>
      </DetentSheet>
    </>
  );
}

function sheet() {
  return screen.getByRole('dialog', { name: 'Meu semestre' });
}

beforeEach(() => {
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
});

afterEach(() => {
  document.body.style.removeProperty('--sheet-drag');
});

function drag(target: Element, from: number, to: number, durationMs: number) {
  const now = vi.spyOn(performance, 'now');
  now.mockReturnValue(1000);
  fireEvent.pointerDown(target, { pointerId: 1, clientY: from, button: 0 });
  now.mockReturnValue(1000 + durationMs / 2);
  fireEvent.pointerMove(target, { pointerId: 1, clientY: (from + to) / 2 });
  now.mockReturnValue(1000 + durationMs);
  fireEvent.pointerMove(target, { pointerId: 1, clientY: to });
  fireEvent.pointerUp(target, { pointerId: 1, clientY: to });
  now.mockRestore();
}

describe('DetentSheet', () => {
  it('opens at medium as a glass dialog with its title and description', () => {
    render(<Harness />);
    expect(sheet()).toHaveAttribute('data-detent', 'medium');
    expect(sheet()).toHaveClass('glass', 'rounded-t-sheet');
    expect(screen.getByText('3 disciplinas, 12 créditos')).toBeInTheDocument();
  });

  it('toggles the detent from the grabber with the keyboard', async () => {
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

  it('has no grabber button with a single detent', () => {
    render(<Harness detents={['large']} />);
    expect(screen.queryByRole('button', { name: /Expandir|Reduzir/ })).not.toBeInTheDocument();
    expect(sheet()).toHaveAttribute('data-detent', 'large');
  });

  it('expands when the header is dragged up and closes on a fast flick down', () => {
    const onOpenChange = vi.fn();
    render(<Harness onOpenChange={onOpenChange} />);
    const header = screen.getByText('Meu semestre').closest('[data-sheet-handle]')!;
    drag(header, 500, 220, 300);
    expect(sheet()).toHaveAttribute('data-detent', 'large');
    drag(header, 120, 260, 60);
    expect(sheet()).toHaveAttribute('data-detent', 'medium');
    drag(header, 420, 500, 40);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('lets the content scroll instead of moving the sheet', () => {
    render(<Harness />);
    drag(screen.getByRole('list', { name: 'Escolhidas' }), 500, 200, 300);
    expect(sheet()).toHaveAttribute('data-detent', 'medium');
  });

  it('closes with Escape and returns focus to the opener', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Abrir' })).toHaveFocus();
  });
});
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/DetentSheet.test.tsx`
Expected: FAIL (módulo ausente).

- [ ] **Step 2: Implementar**

`apps/web/src/components/DetentSheet.tsx`:

```tsx
import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DETENT_FRACTION, resolveDetent, type Detent } from '@/lib/detents';
import { cn } from '@/lib/utils';

interface DetentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  detents?: readonly Detent[];
  initialDetent?: Detent;
  headerAction?: ReactNode;
  children: ReactNode;
}

const DEFAULT_DETENTS = ['medium', 'large'] as const;

interface DragState {
  startY: number;
  lastY: number;
  lastTime: number;
  velocity: number;
}

export function DetentSheet({
  open,
  onOpenChange,
  title,
  description,
  detents = DEFAULT_DETENTS,
  initialDetent,
  headerAction,
  children,
}: DetentSheetProps) {
  const [detent, setDetent] = useState<Detent>(initialDetent ?? detents[0]!);
  const [offset, setOffset] = useState(0);
  const drag = useRef<DragState | null>(null);
  const largest = Math.max(...detents.map((d) => DETENT_FRACTION[d]));
  const toggleable = detents.length > 1;

  function handleOpenChange(next: boolean) {
    if (next) setDetent(initialDetent ?? detents[0]!);
    onOpenChange(next);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { startY: event.clientY, lastY: event.clientY, lastTime: performance.now(), velocity: 0 };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state) return;
    const now = performance.now();
    const elapsed = Math.max(1, now - state.lastTime);
    state.velocity = (event.clientY - state.lastY) / elapsed;
    state.lastY = event.clientY;
    state.lastTime = now;
    const next = event.clientY - state.startY;
    setOffset(next);
    const distanceToClose = window.innerHeight * DETENT_FRACTION[detent];
    document.body.style.setProperty('--sheet-drag', String(Math.min(1, Math.max(0, next / distanceToClose))));
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state) return;
    drag.current = null;
    document.body.style.removeProperty('--sheet-drag');
    const result = resolveDetent({
      current: detent,
      offset: event.clientY - state.startY,
      velocity: state.velocity,
      viewportHeight: window.innerHeight,
      detents,
    });
    setOffset(0);
    if (result === 'close') onOpenChange(false);
    else setDetent(result);
  }

  const dragging = drag.current !== null;
  const style = {
    height: `${largest * 100}dvh`,
    '--detent-offset': `calc(${(largest - DETENT_FRACTION[detent]) * 100}dvh + ${Math.max(offset, -window.innerHeight)}px)`,
  } as CSSProperties;
  const handlers = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        data-detent={detent}
        data-dragging={dragging || undefined}
        style={style}
        className="glass gap-0 rounded-t-sheet border-x-0 border-b-0 p-0 shadow-none"
      >
        <div data-sheet-handle className="touch-none select-none px-5 pt-2 pb-3" {...handlers}>
          {toggleable ? (
            <button
              type="button"
              aria-label={detent === 'large' ? 'Reduzir' : 'Expandir'}
              onClick={() => setDetent(detent === 'large' ? 'medium' : 'large')}
              className="mx-auto flex h-6 w-16 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span aria-hidden className="h-1.5 w-10 rounded-full bg-ink-muted/40" />
            </button>
          ) : (
            <span aria-hidden className="mx-auto mt-2 mb-1 block h-1.5 w-10 rounded-full bg-ink-muted/40" />
          )}
          <div className="mt-1 flex items-start justify-between gap-3">
            <SheetHeader className="p-0">
              <SheetTitle className="text-title3">{title}</SheetTitle>
              {description && <SheetDescription>{description}</SheetDescription>}
            </SheetHeader>
            {headerAction}
          </div>
        </div>
        <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]')}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

(`drag.current` não dispara render; o `data-dragging` acompanha porque `setOffset` re-renderiza a cada movimento. Se o React Doctor apontar a leitura do ref no render, trocar por um `useState<boolean>` `dragging` ligado em `onPointerDown`/`onPointerUp`.)

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/DetentSheet.test.tsx`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/DetentSheet.tsx apps/web/src/components/DetentSheet.test.tsx
git commit -m "feat(web): draggable glass sheet with medium and large detents"
```

---

### Task 3: Movimento e vidro das sheets no CSS

**Files:**
- Modify: `apps/web/src/styles/index.css`
- Test: `apps/web/src/styles/sheet.test.ts`

**Interfaces:**
- Consumes: `data-detent`, `data-dragging`, `--detent-offset`, `--sheet-drag` (Task 2).

- [ ] **Step 1: Teste que falha**

`apps/web/src/styles/sheet.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'index.css'), 'utf8');

function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Missing rule ${selector}`);
  return css.slice(start, css.indexOf('}', start));
}

describe('detent sheet styles', () => {
  it('positions the sheet from --detent-offset and settles it with the smooth spring', () => {
    const base = rule("[data-slot='sheet-content'][data-detent]");
    expect(base).toContain('transform: translateY(var(--detent-offset));');
    expect(base).toContain('transition: transform 380ms var(--ease-spring-smooth);');
  });

  it('follows the finger without a transition while dragging', () => {
    expect(rule("[data-slot='sheet-content'][data-detent][data-dragging]")).toContain('transition: none;');
  });

  it('turns the large sheet almost opaque', () => {
    expect(rule("[data-slot='sheet-content'][data-detent='large']")).toContain(
      '--glass-tint: color-mix(in oklab, var(--surface) 97%, transparent);',
    );
  });

  it('keeps the solid appearance solid on the large sheet too', () => {
    expect(rule(":root[data-appearance='solid'] [data-slot='sheet-content'][data-detent='large']")).toContain(
      '--glass-tint: var(--surface);',
    );
  });

  it('lightens the overlay as the sheet is dragged down', () => {
    expect(rule("[data-slot='sheet-overlay']")).toContain('calc(0.4 * (1 - var(--sheet-drag, 0)))');
  });
});
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/styles/sheet.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implementar**

No `index.css`, logo depois das regras atuais das sheets (`[data-slot='sheet-overlay'][data-state='closed'] { ... }`), acrescentar:

```css
/* Detent sheets (DetentSheet): the position is a transform from --detent-offset, so dragging and settling never relayout. */
[data-slot='sheet-content'][data-detent] {
  transform: translateY(var(--detent-offset));
  transition: transform 380ms var(--ease-spring-smooth);
}
[data-slot='sheet-content'][data-detent][data-dragging] {
  transition: none;
}
@keyframes detent-in {
  from {
    transform: translateY(100%);
  }
}
@keyframes detent-out {
  to {
    transform: translateY(100%);
  }
}
[data-slot='sheet-content'][data-detent][data-state='open'] {
  animation: detent-in 300ms var(--ease-drawer) backwards;
}
[data-slot='sheet-content'][data-detent][data-state='closed'] {
  animation: detent-out 200ms var(--ease-drawer) forwards;
}
/* Pulled up to large, the sheet becomes the task, so the glass turns almost opaque (iOS does the same). */
[data-slot='sheet-content'][data-detent='large'] {
  --glass-tint: color-mix(in oklab, var(--surface) 97%, transparent);
}
:root[data-appearance='solid'] [data-slot='sheet-content'][data-detent='large'] {
  --glass-tint: var(--surface);
}
/* The dimming fades as the sheet is dragged toward closing; Radix animates opacity, so the color carries the drag. */
[data-slot='sheet-overlay'] {
  background-color: rgb(0 0 0 / calc(0.4 * (1 - var(--sheet-drag, 0))));
}
```

E no `@media (prefers-reduced-motion: reduce)`:

```css
  [data-slot='sheet-content'][data-detent] {
    transition: none;
  }
  [data-slot='sheet-content'][data-detent][data-state='open'],
  [data-slot='sheet-content'][data-detent][data-state='closed'] {
    animation-name: sheet-fade-in;
    animation-duration: 150ms;
  }
  [data-slot='sheet-content'][data-detent][data-state='closed'] {
    animation-name: sheet-fade-out;
  }
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/styles/sheet.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/styles
git commit -m "feat(web): spring settling, drag-following dimming and glass for detent sheets"
```

---

### Task 4: Aplicar às duas sheets

**Files:**
- Modify: `apps/web/src/features/planning/PlanningScreen.tsx` (sheet "Meu semestre")
- Modify: `apps/web/src/features/flowchart/ExportSheet.tsx`
- Test: `PlanningScreen.test.tsx`, `FlowchartScreen.test.tsx` (os testes existentes da sheet devem continuar verdes; acrescentar um caso cada)

**Interfaces:**
- Consumes: `DetentSheet` (Task 2).

- [ ] **Step 1: Testes que falham**

`PlanningScreen.test.tsx` (no `describe` existente, abaixo de lg):

```tsx
  it('opens Meu semestre as a medium detent sheet that can expand', async () => {
    setDesktop(false);
    const user = userEvent.setup();
    render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    await user.click(await screen.findByRole('button', { name: /CR projetado/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Meu semestre' });
    expect(dialog).toHaveAttribute('data-detent', 'medium');
    expect(within(dialog).getByRole('button', { name: 'Expandir' })).toBeInTheDocument();
  });
```

`FlowchartScreen.test.tsx` (perto dos testes que abrem "Fluxograma pronto"):

```tsx
  it('shows the exported image in a large detent sheet', async () => {
    // reproduzir o caminho que os testes existentes usam para abrir a ExportSheet num toque
    const dialog = await openExportSheet();
    expect(dialog).toHaveAttribute('data-detent', 'large');
  });
```

(`openExportSheet` = o mesmo passo a passo que os testes atuais de "Salvar ou compartilhar" usam; extrair num helper local se ainda não houver.)

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/planning src/features/flowchart`
Expected: FAIL nos dois casos novos.

- [ ] **Step 2: Implementar**

`PlanningScreen.tsx`: trocar o bloco `<Sheet open={sheetOpen} ...> ... </Sheet>` por:

```tsx
          <DetentSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            title="Meu semestre"
            description={`${summary}, máximo ${maxCredits}`}
            headerAction={
              <Button variant="ghost" className="rounded-full max-md:h-11" onClick={() => setSheetOpen(false)}>
                Fechar
              </Button>
            }
          >
            {panel}
          </DetentSheet>
```

(import `DetentSheet` de `@/components/DetentSheet`; remover os imports de `Sheet*` e `SheetClose` que ficarem sem uso.)

`ExportSheet.tsx`: trocar `<Sheet ...><SheetContent ...> ... </SheetContent></Sheet>` por `<DetentSheet open={image !== null} onOpenChange={(open) => !open && onClose()} title="Fluxograma pronto" description={...mesmo texto...} detents={['large']}>`, com o conteúdo (imagem e botões) como `children`; o grabber decorativo e o `SheetHeader` próprios saem (a `DetentSheet` já tem); a imagem passa a `rounded-group border border-hairline`.

Run: `pnpm --filter @easy-grades/web exec vitest run --maxWorkers=2 src/features/planning src/features/flowchart`
Expected: PASS (os testes antigos de "Meu semestre", "Salvar ou compartilhar" e "Baixar imagem" continuam verdes).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/planning/PlanningScreen.tsx apps/web/src/features/planning/PlanningScreen.test.tsx apps/web/src/features/flowchart/ExportSheet.tsx apps/web/src/features/flowchart/FlowchartScreen.test.tsx
git commit -m "feat(web): Meu semestre and the PNG export in detent sheets"
```

---

### Task 5: Documentação e verificação

- [ ] **Step 1: `CLAUDE.md`**

Substituir o item "`sheet.tsx` is unpatched..." da lista de patches do shadcn por:

```markdown
  - `sheet.tsx` is unpatched. Bottom sheets go through `DetentSheet` (`components/DetentSheet.tsx`): detents `medium` (50%) and `large` (92%), an accessible grabber ("Expandir" / "Reduzir"), dragging only from the grabber and header, and `resolveDetent` (`lib/detents.ts`, pure, tested) deciding where a release settles (a flick never skips a detent; only the smallest can close). Its motion lives in `index.css` under `[data-slot='sheet-content'][data-detent]` (transform from `--detent-offset`, smooth spring, `data-dragging` turns the transition off) and the overlay dims by `--sheet-drag`; don't add motion classes to the component.
```

E na seção "Planejamento": a sheet "Meu semestre" é uma `DetentSheet` que abre em `medium`.

- [ ] **Step 2: React Doctor e verificação**

`pnpm react-doctor:changed` (0 erros); `pnpm --filter @easy-grades/web exec vitest run --maxWorkers=2 && pnpm typecheck && pnpm lint && pnpm build` (PASS).

- [ ] **Step 3: Verificação manual (iPhone real e 390 px no DevTools com toque)**
- "Meu semestre": abre na metade; arrastar pelo cabeçalho para cima vai a 92% e o vidro fica quase opaco; um puxão rápido para baixo volta à metade; outro fecha; o fundo clareia acompanhando o dedo; rolar a lista dentro dela não move a sheet.
- Exportar PNG num toque: sheet grande; arrastar para baixo fecha.
- VoiceOver: o grabber lê "Expandir"/"Reduzir"; Esc (teclado) fecha e o foco volta.
- Movimento reduzido: sem mola; entrada e saída só com fade.

- [ ] **Step 4: Commit e revisão**

```bash
git add CLAUDE.md
git commit -m "docs: detent sheet conventions"
```

Revisão da branch inteira (Opus 5.5, médio); `gh auth status`, push, PR, merge `--no-ff`.

## Ordem e paralelismo

Task 1 → Task 2 → Task 4 em sequência (cada uma usa a anterior). Task 3 (só CSS) pode rodar em paralelo com Task 2. Task 5 por último.
