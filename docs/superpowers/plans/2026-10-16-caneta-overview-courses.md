# Caneta — Fase 3 (Visão geral e Disciplinas) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar a Visão geral (cartões de métrica no estilo do app Saúde, a MarkerBand num cartão de destaque, seções de detalhe em cartões, gráficos no estilo Swift Charts) e Disciplinas (busca em cápsula, tabela dentro de cartão no desktop, lista agrupada no estilo iOS no mobile).

**Architecture:** Um componente novo, `MetricCard`, monta cada métrica do resumo; quando há seção de detalhe, o cartão inteiro é um link que rola até ela sem mudar o hash (o app usa `#/<view>` para navegar). As seções existentes viram cartões trocando só as classes da raiz e do `h2`. Em Disciplinas, cada grupo continua sendo uma única `section` com um `h2` (os testes e o leitor de tela dependem disso); a tabela (md+) e a lista (abaixo de md) continuam alternadas por CSS, só mudam de visual.

**Tech Stack:** React 19, Tailwind CSS v4, Recharts 3, Lucide, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-16-caneta-rebranding-design.md` (seções 5.1, 5.2 e linha 3 da seção 9).

**Pré-requisito:** fases 1 e 2 mergeadas em `main`. Usa da fase 1: tokens (`surface`, `canvas`, `ink`, `ink-muted`, `hairline`, `pen`, `pen-ink`, `success`), `rounded-card`, `rounded-group`, `text-title3`, `text-caption`, `text-footnote`, `heading-ink`, `code-label`, `Card` (`@/components/Card`), `ListGroupRow` (`@/components/ListGroup`), `ChipGroup` e `SegmentedControl` (já adotados em `CoursesScreen`). Usa da fase 2: o header compacto (mobile, 44 px + safe area) e o header desktop sticky (52 px), que definem os offsets de rolagem.

## Global Constraints

- Escopo: só `apps/web`; lógica e dados das telas não mudam (só apresentação).
- Nomes em código em inglês; copy em PT-BR, sentence case, sem "→".
- Comentários só para o "porquê" não óbvio.
- Conteúdo é sempre opaco: cartões `bg-surface` sobre o `canvas`. Nada de `glass` nesta fase.
- Status sempre ícone + texto. Contraste AA (os tokens já garantem; não inventar cores novas).
- Alvos de toque ≥ 44 px.
- `src/components/ui/` sem patch novo.
- Gráficos continuam lazy e com o comentário `react-doctor-disable-next-line react-doctor/prefer-dynamic-import` acima do import do recharts.
- Testes: rodar a suíte com `pnpm --filter @easy-grades/web exec vitest run --maxWorkers=2` (não `pnpm test -- ...`). Testes que leem o `index.css` usam `readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'index.css'), 'utf8')`, nunca `?raw`.
- Branch: `feat/caneta-overview-courses` a partir de `main`. Nunca alterar `git config`. Commits sem trailer de co-autoria de agente.
- Antes da revisão: `pnpm react-doctor:changed` sem erros.

## Review Focus

1. **Tocar num cartão de métrica** não pode trocar a tela nem sujar o histórico: o hash continua `#/visao-geral`, a página rola até a seção e o foco vai para o título dela (leitor de tela anuncia onde chegou). Testado no Task 1.
2. **Seção de destino escondida pelo header fixo:** ao rolar até uma seção, o título não pode ficar atrás do header compacto (mobile) ou do header de vidro (desktop). Testado no Task 2 (classe `scroll-mt-*` em cada seção alvo).
3. **Nome de disciplina muito longo no mobile** ("Trabalho de Conclusão de Curso II — Orientação..."): a linha quebra em até 2 linhas sem empurrar nota e badge para fora. Testado no Task 4.
4. **Disciplina sem nota ou sem CH** (em curso, dispensa): a linha mostra "—" no lugar, sem buraco no layout. Testado no Task 4.
5. **Cabeçalho do grupo grudado ao rolar** não pode ficar atrás do header fixo: `top` do cabeçalho sticky abaixo do header compacto (mobile) e do header de vidro (desktop). Testado no Task 4.

---

### Task 1: `MetricCard` e o resumo em cartões

**Files:**
- Create: `apps/web/src/components/MetricCard.tsx`
- Modify: `apps/web/src/features/overview/OverviewSummary.tsx`
- Test: `apps/web/src/components/MetricCard.test.tsx`, `apps/web/src/features/overview/OverviewSummary.test.tsx` (acrescentar casos)

**Interfaces:**
- Consumes: `Card` de `@/components/Card` (fase 1).
- Produces:
  - `MetricCard(props: { icon: LucideIcon; label: string; value: ReactNode; children?: ReactNode; targetId?: string; className?: string })` — `children` são as linhas de contexto (footnote). Com `targetId`, o cartão é um `<a href="#<targetId>">` que, ao clicar, cancela a navegação, rola até `document.getElementById(targetId)` e foca o primeiro `h2` dele.

- [ ] **Step 1: Criar a branch**

```bash
git checkout main
git pull --ff-only
git checkout -b feat/caneta-overview-courses
```

- [ ] **Step 2: Escrever o teste que falha**

`apps/web/src/components/MetricCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrendingUp } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MetricCard } from './MetricCard';

afterEach(() => {
  document.body.innerHTML = '';
  window.location.hash = '';
});

describe('MetricCard', () => {
  it('shows the label, the value and the context lines on an opaque card', () => {
    render(
      <MetricCard icon={TrendingUp} label="Coeficiente de rendimento" value="7,757">
        <p>Na formatura: entre 7,229 e 8,186.</p>
      </MetricCard>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Coeficiente de rendimento' })).toBeInTheDocument();
    expect(screen.getByText('7,757')).toHaveClass('heading-ink');
    expect(screen.getByText('Na formatura: entre 7,229 e 8,186.')).toBeInTheDocument();
    expect(screen.getByText('7,757').closest('[data-slot="card"]')).toHaveClass('rounded-card', 'bg-surface');
  });

  it('is not a link without a target', () => {
    render(<MetricCard icon={TrendingUp} label="Coeficiente de rendimento" value="7,757" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('scrolls to the detail section and focuses its title without changing the route', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/visao-geral';
    const section = document.createElement('section');
    section.id = 'desempenho';
    section.innerHTML = '<h2>Desempenho</h2>';
    document.body.append(section);
    const scrollIntoView = vi.fn();
    section.scrollIntoView = scrollIntoView;

    render(<MetricCard icon={TrendingUp} label="Coeficiente de rendimento" value="7,757" targetId="desempenho" />);
    await user.click(screen.getByRole('link', { name: /Coeficiente de rendimento/ }));

    expect(window.location.hash).toBe('#/visao-geral');
    expect(scrollIntoView).toHaveBeenCalled();
    expect(section.querySelector('h2')).toHaveFocus();
  });
});
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/MetricCard.test.tsx`
Expected: FAIL (`Failed to resolve import "./MetricCard"`).

- [ ] **Step 3: Implementar `MetricCard`**

`apps/web/src/components/MetricCard.tsx`:

```tsx
import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { Card } from '@/components/Card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  children?: ReactNode;
  targetId?: string;
  className?: string;
}

// The app routes on #/<view>, so the card scrolls by hand instead of letting the anchor rewrite the hash.
function revealSection(event: MouseEvent<HTMLAnchorElement>, targetId: string) {
  const target = document.getElementById(targetId);
  if (!target) return;
  event.preventDefault();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  const heading = target.querySelector<HTMLElement>('h2');
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
}

export function MetricCard({ icon: Icon, label, value, children, targetId, className }: MetricCardProps) {
  const body = (
    <>
      <div className="flex items-center gap-1.5 text-caption font-semibold text-pen-ink">
        <Icon aria-hidden className="size-4 shrink-0" />
        <h2 className="font-sans text-caption font-semibold tracking-normal font-stretch-normal">{label}</h2>
        {targetId && <ChevronRight aria-hidden className="ml-auto size-4 shrink-0 text-ink-muted" />}
      </div>
      <p className="mt-2 heading-ink text-[1.75rem] leading-none tabular-nums md:text-[2.5rem]">{value}</p>
      {children && <div className="mt-2 grid gap-1 text-footnote text-ink-muted">{children}</div>}
    </>
  );

  if (!targetId) return <Card className={cn('min-w-0', className)}>{body}</Card>;

  return (
    <Card className={cn('min-w-0 p-0', className)}>
      <a
        href={`#${targetId}`}
        onClick={(event) => revealSection(event, targetId)}
        className="block h-full rounded-card p-4 outline-none transition-colors duration-150 ease-snap hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {body}
      </a>
    </Card>
  );
}
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/MetricCard.test.tsx`
Expected: PASS.

- [ ] **Step 4: Teste do resumo em cartões (falha)**

No fim do `describe('OverviewSummary', ...)` de `apps/web/src/features/overview/OverviewSummary.test.tsx`, acrescentar:

```tsx
  it('shows each metric as a card that leads to its detail section', () => {
    renderSummary();
    const summary = screen.getByRole('region', { name: 'Resumo' });
    expect(summary.querySelectorAll('[data-slot="card"]')).toHaveLength(3);
    expect(screen.getByRole('link', { name: /Coeficiente de rendimento/ })).toHaveAttribute('href', '#desempenho');
    expect(screen.getByRole('link', { name: /Previsão de formatura/ })).toHaveAttribute('href', '#ritmo');
    expect(screen.getByRole('link', { name: /Fora das disciplinas/ })).toHaveAttribute('href', '#atividades-complementares');
  });
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/overview/OverviewSummary.test.tsx`
Expected: FAIL no caso novo (os antigos continuam verdes).

- [ ] **Step 5: `OverviewSummary` com `MetricCard`**

Substituir o `return (...)` de `apps/web/src/features/overview/OverviewSummary.tsx` (o resto do arquivo fica) por:

```tsx
  return (
    <section aria-label="Resumo" className="grid min-w-0 gap-3 sm:grid-cols-3">
      <MetricCard icon={TrendingUp} label="Coeficiente de rendimento" value={formatCr(officialCr ?? cr)} targetId="desempenho">
        {officialCr !== null && cr !== null && officialCr !== cr && <p>Pelas notas do histórico: {formatCr(cr)}.</p>}
        {performance.mandatoryCr !== null && <p>CR nas obrigatórias: {formatCr(performance.mandatoryCr)}.</p>}
        {projectionVisible && (
          <p>
            Na formatura: entre {formatCr(projection.worst)} e {formatCr(projection.best)}.
          </p>
        )}
      </MetricCard>
      <MetricCard icon={CalendarCheck} label="Previsão de formatura" value={graduation} targetId="ritmo">
        <p>
          {forecast.remainingTerms === 0
            ? 'Sem obrigatórias pendentes além das que estão em curso.'
            : `${forecast.remainingTerms} ${forecast.remainingTerms === 1 ? 'semestre' : 'semestres'} de obrigatórias pela frente.`}
          {forecast.exceedsMax && forecast.maxTerm && ` Passa do prazo máximo (${formatTerm(forecast.maxTerm)}).`}
        </p>
      </MetricCard>
      <MetricCard
        icon={Clock}
        label="Fora das disciplinas"
        value={formatHours(outsideHours)}
        targetId="atividades-complementares"
      >
        <p>de atividades complementares e extensão ainda por cumprir.</p>
      </MetricCard>
    </section>
  );
```

E acrescentar os imports: `import { CalendarCheck, Clock, TrendingUp } from 'lucide-react';` e `import { MetricCard } from '@/components/MetricCard';`.

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/overview/OverviewSummary.test.tsx src/components/MetricCard.test.tsx`
Expected: PASS (todos, inclusive os textos antigos).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/MetricCard.tsx apps/web/src/components/MetricCard.test.tsx apps/web/src/features/overview/OverviewSummary.tsx apps/web/src/features/overview/OverviewSummary.test.tsx
git commit -m "feat(web): Health-style metric cards for the overview summary"
```

---

### Task 2: Visão geral em cartões

**Files:**
- Modify: `apps/web/src/features/overview/OverviewScreen.tsx`
- Modify (classes da raiz e do `h2`): `PaceSection.tsx`, `PerformanceSection.tsx`, `PendingSection.tsx`, `EnadeSection.tsx`, `IntegrationTable.tsx`, `AaccCard.tsx`, `TimelineBand.tsx` (todos em `apps/web/src/features/overview/`)
- Modify: `apps/web/src/styles/index.css` (raio da `.marker-band`)
- Test: `apps/web/src/features/overview/OverviewScreen.test.tsx`

**Interfaces:**
- Consumes: `Card` (fase 1); ids de seção existentes: `progresso`, `ritmo`, `desempenho`, `pendente`, `enade`, `integralizacao`, `atividades-complementares`, `linha-do-tempo`.
- Produces: cada seção de detalhe é um cartão (`rounded-card bg-surface p-5`) com `scroll-mt-20 md:scroll-mt-24` e `h2` em `text-title3`.

- [ ] **Step 1: Escrever o teste que falha**

`apps/web/src/features/overview/OverviewScreen.test.tsx`:

```tsx
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { analyze } from '@/lib/use-analysis';
import { OverviewScreen } from './OverviewScreen';

const data = { curriculum: sampleCurriculum, transcript: sampleTranscript };

function renderOverview() {
  return render(<OverviewScreen data={data} analysis={analyze(data)} reveal={false} onRevealed={vi.fn()} />);
}

describe('OverviewScreen', () => {
  it('puts the progress band in a highlighted card', () => {
    renderOverview();
    const progress = screen.getByRole('heading', { level: 2, name: '64,69%' });
    expect(progress.closest('[data-slot="card"]')).toHaveClass('rounded-card', 'bg-surface');
  });

  it.each(['ritmo', 'desempenho', 'pendente', 'atividades-complementares'])(
    'renders the %s section as a card that clears the fixed header when scrolled to',
    (id) => {
      const { container } = renderOverview();
      const heading = container.querySelector(`#${id}`);
      expect(heading).not.toBeNull();
      const section = heading!.closest('section');
      expect(section).toHaveClass('rounded-card', 'bg-surface', 'scroll-mt-20', 'md:scroll-mt-24');
      expect(heading).toHaveClass('text-title3');
    },
  );
});
```

(Se `sampleTranscript` não tiver ENADE ou pendências, o `it.each` cobre só as seções que o fixture renderiza; não acrescentar ids que o fixture não mostra.)

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/overview/OverviewScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Seções como cartões**

Em cada arquivo abaixo, trocar a classe da raiz e do `h2` exatamente assim (as demais classes e todo o conteúdo ficam):

| Arquivo | Raiz: classe atual → nova | `h2`: classe atual → nova |
|---|---|---|
| `PaceSection.tsx` | `grid min-w-0 content-start gap-4` → `grid min-w-0 scroll-mt-20 content-start gap-4 rounded-card bg-surface p-5 md:scroll-mt-24` | `text-xl` → `text-title3` |
| `PerformanceSection.tsx` | `grid min-w-0 content-start gap-4` → `grid min-w-0 scroll-mt-20 content-start gap-4 rounded-card bg-surface p-5 md:scroll-mt-24` | `text-xl` → `text-title3` |
| `PendingSection.tsx` | `grid min-w-0 gap-4` → `grid min-w-0 scroll-mt-20 gap-4 rounded-card bg-surface p-5 md:scroll-mt-24` | `text-xl` → `text-title3` |
| `EnadeSection.tsx` | `grid min-w-0 gap-4` → `grid min-w-0 scroll-mt-20 gap-4 rounded-card bg-surface p-5 md:scroll-mt-24` | `text-xl` → `text-title3` |
| `IntegrationTable.tsx` | `grid min-w-0 gap-4` → `grid min-w-0 scroll-mt-20 gap-4 rounded-card bg-surface p-5 md:scroll-mt-24` | `text-xl` → `text-title3` |
| `AaccCard.tsx` | `grid min-w-0 gap-6` → `grid min-w-0 scroll-mt-20 gap-6 rounded-card bg-surface p-5 md:scroll-mt-24` | `text-xl` → `text-title3` |
| `TimelineBand.tsx` | `min-w-0` → `min-w-0 scroll-mt-20 rounded-card bg-surface p-5 md:scroll-mt-24` | `text-xl` → `text-title3` |

(`IntegrationTable.tsx` não tem `aria-labelledby` na `section`: acrescentar `aria-labelledby="integralizacao"` para ela virar região nomeada como as outras.)

- [ ] **Step 3: A tela**

Em `apps/web/src/features/overview/OverviewScreen.tsx`:

1. Importar `import { Card } from '@/components/Card';`.
2. Trocar `<div className="grid gap-14">` por `<div className="grid gap-4 md:gap-6">`.
3. Envolver o `<MarkerBand ... />` em `<Card className="p-5 md:p-6">` ... `</Card>`.
4. Nas duas `div` de duas colunas (`grid min-w-0 gap-12 lg:grid-cols-2`), trocar `gap-12` por `gap-4 md:gap-6`.
5. Os dois gráficos: envolver cada `<Suspense ...>` num `<Card className="p-5">` e trocar o `chartFallback` por `<div aria-hidden className="h-72 rounded-group bg-muted/60" />`.
6. O aviso `unknownStatuses` (`<p role="status" ...>`): trocar `rounded-lg` por `rounded-card` e `p-3` por `p-4`.

Em `apps/web/src/styles/index.css`, na regra `.marker-band`, trocar `border-radius: var(--radius);` por `border-radius: var(--radius-group);`.

- [ ] **Step 4: Rodar**

Run: `pnpm --filter @easy-grades/web exec vitest run --maxWorkers=2 src/features/overview`
Expected: PASS. Se algum teste de seção verificar uma classe antiga (`text-xl`), atualizar para `text-title3`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/overview apps/web/src/styles/index.css
git commit -m "feat(web): overview sections as cards with the progress band as the hero"
```

---

### Task 3: Gráficos no estilo Swift Charts

**Files:**
- Modify: `apps/web/src/features/overview/CrChart.tsx`, `apps/web/src/features/overview/HoursChart.tsx`

**Interfaces:**
- Consumes: `--pen`, `--ink-muted`, `--hairline` (fase 1).
- Produces: nada consumido por outras tasks.

Recharts não renderiza no jsdom (sem tamanho), então esta task não tem teste unitário; a verificação é visual (Step 3).

- [ ] **Step 1: `CrChart`**

Em `apps/web/src/features/overview/CrChart.tsx`:
- `<h2 className="text-xl">` → `<h2 className="text-title3">`;
- `<CartesianGrid vertical={false} />` → `<CartesianGrid vertical={false} stroke="var(--hairline)" />`;
- nas duas `XAxis`/`YAxis`, acrescentar `tick={{ fill: 'var(--ink-muted)', fontSize: 12 }}`;
- na `Line` de `cumulativeCr`, trocar `strokeWidth={3}` por `strokeWidth={3} strokeLinecap="round"`.

- [ ] **Step 2: `HoursChart`**

Em `apps/web/src/features/overview/HoursChart.tsx`:
- `<h2 className="text-xl">` → `<h2 className="text-title3">`;
- `CartesianGrid`, `XAxis`, `YAxis`: as mesmas trocas do Step 1;
- `Bar dataKey="done"`: `radius={[0, 0, 4, 4]}` → `radius={[0, 0, 6, 6]}`; `Bar dataKey="inProgress"`: `radius={[4, 4, 0, 0]}` → `radius={[6, 6, 0, 0]}`; acrescentar `maxBarSize={28}` nas três `Bar`.

Run: `pnpm --filter @easy-grades/web typecheck`
Expected: PASS.

- [ ] **Step 3: Conferir no navegador**

`pnpm dev`, dataset carregado, Visão geral em claro e escuro: grade só horizontal e fraca, eixos em `ink-muted` 12 px, barras arredondadas e finas, linha do CR acumulado em azul com pontas arredondadas. Nada de cor fora da paleta.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/overview/CrChart.tsx apps/web/src/features/overview/HoursChart.tsx
git commit -m "feat(web): Swift Charts style for the overview charts"
```

---

### Task 4: Disciplinas — busca em cápsula, tabela em cartão, lista agrupada no mobile

**Files:**
- Modify: `apps/web/src/features/courses/CoursesScreen.tsx` (busca e categoria)
- Modify: `apps/web/src/features/courses/CourseGroup.tsx`
- Test: `apps/web/src/features/courses/CourseGroup.test.tsx` (novo), `apps/web/src/features/courses/CoursesScreen.test.tsx` (acrescentar caso)

**Interfaces:**
- Consumes: `ListGroupRow` de `@/components/ListGroup` (fase 1); `EntryStatusBadge`; `EntryGroup` e `CATEGORY_LABELS` de `./filter-entries`; `formatCr`, `formatGrade`, `formatHours`, `toTitleCase` de `@/lib/format`.
- Produces: `CourseGroup` com a mesma API (`{ group: EntryGroup; cr?: number | null }`).

- [ ] **Step 1: Escrever os testes que falham**

`apps/web/src/features/courses/CourseGroup.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EntryGroup } from './filter-entries';
import { CourseGroup } from './CourseGroup';

type Entry = EntryGroup['entries'][number];

function entry(over: Partial<Entry>): Entry {
  return {
    key: 'ICC001-2024/1',
    code: 'ICC001',
    name: 'INTRODUCAO A COMPUTACAO',
    category: 'obrigatoria',
    hours: 60,
    grade: 9.1,
    status: 'aprovado',
    rawStatus: 'APR',
    ...over,
  } as Entry;
}

const group = {
  id: '2024/1',
  label: '2024/1',
  hours: 120,
  entries: [
    entry({}),
    entry({
      key: 'ICC099-2024/1',
      code: 'ICC099',
      name: 'TRABALHO DE CONCLUSAO DE CURSO II ORIENTACAO E DESENVOLVIMENTO DE PROJETO FINAL',
      hours: null,
      grade: null,
      status: 'matriculado',
      rawStatus: 'MAT',
    }),
  ],
} as unknown as EntryGroup;

describe('CourseGroup', () => {
  it('keeps one named region with one h2, the period CR and the hours', () => {
    render(<CourseGroup group={group} cr={8.2} />);
    const region = screen.getByRole('region', { name: '2024/1' });
    expect(within(region).getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(within(region).getByText('8,2', { exact: false })).toBeInTheDocument();
  });

  it('lists the courses below md as an iOS grouped list', () => {
    render(<CourseGroup group={group} />);
    const list = screen.getByRole('list');
    expect(list).toHaveClass('rounded-group', 'bg-surface', 'md:hidden');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  it('clamps a long name to two lines and keeps grade and status on the row', () => {
    render(<CourseGroup group={group} />);
    const row = within(screen.getByRole('list')).getAllByRole('listitem')[1]!;
    expect(within(row).getByText(/Trabalho de Conclusão|Trabalho De Conclusao/i)).toHaveClass('line-clamp-2');
    expect(within(row).getByText('—')).toBeInTheDocument();
    expect(within(row).getByText('CH —')).toBeInTheDocument();
  });

  it('puts the md+ table in a card', () => {
    render(<CourseGroup group={group} />);
    const table = screen.getByRole('table', { name: 'Disciplinas de 2024/1' });
    expect(table.parentElement).toHaveClass('rounded-card', 'bg-surface');
  });

  it('sticks the group header below the fixed headers', () => {
    render(<CourseGroup group={group} />);
    const header = screen.getByRole('heading', { level: 2 });
    expect(header).toHaveClass('sticky', 'top-[calc(env(safe-area-inset-top)+2.75rem)]', 'md:top-[3.25rem]');
  });
});
```

(Se o tipo real de `EntryGroup` tiver campos com outros nomes, ajustar só a fábrica `entry`/`group` ao tipo de `./filter-entries`; manter o que cada caso afirma.)

No `apps/web/src/features/courses/CoursesScreen.test.tsx`, acrescentar no `describe` principal:

```tsx
  it('searches from a capsule field with a search icon', () => {
    renderScreen();
    const search = screen.getByRole('searchbox', { name: 'Buscar disciplina' });
    expect(search).toHaveClass('rounded-full', 'pl-10');
    expect(search.parentElement?.querySelector('svg')).not.toBeNull();
  });
```

(Usar o helper de render que o arquivo já tem; se ele tiver outro nome, usar esse nome.)

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/courses`
Expected: FAIL nos casos novos.

- [ ] **Step 2: Busca e categoria**

Em `apps/web/src/features/courses/CoursesScreen.tsx`:

1. Import `Search` de `lucide-react` (junto com os ícones já importados).
2. O bloco do `Input` de busca vira:

```tsx
          <div className="grid gap-1.5">
            <Label htmlFor="busca" className="sr-only">
              Buscar disciplina
            </Label>
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted" />
              <Input
                ref={searchRef}
                id="busca"
                type="search"
                placeholder="Buscar por código ou nome"
                className="pl-10 max-md:h-11"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
```

3. No `SelectTrigger` de categoria, acrescentar `rounded-full` ao `className`.

- [ ] **Step 3: `CourseGroup`**

Substituir o JSX retornado por `CourseGroup` em `apps/web/src/features/courses/CourseGroup.tsx` (o comentário do componente passa a dizer "The header sticks under the fixed header..."; imports: acrescentar `import { ListGroupRow } from '@/components/ListGroup';`):

```tsx
  return (
    <section aria-labelledby={labelId} className="grid gap-2">
      <h2 className="sticky top-[calc(env(safe-area-inset-top)+2.75rem)] z-20 -mx-4 flex h-11 items-baseline gap-3 bg-background/95 px-4 pt-2 font-sans tracking-normal font-stretch-normal md:top-[3.25rem]">
        <span id={labelId} className="heading-ink text-title3">
          {group.label}
        </span>
        <span className="text-footnote font-normal text-ink-muted">
          {cr !== undefined && (
            <>
              <abbr title="Coeficiente de rendimento">CR</abbr> {formatCr(cr)} ·{' '}
            </>
          )}
          {formatHours(group.hours)}
        </span>
      </h2>

      <div className="hidden rounded-card bg-surface px-4 md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Disciplinas de {group.label}</caption>
          <thead className="sticky top-[calc(3.25rem+2.75rem)] z-10 text-left text-footnote text-ink-muted">
            <tr>
              <th scope="col" className="bg-surface py-2.5 pr-4 font-medium">
                Disciplina
              </th>
              <th scope="col" className="bg-surface py-2.5 pr-4 font-medium">
                Categoria
              </th>
              <th scope="col" className="bg-surface py-2.5 pr-4 text-right font-medium">
                CH
              </th>
              <th scope="col" className="bg-surface py-2.5 pr-4 text-right font-medium">
                Nota
              </th>
              <th scope="col" className="bg-surface py-2.5 font-medium">
                Situação
              </th>
            </tr>
          </thead>
          <tbody>
            {group.entries.map((e) => (
              <tr key={e.key} className="border-t border-hairline">
                <td className="py-3 pr-4">
                  <span className="code-label block text-caption">{e.code}</span>
                  {toTitleCase(e.name)}
                </td>
                <td className="py-3 pr-4">{CATEGORY_LABELS[e.category]}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{e.hours ?? '—'}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{formatGrade(e.grade)}</td>
                <td className="py-3">
                  <EntryStatusBadge status={e.status} rawStatus={e.rawStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="rounded-group bg-surface pl-4 md:hidden">
        {group.entries.map((e) => (
          <ListGroupRow key={e.key} className="items-start">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-medium">{toTitleCase(e.name)}</p>
              <p className="mt-0.5 flex flex-wrap gap-x-2 text-footnote text-ink-muted">
                <span className="code-label">{e.code}</span>
                <span>{CATEGORY_LABELS[e.category]}</span>
                <span>{e.hours === null ? 'CH —' : formatHours(e.hours)}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="heading-ink text-title3 tabular-nums">{formatGrade(e.grade)}</span>
              <EntryStatusBadge status={e.status} rawStatus={e.rawStatus} />
            </div>
          </ListGroupRow>
        ))}
      </ul>
    </section>
  );
```

(`formatGrade(null)` já devolve "—"; se não devolver, o teste do Step 1 aponta e o certo é usar `e.grade === null ? '—' : formatGrade(e.grade)` nas duas visões.)

- [ ] **Step 4: Rodar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/features/courses`
Expected: PASS (inclusive os testes antigos da tabela, das chips e dos `h2`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/courses
git commit -m "feat(web): courses with a capsule search, a carded table and an iOS grouped list"
```

---

### Task 5: Documentação e verificação

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: `CLAUDE.md`**

Na seção "Frontend conventions", acrescentar depois do item "Navigation shell":

```markdown
- Overview (phase 3): the summary is three `MetricCard`s (icon + caption label in `pen-ink`, big `heading-ink` value, footnote context). A card with `targetId` is an anchor that scrolls to that section and focuses its `h2` without touching the `#/<view>` hash. The MarkerBand sits in a hero `Card`; every detail section is a card (`rounded-card bg-surface p-5`, `h2` in `text-title3`, `scroll-mt-20 md:scroll-mt-24` so the fixed headers never cover it). Charts: horizontal hairline grid only, `ink-muted` 12 px ticks, rounded thin bars (`radius` 6, `maxBarSize` 28).
- Courses (phase 3): capsule search with an icon (visually hidden label), carded table from md, iOS grouped list (`ListGroupRow`) below md; one `section` + one `h2` per group, sticky below the fixed headers (`top-[calc(env(safe-area-inset-top)+2.75rem)] md:top-[3.25rem]`).
```

- [ ] **Step 2: React Doctor e verificação**

Run: `pnpm react-doctor:changed`
Expected: 0 erros.

Run: `pnpm --filter @easy-grades/web exec vitest run --maxWorkers=2 && pnpm typecheck && pnpm lint && pnpm build`
Expected: PASS.

- [ ] **Step 3: Verificação manual**

`pnpm dev`, 390 px e 1440 px, claro e escuro:
- Visão geral: cartões do resumo; tocar no do CR rola até "Desempenho" com o título visível abaixo do header e o hash continua `#/visao-geral`; MarkerBand no cartão de destaque com a revelação; seções em cartões; gráficos no estilo novo.
- Disciplinas: busca em cápsula; no mobile, lista agrupada com nota e badge à direita e nomes longos em 2 linhas; no desktop, tabela em cartão; cabeçalhos dos grupos grudam abaixo do header ao rolar.

- [ ] **Step 4: Commit e revisão**

```bash
git add CLAUDE.md
git commit -m "docs: overview and courses conventions"
```

Revisão da branch inteira (Opus 5.5, esforço médio); depois `gh auth status`, push, PR e merge `--no-ff`.

## Ordem e paralelismo

Tasks 1, 2, 3 e 4 mexem em arquivos diferentes e podem rodar em paralelo (cada uma na sua worktree a partir de `feat/caneta-overview-courses`); o Task 2 é o único que toca o `index.css`. O Task 5 vem por último.
