# Caneta — Fase 4 (Fluxograma, Planejamento, Upload e diálogos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar a identidade "Caneta" às telas que faltam: o fluxograma em "modo Mapas" (canvas de borda a borda com zoom e legenda em vidro), o Planejamento (catálogo em lista agrupada, painel em cartão, medidor em cápsula, cápsula "Meu semestre" que desliza para o lado da tab bar encolhida), o Upload (campos de PDF em cartões, ação azul) e os diálogos.

**Architecture:** O React Flow perde os `Controls` próprios; um componente `FlowZoomControls` (cápsula `glass` vertical) chama `useReactFlow()`, e um `FlowLegendPanel` mostra a legenda num painel `glass` recolhível sobre o canvas. Os interruptores "Mostrar só o que falta" e "Ver como lista" continuam `Switch` (são toggles no estilo iOS e os testes dependem deles); ficam numa linha de ferramentas acima do canvas com o botão "Exportar PNG". A cápsula do semestre continua posicionada só por CSS, lendo `body[data-tab-bar]` (fase 2); para ela caber ao lado da pílula encolhida, a pílula ganha largura fixa.

**Tech Stack:** React 19, @xyflow/react 12, Tailwind CSS v4, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-16-caneta-rebranding-design.md` (seções 5.3, 5.4, 5.5, 5.6 e linha 4 da seção 9).

**Pré-requisito:** fases 1, 2 e 3 mergeadas em `main`. Usa: tokens e utilitários da fase 1 (`glass`, `rounded-card`, `rounded-group`, `rounded-node`, `text-title3`, `text-footnote`, `code-label`, `--ease-spring-snappy`), `Card`, `ListGroupRow`, `SegmentedControl`/`ChipGroup`, `Button variant="accent"`; da fase 2, `TabBar`, `body[data-tab-bar]`, `body[data-bottom-accessory]`, `--tab-bar-space`, `--accessory-space`.

## Global Constraints

- Escopo: só `apps/web`; regras e dados das telas não mudam.
- Nomes em código em inglês; copy em PT-BR, sentence case, sem "→".
- Comentários só para o "porquê" não óbvio.
- Vidro só nos controles flutuantes do fluxograma, na legenda sobre o canvas e na cápsula do semestre. Nós, minimapa, cartões e listas são opacos. Nunca vidro sobre vidro.
- Status sempre ícone + texto; alvos ≥ 44 px no toque.
- Movimento reduzido: zoom e "ajustar" sem animação (`duration: 0`); a cápsula do semestre troca de lugar sem transição.
- Cores do React Flow em atributos SVG ficam no CSS (`index.css`), não em props com `var(--x)`.
- Exportação de PNG: comportamento inalterado (as regras `.is-exporting` continuam).
- `src/components/ui/` sem patch novo.
- Testes: `pnpm --filter @easy-grades/web exec vitest run --maxWorkers=2`; CSS lido com `readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'index.css'), 'utf8')`, nunca `?raw`.
- Branch: `feat/caneta-flowchart-planning-upload` a partir de `main`. Commits com `Co-Authored-By: Claude <noreply@anthropic.com>`. `pnpm react-doctor:changed` sem erros antes da revisão.

## Review Focus

1. **Zoom com "Reduzir movimento"**: os botões de zoom e ajustar não animam (`duration: 0`). Testado no Task 1.
2. **Legenda aberta cobrindo o grafo no celular**: no mobile ela começa recolhida, e o botão diz se está aberta (`aria-expanded`). Testado no Task 1.
3. **Nome do período muito longo ou ausente no "Ver como lista"** e disciplina sem nota: a lista agrupada mostra o que existe sem buracos. Testado no Task 3.
4. **Tab bar encolhida com a cápsula do semestre**: as duas ficam lado a lado sem se sobrepor, e o espaço inferior reservado cai para uma linha só. Testado no Task 5.
5. **Upload sem conexão ou com erro**: os avisos continuam visíveis e anunciados, agora em cartões, e "Ler meus PDFs" continua desabilitado offline. Testado no Task 6.

---

### Task 1: `FlowZoomControls` e `FlowLegendPanel`

**Files:**
- Create: `apps/web/src/features/flowchart/FlowControls.tsx`
- Test: `apps/web/src/features/flowchart/FlowControls.test.tsx`

**Interfaces:**
- Consumes: `useReactFlow` de `@xyflow/react`; `FlowLegend` (`./FlowLegend`, props `{ nodes: FlowNode[] }`); `type FlowNode` de `@easy-grades/core`; `useMediaQuery` de `@/lib/use-media-query`.
- Produces:
  - `FlowZoomControls(props: { className?: string })` — `div role="group" aria-label="Zoom"` com três botões ("Aproximar", "Afastar", "Ajustar à tela").
  - `FlowLegendPanel(props: { nodes: FlowNode[]; className?: string })` — botão "Legenda" (`aria-expanded`) e painel `glass` com a `FlowLegend`.

- [ ] **Step 1: Criar a branch**

```bash
git checkout main
git pull --ff-only
git checkout -b feat/caneta-flowchart-planning-upload
```

- [ ] **Step 2: Escrever o teste que falha**

`apps/web/src/features/flowchart/FlowControls.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FlowLegendPanel, FlowZoomControls } from './FlowControls';

const zoomIn = vi.fn();
const zoomOut = vi.fn();
const fitView = vi.fn();

vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@xyflow/react')>()),
  useReactFlow: () => ({ zoomIn, zoomOut, fitView }),
}));

function mockMedia(matches: (query: string) => boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: matches(query),
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

beforeEach(() => {
  zoomIn.mockClear();
  zoomOut.mockClear();
  fitView.mockClear();
});

afterEach(() => vi.restoreAllMocks());

describe('FlowZoomControls', () => {
  it('is a glass capsule of three 44 px buttons', () => {
    mockMedia(() => false);
    render(<FlowZoomControls />);
    const group = screen.getByRole('group', { name: 'Zoom' });
    expect(group).toHaveClass('glass', 'rounded-full');
    for (const name of ['Aproximar', 'Afastar', 'Ajustar à tela']) {
      expect(screen.getByRole('button', { name })).toHaveClass('size-11');
    }
  });

  it('zooms and fits with a short animation', async () => {
    mockMedia(() => false);
    const user = userEvent.setup();
    render(<FlowZoomControls />);
    await user.click(screen.getByRole('button', { name: 'Aproximar' }));
    await user.click(screen.getByRole('button', { name: 'Afastar' }));
    await user.click(screen.getByRole('button', { name: 'Ajustar à tela' }));
    expect(zoomIn).toHaveBeenCalledWith({ duration: 200 });
    expect(zoomOut).toHaveBeenCalledWith({ duration: 200 });
    expect(fitView).toHaveBeenCalledWith({ padding: 0.1, duration: 200 });
  });

  it('does not animate with reduced motion', async () => {
    mockMedia((query) => query.includes('prefers-reduced-motion'));
    const user = userEvent.setup();
    render(<FlowZoomControls />);
    await user.click(screen.getByRole('button', { name: 'Aproximar' }));
    await user.click(screen.getByRole('button', { name: 'Ajustar à tela' }));
    expect(zoomIn).toHaveBeenCalledWith({ duration: 0 });
    expect(fitView).toHaveBeenCalledWith({ padding: 0.1, duration: 0 });
  });
});

describe('FlowLegendPanel', () => {
  it('starts collapsed on a phone and opens on demand', async () => {
    mockMedia(() => false);
    const user = userEvent.setup();
    render(<FlowLegendPanel nodes={[]} />);
    const toggle = screen.getByRole('button', { name: 'Legenda' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('list', { name: 'Legenda' })).not.toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('list', { name: 'Legenda' }).closest('.glass')).not.toBeNull();
  });

  it('starts open from md up', () => {
    mockMedia((query) => query.includes('min-width'));
    render(<FlowLegendPanel nodes={[]} />);
    expect(screen.getByRole('button', { name: 'Legenda' })).toHaveAttribute('aria-expanded', 'true');
  });
});
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/flowchart/FlowControls.test.tsx`
Expected: FAIL (`Failed to resolve import "./FlowControls"`).

- [ ] **Step 3: Implementar**

`apps/web/src/features/flowchart/FlowControls.tsx`:

```tsx
import { useReactFlow } from '@xyflow/react';
import { ListTree, Maximize, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/lib/use-media-query';
import { cn } from '@/lib/utils';
import type { FlowNode } from '@easy-grades/core';
import { FlowLegend } from './FlowLegend';

export function FlowZoomControls({ className }: { className?: string }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const duration = reduceMotion ? 0 : 200;

  return (
    <div role="group" aria-label="Zoom" className={cn('glass flex flex-col rounded-full p-0.5', className)}>
      <Button variant="ghost" size="icon" aria-label="Aproximar" className="size-11" onClick={() => zoomIn({ duration })}>
        <Plus />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Afastar" className="size-11" onClick={() => zoomOut({ duration })}>
        <Minus />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Ajustar à tela"
        className="size-11"
        onClick={() => fitView({ padding: 0.1, duration })}
      >
        <Maximize />
      </Button>
    </div>
  );
}

export function FlowLegendPanel({ nodes, className }: { nodes: FlowNode[]; className?: string }) {
  const desktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useState<boolean | null>(null);
  const expanded = open ?? desktop;

  return (
    <div className={cn('grid justify-items-start gap-2', className)}>
      <Button
        variant="ghost"
        aria-expanded={expanded}
        onClick={() => setOpen(!expanded)}
        className="glass h-11 rounded-full px-4"
      >
        <ListTree aria-hidden />
        Legenda
      </Button>
      {expanded && (
        <div className="glass max-w-[calc(100vw-2rem)] rounded-group p-3">
          <FlowLegend nodes={nodes} />
        </div>
      )}
    </div>
  );
}
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/flowchart/FlowControls.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/flowchart/FlowControls.tsx apps/web/src/features/flowchart/FlowControls.test.tsx
git commit -m "feat(web): glass zoom controls and collapsible legend for the flowchart" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Fluxograma em "modo Mapas"

**Files:**
- Modify: `apps/web/src/features/flowchart/FlowchartScreen.tsx`
- Modify: `apps/web/src/features/flowchart/CourseNode.tsx`
- Modify: `apps/web/src/styles/index.css` (regras do React Flow)
- Test: `apps/web/src/features/flowchart/FlowchartScreen.test.tsx` (acrescentar casos), `apps/web/src/styles/flow.test.ts`

**Interfaces:**
- Consumes: `FlowZoomControls`, `FlowLegendPanel` (Task 1).
- Produces: nada consumido por outras tasks.

- [ ] **Step 1: Escrever os testes que falham**

No `apps/web/src/features/flowchart/FlowchartScreen.test.tsx`, acrescentar (usando o helper de render que o arquivo já tem):

```tsx
  it('floats glass zoom controls and the legend over the canvas instead of React Flow controls', async () => {
    renderScreen();
    expect(await screen.findByRole('group', { name: 'Zoom' })).toHaveClass('glass');
    expect(screen.getByRole('button', { name: 'Legenda' })).toBeInTheDocument();
    expect(document.querySelector('.react-flow__controls')).toBeNull();
  });

  it('keeps the export button as a capsule in the toolbar', async () => {
    renderScreen();
    expect(await screen.findByRole('button', { name: 'Exportar PNG' })).toHaveClass('rounded-full');
  });
```

`apps/web/src/styles/flow.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'index.css'), 'utf8');

describe('flowchart styles', () => {
  it('drops the React Flow control button rules', () => {
    expect(css).not.toContain('.react-flow__controls-button');
    expect(css).not.toContain('--xy-controls-button');
  });

  it('gives the minimap an opaque rounded card', () => {
    const start = css.indexOf('.react-flow__minimap {');
    const rule = css.slice(start, css.indexOf('}', start));
    expect(rule).toContain('background: var(--surface);');
    expect(rule).toContain('border-radius: var(--radius-group);');
  });
});
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/flowchart src/styles/flow.test.ts`
Expected: FAIL nos casos novos.

- [ ] **Step 2: A tela**

Em `apps/web/src/features/flowchart/FlowchartScreen.tsx`:

1. Imports: remover `Controls` do import de `@xyflow/react`; acrescentar `import { FlowLegendPanel, FlowZoomControls } from './FlowControls';`. Se `FlowLegend` deixar de ser usado aqui, remover o import.
2. O bloco do topo (`<div className="flex flex-wrap items-end justify-between gap-4">` com o parágrafo e o botão) e a linha seguinte (`<div className="flex flex-wrap items-center justify-between gap-4">` com `FlowLegend` e os dois `Switch`) viram uma única linha de ferramentas:

```tsx
      <p className="max-w-[60ch] text-footnote text-ink-muted max-md:hidden">
        Passe o mouse ou toque numa disciplina para ver o que ela exige e o que ela libera. Arraste o fundo para
        percorrer os períodos.
      </p>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <Switch id="so-pendentes" checked={onlyRemaining} onCheckedChange={setOnlyRemaining} className="max-md:after:-inset-y-3.5" />
          <Label htmlFor="so-pendentes" className="max-md:min-h-11">
            Mostrar só o que falta
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="como-lista"
            checked={asList}
            onCheckedChange={(checked) => {
              const next: FlowView = checked ? 'lista' : 'grafo';
              writeFlowView(next);
              setFlowView(next);
            }}
            className="max-md:after:-inset-y-3.5"
          />
          <Label htmlFor="como-lista" className="max-md:min-h-11">
            Ver como lista
          </Label>
        </div>
        <Button
          variant="outline"
          onClick={exportPng}
          disabled={exporting}
          aria-busy={exporting}
          className="ml-auto rounded-full max-md:h-11"
        >
          {exporting ? (
            <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
          ) : (
            <Download aria-hidden />
          )}
          {exporting ? 'Exportando…' : 'Exportar PNG'}
        </Button>
      </div>
```

3. O contêiner do canvas: trocar a classe por

```tsx
          className={cn(
            'relative -mx-4 h-[calc(100dvh-env(safe-area-inset-top)-var(--bottom-chrome)-11rem)] min-h-96 bg-canvas md:mx-0 md:h-[min(75dvh,760px)] md:rounded-card md:border md:border-hairline',
            exporting && 'is-exporting',
          )}
```

4. Dentro do `<ReactFlow>`, trocar `<Controls showInteractive={false} />` por nada (sai), e logo depois do `</ReactFlow>` (ainda dentro do `HighlightContext`), acrescentar:

```tsx
            <FlowLegendPanel nodes={layout.nodes} className="absolute top-3 left-3 z-10" />
            <FlowZoomControls className="absolute right-3 bottom-3 z-10" />
```

A exportação captura o contêiner inteiro, então os controles não podem sair na imagem: envolver os dois num `<div className="contents [.is-exporting_&]:hidden">`.

5. No `MiniMap`, trocar `className="hidden sm:block"` por `className="hidden md:block"`.

Em `apps/web/src/features/flowchart/CourseNode.tsx`, na `className` do cartão do nó, trocar `rounded-lg` (ou o raio que estiver lá) por `rounded-node`.

- [ ] **Step 3: CSS do React Flow**

Em `apps/web/src/styles/index.css`:
- na regra `.react-flow { ... }`, remover as três linhas `--xy-controls-button-*`;
- trocar a regra `.react-flow__minimap { ... }` por:

```css
.react-flow__minimap {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-group);
  overflow: hidden;
}
```

- remover o bloco `/* Touch targets: React Flow's zoom buttons are 26 px; ... */` com o `@media` de `.react-flow__controls-button`;
- na regra `.react-flow__node:focus-visible`, trocar `border-radius: var(--radius);` por `border-radius: var(--radius-node);`.

- [ ] **Step 4: Rodar**

Run: `pnpm --filter @easy-grades/web exec vitest run --maxWorkers=2 src/features/flowchart src/styles`
Expected: PASS (inclusive os testes de exportação e do switch "Ver como lista").

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/flowchart apps/web/src/styles
git commit -m "feat(web): edge-to-edge flowchart with floating glass controls" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: "Ver como lista" em lista agrupada

**Files:**
- Modify: `apps/web/src/features/flowchart/FlowchartList.tsx`
- Test: `apps/web/src/features/flowchart/FlowchartList.test.tsx` (novo)

**Interfaces:**
- Consumes: `ListGroupRow` de `@/components/ListGroup`; `StateBadge` de `@/components/StatusBadge`.
- Produces: `FlowchartList` com a mesma API (`{ nodes: FlowNode[]; curriculum: Curriculum }`).

- [ ] **Step 1: Ler o componente atual** (`FlowchartList.tsx`, ~40 linhas) para manter o agrupamento por período, os ids `periodo-<n>`, o texto de pré-requisitos faltantes e a nota.

- [ ] **Step 2: Escrever o teste que falha**

`apps/web/src/features/flowchart/FlowchartList.test.tsx`:

```tsx
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { layoutFlowchart } from '@easy-grades/core';
import { FlowchartList } from './FlowchartList';

const graph = layoutFlowchart(sampleCurriculum, sampleTranscript, { columnWidth: 264, rowHeight: 112 });

describe('FlowchartList', () => {
  it('shows one grouped list per period, each named by its heading', () => {
    render(<FlowchartList nodes={graph.nodes} curriculum={sampleCurriculum} />);
    const first = screen.getByRole('heading', { level: 2, name: /1º período/ });
    const list = first.parentElement!.querySelector('ul')!;
    expect(list).toHaveClass('rounded-group', 'bg-surface');
    expect(within(list).getAllByRole('listitem').length).toBeGreaterThan(0);
  });

  it('labels every course with its status as icon and text', () => {
    render(<FlowchartList nodes={graph.nodes} curriculum={sampleCurriculum} />);
    const rows = screen.getAllByRole('listitem');
    for (const row of rows) expect(row.querySelector('svg')).not.toBeNull();
  });
});
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/flowchart/FlowchartList.test.tsx`
Expected: FAIL na classe `rounded-group`.

- [ ] **Step 3: Implementar**

Em `FlowchartList.tsx`:
- o contêiner raiz `grid gap-8` → `grid gap-6`;
- cada cabeçalho de período: classe `text-lg` → `text-title3`;
- a `ul` (`mt-3 grid gap-2`) → `mt-2 rounded-group bg-surface pl-4`;
- cada `li` vira `ListGroupRow` (import de `@/components/ListGroup`), mantendo o conteúdo; o código passa a `code-label text-footnote`; acrescentar `<StateBadge state={n.state} />` no fim da linha se a linha ainda não mostra o status com ícone (verificar o que o `li` atual mostra e não duplicar).

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/flowchart`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/flowchart/FlowchartList.tsx apps/web/src/features/flowchart/FlowchartList.test.tsx
git commit -m "feat(web): flowchart list view as iOS grouped lists" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Planejamento — catálogo, painel, medidor e nota

**Files:**
- Modify: `apps/web/src/features/planning/CourseCatalog.tsx` (busca e lista)
- Modify: `apps/web/src/features/planning/PlanningScreen.tsx` (aside e topo)
- Modify: `apps/web/src/features/planning/MySemesterPanel.tsx` (blocos de número e "Usar sugestão")
- Modify: `apps/web/src/features/planning/CreditMeter.tsx`, `apps/web/src/features/planning/GradeInput.tsx`
- Test: `MySemesterPanel.test.tsx`, `CreditMeter.test.tsx`, `GradeInput.test.tsx`, `PlanningScreen.test.tsx` (acrescentar casos)

**Interfaces:**
- Consumes: `ListGroupRow`, `Button variant="accent"`.
- Produces: nada novo.

- [ ] **Step 1: Escrever os testes que falham**

`MySemesterPanel.test.tsx` (no `describe` existente, usando o render que ele já tem):

```tsx
  it('makes Usar sugestão the screen accent action', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: 'Usar sugestão' })).toHaveClass('bg-pen', 'text-pen-foreground');
  });
```

`CreditMeter.test.tsx`:

```tsx
  it('draws the cells inside one capsule bar', () => {
    const { container } = render(<CreditMeter credits={12} min={16} max={30} />);
    const bar = container.querySelector('[data-cell]')!.parentElement!;
    expect(bar).toHaveClass('rounded-full', 'overflow-hidden');
    expect(container.querySelector('[data-cell]')).not.toHaveClass('rounded-[2px]');
  });
```

`GradeInput.test.tsx`:

```tsx
  it('is a capsule field', () => {
    renderInput();
    expect(screen.getByRole('textbox').parentElement).toHaveClass('rounded-full');
  });
```

`PlanningScreen.test.tsx`:

```tsx
  it('lists the catalog as an iOS grouped list with a capsule search', async () => {
    setDesktop(true);
    render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    const search = await screen.findByRole('searchbox');
    expect(search).toHaveClass('rounded-full', 'pl-10');
    const row = screen.getAllByRole('listitem').find((li) => within(li).queryByRole('button', { name: /Adicionar/ }))!;
    expect(row.parentElement).toHaveClass('rounded-group', 'bg-surface');
  });

  it('shows the semester panel as an opaque card from lg up', async () => {
    setDesktop(true);
    render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    const heading = await screen.findByRole('heading', { name: 'Meu semestre', level: 2 });
    expect(heading.closest('aside')).toHaveClass('rounded-card', 'bg-surface');
  });
```

(Adaptar os nomes `renderPanel`/`renderInput`/props do `CreditMeter` aos helpers e às props reais de cada arquivo de teste; manter o que cada caso afirma.)

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/planning`
Expected: FAIL nos casos novos.

- [ ] **Step 2: Implementar**

- `CourseCatalog.tsx`:
  - o `Input` de busca ganha o mesmo tratamento de Disciplinas (fase 3): envolvido num `div className="relative"` com `<Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted" />` e `className` com `pl-10`; o `Label` visível pode ficar `sr-only` se houver placeholder descritivo;
  - a lista `ul className="divide-y divide-hairline border-t border-hairline"` → `ul className="rounded-group bg-surface pl-4"`, e cada `CatalogRow` passa a renderizar `ListGroupRow` (de `@/components/ListGroup`) no lugar do `li`, mantendo conteúdo e botões;
  - o aviso de lista vazia: `rounded-lg border border-dashed border-hairline p-6` → `rounded-group border border-dashed border-hairline p-6`.
- `PlanningScreen.tsx`:
  - o `aside` (lg+): `rounded-xl border border-hairline bg-surface p-[22px]` → `rounded-card bg-surface p-5`;
  - o topo: o número do CR projetado mantém `text-pen-ink`; o bloco `border-b border-hairline pb-8` → `pb-2` (sem borda; a hierarquia vem dos cartões).
- `MySemesterPanel.tsx`:
  - os dois blocos de número (`rounded-lg bg-canvas p-3.5`) → `rounded-group bg-canvas p-3.5`;
  - a lista de escolhidas `divide-y divide-hairline border-t border-hairline` → `rounded-group bg-canvas pl-3` com `li` como `ListGroupRow`;
  - o botão "Usar sugestão": `variant="ghost"` → `variant="accent"`.
- `CreditMeter.tsx`: no `div aria-hidden className="grid gap-[2px]"` acrescentar `overflow-hidden rounded-full`; em cada célula, `rounded-[2px]` sai e `h-3.5` → `h-2.5`.
- `GradeInput.tsx`: no `div` externo, `rounded-lg` → `rounded-full`.

Run: `pnpm --filter @easy-grades/web exec vitest run --maxWorkers=2 src/features/planning`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/planning
git commit -m "feat(web): planning catalog as a grouped list, carded panel and capsule meter" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Cápsula do semestre ao lado da tab bar encolhida

**Files:**
- Modify: `apps/web/src/components/TabBar.tsx` (largura fixa da pílula)
- Modify: `apps/web/src/features/planning/PlanningScreen.tsx` (classe da cápsula)
- Modify: `apps/web/src/styles/index.css` (regras da cápsula)
- Test: `apps/web/src/components/TabBar.test.tsx`, `apps/web/src/styles/chrome.test.ts` (acrescentar casos)

**Interfaces:**
- Consumes: `body[data-tab-bar]`, `body[data-bottom-accessory]`, `--tab-bar-space`, `--accessory-space` (fase 2).
- Produces: classe `semester-bar` na cápsula do Planejamento; a pílula encolhida tem `w-40`.

- [ ] **Step 1: Testes que falham**

`TabBar.test.tsx` (no `describe` existente):

```tsx
  it('gives the minimized pill a fixed width so a screen accessory can sit beside it', () => {
    render(<TabBar view="planejamento" />);
    scrollTo(30);
    scrollTo(300);
    const pill = screen.getByRole('button', { name: 'Planejamento: mostrar seções' });
    expect(pill).toHaveClass('w-40');
  });
```

`chrome.test.ts`:

```ts
describe('semester bar beside the minimized tab bar', () => {
  it('reserves a single row when the tab bar is minimized', () => {
    expect(rule("body[data-tab-bar='minimized'][data-bottom-accessory]")).toContain('--accessory-space: 0px;');
  });

  it('moves the bar next to the minimized pill and back with the snappy spring', () => {
    const base = rule('.semester-bar');
    expect(base).toContain('transition: left 430ms var(--ease-spring-snappy), bottom 430ms var(--ease-spring-snappy);');
    const beside = rule("body[data-tab-bar='minimized'] .semester-bar");
    expect(beside).toContain('left: calc(max(0.75rem, env(safe-area-inset-left)) + 10.5rem);');
    expect(beside).toContain('bottom: calc(0.75rem + env(safe-area-inset-bottom));');
  });
});
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/TabBar.test.tsx src/styles/chrome.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implementar**

`TabBar.tsx`: no `button` da pílula encolhida, acrescentar `w-40` e trocar o texto `{VIEW_LABELS[view]}` por `<span className="truncate">{VIEW_LABELS[view]}</span>`.

`PlanningScreen.tsx`: na classe da cápsula fixa (fase 2), acrescentar `semester-bar` e remover `transition-[bottom] duration-200 ease-snap motion-reduce:transition-none` (a transição passa para o CSS); trocar `inset-x-[max(0.75rem,env(safe-area-inset-left))]` por `right-[max(0.75rem,env(safe-area-inset-right))] left-[max(0.75rem,env(safe-area-inset-left))]` e `h-13` por `h-12`.

`index.css`, logo depois do bloco do espaço inferior (fase 2):

```css
/* "Meu semestre" bar: above the tab bar, or beside its minimized 10 rem pill on one row (like Music's mini player). */
.semester-bar {
  transition: left 430ms var(--ease-spring-snappy), bottom 430ms var(--ease-spring-snappy);
}
@media (max-width: 47.99rem) {
  body[data-tab-bar='minimized'] .semester-bar {
    left: calc(max(0.75rem, env(safe-area-inset-left)) + 10.5rem);
    bottom: calc(0.75rem + env(safe-area-inset-bottom));
  }
  body[data-tab-bar='minimized'][data-bottom-accessory] {
    --accessory-space: 0px;
  }
}
```

E no `@media (prefers-reduced-motion: reduce)`: `.semester-bar { transition: none; }`.

(A pílula tem 10 rem; a cápsula começa 0,5 rem depois dela, por isso `10.5rem`. Com a barra a 48 px, a mesma altura da pílula, as duas ficam alinhadas.)

Run: `pnpm --filter @easy-grades/web exec vitest run --maxWorkers=2 src/components src/styles src/features/planning`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/TabBar.tsx apps/web/src/components/TabBar.test.tsx apps/web/src/features/planning/PlanningScreen.tsx apps/web/src/styles
git commit -m "feat(web): semester bar slides beside the minimized tab bar" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Upload e diálogos

**Files:**
- Modify: `apps/web/src/features/upload/Dropzone.tsx`, `apps/web/src/features/upload/UploadScreen.tsx`
- Test: `apps/web/src/features/upload/Dropzone.test.tsx` (novo, se não existir), `apps/web/src/features/upload/UploadScreen.test.tsx` (acrescentar casos, se existir; senão criar)

**Interfaces:**
- Consumes: `Button variant="accent"`.

- [ ] **Step 1: Testes que falham**

```tsx
// Dropzone.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Dropzone } from './Dropzone';

describe('Dropzone', () => {
  it('is a large opaque card', () => {
    render(<Dropzone id="curriculo" label="Currículo do curso" documentName="Currículo de Curso" file={null} onFile={vi.fn()} />);
    expect(screen.getByText('Currículo do curso').closest('label')).toHaveClass('rounded-card', 'bg-surface');
  });

  it('marks a chosen file in pen blue with a check icon and the file name', () => {
    const file = new File(['%PDF'], 'curriculo.pdf', { type: 'application/pdf' });
    render(<Dropzone id="curriculo" label="Currículo do curso" documentName="Currículo de Curso" file={file} onFile={vi.fn()} />);
    const label = screen.getByText('curriculo.pdf').closest('label')!;
    expect(label).toHaveAttribute('data-filled');
    expect(label.querySelector('svg')).toHaveClass('text-pen');
  });
});
```

```tsx
// UploadScreen.test.tsx (acrescentar ao describe existente, ou criar com o mesmo padrão de render)
  it('makes Ler meus PDFs the accent capsule and keeps it disabled without both files', () => {
    renderUpload();
    const submit = screen.getByRole('button', { name: 'Ler meus PDFs' });
    expect(submit).toHaveClass('bg-pen', 'rounded-full');
    expect(submit).toBeDisabled();
  });
```

(Adaptar props do `Dropzone` e o helper do `UploadScreen` ao que os arquivos reais esperam.)

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/upload`
Expected: FAIL.

- [ ] **Step 2: Implementar**

- `Dropzone.tsx`:
  - importar `CircleCheck` de `lucide-react`;
  - na `label`: `rounded-xl border-2 border-dashed border-input bg-card p-5` → `rounded-card border-2 border-dashed border-field bg-surface p-5 md:p-6`; manter os estados `data-[dragging]` e `data-[filled]` (borda `pen`);
  - o ícone: `file ? <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-pen" /> : <FileText aria-hidden className="mt-0.5 size-5 shrink-0 text-ink" />`.
- `UploadScreen.tsx`:
  - o botão "Ler meus PDFs": acrescentar `variant="accent"`;
  - os avisos offline e de erro: `rounded-lg` → `rounded-card`, `p-3` → `p-4`.
- Diálogos (`ClearDataDialog`, `IosInstallDialog`): o `AlertDialogContent` já fica com `rounded-xl` = 20 px pela fase 1 e os botões já são cápsulas; conferir no navegador e não mexer em `ui/`.

Run: `pnpm --filter @easy-grades/web exec vitest run --maxWorkers=2 src/features/upload src/components`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/upload
git commit -m "feat(web): upload dropzones as cards with a pen blue primary action" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Documentação e verificação

- [ ] **Step 1: `CLAUDE.md`**

Em "Frontend conventions":
- no item "Flowchart cards show code, name and credits...", acrescentar ao fim: "The canvas is edge to edge on phones; React Flow's own `Controls` are gone: `FlowZoomControls` (glass vertical capsule, `useReactFlow`, no animation with reduced motion) and `FlowLegendPanel` (glass, collapsed on phones) float over it and are hidden from the PNG export. The minimap is an opaque `rounded-group` card. Nodes use `rounded-node`."
- acrescentar: "Planning (phase 4): catalog and chosen courses are grouped lists (`ListGroupRow`), the lg+ panel is a card, `CreditMeter` cells sit inside one capsule, `GradeInput` is a capsule, and "Usar sugestão" is the screen's accent button. Below md the "Meu semestre" bar (`.semester-bar`) slides beside the minimized tab bar pill (fixed `w-40`), and the bottom chrome then reserves one row."
- acrescentar: "Upload: dropzones are surface cards (pen border and check icon when filled); "Ler meus PDFs" is the accent button."

- [ ] **Step 2: React Doctor e verificação**

Run: `pnpm react-doctor:changed` (0 erros) e `pnpm --filter @easy-grades/web exec vitest run --maxWorkers=2 && pnpm typecheck && pnpm lint && pnpm build` (PASS).

- [ ] **Step 3: Verificação manual** (390 px e 1440 px, claro e escuro, movimento reduzido):
- Fluxograma: canvas de borda a borda no celular; zoom/ajustar em vidro; legenda recolhida no celular e aberta no desktop; exportar PNG gera a imagem sem os controles; nós com raio 12.
- Planejamento: cápsula do semestre acima da tab bar; ao rolar e a tab bar encolher, a cápsula desliza para o lado da pílula; ao subir, volta.
- Upload: cartões dos PDFs, estado preenchido em azul, "Ler meus PDFs" azul e desabilitado offline (DevTools > Network > Offline).
- Diálogos "Limpar dados" e "Instalar no iOS": cartão de 20 px, botões em cápsula, destrutivo em `danger`.

- [ ] **Step 4: Commit e revisão**

```bash
git add CLAUDE.md
git commit -m "docs: flowchart, planning and upload conventions" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

Revisão da branch inteira (Opus 5.5, médio); `gh auth status`, push, PR, merge `--no-ff`.

## Ordem e paralelismo

- Paralelo: Task 1, Task 3, Task 4 e Task 6 (arquivos diferentes).
- Task 2 depende do Task 1. Task 5 mexe em `PlanningScreen.tsx` e no `index.css`: rodar depois do Task 4 (mesmo arquivo) e do Task 2 (mesmo CSS).
- Task 7 por último.
