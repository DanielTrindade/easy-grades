# Caneta — Fase 2 (navegação) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a casca de navegação do app pela da identidade "Caneta": tab bar de vidro flutuante que encolhe ao rolar, título grande por tela com header compacto de vidro no mobile, header de vidro com seletor em cápsula no desktop, menu ⋯ com a preferência de aparência, toasts de vidro e um espaço inferior (`--bottom-chrome`) único para tab bar, barra do semestre e toasts.

**Architecture:** A lógica de rolagem é uma função pura (`reduceScroll`) com um hook fino por cima. O espaço inferior é declarado em CSS a partir de data-attributes no `<body>` (`data-tab-bar`, `data-bottom-accessory`), que os componentes ligam com um hook (`useBodyData`). O `Dashboard` escolhe por media query o que montar (tab bar + header compacto no mobile, header de vidro no desktop), então só um conjunto de navegação existe no DOM de cada vez. Cada tela perde seu `h1` próprio; o título vem da casca.

**Tech Stack:** React 19, Tailwind CSS v4, shadcn 4 (Radix dropdown), Sonner, Vitest + Testing Library (jsdom), pnpm 11.

**Spec:** `docs/superpowers/specs/2026-10-16-caneta-rebranding-design.md` (seção 4 e linha 2 da seção 9).

**Pré-requisito:** a fase 1 (`docs/superpowers/plans/2026-10-16-caneta-foundation.md`) mergeada em `main`. Esta fase usa dela: os tokens (`pen`, `pen-ink`, `pen-tint`, `ink`, `ink-muted`, `surface`, `canvas`, `hairline`), os tokens de vidro (`--glass-tint`, `--glass-edge`, `--glass-shadow`, `--glass-filter`), o utilitário `glass`, `--ease-spring-snappy`, `--radius-group`, `text-large-title`, `text-headline`, `text-footnote`, e `useAppearance` / `type Appearance` de `@/lib/appearance`.

## Global Constraints

- Escopo: só `apps/web`. API, `packages/core` e regras de domínio não mudam.
- Todo nome em código em inglês. Copy em PT-BR, sentence case, sem "→".
- Comentários só para o "porquê" não óbvio; sem código comentado; sem docstrings novas não pedidas.
- Vidro (`glass` ou as regras de vidro do `index.css`) só na camada de navegação: tab bar, header compacto, header desktop, botão ⋯, menus, barra do semestre, toasts. Nunca em cartões, listas, gráficos ou nós; nunca vidro sobre vidro.
- Alvos de toque ≥ 44 px. Status sempre ícone + texto.
- Movimento reduzido: sem translação/mola; fades ≤ 150 ms.
- Sem CDN, sem script inline (CSP `script-src 'self'`).
- `src/components/ui/` não recebe patch novo nesta fase (menus e toasts são estilizados pelo `index.css` e por props).
- Branch: `feat/caneta-navigation` a partir de `main` (com a fase 1 já mergeada). Nunca alterar `git config`.
- Toda mensagem de commit termina com a linha `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Antes da revisão: `pnpm react-doctor:changed` sem erros.
- No Windows, se o shim `pnpm` do bash falhar, usar `pnpm.cmd` com os mesmos argumentos.

## Review Focus

1. **Usuário de teclado com a tab bar encolhida.** Ao dar Tab até a pílula, ela precisa expandir e o foco cair no link da seção atual, sem se perder no `body`. Testado no Task 3.
2. **Rolagem tremida perto do limiar** (inércia do iOS, rolagem de 1–2 px): a tab bar não pode piscar entre expandida e encolhida. Testado no Task 1.
3. **Toast aparecendo com a tab bar encolhida ou com a barra do semestre:** ele nunca cobre a navegação. Testado no Task 2 (fórmula do `--bottom-chrome`) e no Task 3 (o atributo acompanha o estado).
4. **Girar o celular / redimensionar além de md:** a tab bar desmonta e o atributo `data-tab-bar` sai do `body`, para o espaço inferior não ficar reservado à toa. Testado no Task 3.
5. **Leitor de tela:** cada tela tem exatamente um `h1`, e o título repetido no header compacto não é lido duas vezes. Testado no Task 4 e no Task 6.

---

### Task 1: `useScrollMinimize`

**Files:**
- Create: `apps/web/src/lib/use-scroll-minimize.ts`
- Test: `apps/web/src/lib/use-scroll-minimize.test.ts`

**Interfaces:**
- Produces:
  - `interface ScrollState { minimized: boolean; anchorY: number; lastY: number }`
  - `MINIMIZE_THRESHOLD = 48`, `MINIMIZE_HYSTERESIS = 16`
  - `INITIAL_SCROLL_STATE: ScrollState`
  - `reduceScroll(state: ScrollState, y: number): ScrollState`
  - `useScrollMinimize(enabled: boolean): { minimized: boolean; expand: () => void }`

- [ ] **Step 1: Criar a branch**

```bash
git checkout main
git pull --ff-only
git checkout -b feat/caneta-navigation
```

- [ ] **Step 2: Escrever o teste que falha**

`apps/web/src/lib/use-scroll-minimize.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_SCROLL_STATE, reduceScroll, useScrollMinimize, type ScrollState } from './use-scroll-minimize';

function run(...ys: number[]): ScrollState {
  return ys.reduce(reduceScroll, INITIAL_SCROLL_STATE);
}

describe('reduceScroll', () => {
  it('stays expanded above the 48 px threshold, however it scrolls', () => {
    expect(run(10, 30, 47).minimized).toBe(false);
  });

  it('minimizes after 16 px of downward travel past the threshold', () => {
    expect(run(30, 46).minimized).toBe(false);
    expect(run(30, 60).minimized).toBe(true);
  });

  it('ignores small reversals (iOS inertia, 1–2 px jitter)', () => {
    const minimized = run(30, 200, 400);
    expect(minimized.minimized).toBe(true);
    expect(run(30, 200, 400, 398, 401, 395).minimized).toBe(true);
  });

  it('expands after 16 px of upward travel', () => {
    expect(run(30, 200, 400, 390).minimized).toBe(true);
    expect(run(30, 200, 400, 390, 383).minimized).toBe(false);
  });

  it('expands again near the top', () => {
    expect(run(30, 200, 400, 40).minimized).toBe(false);
  });

  it('measures travel from the last turning point, not from the start', () => {
    const upThenDown = run(30, 400, 380, 370, 380, 390);
    expect(upThenDown.minimized).toBe(true);
  });
});

describe('useScrollMinimize', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
  });

  function scrollTo(y: number) {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
  }

  it('minimizes on a downward scroll and expands on demand', () => {
    const { result } = renderHook(() => useScrollMinimize(true));
    scrollTo(30);
    scrollTo(300);
    expect(result.current.minimized).toBe(true);
    act(() => result.current.expand());
    expect(result.current.minimized).toBe(false);
  });

  it('measures the next minimize from where expand happened', () => {
    const { result } = renderHook(() => useScrollMinimize(true));
    scrollTo(30);
    scrollTo(300);
    act(() => result.current.expand());
    scrollTo(310);
    expect(result.current.minimized).toBe(false);
    scrollTo(320);
    expect(result.current.minimized).toBe(true);
  });

  it('never minimizes when disabled', () => {
    const { result } = renderHook(() => useScrollMinimize(false));
    scrollTo(30);
    scrollTo(600);
    expect(result.current.minimized).toBe(false);
  });

  it('stops listening on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useScrollMinimize(true));
    unmount();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/lib/use-scroll-minimize.test.ts`
Expected: FAIL (`Failed to resolve import "./use-scroll-minimize"`).

- [ ] **Step 4: Implementar**

`apps/web/src/lib/use-scroll-minimize.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

export interface ScrollState {
  minimized: boolean;
  anchorY: number;
  lastY: number;
}

export const MINIMIZE_THRESHOLD = 48;
export const MINIMIZE_HYSTERESIS = 16;
export const INITIAL_SCROLL_STATE: ScrollState = { minimized: false, anchorY: 0, lastY: 0 };

export function reduceScroll(state: ScrollState, y: number): ScrollState {
  if (y < MINIMIZE_THRESHOLD) return { minimized: false, anchorY: y, lastY: y };
  const goingDown = y > state.lastY;
  const wasGoingDown = state.lastY >= state.anchorY;
  // Travel counts from the last turning point, so inertia and 1–2 px jitter never flip the state.
  const anchorY = goingDown === wasGoingDown ? state.anchorY : state.lastY;
  const travel = y - anchorY;
  if (travel > MINIMIZE_HYSTERESIS) return { minimized: true, anchorY, lastY: y };
  if (travel < -MINIMIZE_HYSTERESIS) return { minimized: false, anchorY, lastY: y };
  return { minimized: state.minimized, anchorY, lastY: y };
}

export function useScrollMinimize(enabled: boolean): { minimized: boolean; expand: () => void } {
  const [minimized, setMinimized] = useState(false);
  const state = useRef(INITIAL_SCROLL_STATE);

  useEffect(() => {
    const y = window.scrollY;
    state.current = { minimized: false, anchorY: y, lastY: y };
    if (!enabled) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        state.current = reduceScroll(state.current, window.scrollY);
        setMinimized(state.current.minimized);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [enabled]);

  const expand = useCallback(() => {
    const y = window.scrollY;
    state.current = { minimized: false, anchorY: y, lastY: y };
    setMinimized(false);
  }, []);

  return { minimized: enabled && minimized, expand };
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/lib/use-scroll-minimize.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/use-scroll-minimize.ts apps/web/src/lib/use-scroll-minimize.test.ts
git commit -m "feat(web): scroll minimize state with hysteresis" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Espaço inferior (`--bottom-chrome`) e a barra do semestre

**Files:**
- Create: `apps/web/src/lib/body-data.ts`
- Modify: `apps/web/src/styles/index.css` (bloco de toasts e novo bloco do espaço inferior)
- Modify: `apps/web/src/features/planning/PlanningScreen.tsx` (efeito `summaryBar` e classe da barra fixa)
- Modify: `apps/web/src/features/planning/PlanningScreen.test.tsx` (os dois testes de `data-summary-bar`)
- Test: `apps/web/src/lib/body-data.test.ts`, `apps/web/src/styles/chrome.test.ts`

**Interfaces:**
- Produces:
  - `type BodyDataKey = 'tabBar' | 'bottomAccessory'`
  - `useBodyData(key: BodyDataKey, value: string | null): void` — escreve `document.body.dataset[key] = value` enquanto montado e com valor não nulo; remove ao desmontar ou quando o valor vira `null`.
  - CSS: `--tab-bar-space`, `--accessory-space`, `--bottom-chrome` no `body`; `body[data-tab-bar='expanded'|'minimized']` e `body[data-bottom-accessory]` os alimentam.

- [ ] **Step 1: Escrever os testes que falham**

`apps/web/src/lib/body-data.test.ts`:

```ts
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useBodyData } from './body-data';

afterEach(() => {
  delete document.body.dataset.tabBar;
  delete document.body.dataset.bottomAccessory;
});

describe('useBodyData', () => {
  it('sets the body data attribute while mounted and removes it on unmount', () => {
    const { unmount } = renderHook(() => useBodyData('tabBar', 'expanded'));
    expect(document.body).toHaveAttribute('data-tab-bar', 'expanded');
    unmount();
    expect(document.body).not.toHaveAttribute('data-tab-bar');
  });

  it('follows value changes', () => {
    const { rerender } = renderHook(({ value }) => useBodyData('tabBar', value), { initialProps: { value: 'expanded' } });
    rerender({ value: 'minimized' });
    expect(document.body).toHaveAttribute('data-tab-bar', 'minimized');
  });

  it('removes the attribute when the value becomes null', () => {
    const { rerender } = renderHook(({ value }: { value: string | null }) => useBodyData('bottomAccessory', value), {
      initialProps: { value: '' as string | null },
    });
    expect(document.body).toHaveAttribute('data-bottom-accessory', '');
    rerender({ value: null });
    expect(document.body).not.toHaveAttribute('data-bottom-accessory');
  });
});
```

`apps/web/src/styles/chrome.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import css from './index.css?raw';

function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Missing rule ${selector}`);
  return css.slice(start, css.indexOf('}', start));
}

describe('bottom chrome', () => {
  it('sums the tab bar and the screen accessory into one variable', () => {
    const body = rule('body');
    expect(body).toContain('--tab-bar-space: 0px;');
    expect(body).toContain('--accessory-space: 0px;');
    expect(body).toContain('--bottom-chrome: calc(var(--tab-bar-space) + var(--accessory-space));');
  });

  it('reserves room for the expanded and the minimized tab bar', () => {
    expect(rule("body[data-tab-bar='expanded']")).toContain('--tab-bar-space: 4.25rem;');
    expect(rule("body[data-tab-bar='minimized']")).toContain('--tab-bar-space: 3.75rem;');
  });

  it('reserves room for a screen accessory such as the Meu semestre bar', () => {
    expect(rule('body[data-bottom-accessory]')).toContain('--accessory-space: 3.75rem;');
  });

  it('keeps toasts above all of it', () => {
    expect(rule("[data-sonner-toaster][data-y-position='bottom']")).toContain(
      'bottom: calc(var(--bottom-chrome) + 1.5rem + env(safe-area-inset-bottom)) !important;',
    );
    expect(css).not.toContain('data-summary-bar');
  });
});
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/lib/body-data.test.ts src/styles/chrome.test.ts`
Expected: FAIL (módulo ausente; regras ausentes).

- [ ] **Step 2: Implementar `useBodyData`**

`apps/web/src/lib/body-data.ts`:

```ts
import { useEffect } from 'react';

export type BodyDataKey = 'tabBar' | 'bottomAccessory';

export function useBodyData(key: BodyDataKey, value: string | null): void {
  useEffect(() => {
    if (value === null) return;
    document.body.dataset[key] = value;
    return () => {
      delete document.body.dataset[key];
    };
  }, [key, value]);
}
```

- [ ] **Step 3: CSS do espaço inferior**

No `apps/web/src/styles/index.css`, substituir o bloco inteiro de toasts (o comentário `/* Toasts clear the fixed bottom chrome. ...` e as duas `@media` que seguem, com `body[data-summary-bar]`) por:

```css
/* Fixed chrome under the content: the floating tab bar (below md) and a screen accessory such as the "Meu semestre"
   bar (below lg). Their heights live here so the main padding, the accessory and the toasts stay in step. */
body {
  --tab-bar-space: 0px;
  --accessory-space: 0px;
  --bottom-chrome: calc(var(--tab-bar-space) + var(--accessory-space));
}
@media (max-width: 47.99rem) {
  body[data-tab-bar='expanded'] {
    --tab-bar-space: 4.25rem;
  }
  body[data-tab-bar='minimized'] {
    --tab-bar-space: 3.75rem;
  }
}
@media (max-width: 63.99rem) {
  body[data-bottom-accessory] {
    --accessory-space: 3.75rem;
  }
}
/* Sonner sets its offsets as inline custom properties, so bottom is set directly. */
[data-sonner-toaster][data-y-position='bottom'] {
  bottom: calc(var(--bottom-chrome) + 1.5rem + env(safe-area-inset-bottom)) !important;
}
```

(As alturas: tab bar 56 px + 12 px de folga = 4,25 rem; pílula encolhida 48 + 12 = 3,75 rem; barra do semestre 52 + 8 = 3,75 rem.)

- [ ] **Step 4: A barra do semestre usa o espaço comum**

Em `apps/web/src/features/planning/PlanningScreen.tsx`:

1. Importar `import { useBodyData } from '@/lib/body-data';`.
2. Substituir o efeito inteiro que escreve `document.body.dataset.summaryBar` (o `useEffect` com o comentário "The summary bar is fixed above the tab bar below lg...") por:

```tsx
  useBodyData('bottomAccessory', desktop ? null : '');
```

3. Na `<div className="grid gap-12 max-lg:pb-16">` raiz do board, trocar por `<div className="grid gap-12">` (o padding inferior passa a vir do `main`, Task 6).
4. Na classe do `<button type="button" aria-haspopup="dialog" ...>` da barra fixa, trocar a string inteira por:

```tsx
            className="glass fixed inset-x-[max(0.75rem,env(safe-area-inset-left))] bottom-[calc(var(--tab-bar-space)+0.5rem+env(safe-area-inset-bottom))] z-30 flex h-13 items-center justify-between gap-3 rounded-full px-5 text-left text-sm transition-[bottom] duration-200 ease-snap motion-reduce:transition-none"
```

Em `apps/web/src/features/planning/PlanningScreen.test.tsx`, nos dois testes de `data-summary-bar`:
- trocar os títulos por `'flags the body while the summary bar is shown, so the bottom chrome clears it'` e `'does not flag the body at lg and up, where the summary bar is not shown'`;
- trocar toda ocorrência de `'data-summary-bar'` por `'data-bottom-accessory'`.

- [ ] **Step 5: Rodar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/lib/body-data.test.ts src/styles/chrome.test.ts src/features/planning`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/body-data.ts apps/web/src/lib/body-data.test.ts apps/web/src/styles/index.css apps/web/src/styles/chrome.test.ts apps/web/src/features/planning/PlanningScreen.tsx apps/web/src/features/planning/PlanningScreen.test.tsx
git commit -m "feat(web): one bottom chrome space for the tab bar, the semester bar and toasts" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: `TabBar`

**Files:**
- Create: `apps/web/src/components/section-icons.ts`, `apps/web/src/components/TabBar.tsx`
- Modify: `apps/web/src/styles/index.css` (regra `.tab-indicator`)
- Test: `apps/web/src/components/TabBar.test.tsx`

**Interfaces:**
- Consumes: `useScrollMinimize(enabled)` (Task 1), `useBodyData('tabBar', value)` (Task 2), `VIEWS`, `VIEW_LABELS`, `type View` de `@/lib/use-hash-view`.
- Produces:
  - `SECTION_ICONS: Record<View, LucideIcon>` (Task 6 reaproveita no `SectionNav`).
  - `TabBar(props: { view: View })` — `<nav aria-label="Seções">` fixa; liga `body[data-tab-bar]`.
  - classe CSS `.tab-indicator` (pílula deslizante; Task 6 reaproveita).

- [ ] **Step 1: Escrever o teste que falha**

`apps/web/src/components/TabBar.test.tsx`:

```tsx
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TabBar } from './TabBar';

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
});

describe('TabBar', () => {
  it('lists the four sections as links and marks the current one', () => {
    render(<TabBar view="disciplinas" />);
    const nav = screen.getByRole('navigation', { name: 'Seções' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Visão geral', 'Fluxograma', 'Disciplinas', 'Planejamento']);
    expect(within(nav).getByRole('link', { name: 'Disciplinas' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Visão geral' })).not.toHaveAttribute('aria-current');
  });

  it('slides the indicator under the current section', () => {
    const { container } = render(<TabBar view="planejamento" />);
    expect(container.querySelector('.tab-indicator')).toHaveStyle({ transform: 'translateX(300%)' });
  });

  it('flags the body as expanded, then minimized after a downward scroll', () => {
    render(<TabBar view="disciplinas" />);
    expect(document.body).toHaveAttribute('data-tab-bar', 'expanded');
    scrollTo(30);
    scrollTo(300);
    expect(document.body).toHaveAttribute('data-tab-bar', 'minimized');
  });

  it('minimizes to one button that names the current section and hides the other links', () => {
    render(<TabBar view="disciplinas" />);
    scrollTo(30);
    scrollTo(300);
    const pill = screen.getByRole('button', { name: 'Disciplinas: mostrar seções' });
    expect(pill).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('expands when the pill is tapped and moves focus to the current section', async () => {
    const user = userEvent.setup();
    render(<TabBar view="disciplinas" />);
    scrollTo(30);
    scrollTo(300);
    await user.click(screen.getByRole('button', { name: 'Disciplinas: mostrar seções' }));
    expect(screen.getByRole('link', { name: 'Disciplinas' })).toHaveFocus();
    expect(document.body).toHaveAttribute('data-tab-bar', 'expanded');
  });

  it('expands when keyboard focus reaches the pill', async () => {
    const user = userEvent.setup();
    render(<TabBar view="visao-geral" />);
    scrollTo(30);
    scrollTo(300);
    await user.tab();
    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveFocus();
  });

  it('never minimizes on the flowchart, whose canvas does not scroll the page', () => {
    render(<TabBar view="fluxograma" />);
    scrollTo(30);
    scrollTo(600);
    expect(screen.getAllByRole('link')).toHaveLength(4);
    expect(document.body).toHaveAttribute('data-tab-bar', 'expanded');
  });

  it('frees the bottom space when it unmounts (rotation or resize past md)', () => {
    const { unmount } = render(<TabBar view="disciplinas" />);
    unmount();
    expect(document.body).not.toHaveAttribute('data-tab-bar');
  });
});
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/TabBar.test.tsx`
Expected: FAIL (`Failed to resolve import "./TabBar"`).

- [ ] **Step 2: Ícones das seções**

`apps/web/src/components/section-icons.ts`:

```ts
import { BookOpen, CalendarDays, LayoutDashboard, Workflow, type LucideIcon } from 'lucide-react';
import type { View } from '@/lib/use-hash-view';

export const SECTION_ICONS: Record<View, LucideIcon> = {
  'visao-geral': LayoutDashboard,
  fluxograma: Workflow,
  disciplinas: BookOpen,
  planejamento: CalendarDays,
};
```

- [ ] **Step 3: Implementar `TabBar`**

`apps/web/src/components/TabBar.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { SECTION_ICONS } from '@/components/section-icons';
import { useBodyData } from '@/lib/body-data';
import { VIEW_LABELS, VIEWS, type View } from '@/lib/use-hash-view';
import { useScrollMinimize } from '@/lib/use-scroll-minimize';
import { cn } from '@/lib/utils';

export function TabBar({ view }: { view: View }) {
  const { minimized, expand } = useScrollMinimize(view !== 'fluxograma');
  const currentLink = useRef<HTMLAnchorElement>(null);
  const focusOnExpand = useRef(false);
  useBodyData('tabBar', minimized ? 'minimized' : 'expanded');

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
          onClick={reveal}
          onFocus={reveal}
          className="flex h-12 animate-in items-center gap-2 rounded-full px-4 text-sm font-semibold text-pen-ink outline-none fade-in zoom-in-95 duration-200 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <CurrentIcon aria-hidden className="size-5 fill-current/15" />
          {VIEW_LABELS[view]}
        </button>
      ) : (
        <div className="relative h-14 animate-in p-1 fade-in duration-200">
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
```

- [ ] **Step 4: A pílula desliza com mola**

No `apps/web/src/styles/index.css`, logo depois das regras do `.course-node` (antes do bloco `/* PNG export ...`), acrescentar:

```css
/* The selected-section pill slides with the snappy spring (tab bar and the desktop segmented nav). */
.tab-indicator {
  transition: transform 430ms var(--ease-spring-snappy);
}
```

E dentro do `@media (prefers-reduced-motion: reduce) { ... }` existente, acrescentar:

```css
  .tab-indicator {
    transition: none;
  }
```

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/TabBar.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/section-icons.ts apps/web/src/components/TabBar.tsx apps/web/src/components/TabBar.test.tsx apps/web/src/styles/index.css
git commit -m "feat(web): floating glass tab bar that minimizes on scroll" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Título grande e header compacto

**Files:**
- Create: `apps/web/src/lib/use-in-view.ts`, `apps/web/src/components/PageTitle.tsx`, `apps/web/src/components/CompactHeader.tsx`
- Modify: `apps/web/src/styles/index.css` (utilitário `scroll-edge`)
- Test: `apps/web/src/lib/use-in-view.test.ts`, `apps/web/src/components/PageTitle.test.tsx`, `apps/web/src/components/CompactHeader.test.tsx`

**Interfaces:**
- Produces:
  - `useInView(ref: RefObject<Element | null>): boolean` — `true` até o IntersectionObserver dizer o contrário; `true` sem IntersectionObserver.
  - `PageTitle(props: { title: string; context: ReactNode; titleRef?: Ref<HTMLHeadingElement>; className?: string })` — linha de contexto + `h1` `text-large-title`.
  - `CompactHeader(props: { title: string; visible: boolean; asHeading?: boolean })` — barra `glass` fixa no topo (só abaixo de md, quem decide montar é o `Dashboard`). Com `asHeading`, o título é o `h1` da tela; sem ele, é `aria-hidden` (duplica o `h1` do `PageTitle`).
  - utilitário `scroll-edge` (gradiente de 16 px sob a barra).

- [ ] **Step 1: Escrever os testes que falham**

`apps/web/src/lib/use-in-view.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useInView } from './use-in-view';

let notify: (entries: Partial<IntersectionObserverEntry>[]) => void = () => {};
const disconnect = vi.fn();

class IntersectionObserverStub {
  constructor(callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {
    notify = callback;
  }
  observe() {}
  disconnect = disconnect;
}

afterEach(() => {
  vi.unstubAllGlobals();
  disconnect.mockClear();
});

describe('useInView', () => {
  it('starts in view and follows the observer', () => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
    const ref = { current: document.createElement('h1') };
    const { result } = renderHook(() => useInView(ref));
    expect(result.current).toBe(true);
    act(() => notify([{ isIntersecting: false }]));
    expect(result.current).toBe(false);
    act(() => notify([{ isIntersecting: true }]));
    expect(result.current).toBe(true);
  });

  it('disconnects on unmount', () => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
    const ref = { current: document.createElement('h1') };
    const { unmount } = renderHook(() => useInView(ref));
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('stays in view where IntersectionObserver is missing', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const ref = { current: document.createElement('h1') };
    const { result } = renderHook(() => useInView(ref));
    expect(result.current).toBe(true);
  });
});
```

`apps/web/src/components/PageTitle.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageTitle } from './PageTitle';

describe('PageTitle', () => {
  it('renders the screen title as the h1, under a context line', () => {
    render(<PageTitle title="Disciplinas" context="Ciência da Computação, currículo 2019" />);
    const heading = screen.getByRole('heading', { level: 1, name: 'Disciplinas' });
    expect(heading).toHaveClass('text-large-title');
    expect(screen.getByText('Ciência da Computação, currículo 2019')).toHaveClass('text-footnote', 'text-ink-muted');
  });
});
```

`apps/web/src/components/CompactHeader.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompactHeader } from './CompactHeader';

describe('CompactHeader', () => {
  it('repeats the title without exposing it twice to screen readers', () => {
    const { container } = render(<CompactHeader title="Disciplinas" visible />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstElementChild).toHaveClass('glass', 'scroll-edge');
  });

  it('is faded out and not clickable while the large title is on screen', () => {
    const { container } = render(<CompactHeader title="Disciplinas" visible={false} />);
    expect(container.firstElementChild).toHaveClass('opacity-0', 'pointer-events-none');
  });

  it('carries the h1 itself when the screen has no large title (flowchart)', () => {
    const { container } = render(<CompactHeader title="Fluxograma" visible asHeading />);
    expect(screen.getByRole('heading', { level: 1, name: 'Fluxograma' })).toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveAttribute('aria-hidden');
  });
});
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/lib/use-in-view.test.ts src/components/PageTitle.test.tsx src/components/CompactHeader.test.tsx`
Expected: FAIL (módulos ausentes).

- [ ] **Step 2: Implementar `useInView`**

`apps/web/src/lib/use-in-view.ts`:

```ts
import { useEffect, useState, type RefObject } from 'react';

export function useInView(ref: RefObject<Element | null>): boolean {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? true));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return inView;
}
```

- [ ] **Step 3: Implementar `PageTitle` e `CompactHeader`**

`apps/web/src/components/PageTitle.tsx`:

```tsx
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
```

`apps/web/src/components/CompactHeader.tsx`:

```tsx
import { cn } from '@/lib/utils';

interface CompactHeaderProps {
  title: string;
  visible: boolean;
  asHeading?: boolean;
}

export function CompactHeader({ title, visible, asHeading = false }: CompactHeaderProps) {
  return (
    <div
      aria-hidden={asHeading ? undefined : true}
      className={cn(
        'glass scroll-edge fixed inset-x-0 top-0 z-30 rounded-none pt-[env(safe-area-inset-top)] transition-opacity duration-150 ease-snap',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <div className="flex h-11 items-center justify-center px-16">
        {asHeading ? (
          <h1 className="font-sans text-headline font-semibold tracking-normal font-stretch-normal">{title}</h1>
        ) : (
          <span className="text-headline font-semibold">{title}</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Utilitário `scroll-edge`**

No `apps/web/src/styles/index.css`, logo depois do utilitário `glass`, acrescentar:

```css
/* Scroll edge effect under a floating bar: content fades into the canvas instead of meeting a hard border. */
@utility scroll-edge {
  &::after {
    content: '';
    position: absolute;
    inset: 100% 0 auto;
    height: 1rem;
    pointer-events: none;
    background: linear-gradient(var(--canvas), transparent);
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/lib/use-in-view.test.ts src/components/PageTitle.test.tsx src/components/CompactHeader.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/use-in-view.ts apps/web/src/lib/use-in-view.test.ts apps/web/src/components/PageTitle.tsx apps/web/src/components/PageTitle.test.tsx apps/web/src/components/CompactHeader.tsx apps/web/src/components/CompactHeader.test.tsx apps/web/src/styles/index.css
git commit -m "feat(web): large page title and compact glass header" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Menu ⋯ com "Aparência" e menus de vidro

**Files:**
- Modify: `apps/web/src/components/OptionsMenu.tsx`
- Modify: `apps/web/src/styles/index.css` (regra de vidro dos menus)
- Test: `apps/web/src/components/OptionsMenu.test.tsx`

**Interfaces:**
- Consumes: `useAppearance(): readonly [Appearance, (next: Appearance) => void]` e `type Appearance` de `@/lib/appearance` (fase 1); `DropdownMenuLabel`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem` de `@/components/ui/dropdown-menu`.
- Produces: `OptionsMenu` ganha `showActions?: boolean` (padrão `true`). Com `false`, o menu mostra só "Aparência" (o desktop largo já tem as ações no header). O resto da API não muda.

- [ ] **Step 1: Escrever os testes que falham**

No fim do `describe('OptionsMenu', ...)` de `apps/web/src/components/OptionsMenu.test.tsx`, acrescentar (e `afterEach` + imports no topo do arquivo: `import { afterEach, describe, expect, it, vi } from 'vitest';`):

```tsx
  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.appearance;
  });

  it('offers the glass and solid appearances, with glass checked by default', async () => {
    render(<OptionsMenu onNewUpload={vi.fn()} onClearData={vi.fn()} />);
    const { menu } = await openMenu();
    expect(within(menu).getByText('Aparência')).toBeInTheDocument();
    expect(within(menu).getByRole('menuitemradio', { name: 'Vidro' })).toHaveAttribute('aria-checked', 'true');
    expect(within(menu).getByRole('menuitemradio', { name: 'Sólida' })).toHaveAttribute('aria-checked', 'false');
  });

  it('applies and remembers the solid appearance', async () => {
    render(<OptionsMenu onNewUpload={vi.fn()} onClearData={vi.fn()} />);
    const { user, menu } = await openMenu();
    await user.click(within(menu).getByRole('menuitemradio', { name: 'Sólida' }));
    expect(document.documentElement).toHaveAttribute('data-appearance', 'solid');
    expect(localStorage.getItem('appearance')).toBe('solid');
  });

  it('shows only the appearance when the actions already sit in the header', async () => {
    render(<OptionsMenu onNewUpload={vi.fn()} onClearData={vi.fn()} showActions={false} />);
    const { menu } = await openMenu();
    expect(within(menu).queryByRole('menuitem')).not.toBeInTheDocument();
    expect(within(menu).getAllByRole('menuitemradio')).toHaveLength(2);
  });
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/OptionsMenu.test.tsx`
Expected: FAIL nos 3 testes novos.

- [ ] **Step 2: Implementar**

Em `apps/web/src/components/OptionsMenu.tsx`:

1. Imports: acrescentar `DropdownMenuLabel`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem` ao import de `@/components/ui/dropdown-menu`, e `import { useAppearance, type Appearance } from '@/lib/appearance';`.
2. Em `OptionsMenuProps`, acrescentar:

```ts
  /** False on wide screens, where the header already shows the actions; the menu then keeps only the appearance. */
  showActions?: boolean;
```

3. Assinatura: `export function OptionsMenu({ onNewUpload, onClearData, install, showActions = true, className }: OptionsMenuProps) {` e, na primeira linha do corpo, `const [appearance, setAppearance] = useAppearance();`.
4. Dentro do `DropdownMenuContent`, envolver os três itens de ação e o separador existente em `{showActions && (<>...</>)}`, e acrescentar depois deles:

```tsx
        {showActions && <DropdownMenuSeparator />}
        <DropdownMenuLabel className="text-footnote font-normal text-ink-muted">Aparência</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={appearance} onValueChange={(value) => setAppearance(value as Appearance)}>
          <DropdownMenuRadioItem value="glass" className="max-md:min-h-11">
            Vidro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="solid" className="max-md:min-h-11">
            Sólida
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
```

(O separador que já existia entre "Instalar app" e "Limpar dados" continua dentro do bloco de ações; o novo separa as ações da aparência.)

5. No `Button` do gatilho, trocar `className={cn('max-md:size-11', className)}` por `className={cn('rounded-full max-md:size-11', className)}`.

- [ ] **Step 3: Menus de vidro**

No `apps/web/src/styles/index.css`, depois das regras de vidro sólido da fase 1 (`:root[data-appearance='solid'] { ... }`), acrescentar:

```css
/* Menus belong to the navigation layer. Unlayered, so it wins over the popover classes of the shadcn component. */
[data-slot='dropdown-menu-content'] {
  background-color: var(--glass-tint);
  -webkit-backdrop-filter: var(--glass-filter);
  backdrop-filter: var(--glass-filter);
  border: 1px solid var(--glass-edge);
  box-shadow: inset 0 1px 0 var(--glass-edge), var(--glass-shadow);
  border-radius: var(--radius-group);
}
```

- [ ] **Step 4: Rodar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/OptionsMenu.test.tsx src/components/ClearDataDialog.test.tsx`
Expected: PASS (os testes antigos continuam verdes: a ordem de `menuitem` não muda).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/OptionsMenu.tsx apps/web/src/components/OptionsMenu.test.tsx apps/web/src/styles/index.css
git commit -m "feat(web): appearance choice in the options menu, glass menus" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Seletor em cápsula no desktop e a casca do `Dashboard`

**Files:**
- Modify: `apps/web/src/components/SectionNav.tsx` (vira só desktop, segmented com pílula)
- Modify: `apps/web/src/components/SectionNav.test.tsx`
- Modify: `apps/web/src/components/Dashboard.tsx`
- Modify: `apps/web/src/features/courses/CoursesScreen.tsx` (remove o `h1`), `apps/web/src/features/flowchart/FlowchartScreen.tsx` (remove o `h1`), `apps/web/src/features/planning/PlanningScreen.tsx` (remove o `h1`), `apps/web/src/features/overview/MarkerBand.tsx` (`h1` → `h2`)
- Modify: `apps/web/src/App.test.tsx`, `apps/web/src/features/overview/MarkerBand.test.tsx` (nível do heading do progresso)
- Test: `apps/web/src/components/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `TabBar`, `SECTION_ICONS`, `.tab-indicator` (Task 3); `PageTitle`, `CompactHeader`, `useInView` (Task 4); `OptionsMenu` com `showActions` (Task 5); `useMediaQuery` de `@/lib/use-media-query`; `VIEW_LABELS`, `VIEWS` de `@/lib/use-hash-view`.
- Produces: `SectionNav(props: { view: View; className?: string })` desktop; a casca final da fase.

- [ ] **Step 1: Escrever os testes que falham**

Substituir `apps/web/src/components/SectionNav.test.tsx` por:

```tsx
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionNav } from './SectionNav';

describe('SectionNav', () => {
  it('renders the four sections as links, in order', () => {
    render(<SectionNav view="visao-geral" />);
    const nav = screen.getByRole('navigation', { name: 'Seções' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Visão geral', 'Fluxograma', 'Disciplinas', 'Planejamento']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '#/visao-geral',
      '#/fluxograma',
      '#/disciplinas',
      '#/planejamento',
    ]);
  });

  it('marks only the active section with aria-current="page"', () => {
    render(<SectionNav view="disciplinas" />);
    expect(screen.getByRole('link', { name: 'Disciplinas' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Visão geral' })).not.toHaveAttribute('aria-current');
  });

  it('is a capsule segmented control with a sliding pill under the active section', () => {
    const { container } = render(<SectionNav view="fluxograma" />);
    expect(screen.getByRole('navigation', { name: 'Seções' })).toHaveClass('rounded-full');
    expect(container.querySelector('.tab-indicator')).toHaveStyle({ transform: 'translateX(100%)' });
  });
});
```

`apps/web/src/components/Dashboard.test.tsx`:

```tsx
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Dataset } from '@/lib/storage';
import { Dashboard } from './Dashboard';

const dataset: Dataset = {
  data: { curriculum: sampleCurriculum, transcript: sampleTranscript },
  savedAt: '2026-10-16T00:00:00.000Z',
  revealed: true,
};

function setWidth(desktop: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: desktop && /min-width/.test(query),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

function renderAt(hash: string) {
  window.location.hash = hash;
  return render(
    <Dashboard dataset={dataset} onRevealed={vi.fn()} onNewUpload={vi.fn()} onClear={vi.fn()} onResetDataset={vi.fn()} />,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  window.location.hash = '';
});

describe('Dashboard shell', () => {
  it.each([
    ['#/visao-geral', 'Visão geral'],
    ['#/disciplinas', 'Disciplinas'],
    ['#/planejamento', 'Planejamento'],
  ])('gives %s exactly one h1, the screen title', async (hash, title) => {
    setWidth(false);
    renderAt(hash);
    expect(await screen.findAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  });

  it('puts the flowchart title in the compact header on mobile', async () => {
    setWidth(false);
    renderAt('#/fluxograma');
    expect(await screen.findByRole('heading', { level: 1, name: 'Fluxograma' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('uses the tab bar on mobile and the segmented nav on desktop, never both', () => {
    setWidth(false);
    const { unmount } = renderAt('#/disciplinas');
    expect(screen.getAllByRole('navigation', { name: 'Seções' })).toHaveLength(1);
    expect(document.body).toHaveAttribute('data-tab-bar', 'expanded');
    unmount();

    setWidth(true);
    renderAt('#/disciplinas');
    expect(screen.getAllByRole('navigation', { name: 'Seções' })).toHaveLength(1);
    expect(screen.getByRole('navigation', { name: 'Seções' })).toHaveClass('rounded-full');
    expect(document.body).not.toHaveAttribute('data-tab-bar');
  });

  it('keeps a single options menu on screen', () => {
    setWidth(false);
    renderAt('#/visao-geral');
    expect(screen.getAllByRole('button', { name: 'Mais opções' })).toHaveLength(1);
  });
});
```

(Os testes de CSS desta fase não usam `?raw`: no Vitest deste repo ele vem vazio. Quando um teste precisar do `index.css`, ler com `readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'index.css'), 'utf8')`.)

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/SectionNav.test.tsx src/components/Dashboard.test.tsx`
Expected: FAIL.

- [ ] **Step 2: `SectionNav` desktop**

Substituir `apps/web/src/components/SectionNav.tsx` por:

```tsx
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
              className="flex h-8 flex-1 items-center justify-center rounded-full px-3 text-sm whitespace-nowrap text-ink-muted outline-none transition-colors duration-150 ease-snap hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:font-medium aria-[current=page]:text-ink"
            >
              {VIEW_LABELS[v]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 3: A casca do `Dashboard`**

Em `apps/web/src/components/Dashboard.tsx`:

1. Imports: remover o import de `SectionNav` antigo e acrescentar:

```tsx
import { CompactHeader } from '@/components/CompactHeader';
import { PageTitle } from '@/components/PageTitle';
import { SectionNav } from '@/components/SectionNav';
import { TabBar } from '@/components/TabBar';
import { VIEW_LABELS } from '@/lib/use-hash-view';
import { useInView } from '@/lib/use-in-view';
import { useMediaQuery } from '@/lib/use-media-query';
```

(manter os imports existentes que continuam em uso; `useRef` já é importado.)

2. No corpo, depois de `const view = useHashView();`, acrescentar:

```tsx
  const desktop = useMediaQuery('(min-width: 768px)');
  const wide = useMediaQuery('(min-width: 1024px)');
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleInView = useInView(titleRef);
  const title = VIEW_LABELS[view];
  const context = `${curriculum.courseName}, currículo ${curriculum.version}`;
  // On a phone the flowchart canvas needs the height, so its title lives in the compact header instead.
  const compactOnly = !desktop && view === 'fluxograma';
```

3. Substituir todo o `return (...)` por:

```tsx
  const optionsMenu = (
    <OptionsMenu
      onNewUpload={onNewUpload}
      onClearData={openClear}
      install={installOption}
      showActions={!wide}
      className={desktop ? undefined : 'glass size-11'}
    />
  );

  return (
    <div className="min-h-dvh pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {desktop ? (
        <header className="glass sticky top-0 z-30 rounded-none border-x-0 border-t-0 pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-2.5">
            <BrandMark className="shrink-0" />
            <SectionNav view={view} />
            <div className="ml-auto flex items-center gap-1">
              {wide && (
                <>
                  <Button variant="ghost" size="sm" onClick={onNewUpload}>
                    Novo upload
                  </Button>
                  {installOption && <InstallAppButton install={installOption} />}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:text-danger"
                    onClick={(event) => openClear(event.currentTarget)}
                  >
                    Limpar dados
                  </Button>
                </>
              )}
              {optionsMenu}
            </div>
          </div>
        </header>
      ) : (
        <>
          <CompactHeader title={title} visible={compactOnly || !titleInView} asHeading={compactOnly} />
          <div className="fixed top-[calc(env(safe-area-inset-top)+0.25rem)] right-[max(0.75rem,env(safe-area-inset-right))] z-40">
            {optionsMenu}
          </div>
        </>
      )}
      <ClearDataDialog open={clearOpen} onOpenChange={setClearOpen} onConfirm={onClear} openerRef={clearOpenerRef} />
      <IosInstallDialog open={iosInstallOpen} onOpenChange={setIosInstallOpen} openerRef={iosInstallOpenerRef} />

      <main className="mx-auto max-w-6xl px-4 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-[calc(var(--bottom-chrome)+2rem+env(safe-area-inset-bottom))] md:pt-8">
        {!compactOnly && <PageTitle title={title} context={context} titleRef={titleRef} className="mb-8 pr-14 md:pr-0" />}
        {view === 'visao-geral' && (
          <OverviewScreen data={dataset.data} analysis={analysis} reveal={!dataset.revealed} onRevealed={onRevealed} />
        )}
        {view === 'fluxograma' && (
          <ErrorBoundary onReset={onResetDataset}>
            <Suspense fallback={<p className="text-muted-foreground">Montando o fluxograma…</p>}>
              <FlowchartScreen data={dataset.data} />
            </Suspense>
          </ErrorBoundary>
        )}
        {view === 'disciplinas' && <CoursesScreen data={dataset.data} />}
        {view === 'planejamento' && <PlanningScreen data={dataset.data} analysis={analysis} savedAt={dataset.savedAt} />}
      </main>

      {!desktop && <TabBar view={view} />}
    </div>
  );
```

(O antigo `<p className="mb-6 hidden ...">{curriculum.courseName}, currículo ...</p>` sai: a linha de contexto agora é do `PageTitle`.)

- [ ] **Step 4: Um `h1` por tela**

- `apps/web/src/features/courses/CoursesScreen.tsx`: apagar a linha `<h1 className="text-large-title">Disciplinas cursadas</h1>` (a classe pode ser `text-3xl sm:text-display` se a fase 1 ainda não tiver chegado; apagar a linha de qualquer forma).
- `apps/web/src/features/flowchart/FlowchartScreen.tsx`: no bloco do topo, apagar o `<h1 ...>Fluxograma do curso</h1>`; o `<p className="mt-2 max-w-[60ch] ...">` que vem depois perde o `mt-2`.
- `apps/web/src/features/planning/PlanningScreen.tsx`: no topo do board, apagar o `<h1 ...>Planejamento</h1>`; o `<p className="mt-2 max-w-[40ch] ...">` perde o `mt-2`.
- `apps/web/src/features/overview/MarkerBand.tsx`: trocar `<h1 id="progresso" ...>` / `</h1>` por `<h2 id="progresso" ...>` / `</h2>` (mesma classe).
- `apps/web/src/features/overview/MarkerBand.test.tsx` e `apps/web/src/App.test.tsx`: em toda chamada `getByRole`/`findByRole('heading', { level: 1, ... })` que procura o progresso (`'64,69%'`), trocar `level: 1` por `level: 2`.

- [ ] **Step 5: Rodar tudo**

Run: `pnpm --filter @easy-grades/web test && pnpm --filter @easy-grades/web typecheck`
Expected: PASS. Se algum teste de tela procurar um `h1` que saiu ("Disciplinas cursadas", "Fluxograma do curso") ou o antigo parágrafo de curso no `Dashboard`, atualizar a expectativa para o título novo da casca, sem enfraquecer o que ela verifica.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): glass shell with large titles, compact header and desktop segmented nav" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Toasts de vidro, manifest, documentação e verificação

**Files:**
- Modify: `apps/web/src/App.tsx` (props do `Toaster`)
- Modify: `apps/web/src/styles/index.css` (regra de vidro dos toasts)
- Modify: `apps/web/src/pwa/pwa-options.ts`, `apps/web/src/pwa/pwa-options.test.ts` (`theme_color`)
- Modify: `apps/web/src/styles/chrome.test.ts` (teste dos toasts)
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: tokens de vidro (fase 1), `--bottom-chrome` (Task 2).
- Produces: documentação coerente com a fase 2.

- [ ] **Step 1: Testes que falham**

No fim de `apps/web/src/styles/chrome.test.ts`, acrescentar:

```ts
describe('toasts', () => {
  it('are glass capsules on the navigation layer', () => {
    const toast = rule("[data-sonner-toaster] [data-sonner-toast][data-styled='true']");
    expect(toast).toContain('-webkit-backdrop-filter: var(--glass-filter);');
    expect(toast).toContain('backdrop-filter: var(--glass-filter);');
    expect(toast).toContain('box-shadow: inset 0 1px 0 var(--glass-edge), var(--glass-shadow);');
  });
});
```

Em `apps/web/src/pwa/pwa-options.test.ts`, trocar `expect(manifest.theme_color).toBe('#18191C');` por `expect(manifest.theme_color).toBe('#2A5BD7');`.

Run: `pnpm --filter @easy-grades/web exec vitest run src/styles/chrome.test.ts src/pwa/pwa-options.test.ts`
Expected: FAIL nos dois pontos.

- [ ] **Step 2: Implementar**

`apps/web/src/pwa/pwa-options.ts`: `theme_color: '#18191C'` → `theme_color: '#2A5BD7'`.

No `apps/web/src/styles/index.css`, logo depois da regra `[data-sonner-toaster][data-y-position='bottom']`, acrescentar:

```css
/* Three attributes, so it outranks Sonner's own [data-sonner-toast][data-styled] rules. */
[data-sonner-toaster] [data-sonner-toast][data-styled='true'] {
  -webkit-backdrop-filter: var(--glass-filter);
  backdrop-filter: var(--glass-filter);
  box-shadow: inset 0 1px 0 var(--glass-edge), var(--glass-shadow);
}
```

Em `apps/web/src/App.tsx`, trocar `<Toaster position="bottom-right" />` (e o comentário acima dele) por:

```tsx
      {/* The bottom clearance comes from --bottom-chrome in index.css; these replace the component's own colors. */}
      <Toaster
        position="bottom-right"
        style={
          {
            '--normal-bg': 'var(--glass-tint)',
            '--normal-text': 'var(--ink)',
            '--normal-border': 'var(--glass-edge)',
            '--border-radius': '1.5rem',
          } as React.CSSProperties
        }
      />
```

(Se `React` não estiver em escopo para o tipo, importar `type CSSProperties` de `'react'` e usar `as CSSProperties`.)

Run: `pnpm --filter @easy-grades/web exec vitest run src/styles/chrome.test.ts src/pwa/pwa-options.test.ts src/components/PwaUpdatePrompt.test.tsx`
Expected: PASS.

- [ ] **Step 3: Atualizar o `CLAUDE.md`**

Na seção "Frontend conventions":

1. Acrescentar depois do item "Base components" (fase 1):

```markdown
- Navigation shell (phase 2): below md, a floating glass `TabBar` (capsule, 4 links, sliding `.tab-indicator` pill with the snappy spring) that minimizes on downward scroll (`useScrollMinimize`: 48 px threshold, 16 px hysteresis from the last turning point) to a "<section>: mostrar seções" button; focus or a tap expands it and focuses the current link; it never minimizes on the flowchart. Each screen's `h1` is its section name, rendered by the shell (`PageTitle`, `text-large-title`, with the course as context line); screens have no `h1` of their own. Below md, `CompactHeader` (glass, `scroll-edge`) fades in when the title leaves the screen (`useInView`) and is `aria-hidden`; on the flowchart it is always shown and carries the `h1`. The ⋯ menu floats top-right below md. From md, a sticky glass header holds the brand, `SectionNav` (capsule segmented links) and, from lg, the actions; the ⋯ menu then only offers "Aparência". The `Dashboard` mounts one set by media query, never both.
- Bottom chrome: `body[data-tab-bar='expanded'|'minimized']` and `body[data-bottom-accessory]` (set with `useBodyData`) feed `--tab-bar-space` + `--accessory-space` = `--bottom-chrome` in `index.css`. The main padding, the "Meu semestre" bar (`bottom: var(--tab-bar-space) + 8px`) and the toasts all read it; never hard-code those offsets.
- Menus (`[data-slot='dropdown-menu-content']`) and toasts are glass through unlayered rules in `index.css` and the `Toaster` `style` prop; `ui/dropdown-menu.tsx` and `ui/sonner.tsx` stay unpatched.
```

2. No item "Toasts" da seção "Planejamento", trocar o texto por:

```markdown
- Toasts: Sonner sets its offsets as inline custom properties, so `index.css` sets `bottom` with `!important`, from `--bottom-chrome` (tab bar + the "Meu semestre" bar while `PlanningBoard` shows it below lg, via `useBodyData('bottomAccessory', ...)`).
```

3. Na seção "PWA", onde houver a cor do tema, registrar `theme_color` `#2A5BD7`.

- [ ] **Step 4: React Doctor e verificação completa**

Run: `pnpm react-doctor:changed`
Expected: 0 erros (corrigir antes de seguir).

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build`
Expected: tudo PASS.

- [ ] **Step 5: Verificação manual**

`pnpm dev`, dataset carregado, em 390 px e 1440 px, claro e escuro:
- mobile: tab bar flutuante; rolar Disciplinas para baixo encolhe, para cima expande; Tab do teclado na pílula expande e foca a seção; Fluxograma não encolhe e mostra o título no header compacto;
- o título grande some e o header compacto aparece com o gradiente embaixo;
- Planejamento: a barra "Meu semestre" fica acima da tab bar e acompanha quando ela encolhe; um toast ("Desfazer") aparece acima das duas;
- ⋯ → Aparência → Sólida: tab bar, header e menus ficam opacos; recarregar mantém;
- desktop: header de vidro sticky, seletor com a pílula deslizando, ações a partir de 1024 px;
- DevTools > Rendering: `prefers-reduced-motion` (sem deslize) e `prefers-contrast: more` (vidro sólido).
- iPhone real (Safari e PWA instalado): a cor que o Safari 26 dá às barras com a tab bar `fixed` translúcida. Se ficar ruim no navegador (fora do PWA), registrar no PR para tratar com `display-mode: browser` (spec 4.5).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/styles apps/web/src/pwa CLAUDE.md
git commit -m "feat(web): glass toasts, pen blue theme color and navigation docs" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

- [ ] **Step 7: Revisão da branch e merge**

Revisão da branch inteira (Opus 5.5, esforço médio). Depois de aprovada: `gh auth status` (conta pessoal), push (o pre-push roda `pnpm react-doctor:gate`), PR para `main`, merge `--no-ff`.

## Ordem e paralelismo

- Tasks 1, 2, 4 e 5 não dependem umas das outras e podem rodar em paralelo, cada uma na sua worktree (2, 4 e 5 mexem em trechos diferentes do `index.css`; integrar uma de cada vez).
- Task 3 depende de 1 e 2. Task 6 depende de 3, 4 e 5. Task 7 vem por último.
