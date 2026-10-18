# Caneta — Fase 1 (fundação) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a fundação visual do app inteiro para a identidade "Caneta": tokens em inglês, azul caneta, verde de aprovado, tipografia híbrida, raios, material de vidro, molas, contraste aumentado, preferência de aparência e os componentes base em cápsula.

**Architecture:** Tudo nasce em `apps/web/src/styles/index.css` (tokens CSS + `@theme` do Tailwind v4) e é consumido por utilitários Tailwind. Uma renomeação mecânica troca os nomes PT-BR pelos novos em todo o `src`. Um teste lê o `index.css` cru e garante os contrastes WCAG. Componentes base novos (`Card`, `ListGroup`, `SegmentedControl`, `ChipGroup`) e os patches de `button.tsx`/`input.tsx` dão o visual em cápsula. Nenhuma tela é redesenhada nesta fase; elas só herdam a fundação.

**Tech Stack:** React 19, Tailwind CSS v4 (`@theme`, `@utility`), shadcn 4 (radix-nova), Vitest + Testing Library (jsdom), pnpm 11.

**Spec:** `docs/superpowers/specs/2026-10-16-caneta-rebranding-design.md` (seções 3 e 9, fase 1).

## Global Constraints

- Escopo: só `apps/web`. API, `packages/core` e regras de domínio não mudam.
- Todo nome em código (tokens, utilitários, componentes, funções, arquivos, data-attributes) em inglês. Copy da interface em PT-BR, sentence case, sem "→".
- Comentários só para o "porquê" não óbvio; sem código comentado; sem docstrings novas não pedidas.
- Contraste: texto ≥ 4,5:1, bordas de campo ≥ 3:1, nos modos claro e escuro.
- Status sempre ícone + texto, nunca só cor.
- Sem CDN, sem scripts de terceiros, fontes self-hosted. CSP: `script-src 'self'` (sem script inline em `index.html`).
- `localStorage` sempre dentro de `try/catch`.
- `src/components/ui/` só recebe os patches documentados no `CLAUDE.md` (esta fase acrescenta `button.tsx` e `input.tsx`).
- Branch: `feat/caneta-foundation` a partir de `main`. Commits com a identidade local do repo (já configurada); nunca alterar `git config`.
- Commits sem trailer de co-autoria de agente (nada de `Co-Authored-By` de IA).
- Antes da revisão: `pnpm react-doctor:changed` sem erros.

## Review Focus

1. **Classes renomeadas que viram no-op silencioso.** Uma classe antiga (`text-suave`) que sobrar não quebra build, só some a cor. O Task 2 acrescenta `legacy-tokens.test.ts`, que varre todo o `src` e falha se um nome antigo aparecer.
2. **Texto sobre o vidro com conteúdo escuro passando por baixo.** O pior caso é `ink-muted` sobre a tinta do vidro composta sobre `ink`/`pen`/`danger`/`success`. Testado no Task 2 (`tokens.test.ts`).
3. **`localStorage` indisponível** (Safari privado, bloqueado): a aparência precisa cair em "glass" sem lançar. Testado no Task 5.
4. **Usuário com "Aumentar contraste"**: o vidro tem de virar sólido e os neutros reforçados precisam manter os contrastes. Testado no Task 2 (tokens de alto contraste) e no Task 4 (vidro sólido).
5. **Chip/segmented por teclado** depois da troca de visual: setas, Home/End e tab stop único continuam funcionando. Testado no Task 8.

---

### Task 1: Funções de contraste WCAG

**Files:**
- Create: `apps/web/src/lib/contrast.ts`
- Test: `apps/web/src/lib/contrast.test.ts`

**Interfaces:**
- Produces:
  - `type Rgb = readonly [number, number, number]`
  - `parseHex(hex: string): Rgb` (só `#rrggbb`; lança em qualquer outro formato)
  - `relativeLuminance(rgb: Rgb): number`
  - `contrastRatio(a: Rgb, b: Rgb): number`
  - `composite(top: Rgb, bottom: Rgb, alpha: number): Rgb` (mistura alfa em sRGB)

- [ ] **Step 1: Criar a branch**

```bash
git checkout main
git pull --ff-only
git checkout -b feat/caneta-foundation
```

- [ ] **Step 2: Escrever o teste que falha**

`apps/web/src/lib/contrast.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { composite, contrastRatio, parseHex, relativeLuminance } from './contrast';

describe('parseHex', () => {
  it('reads a 6-digit hex color in either case', () => {
    expect(parseHex('#2A5BD7')).toEqual([42, 91, 215]);
    expect(parseHex('#ffffff')).toEqual([255, 255, 255]);
  });

  it('rejects anything that is not #rrggbb', () => {
    expect(() => parseHex('#fff')).toThrow();
    expect(() => parseHex('var(--ink)')).toThrow();
    expect(() => parseHex('2a5bd7')).toThrow();
  });
});

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0);
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('is 21 between black and white, in either order', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 5);
  });

  it('is 1 for the same color', () => {
    expect(contrastRatio([42, 91, 215], [42, 91, 215])).toBe(1);
  });

  it('matches the WCAG value for the pen blue on white', () => {
    expect(contrastRatio(parseHex('#2a5bd7'), parseHex('#ffffff'))).toBeCloseTo(5.87, 2);
  });
});

describe('composite', () => {
  it('returns the top color at alpha 1 and the bottom one at alpha 0', () => {
    expect(composite([255, 255, 255], [0, 0, 0], 1)).toEqual([255, 255, 255]);
    expect(composite([255, 255, 255], [0, 0, 0], 0)).toEqual([0, 0, 0]);
  });

  it('mixes linearly in between', () => {
    expect(composite([200, 100, 0], [0, 100, 200], 0.75)).toEqual([150, 100, 50]);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/lib/contrast.test.ts`
Expected: FAIL (`Failed to resolve import "./contrast"`).

- [ ] **Step 4: Implementar**

`apps/web/src/lib/contrast.ts`:

```ts
export type Rgb = readonly [number, number, number];

export function parseHex(hex: string): Rgb {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new Error(`Not a #rrggbb color: ${hex}`);
  const value = match[1]!;
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

function linearChannel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance([r, g, b]: Rgb): number {
  return 0.2126 * linearChannel(r) + 0.7152 * linearChannel(g) + 0.0722 * linearChannel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function composite(top: Rgb, bottom: Rgb, alpha: number): Rgb {
  return [
    top[0] * alpha + bottom[0] * (1 - alpha),
    top[1] * alpha + bottom[1] * (1 - alpha),
    top[2] * alpha + bottom[2] * (1 - alpha),
  ];
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/lib/contrast.test.ts`
Expected: PASS (todos).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/contrast.ts apps/web/src/lib/contrast.test.ts
git commit -m "feat(web): WCAG contrast helpers"
```

---

### Task 2: Tokens de cor em inglês, azul caneta e verde de aprovado

**Files:**
- Modify: `apps/web/src/styles/index.css` (bloco `@theme inline`, `:root`, bloco escuro, novo bloco de contraste aumentado, regras de React Flow)
- Modify: todos os `.ts`/`.tsx` de `apps/web/src` que usam as classes antigas (renomeação mecânica, ~34 arquivos)
- Modify: `apps/web/src/components/state-style.ts`, `apps/web/src/components/state-style.test.ts`
- Modify: `apps/web/src/features/overview/PaceSection.tsx`, `apps/web/src/features/overview/PerformanceSection.tsx`
- Modify: `apps/web/index.html` (`theme-color`)
- Test: `apps/web/src/styles/tokens.test.ts`, `apps/web/src/styles/legacy-tokens.test.ts`

**Interfaces:**
- Consumes: `parseHex`, `contrastRatio`, `composite`, `type Rgb` (Task 1).
- Produces (tokens CSS e classes Tailwind usados por todas as tasks seguintes):
  - CSS vars: `--canvas`, `--surface`, `--ink`, `--ink-muted`, `--hairline`, `--field`, `--pen`, `--pen-ink`, `--pen-tint`, `--pen-foreground`, `--success`, `--success-tint`, `--danger`, `--danger-foreground`, `--glass-opacity`, `--glass-tint`, `--glass-edge`, `--glass-shadow`, `--glass-filter`.
  - Classes: `bg-canvas`, `bg-surface`, `text-ink`, `text-ink-muted`, `border-hairline`, `border-field`, `bg-pen`, `text-pen-ink`, `bg-pen-tint`, `text-pen-foreground`, `text-success`, `bg-success-tint`, `border-success`, `text-danger`, `bg-danger`, `text-danger-foreground` (e as variantes `border-l-*`, `divide-*`, `/opacity` etc.).

- [ ] **Step 1: Escrever o teste de contraste dos tokens (vai falhar)**

`apps/web/src/styles/tokens.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { composite, contrastRatio, parseHex, type Rgb } from '@/lib/contrast';
import css from './index.css?raw';

type Tokens = Record<string, string>;

function rootTokens(media?: string): Tokens {
  const from = media ? css.indexOf(media) : 0;
  if (from === -1) throw new Error(`Missing block: ${media}`);
  const open = css.indexOf(':root {', from);
  const close = css.indexOf('}', open);
  const body = css.slice(open, close);
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}

function color(tokens: Tokens, name: string): Rgb {
  let value = tokens[name];
  for (let hops = 0; value?.startsWith('var(--') && hops < 5; hops++) value = tokens[value.slice(6, -1)];
  if (!value) throw new Error(`Missing token --${name}`);
  return parseHex(value);
}

const light = rootTokens();
const dark = { ...light, ...rootTokens('@media (prefers-color-scheme: dark) {') };
const highContrastLight = { ...light, ...rootTokens('@media (prefers-contrast: more) {') };
const highContrastDark = { ...dark, ...rootTokens('@media (prefers-contrast: more) and (prefers-color-scheme: dark) {') };

const modes = { light, dark, highContrastLight, highContrastDark } as const;
const TEXT = 4.5;
const NON_TEXT = 3;

describe.each(Object.entries(modes))('%s tokens', (_, tokens) => {
  const ratio = (fg: string, bg: string) => contrastRatio(color(tokens, fg), color(tokens, bg));

  it.each(['ink', 'ink-muted', 'pen-ink', 'danger', 'success'])('keeps --%s readable on canvas and surface', (fg) => {
    expect(ratio(fg, 'canvas')).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(fg, 'surface')).toBeGreaterThanOrEqual(TEXT);
  });

  it('keeps tinted badges and filled buttons readable', () => {
    expect(ratio('pen-ink', 'pen-tint')).toBeGreaterThanOrEqual(TEXT);
    expect(ratio('success', 'success-tint')).toBeGreaterThanOrEqual(TEXT);
    expect(ratio('pen-foreground', 'pen')).toBeGreaterThanOrEqual(TEXT);
    expect(ratio('danger-foreground', 'danger')).toBeGreaterThanOrEqual(TEXT);
  });

  it('keeps field borders at 3:1', () => {
    expect(ratio('field', 'canvas')).toBeGreaterThanOrEqual(NON_TEXT);
    expect(ratio('field', 'surface')).toBeGreaterThanOrEqual(NON_TEXT);
  });
});

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('%s glass', (_, tokens) => {
  const alpha = Number.parseFloat(tokens['glass-opacity']!) / 100;

  it.each(['pen', 'ink', 'danger', 'success'])(
    'keeps text on the glass readable with --%s content scrolling under it (sRGB blend, blur ignored)',
    (under) => {
      const glass = composite(color(tokens, 'surface'), color(tokens, under), alpha);
      for (const fg of ['ink', 'ink-muted', 'pen-ink']) {
        expect(contrastRatio(color(tokens, fg), glass)).toBeGreaterThanOrEqual(TEXT);
      }
    },
  );
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/styles/tokens.test.ts`
Expected: FAIL (`Missing token --canvas` ou `Missing block: @media (prefers-contrast: more) {`).

- [ ] **Step 3: Reescrever os tokens de cor no `index.css`**

No bloco `@theme inline`, substituir as 11 linhas de `--color-fundo` até `--color-erro-foreground` por:

```css
  --color-canvas: var(--canvas);
  --color-surface: var(--surface);
  --color-ink: var(--ink);
  --color-ink-muted: var(--ink-muted);
  --color-hairline: var(--hairline);
  --color-field: var(--field);
  --color-pen: var(--pen);
  --color-pen-ink: var(--pen-ink);
  --color-pen-tint: var(--pen-tint);
  --color-pen-foreground: var(--pen-foreground);
  --color-success: var(--success);
  --color-success-tint: var(--success-tint);
  --color-danger: var(--danger);
  --color-danger-foreground: var(--danger-foreground);
```

Substituir o comentário da paleta e o bloco `:root { ... }` inteiro (de `/* Palette: ...` até o `}` que fecha depois de `--sidebar-ring`) por:

```css
/* Palette: graphite neutrals and one accent, pen blue. Approval has its own quiet green so the accent never means "approved". */
:root {
  --canvas: #f4f4f2;
  --surface: #ffffff;
  --ink: #18191c;
  --ink-muted: #5d6068;
  --hairline: #e2e2de;
  --field: #7f848c;
  --pen: #2a5bd7;
  --pen-ink: #2350c2;
  --pen-tint: #e3eafb;
  --pen-foreground: #ffffff;
  --success: #2a7348;
  --success-tint: #e2efe6;
  --danger: #c23b3b;
  --danger-foreground: #ffffff;

  --band-pending: color-mix(in oklab, var(--pen) 45%, transparent);

  /* Opacity floor that keeps --ink-muted at 4.5:1 with any content color under the glass (tokens.test.ts). */
  --glass-opacity: 84%;
  --glass-tint: color-mix(in oklab, var(--surface) var(--glass-opacity), transparent);
  --glass-edge: color-mix(in oklab, #ffffff 60%, transparent);
  --glass-shadow: 0 8px 24px rgb(0 0 0 / 0.1), 0 1px 2px rgb(0 0 0 / 0.06);
  --glass-filter: blur(16px) saturate(170%);

  --background: var(--canvas);
  --foreground: var(--ink);
  --card: var(--surface);
  --card-foreground: var(--ink);
  --popover: var(--surface);
  --popover-foreground: var(--ink);
  /* Buttons stay graphite: blue is reserved for navigation, progress, focus and one primary action per screen. */
  --primary: var(--ink);
  --primary-foreground: var(--canvas);
  --secondary: #ededea;
  --secondary-foreground: var(--ink);
  --muted: #ededea;
  --muted-foreground: var(--ink-muted);
  --accent: #ededea;
  --accent-foreground: var(--ink);
  --destructive: var(--danger);
  --border: var(--hairline);
  --input: var(--field);
  --ring: var(--pen);
  --chart-1: var(--pen);
  --chart-2: var(--ink);
  --chart-3: var(--ink-muted);
  --chart-4: #1f47b4;
  --chart-5: var(--danger);
  --radius: 0.5rem;
  --sidebar: var(--surface);
  --sidebar-foreground: var(--ink);
  --sidebar-primary: var(--ink);
  --sidebar-primary-foreground: var(--canvas);
  --sidebar-accent: var(--accent);
  --sidebar-accent-foreground: var(--ink);
  --sidebar-border: var(--border);
  --sidebar-ring: var(--pen);
}
```

Substituir o bloco escuro inteiro (`/* Dark is graphite at night ... */` e o `@media (prefers-color-scheme: dark) { :root { ... } }`) por:

```css
/* Dark is graphite at night: a cool near-black, not navy. */
@media (prefers-color-scheme: dark) {
  :root {
    --canvas: #0e0f11;
    --surface: #1b1c1f;
    --ink: #ecedee;
    --ink-muted: #9a9ca3;
    --hairline: #2a2c30;
    --field: #6e727b;
    --pen: #6f9bff;
    --pen-ink: #8fb0ff;
    --pen-tint: #1c2a4d;
    --pen-foreground: #0e0f11;
    --success: #7fc79a;
    --success-tint: #1c3326;
    --danger: #f07070;
    --danger-foreground: #0e0f11;

    --glass-opacity: 90%;
    --glass-edge: color-mix(in oklab, #ffffff 14%, transparent);
    --glass-shadow: 0 8px 24px rgb(0 0 0 / 0.45);

    --secondary: #232427;
    --muted: #232427;
    --accent: #232427;
    --chart-4: #a8c2ff;
    --sidebar-primary-foreground: var(--canvas);
  }
}

/* "Increase contrast": stronger neutrals. The glass turns solid in the same condition (see the glass section). */
@media (prefers-contrast: more) {
  :root {
    --ink-muted: #3f4248;
    --hairline: #8a8e95;
    --field: #5d6068;
  }
}
@media (prefers-contrast: more) and (prefers-color-scheme: dark) {
  :root {
    --ink-muted: #c4c6cb;
    --hairline: #6e727b;
    --field: #9a9ca3;
  }
}
```

No `@layer base`, trocar `@apply border-border outline-ring/50;` (inalterado) e manter; nada mais muda no base nesta task.

Nas regras do React Flow, trocar:
- `--xy-node-boxshadow-selected: 0 0 0 2px var(--esmeralda);` → `0 0 0 2px var(--pen);`
- `.react-flow__minimap-node.mini-done { fill: var(--esmeralda); }` → `fill: var(--success);`
- `.react-flow__minimap-node.mini-left { fill: var(--linha); }` → `fill: var(--hairline);`
- `--xy-background-pattern-dots-color-default: var(--linha);` → `var(--hairline);`
- `.react-flow__node:focus-visible { outline: 2px solid var(--esmeralda); ... }` → `var(--pen)`

No `.grid-paper::before` e no `.marker-band`, trocar `var(--linha)` por `var(--hairline)` e `var(--superficie)` por `var(--surface)`.

Depois disso, conferir que o CSS não tem mais nomes antigos:

Run: `grep -nE "fundo|superficie|--texto|suave|linha|campo|esmeralda|--erro" apps/web/src/styles/index.css`
Expected: nenhuma linha.

- [ ] **Step 4: Rodar o teste de tokens**

Run: `pnpm --filter @easy-grades/web exec vitest run src/styles/tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Renomear as classes e vars nos `.ts`/`.tsx`**

A troca só pega o nome quando ele vem logo depois de um utilitário Tailwind ou de `--` (caractere antes do `-` é letra ou `-`). Assim ids como `` `${id}-erro` `` não mudam. A ordem importa (os nomes compostos primeiro).

```bash
cd apps/web
node -e '
const fs = require("fs"), path = require("path");
const map = [
  ["esmeralda-texto", "pen-ink"], ["esmeralda-fundo", "pen-tint"], ["esmeralda", "pen"],
  ["erro-foreground", "danger-foreground"], ["erro", "danger"],
  ["superficie", "surface"], ["fundo", "canvas"], ["texto", "ink"],
  ["suave", "ink-muted"], ["linha", "hairline"], ["campo", "field"],
];
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(e.name) ? [p] : [];
});
for (const file of walk("src")) {
  const before = fs.readFileSync(file, "utf8");
  let after = before;
  for (const [from, to] of map) after = after.replace(new RegExp(`([a-z-])-${from}(?![\\w-])`, "g"), `$1-${to}`);
  if (after !== before) { fs.writeFileSync(file, after); console.log(file); }
}'
cd ../..
```

Conferir que não sobrou nenhuma classe ou var antiga:

Run: `grep -rnE "[a-z-]-(esmeralda|erro|superficie|fundo|texto|suave|linha|campo)([^a-zA-Z0-9_-]|$)" apps/web/src --include=*.ts --include=*.tsx`
Expected: nenhuma linha.

Conferir que os ids de erro não mudaram:

Run: `grep -rn -- '}-erro' apps/web/src --include=*.tsx`
Expected: as 5 linhas de `AaccCard.tsx` e `Dropzone.tsx` com `` `${...}-erro` `` continuam lá.

Atualizar a prosa que ainda fala da cor antiga (comentários e nomes de teste não são pegos pela troca):

Run: `grep -rn "esmeralda" apps/web/src --include=*.ts --include=*.tsx`
Expected: sobram `BrandMark.tsx` (o logo muda na fase 6, deixar), o comentário de `MarkerBand.tsx`, o de `CreditMeter.tsx` e o título de um teste em `PlanningScreen.test.tsx`. Nesses três, trocar "esmeralda" por "pen blue" (o teste vira `'keeps the pen blue text on "No semestre" when it is hovered'`).

- [ ] **Step 5b: Fixar que nenhuma classe antiga volte (teste)**

`apps/web/src/styles/legacy-tokens.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

const sources = import.meta.glob(['../**/*.{ts,tsx}', '!./legacy-tokens.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const LEGACY = /[a-z-]-(esmeralda|erro|superficie|fundo|texto|suave|linha|campo)(?![\w-])/;

describe('legacy Grafite tokens', () => {
  it.each(Object.entries(sources))('are gone from %s', (_, source) => {
    expect(source).not.toMatch(LEGACY);
  });
});
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/styles/legacy-tokens.test.ts`
Expected: PASS (se falhar, o nome do arquivo no título do caso aponta a classe esquecida; renomear e rodar de novo).

- [ ] **Step 6: Separar "aprovado" do destaque — teste primeiro**

Substituir o segundo e o quarto `it` de `apps/web/src/components/state-style.test.ts` (o arquivo já teve as classes renomeadas pelo Step 5) por:

```ts
  it('gives a concluída course the success wash in both modes, and a success left accent', () => {
    expect(STATE_STYLE.concluida.surface).toBe('bg-success-tint');
    expect(STATE_STYLE.concluida.badge).toContain('bg-success-tint text-success');
    expect(STATE_STYLE.concluida.accent).toBe('border-l-success');
    expect(STATE_STYLE.concluida.iconColor).toBe('text-success');
  });
```

```ts
  it('gives each status its left accent, with em curso in pen blue and disponível dashed', () => {
    expect(STATE_STYLE.em_curso.accent).toBe('border-l-pen');
    expect(STATE_STYLE.em_curso.badge).toContain('bg-pen-tint text-pen-ink');
    expect(STATE_STYLE.disponivel.accent).toBe('border-l-ink border-dashed');
    expect(STATE_STYLE.bloqueada.accent).toBe('border-l-ink-muted');
    expect(STATE_STYLE.reprovada.accent).toBe('border-l-danger');
  });
```

O primeiro `it` já deve estar com `text-danger-foreground` (renomeado no Step 5).

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/state-style.test.ts`
Expected: FAIL nos dois `it` alterados.

- [ ] **Step 7: Implementar os estados**

Em `apps/web/src/components/state-style.ts`, trocar o comentário de `surface` e o comentário do objeto, e as entradas `concluida` e `em_curso`:

```ts
  /** Card background. Concluída courses get the success wash in both modes, so the done pattern reads at a glance. */
  surface: string;
```

```ts
/**
 * Status is always color + icon + text, never color alone. Success green marks what is approved, pen blue what is in
 * progress, graphite what is still open (disponível, bloqueada) and danger what failed.
 */
export const STATE_STYLE: Record<CourseState, StateStyle> = {
  concluida: {
    icon: CircleCheck,
    badge: 'bg-success-tint text-success border-success',
    surface: 'bg-success-tint',
    accent: 'border-l-success',
    iconColor: 'text-success',
  },
  em_curso: {
    icon: CircleDot,
    badge: 'bg-pen-tint text-pen-ink border-pen-tint',
    surface: 'bg-card',
    accent: 'border-l-pen',
    iconColor: 'text-pen-ink',
  },
```

(`disponivel`, `bloqueada` e `reprovada` ficam como o Step 5 deixou.)

Em `apps/web/src/features/overview/PaceSection.tsx`, nas entradas `concluido` e `no_ritmo`, trocar `iconColor: 'text-pen-ink'` por `iconColor: 'text-success'`.
Em `apps/web/src/features/overview/PerformanceSection.tsx`, na entrada `subindo`, trocar `iconColor: 'text-pen-ink'` por `iconColor: 'text-success'`.

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/state-style.test.ts`
Expected: PASS.

- [ ] **Step 8: `theme-color` do canvas escuro**

Em `apps/web/index.html`, trocar `content="#141517"` por `content="#0E0F11"` (a meta clara `#F4F4F2` continua).

- [ ] **Step 9: Rodar tudo**

Run: `pnpm --filter @easy-grades/web test && pnpm --filter @easy-grades/web typecheck`
Expected: PASS. Se algum teste de tela falhar, é porque ainda espera uma classe antiga: atualizar a expectativa para o nome novo (nunca o contrário).

- [ ] **Step 10: Commit**

```bash
git add apps/web
git commit -m "feat(web): Caneta color tokens in English, pen blue accent and success green"
```

---

### Task 3: Tipografia híbrida e escala no estilo iOS

**Files:**
- Modify: `apps/web/src/styles/index.css` (`@theme inline` fontes e escala, `heading-ink`, `@layer base`)
- Modify: `apps/web/src/features/courses/CoursesScreen.tsx:65`, `apps/web/src/features/flowchart/FlowchartScreen.tsx:216`, `apps/web/src/features/planning/PlanningScreen.tsx:159`, `apps/web/src/features/upload/UploadScreen.tsx:39`, `apps/web/src/features/overview/OverviewSummary.tsx:29,46,58`
- Test: `apps/web/src/styles/theme.test.ts`

**Interfaces:**
- Consumes: nada das tasks anteriores além do `index.css` já renomeado.
- Produces: utilitários `text-large-title`, `text-title1`, `text-title2`, `text-title3`, `text-headline`, `text-body`, `text-callout`, `text-subhead`, `text-footnote`, `text-caption`, `text-stat`; `font-sans` = fonte do sistema; `font-heading` = Mona Sans; `heading-ink` afinado. `text-display` deixa de existir.

- [ ] **Step 1: Escrever o teste que falha**

`apps/web/src/styles/theme.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import css from './index.css?raw';

function declaration(name: string): string | undefined {
  return new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim();
}

function utility(name: string): string {
  const start = css.indexOf(`@utility ${name} {`);
  if (start === -1) throw new Error(`Missing @utility ${name}`);
  return css.slice(start, css.indexOf('\n}', start));
}

describe('typography', () => {
  it('sets the body in the system font and keeps Mona Sans for headings', () => {
    expect(declaration('--font-sans')).toBe('-apple-system, system-ui, "Segoe UI", Roboto, sans-serif');
    expect(declaration('--font-heading')).toMatch(/^"Mona Sans Variable",/);
  });

  it.each([
    ['large-title', '2.125rem', '2.5625rem'],
    ['title1', '1.75rem', '2.125rem'],
    ['title2', '1.375rem', '1.75rem'],
    ['title3', '1.25rem', '1.5625rem'],
    ['headline', '1.0625rem', '1.375rem'],
    ['body', '1.0625rem', '1.375rem'],
    ['callout', '1rem', '1.3125rem'],
    ['subhead', '0.9375rem', '1.25rem'],
    ['footnote', '0.8125rem', '1.125rem'],
    ['caption', '0.75rem', '1rem'],
  ])('defines text-%s with a fixed line height', (step, size, lineHeight) => {
    expect(declaration(`--text-${step}`)).toBe(size);
    expect(declaration(`--text-${step}--line-height`)).toBe(lineHeight);
  });

  it('drops the old display step', () => {
    expect(declaration('--text-display')).toBeUndefined();
  });

  it('tunes heading-ink toward the iOS large title', () => {
    const rules = utility('heading-ink');
    expect(rules).toContain('font-weight: 750;');
    expect(rules).toContain('font-stretch: 106%;');
    expect(rules).toContain('letter-spacing: -0.015em;');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/styles/theme.test.ts`
Expected: FAIL (`--font-sans` ainda é Mona Sans; `--text-large-title` indefinido).

- [ ] **Step 3: Implementar no `index.css`**

Trocar o utilitário `heading-ink` por:

```css
/* Headings and big numbers: Mona Sans close to the bold of the iOS large titles, so the switch to the system body font
   stays smooth on SF, Roboto and Segoe UI. */
@utility heading-ink {
  font-family: var(--font-heading);
  font-weight: 750;
  font-stretch: 106%;
  letter-spacing: -0.015em;
  line-height: 1.1;
}
```

No início do `@theme inline`, trocar as linhas de `--font-sans` até `--text-stat` por:

```css
  --font-sans: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif;
  --font-heading: "Mona Sans Variable", -apple-system, system-ui, sans-serif;
  /* iOS Dynamic Type at the default "Large" size. Fixed line heights keep layouts stable whatever the system font. */
  --text-large-title: 2.125rem;
  --text-large-title--line-height: 2.5625rem;
  --text-title1: 1.75rem;
  --text-title1--line-height: 2.125rem;
  --text-title2: 1.375rem;
  --text-title2--line-height: 1.75rem;
  --text-title3: 1.25rem;
  --text-title3--line-height: 1.5625rem;
  --text-headline: 1.0625rem;
  --text-headline--line-height: 1.375rem;
  --text-headline--font-weight: 600;
  --text-body: 1.0625rem;
  --text-body--line-height: 1.375rem;
  --text-callout: 1rem;
  --text-callout--line-height: 1.3125rem;
  --text-subhead: 0.9375rem;
  --text-subhead--line-height: 1.25rem;
  --text-footnote: 0.8125rem;
  --text-footnote--line-height: 1.125rem;
  --text-caption: 0.75rem;
  --text-caption--line-height: 1rem;
  --text-stat: clamp(2.75rem, 8vw, 4rem);
  --text-stat--line-height: 1;
```

No `@layer base`, trocar a regra do `body` por:

```css
  body {
    @apply bg-background text-foreground antialiased;
    font-variant-numeric: tabular-nums;
    font-size: 1.0625rem;
    line-height: 1.375rem;
    @media (min-width: 48rem) {
      font-size: 1rem;
      line-height: 1.5rem;
    }
  }
```

(Valores literais, não `var(--text-body)`: com `@theme inline` o Tailwind não garante que a variável exista em `:root`. `h1, h2, h3 { @apply heading-ink; }` continua.)

- [ ] **Step 4: Trocar os usos de `text-display`**

- `CoursesScreen.tsx:65`, `FlowchartScreen.tsx:216`, `PlanningScreen.tsx:159`: `className="text-3xl sm:text-display"` → `className="text-large-title"`.
- `UploadScreen.tsx:39`: `className="mt-8 max-w-[18ch] text-4xl sm:text-display"` → `className="mt-8 max-w-[18ch] text-large-title"`.
- `OverviewSummary.tsx:29,46,58`: `heading-ink text-display leading-none` → `heading-ink text-[2.75rem] leading-none` (a Visão geral é redesenhada na fase 3).

Run: `grep -rn "text-display" apps/web/src`
Expected: nenhuma linha.

- [ ] **Step 5: Rodar os testes**

Run: `pnpm --filter @easy-grades/web exec vitest run src/styles`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): system body font, tuned Mona Sans headings and iOS type scale"
```

---

### Task 4: Raios, material de vidro e molas

**Files:**
- Modify: `apps/web/src/styles/index.css` (`@theme inline` raios e easings; utilitário `glass`; regras de vidro sólido; `@media (prefers-reduced-motion)`)
- Test: `apps/web/src/styles/theme.test.ts` (acrescentar `describe`s)

**Interfaces:**
- Consumes: `--glass-tint`, `--glass-edge`, `--glass-shadow`, `--glass-filter`, `--surface`, `--hairline`, `--ink` (Task 2).
- Produces:
  - `rounded-card` (20 px), `rounded-group` (16 px), `rounded-node` (12 px), `rounded-sheet` (28 px); `rounded-xl` passa a 20 px.
  - utilitário `glass`;
  - `:root[data-appearance='solid']` desliga o vidro (usado pelo Task 5);
  - `ease-spring-smooth` e `ease-spring-snappy` (`--ease-spring-smooth`, `--ease-spring-snappy`).
  - `--ease-glide` deixa de existir; `--ease-snap` e `--ease-drawer` continuam.

- [ ] **Step 1: Acrescentar os testes que falham**

No fim de `apps/web/src/styles/theme.test.ts`, acrescentar (reaproveitando `declaration` e `utility` do arquivo):

```ts
function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Missing rule ${selector}`);
  return css.slice(start, css.indexOf('}', start));
}

describe('shape', () => {
  it.each([
    ['card', '1.25rem'],
    ['group', '1rem'],
    ['node', '0.75rem'],
    ['sheet', '1.75rem'],
    ['xl', '1.25rem'],
  ])('defines rounded-%s', (name, value) => {
    expect(declaration(`--radius-${name}`)).toBe(value);
  });
});

describe('glass', () => {
  it('reads every visual property from tokens, so a token switch turns it solid', () => {
    const rules = utility('glass');
    expect(rules).toContain('background-color: var(--glass-tint);');
    expect(rules).toContain('-webkit-backdrop-filter: var(--glass-filter);');
    expect(rules).toContain('backdrop-filter: var(--glass-filter);');
    expect(rules).toContain('box-shadow: inset 0 1px 0 var(--glass-edge), var(--glass-shadow);');
  });

  it('turns solid when the user picks the solid appearance', () => {
    const solid = rule(":root[data-appearance='solid']");
    expect(solid).toContain('--glass-tint: var(--surface);');
    expect(solid).toContain('--glass-filter: none;');
  });

  it('turns solid with increased contrast or reduced transparency', () => {
    const start = css.indexOf('@media (prefers-contrast: more), (prefers-reduced-transparency: reduce) {');
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf('}', start));
    expect(block).toContain('--glass-tint: var(--surface);');
    expect(block).toContain('--glass-filter: none;');
    expect(block).toContain('--glass-edge: var(--ink);');
  });

  it('falls back to a solid surface where backdrop-filter is missing', () => {
    expect(css).toContain('@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {');
  });
});

describe('motion', () => {
  it('defines the spring easings as linear() curves', () => {
    expect(declaration('--ease-spring-smooth')).toMatch(/^linear\(0, .*, 1\)$/);
    expect(declaration('--ease-spring-snappy')).toMatch(/^linear\(0, .*, 1\)$/);
  });

  it('drops the unused glide easing', () => {
    expect(declaration('--ease-glide')).toBeUndefined();
  });
});
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/styles/theme.test.ts`
Expected: FAIL nos `describe` novos.

- [ ] **Step 2: Raios e easings no `@theme inline`**

Trocar:

```css
  --ease-snap: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-glide: cubic-bezier(0.77, 0, 0.175, 1);
  /* Bottom sheet: enters and leaves with a soft landing. */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

por:

```css
  --ease-snap: cubic-bezier(0.23, 1, 0.32, 1);
  /* Bottom sheet: enters and leaves with a soft landing. */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  /* Springs sampled from SwiftUI's Spring(duration:bounce:) (mass 1). The CSS duration is the settle time, longer than
     the perceived one: smooth = d 0.25 s, bounce 0, ~380 ms; snappy = d 0.3 s, bounce 0.2, ~430 ms. */
  --ease-spring-smooth: linear(0, 0.09, 0.256, 0.427, 0.576, 0.694, 0.783, 0.848, 0.895, 0.928, 0.951, 0.967, 0.978, 0.985, 0.99, 0.993, 0.996, 0.997, 0.998, 0.999, 1);
  --ease-spring-snappy: linear(0, 0.085, 0.257, 0.446, 0.617, 0.754, 0.856, 0.925, 0.97, 0.996, 1.009, 1.014, 1.014, 1.012, 1.01, 1.007, 1.005, 1.003, 1.002, 1.001, 1);
```

Trocar:

```css
  /* Panels and sheets are 14 px; controls stay on --radius (8 px). */
  --radius-xl: 0.875rem;
```

por:

```css
  /* Concentric shapes: cards 20, list groups 16, flowchart nodes 12, sheet tops 28. Controls are capsules. */
  --radius-xl: 1.25rem;
  --radius-card: 1.25rem;
  --radius-group: 1rem;
  --radius-node: 0.75rem;
  --radius-sheet: 1.75rem;
```

- [ ] **Step 3: Utilitário `glass` e regras de vidro sólido**

Logo depois do utilitário `code-label`, acrescentar:

```css
/* Navigation-layer material only (tab bar, headers, menus, floating controls, toasts, sheets). Never on content. */
@utility glass {
  background-color: var(--glass-tint);
  -webkit-backdrop-filter: var(--glass-filter);
  backdrop-filter: var(--glass-filter);
  border: 1px solid var(--glass-edge);
  box-shadow: inset 0 1px 0 var(--glass-edge), var(--glass-shadow);
}
```

Logo depois do bloco `@media (prefers-contrast: more) and (prefers-color-scheme: dark) { ... }` (Task 2), acrescentar:

```css
/* The glass turns solid where it cannot blur, when contrast or less transparency is asked for, and when the user picks
   the solid appearance (Safari does not report "Reduce transparency", so the app offers its own switch). */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  :root {
    --glass-tint: var(--surface);
    --glass-edge: var(--hairline);
  }
}
@media (prefers-contrast: more), (prefers-reduced-transparency: reduce) {
  :root {
    --glass-tint: var(--surface);
    --glass-filter: none;
    --glass-edge: var(--ink);
  }
}
:root[data-appearance='solid'] {
  --glass-tint: var(--surface);
  --glass-filter: none;
  --glass-edge: var(--hairline);
}
```

- [ ] **Step 4: Rodar os testes**

Run: `pnpm --filter @easy-grades/web exec vitest run src/styles`
Expected: PASS (inclusive `tokens.test.ts`, que lê o primeiro `:root {` e os blocos de mídia; o bloco sólido vem depois deles).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/styles
git commit -m "feat(web): concentric radii, glass material with solid fallbacks and spring easings"
```

---

### Task 5: Preferência de aparência (vidro / sólida)

**Files:**
- Create: `apps/web/src/lib/appearance.ts`
- Modify: `apps/web/src/main.tsx`
- Test: `apps/web/src/lib/appearance.test.ts`

**Interfaces:**
- Consumes: a regra `:root[data-appearance='solid']` (Task 4).
- Produces (o menu ⋯ da fase 2 usa):
  - `type Appearance = 'glass' | 'solid'`
  - `APPEARANCE_STORAGE_KEY = 'appearance'`
  - `readAppearance(): Appearance`
  - `applyAppearance(appearance: Appearance): void` (escreve `data-appearance` em `<html>`)
  - `useAppearance(): readonly [Appearance, (next: Appearance) => void]` (aplica, salva e atualiza o estado)

- [ ] **Step 1: Escrever o teste que falha**

`apps/web/src/lib/appearance.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { APPEARANCE_STORAGE_KEY, applyAppearance, readAppearance, useAppearance } from './appearance';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.appearance;
});

describe('readAppearance', () => {
  it('defaults to glass', () => {
    expect(readAppearance()).toBe('glass');
  });

  it('reads a stored solid choice', () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, 'solid');
    expect(readAppearance()).toBe('solid');
  });

  it('ignores an unknown stored value', () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, 'frosted');
    expect(readAppearance()).toBe('glass');
  });

  it('falls back to glass when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(readAppearance()).toBe('glass');
  });
});

describe('applyAppearance', () => {
  it('sets data-appearance on the root element', () => {
    applyAppearance('solid');
    expect(document.documentElement.dataset.appearance).toBe('solid');
    applyAppearance('glass');
    expect(document.documentElement.dataset.appearance).toBe('glass');
  });
});

describe('useAppearance', () => {
  it('starts from the stored choice', () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, 'solid');
    const { result } = renderHook(() => useAppearance());
    expect(result.current[0]).toBe('solid');
  });

  it('applies, stores and returns a new choice', () => {
    const { result } = renderHook(() => useAppearance());
    act(() => result.current[1]('solid'));
    expect(result.current[0]).toBe('solid');
    expect(document.documentElement.dataset.appearance).toBe('solid');
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe('solid');
  });

  it('still applies the choice when storage cannot save it', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { result } = renderHook(() => useAppearance());
    act(() => result.current[1]('solid'));
    expect(result.current[0]).toBe('solid');
    expect(document.documentElement.dataset.appearance).toBe('solid');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/lib/appearance.test.ts`
Expected: FAIL (`Failed to resolve import "./appearance"`).

- [ ] **Step 3: Implementar**

`apps/web/src/lib/appearance.ts`:

```ts
import { useCallback, useState } from 'react';

export type Appearance = 'glass' | 'solid';

export const APPEARANCE_STORAGE_KEY = 'appearance';

export function readAppearance(): Appearance {
  try {
    return localStorage.getItem(APPEARANCE_STORAGE_KEY) === 'solid' ? 'solid' : 'glass';
  } catch {
    return 'glass';
  }
}

export function applyAppearance(appearance: Appearance): void {
  document.documentElement.dataset.appearance = appearance;
}

export function useAppearance(): readonly [Appearance, (next: Appearance) => void] {
  const [appearance, setAppearance] = useState(readAppearance);

  const choose = useCallback((next: Appearance) => {
    applyAppearance(next);
    try {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, next);
    } catch {
      // The choice still applies for this visit; it just won't be remembered.
    }
    setAppearance(next);
  }, []);

  return [appearance, choose] as const;
}
```

- [ ] **Step 4: Aplicar antes de montar o app**

`apps/web/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyAppearance, readAppearance } from './lib/appearance';
import './styles/index.css';

// The CSP forbids inline scripts, so the stored appearance is applied here, before the first render.
applyAppearance(readAppearance());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/lib/appearance.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/appearance.ts apps/web/src/lib/appearance.test.ts apps/web/src/main.tsx
git commit -m "feat(web): glass or solid appearance preference"
```

---

### Task 6: Botões e campos em cápsula, variante `accent`

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx` (patch documentado)
- Modify: `apps/web/src/components/ui/input.tsx` (patch documentado, novo)
- Test: `apps/web/src/components/ui/button.test.tsx`, `apps/web/src/components/ui/input.test.tsx`

**Interfaces:**
- Consumes: `bg-pen`, `text-pen-foreground` (Task 2).
- Produces: `<Button variant="accent">` (a ação principal da tela; usada nas fases 3 e 4); todo `Button` e `Input` com `rounded-full`.

- [ ] **Step 1: Escrever os testes que falham**

`apps/web/src/components/ui/button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it.each(['default', 'outline', 'secondary', 'ghost', 'destructive', 'accent'] as const)(
    'renders the %s variant as a capsule',
    (variant) => {
      render(<Button variant={variant}>Salvar</Button>);
      expect(screen.getByRole('button', { name: 'Salvar' })).toHaveClass('rounded-full');
    },
  );

  it.each(['xs', 'sm', 'icon-xs', 'icon-sm'] as const)('keeps the %s size a capsule', (size) => {
    render(<Button size={size}>Salvar</Button>);
    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button.className).not.toMatch(/rounded-\[|rounded-lg/);
  });

  it('fills the accent variant with the pen blue', () => {
    render(<Button variant="accent">Usar sugestão</Button>);
    expect(screen.getByRole('button', { name: 'Usar sugestão' })).toHaveClass('bg-pen', 'text-pen-foreground');
  });
});
```

`apps/web/src/components/ui/input.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('is a capsule with room for the rounded ends', () => {
    render(<Input aria-label="Buscar disciplina" />);
    const input = screen.getByRole('textbox', { name: 'Buscar disciplina' });
    expect(input).toHaveClass('rounded-full', 'px-4');
    expect(input).not.toHaveClass('rounded-lg');
  });
});
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/ui`
Expected: FAIL (`rounded-full` ausente; `accent` desconhecida).

- [ ] **Step 2: Patch do `button.tsx`**

Em `buttonVariants`:
- na string base, trocar `rounded-lg` por `rounded-full`;
- em `variant`, acrescentar depois de `default`:

```ts
        accent: "bg-pen text-pen-foreground hover:bg-pen/85",
```

- em `size`, remover os pedaços de raio por tamanho:
  - `xs`: remover `rounded-[min(var(--radius-md),10px)]` e `in-data-[slot=button-group]:rounded-lg`;
  - `sm`: remover `rounded-[min(var(--radius-md),12px)]` e `in-data-[slot=button-group]:rounded-lg`;
  - `icon-xs`: remover `rounded-[min(var(--radius-md),10px)]` e `in-data-[slot=button-group]:rounded-lg`;
  - `icon-sm`: remover `rounded-[min(var(--radius-md),12px)]` e `in-data-[slot=button-group]:rounded-lg` (fica `"size-7"`).

- [ ] **Step 3: Patch do `input.tsx`**

Na string de classes do `Input`, trocar `rounded-lg` por `rounded-full` e `px-2.5` por `px-4`.

- [ ] **Step 4: Rodar os testes do app inteiro**

Run: `pnpm --filter @easy-grades/web test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui
git commit -m "feat(web): capsule buttons and inputs, accent button variant"
```

---

### Task 7: `Card` e `ListGroup`

**Files:**
- Create: `apps/web/src/components/Card.tsx`, `apps/web/src/components/ListGroup.tsx`
- Test: `apps/web/src/components/Card.test.tsx`, `apps/web/src/components/ListGroup.test.tsx`

**Interfaces:**
- Consumes: `rounded-card`, `rounded-group`, `bg-surface`, `border-hairline`, `text-ink-muted`, `text-footnote` (Tasks 2–4); `cn` de `@/lib/utils`.
- Produces (fases 3 e 4 usam):
  - `Card(props: ComponentProps<'div'>)` — `div` com `data-slot="card"`, `rounded-card bg-surface p-4`.
  - `ListGroup(props: { heading?: ReactNode; headingLevel?: 2 | 3; meta?: ReactNode; className?: string; children: ReactNode })` — `section` rotulada pelo cabeçalho (quando há), com `ul`.
  - `ListGroupRow(props: ComponentProps<'li'>)` — linha ≥ 44 px com separador hairline recuado.

- [ ] **Step 1: Escrever os testes que falham**

`apps/web/src/components/Card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './Card';

describe('Card', () => {
  it('is an opaque rounded surface that keeps extra classes and props', () => {
    render(
      <Card className="grid gap-2" aria-label="Coeficiente">
        8,214
      </Card>,
    );
    const card = screen.getByLabelText('Coeficiente');
    expect(card).toHaveAttribute('data-slot', 'card');
    expect(card).toHaveClass('rounded-card', 'bg-surface', 'p-4', 'grid', 'gap-2');
    expect(card).not.toHaveClass('glass');
  });
});
```

`apps/web/src/components/ListGroup.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ListGroup, ListGroupRow } from './ListGroup';

describe('ListGroup', () => {
  it('labels the group by its heading and lists its rows', () => {
    render(
      <ListGroup heading="2025/1" meta="CR 8,0 · 360 h">
        <ListGroupRow>Banco de dados</ListGroupRow>
        <ListGroupRow>Compiladores</ListGroupRow>
      </ListGroup>,
    );
    const group = screen.getByRole('region', { name: '2025/1' });
    expect(within(group).getByRole('heading', { level: 2, name: '2025/1' })).toBeInTheDocument();
    expect(within(group).getByText('CR 8,0 · 360 h')).toHaveClass('text-ink-muted');
    expect(within(group).getAllByRole('listitem')).toHaveLength(2);
  });

  it('uses the requested heading level', () => {
    render(
      <ListGroup heading="Optativas" headingLevel={3}>
        <ListGroupRow>Visão computacional</ListGroupRow>
      </ListGroup>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Optativas' })).toBeInTheDocument();
  });

  it('renders a plain list without a heading', () => {
    render(
      <ListGroup>
        <ListGroupRow>Redes</ListGroupRow>
      </ListGroup>,
    );
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByRole('list')).toHaveClass('rounded-group', 'bg-surface');
  });

  it('gives each row a 44 px minimum and an inset separator after the first', () => {
    render(
      <ListGroup>
        <ListGroupRow>Redes</ListGroupRow>
      </ListGroup>,
    );
    expect(screen.getByRole('listitem')).toHaveClass('min-h-11', 'border-hairline', 'not-first:border-t');
    expect(screen.getByRole('list')).toHaveClass('pl-4');
  });
});
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/Card.test.tsx src/components/ListGroup.test.tsx`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 2: Implementar `Card`**

`apps/web/src/components/Card.tsx`:

```tsx
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card" className={cn('rounded-card bg-surface p-4', className)} {...props} />;
}
```

- [ ] **Step 3: Implementar `ListGroup`**

`apps/web/src/components/ListGroup.tsx`:

```tsx
import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ListGroupProps {
  heading?: ReactNode;
  headingLevel?: 2 | 3;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function ListGroup({ heading, headingLevel = 2, meta, className, children }: ListGroupProps) {
  const headingId = useId();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const list = <ul className="rounded-group bg-surface pl-4">{children}</ul>;

  if (heading === undefined) return <div className={className}>{list}</div>;

  return (
    <section aria-labelledby={headingId} className={cn('grid gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3 px-4 text-footnote">
        <Heading id={headingId} className="font-sans text-footnote font-semibold tracking-normal font-stretch-normal text-ink">
          {heading}
        </Heading>
        {meta !== undefined && <span className="text-ink-muted">{meta}</span>}
      </div>
      {list}
    </section>
  );
}

export function ListGroupRow({ className, ...props }: ComponentProps<'li'>) {
  return (
    <li
      className={cn('flex min-h-11 items-center gap-3 border-hairline py-2.5 pr-4 not-first:border-t', className)}
      {...props}
    />
  );
}
```

(O cabeçalho usa `font-sans`/`tracking-normal` porque `h2`/`h3` herdam `heading-ink` do `@layer base`; o cabeçalho de grupo é texto de sistema em footnote, como no iOS.)

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/Card.test.tsx src/components/ListGroup.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/Card.tsx apps/web/src/components/Card.test.tsx apps/web/src/components/ListGroup.tsx apps/web/src/components/ListGroup.test.tsx
git commit -m "feat(web): Card and iOS-style ListGroup components"
```

---

### Task 8: `SegmentedControl` e `ChipGroup` sobre o `ChoiceGroup`

**Files:**
- Create: `apps/web/src/components/SegmentedControl.tsx`, `apps/web/src/components/ChipGroup.tsx`
- Modify: `apps/web/src/features/courses/CoursesScreen.tsx` (os dois `ChoiceGroup`), `apps/web/src/features/planning/CourseCatalog.tsx` (o `ChoiceGroup` de filtro)
- Test: `apps/web/src/components/SegmentedControl.test.tsx`, `apps/web/src/components/ChipGroup.test.tsx`

**Interfaces:**
- Consumes: `ChoiceGroup<T>` e `ChoiceItem<T>` de `@/features/courses/ChoiceGroup` (API inalterada: `label`, `items`, `value`, `onValueChange`, `className?`, `itemClassName?`).
- Produces:
  - `SegmentedControl<T extends string>(props: { label: string; items: readonly ChoiceItem<T>[]; value: T; onValueChange: (value: T) => void; className?: string })`
  - `ChipGroup<T extends string>(props: { label: string; items: readonly ChoiceItem<T>[]; value: T; onValueChange: (value: T) => void; className?: string })`

- [ ] **Step 1: Escrever os testes que falham**

`apps/web/src/components/SegmentedControl.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

const ITEMS = [
  { value: 'period', content: 'Por período' },
  { value: 'category', content: 'Por categoria' },
] as const;

function Harness() {
  const [value, setValue] = useState<'period' | 'category'>('period');
  return <SegmentedControl label="Agrupar por" items={ITEMS} value={value} onValueChange={setValue} />;
}

describe('SegmentedControl', () => {
  it('is a capsule radiogroup with the checked segment raised on the surface', () => {
    render(<Harness />);
    const group = screen.getByRole('radiogroup', { name: 'Agrupar por' });
    expect(group).toHaveClass('rounded-full');
    const checked = screen.getByRole('radio', { name: 'Por período' });
    expect(checked).toHaveAttribute('aria-checked', 'true');
    expect(checked).toHaveClass('rounded-full', 'aria-checked:bg-surface', 'min-h-11');
  });

  it('keeps one tab stop and moves with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    expect(screen.getByRole('radio', { name: 'Por período' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Por categoria' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Por categoria' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Por período' })).toHaveAttribute('tabindex', '-1');
  });
});
```

`apps/web/src/components/ChipGroup.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ChipGroup } from './ChipGroup';

const ITEMS = [
  { value: 'todas', content: 'Todas' },
  { value: 'aprovadas', content: 'Aprovadas' },
  { value: 'reprovadas', content: 'Reprovadas' },
] as const;

function Harness() {
  const [value, setValue] = useState<'todas' | 'aprovadas' | 'reprovadas'>('todas');
  return <ChipGroup label="Filtrar por situação" items={ITEMS} value={value} onValueChange={setValue} />;
}

describe('ChipGroup', () => {
  it('renders wrapping capsule chips with the checked one in graphite and 44 px on touch', () => {
    render(<Harness />);
    expect(screen.getByRole('radiogroup', { name: 'Filtrar por situação' })).toHaveClass('flex', 'flex-wrap');
    const chip = screen.getByRole('radio', { name: 'Todas' });
    expect(chip).toHaveClass('rounded-full', 'min-h-11', 'aria-checked:bg-ink', 'aria-checked:text-canvas', 'md:pointer-coarse:min-h-11');
  });

  it('jumps to the ends with Home and End', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard('{End}');
    expect(screen.getByRole('radio', { name: 'Reprovadas' })).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: 'Todas' })).toHaveAttribute('aria-checked', 'true');
  });
});
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/SegmentedControl.test.tsx src/components/ChipGroup.test.tsx`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 2: Implementar `SegmentedControl`**

`apps/web/src/components/SegmentedControl.tsx`:

```tsx
import { ChoiceGroup, type ChoiceItem } from '@/features/courses/ChoiceGroup';
import { cn } from '@/lib/utils';

interface SegmentedControlProps<T extends string> {
  label: string;
  items: readonly ChoiceItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({ className, ...props }: SegmentedControlProps<T>) {
  return (
    <ChoiceGroup
      {...props}
      className={cn('inline-flex rounded-full bg-muted p-0.5', className)}
      itemClassName="inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-sm text-ink-muted outline-none transition-[color,background-color,box-shadow] duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 aria-[checked=false]:hover:text-ink aria-checked:bg-surface aria-checked:font-medium aria-checked:text-ink aria-checked:shadow-sm md:min-h-8 md:pointer-coarse:min-h-11"
    />
  );
}
```

- [ ] **Step 3: Implementar `ChipGroup`**

`apps/web/src/components/ChipGroup.tsx`:

```tsx
import { ChoiceGroup, type ChoiceItem } from '@/features/courses/ChoiceGroup';
import { cn } from '@/lib/utils';

interface ChipGroupProps<T extends string> {
  label: string;
  items: readonly ChoiceItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
}

export function ChipGroup<T extends string>({ className, ...props }: ChipGroupProps<T>) {
  return (
    <ChoiceGroup
      {...props}
      className={cn('flex flex-wrap gap-2', className)}
      itemClassName="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 text-sm text-foreground outline-none transition-colors duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 aria-[checked=false]:hover:bg-muted aria-checked:border-ink aria-checked:bg-ink aria-checked:text-canvas aria-checked:focus-visible:ring-offset-2 aria-checked:focus-visible:ring-offset-background md:min-h-8 md:pointer-coarse:min-h-11"
    />
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/SegmentedControl.test.tsx src/components/ChipGroup.test.tsx`
Expected: PASS.

- [ ] **Step 5: Adotar nas telas**

Em `apps/web/src/features/courses/CoursesScreen.tsx`:
- importar `ChipGroup` de `@/components/ChipGroup` e `SegmentedControl` de `@/components/SegmentedControl`; remover o import de `ChoiceGroup` se ficar sem uso;
- o `ChoiceGroup` "Filtrar por situação" vira `<ChipGroup label="Filtrar por situação" items={...} value={status} onValueChange={setStatus} />` (mesmos `items`; sem `className`/`itemClassName`);
- o `ChoiceGroup` "Agrupar por" vira `<SegmentedControl label="Agrupar por" items={GROUP_OPTIONS} value={groupBy} onValueChange={setGroupBy} />`.

Em `apps/web/src/features/planning/CourseCatalog.tsx`:
- importar `ChipGroup` de `@/components/ChipGroup` e remover o import de `ChoiceGroup`;
- `<ChoiceGroup<CatalogFilter> label="Filtrar disciplinas" ... className="flex flex-wrap gap-2" itemClassName="..." />` vira `<ChipGroup<CatalogFilter> label="Filtrar disciplinas" items={...} value={filter} onValueChange={setFilter} />` (mesmos `items`).

- [ ] **Step 6: Rodar tudo**

Run: `pnpm --filter @easy-grades/web test && pnpm --filter @easy-grades/web typecheck`
Expected: PASS (os testes de `CoursesScreen`, `ChoiceGroup` e `PlanningScreen` continuam verdes porque a API e a semântica de radiogroup não mudaram).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): SegmentedControl and ChipGroup, adopted by the courses and catalog filters"
```

---

### Task 9: Documentação, React Doctor e verificação final

**Files:**
- Modify: `CLAUDE.md` (seção "Frontend conventions")
- Modify: `docs/superpowers/specs/2026-10-16-caneta-rebranding-design.md` (seção 3.4: opacidade do vidro)

**Interfaces:**
- Consumes: tudo das Tasks 1–8.
- Produces: documentação coerente com o código desta fase.

- [ ] **Step 1: Ajustar o spec (opacidade do vidro)**

Em `docs/superpowers/specs/2026-10-16-caneta-rebranding-design.md`, seção 3.4, trocar a linha da tinta por:

```markdown
- tinta: `color-mix(in oklab, var(--surface) var(--glass-opacity), transparent)`, com `--glass-opacity` 84% no claro e 90% no escuro. É o mínimo que mantém `--ink-muted` a 4,5:1 com qualquer cor de conteúdo passando por baixo (garantido por `tokens.test.ts`); os 78% da pesquisa davam 3,9:1;
```

E na tabela de riscos (seção 10), trocar "Tinta de 78% (opaca para web)" por "Tinta de 84% (claro) e 90% (escuro)".

- [ ] **Step 2: Atualizar o `CLAUDE.md`**

Na seção "Frontend conventions", substituir o primeiro item (o parágrafo que começa com `Design "Grafite" (spec 3.0, replaces "Caderno")`) por:

```markdown
- Design "Caneta" (spec 4.0, `docs/superpowers/specs/2026-10-16-caneta-rebranding-design.md`, replaces "Grafite"), rolled out in phases; phase 1 (foundation) is in. Tokens are English and live in `apps/web/src/styles/index.css` (light, `prefers-color-scheme: dark`, `prefers-contrast: more`): `--canvas`, `--surface`, `--ink`, `--ink-muted`, `--hairline`, `--field`, `--pen` (pen blue, the one accent), `--pen-ink` (the accent as text), `--pen-tint`, `--pen-foreground`, `--success` / `--success-tint` (approved status only), `--danger` / `--danger-foreground`, with Tailwind aliases such as `bg-pen`, `text-ink-muted`, `border-hairline`. Blue marks navigation, progress, focus, "em curso" and at most one primary action per screen (`<Button variant="accent">`); other buttons are graphite. `src/styles/tokens.test.ts` reads `index.css` and enforces the WCAG ratios in every mode, including text on the glass over any content color; run it after any color change.
- Typography: the body is the system font (`-apple-system, system-ui, "Segoe UI", Roboto`); Mona Sans (self-hosted, `@fontsource-variable/mona-sans/wdth.css`) is only for headings, big numbers and course codes through `heading-ink` (weight 750, wdth 106) and `code-label` (87.5% width). The scale follows iOS Dynamic Type with fixed line heights: `text-large-title` (34) for each screen's `h1`, `text-title1`–`text-title3`, `text-headline`, `text-body` (17 on mobile, 16 from md), `text-callout`, `text-subhead`, `text-footnote`, `text-caption`, `text-stat`. There is no `text-display`.
- Shape: controls (buttons, inputs, chips, segmented, badges) are capsules (`rounded-full`); cards `rounded-card` (20), list groups `rounded-group` (16), flowchart nodes `rounded-node` (12), sheet tops `rounded-sheet` (28); inner elements are concentric (`calc(parent radius − padding)`).
- Glass: the `glass` utility is for the navigation layer only (tab bar, headers, menus, floating controls, toasts, sheets), never on cards, lists, charts or nodes, and never glass on glass. Every glass property comes from `--glass-*` tokens; they turn solid without `backdrop-filter`, under `prefers-contrast: more` / `prefers-reduced-transparency: reduce`, and with `html[data-appearance="solid"]`. The user's choice comes from `lib/appearance.ts` (`useAppearance`, key `appearance` in localStorage), applied in `main.tsx` before the first render because the CSP blocks inline scripts.
- Base components: `Card`, `ListGroup` / `ListGroupRow` (iOS inset grouped list, rows ≥ 44 px, inset hairline), `SegmentedControl` and `ChipGroup` (both wrap `ChoiceGroup`, which keeps the keyboard behaviour).
```

No item "Motion", trocar a primeira frase por:

```markdown
- Motion: `--ease-snap` for fades and color (≤250 ms), `--ease-drawer` for the current sheet, and spring easings `--ease-spring-smooth` / `--ease-spring-snappy` (`linear()` sampled from SwiftUI's `Spring(duration:bounce:)`; the CSS duration is the settle time, ~380/430 ms) for spatial movement only.
```

(o resto do item "Motion" continua.)

Na lista de patches do shadcn, acrescentar depois do item `button.tsx`:

```markdown
  - `button.tsx`: also capsule radius on every size (the per-size `rounded-[min(...)]` were removed) and the `accent` variant (`bg-pen`).
  - `input.tsx`: capsule radius and `px-4`.
```

Procurar no `CLAUDE.md` restos da paleta antiga e atualizar os nomes:

Run: `grep -nE "esmeralda|--fundo|--superficie|--texto|--suave|--linha|--campo|--erro|text-display|Grafite" CLAUDE.md`
Expected: só sobram menções históricas intencionais (por exemplo "replaces \"Grafite\""). Ajustar qualquer outra para os nomes novos (por exemplo, no item "Status is always icon + text" e em "React Flow colors").

- [ ] **Step 3: React Doctor nas mudanças**

Run: `pnpm react-doctor:changed`
Expected: 0 erros. Corrigir qualquer erro apontado antes de seguir (avisos novos também devem ser avaliados).

- [ ] **Step 4: Verificação completa**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build`
Expected: tudo PASS.

- [ ] **Step 5: Verificação manual no navegador**

Run: `pnpm dev` e abrir `http://localhost:5173` com um dataset carregado. Conferir, em 390 px e 1440 px:
- as 4 telas e o upload em claro e escuro: nada sem cor (sinal de classe antiga esquecida), azul só em progresso/foco/"em curso"/aba, verde só em aprovado;
- corpo em fonte do sistema e títulos em Mona Sans;
- DevTools > Rendering > `prefers-contrast: more`: neutros mais fortes;
- botões, campos e chips em cápsula; o segmented "Agrupar por" com a opção ativa em superfície;
- no console: `document.documentElement.dataset.appearance` vale `"glass"`; `localStorage.setItem('appearance','solid')` + recarregar → `"solid"`.

Registrar no PR o que foi verificado.

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-10-16-caneta-rebranding-design.md
git commit -m "docs: Caneta foundation conventions and glass opacity"
```

- [ ] **Step 7: Revisão da branch e merge**

Pedir a revisão da branch inteira (Opus, esforço médio). Depois de aprovada: `gh auth status` (conta pessoal), push da branch (o pre-push roda `pnpm react-doctor:gate`), PR para `main` e merge com `--no-ff`.
