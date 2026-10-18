# Caneta — Fase 6 (marca, PWA e fechamento) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o símbolo da marca pela grade sobre azul caneta (favicon, `BrandMark`, ícones do PWA), limpar tokens e regras que ficaram sem uso nas fases anteriores e deixar a documentação descrevendo o estado final da identidade "Caneta".

**Architecture:** `apps/web/brand/icon.svg` continua sendo a fonte única do símbolo: o favicon é uma cópia, o `BrandMark` embute o mesmo desenho (um teste compara os dois) e `scripts/generate-icons.mjs` gera os PNGs. O fundo passa a ser um gradiente, então o gerador usa o próprio gradiente do símbolo como fundo das versões maskable e apple-touch.

**Tech Stack:** SVG, `@resvg/resvg-js` (gerador), React 19, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-16-caneta-rebranding-design.md` (seção 7 e linha 6 da seção 9).

**Pré-requisito:** fases 1 a 5 mergeadas em `main`.

## Global Constraints

- Escopo: só `apps/web` e documentação.
- Símbolo: fundo em gradiente vertical `#4677EE` → `#1F47B4`; grade 3×3 de células 104×104 com raio 26 (num viewBox de 512); 5 concluídas em `#FFFFFF`; 4 pendentes em `#FFFFFF` com `fill-opacity=".22"`. Bordas bem definidas, sem máscara pré-aplicada (a versão do favicon mantém `rx="112"` no fundo; as versões PWA são quadradas de borda a borda).
- Os PNGs nunca são editados à mão; são gerados por `pnpm --filter @easy-grades/web icons` e commitados.
- Nomes em código em inglês; comentários só para o "porquê".
- Testes: `pnpm --filter @easy-grades/web exec vitest run --maxWorkers=2`.
- Branch: `feat/caneta-brand` a partir de `main`. Commits com `Co-Authored-By: Claude <noreply@anthropic.com>`. `pnpm react-doctor:changed` sem erros.

## Review Focus

1. **O favicon e a marca do app divergirem** depois da troca: o teste que compara `BrandMark` e `icon.svg` precisa cobrir o gradiente, não só os retângulos. Testado no Task 1.
2. **Ícone maskable cortado no Android**: o símbolo fica dentro da zona segura (círculo de 80%) e o fundo é o gradiente de borda a borda, sem faixa transparente. Testado no Task 1 (o gerador) e conferido à mão.
3. **Duas `BrandMark` na mesma página** (header e upload): o `id` do gradiente se repete, mas é o mesmo desenho, então nenhuma instância fica sem fundo. Conferido no Task 1.
4. **Remover uma regra que ainda tem uso**: toda remoção do Task 2 precisa de um grep vazio antes. Testado no Task 2.
5. **Documentação dizendo uma coisa e o código outra**: o `CLAUDE.md` descreve o estado final, sem itens "phase N" pendurados. Conferido no Task 3.

---

### Task 1: Novo símbolo

**Files:**
- Modify: `apps/web/brand/icon.svg`, `apps/web/public/favicon.svg`
- Modify: `apps/web/src/components/BrandMark.tsx`, `apps/web/src/components/BrandMark.test.tsx`
- Modify: `apps/web/scripts/generate-icons.mjs`
- Regenerate: `apps/web/public/icons/*.png`

**Interfaces:**
- Produces: `BrandMark` com a mesma API (`size`, `compactOnMobile`, `className`).

- [ ] **Step 1: Criar a branch**

```bash
git checkout main
git pull --ff-only
git checkout -b feat/caneta-brand
```

- [ ] **Step 2: Teste que falha**

No `apps/web/src/components/BrandMark.test.tsx`, acrescentar:

```tsx
  it('paints the pen blue gradient behind the grid, the same as brand/icon.svg', () => {
    const { container } = render(<BrandMark />);
    const stops = (svg: SVGSVGElement) =>
      Array.from(svg.querySelectorAll('linearGradient stop')).map((stop) => [
        stop.getAttribute('offset'),
        stop.getAttribute('stop-color'),
      ]);
    const drawn = container.querySelector('svg')!;
    expect(stops(drawn)).toEqual([
      ['0', '#4677EE'],
      ['1', '#1F47B4'],
    ]);
    expect(stops(drawn)).toEqual(stops(parseIcon()));
  });

  it('shows five done cells and four pending cells in white', () => {
    const { container } = render(<BrandMark />);
    const cells = Array.from(container.querySelectorAll('rect')).slice(1);
    expect(cells.filter((rect) => rect.getAttribute('fill') === '#FFFFFF' && !rect.hasAttribute('fill-opacity'))).toHaveLength(5);
    expect(cells.filter((rect) => rect.getAttribute('fill-opacity') === '.22')).toHaveLength(4);
  });
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/BrandMark.test.tsx`
Expected: FAIL.

- [ ] **Step 3: O símbolo**

`apps/web/brand/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <title>Easy Grades</title>
  <defs>
    <linearGradient id="brand-pen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4677EE"/>
      <stop offset="1" stop-color="#1F47B4"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#brand-pen)"/>
  <rect x="72" y="72" width="104" height="104" rx="26" fill="#FFFFFF"/>
  <rect x="72" y="204" width="104" height="104" rx="26" fill="#FFFFFF"/>
  <rect x="72" y="336" width="104" height="104" rx="26" fill="#FFFFFF"/>
  <rect x="204" y="72" width="104" height="104" rx="26" fill="#FFFFFF"/>
  <rect x="204" y="204" width="104" height="104" rx="26" fill="#FFFFFF"/>
  <rect x="204" y="336" width="104" height="104" rx="26" fill="#FFFFFF" fill-opacity=".22"/>
  <rect x="336" y="72" width="104" height="104" rx="26" fill="#FFFFFF" fill-opacity=".22"/>
  <rect x="336" y="204" width="104" height="104" rx="26" fill="#FFFFFF" fill-opacity=".22"/>
  <rect x="336" y="336" width="104" height="104" rx="26" fill="#FFFFFF" fill-opacity=".22"/>
</svg>
```

`apps/web/public/favicon.svg`: cópia exata do arquivo acima.

- [ ] **Step 4: `BrandMark`**

Em `apps/web/src/components/BrandMark.tsx`:
- o comentário do componente passa a: "Symbol and wordmark. The symbol is the same drawing as brand/icon.svg (the favicon): a 3×3 grid on a pen blue gradient, done cells in white and pending cells in translucent white. The colors are fixed, not themed, like a logo."
- o `<svg>` passa a desenhar exatamente o `icon.svg` (em JSX: `stopColor`, `fillOpacity`):

```tsx
      <svg aria-hidden="true" viewBox="0 0 512 512" width={size} height={size} className="shrink-0">
        <defs>
          {/* Every BrandMark repeats this id, but they all define the same gradient, so whichever wins draws the same. */}
          <linearGradient id="brand-pen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4677EE" />
            <stop offset="1" stopColor="#1F47B4" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="112" fill="url(#brand-pen)" />
        <rect x="72" y="72" width="104" height="104" rx="26" fill="#FFFFFF" />
        <rect x="72" y="204" width="104" height="104" rx="26" fill="#FFFFFF" />
        <rect x="72" y="336" width="104" height="104" rx="26" fill="#FFFFFF" />
        <rect x="204" y="72" width="104" height="104" rx="26" fill="#FFFFFF" />
        <rect x="204" y="204" width="104" height="104" rx="26" fill="#FFFFFF" />
        <rect x="204" y="336" width="104" height="104" rx="26" fill="#FFFFFF" fillOpacity=".22" />
        <rect x="336" y="72" width="104" height="104" rx="26" fill="#FFFFFF" fillOpacity=".22" />
        <rect x="336" y="204" width="104" height="104" rx="26" fill="#FFFFFF" fillOpacity=".22" />
        <rect x="336" y="336" width="104" height="104" rx="26" fill="#FFFFFF" fillOpacity=".22" />
      </svg>
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/components/BrandMark.test.tsx`
Expected: PASS (inclusive o teste antigo que compara os `rect` com o `icon.svg`).

- [ ] **Step 5: O gerador**

Em `apps/web/scripts/generate-icons.mjs`:
- trocar `const BRAND_GRAPHITE = '#18191C';` por `const BRAND_BACKGROUND = 'url(#brand-pen)';` e o comentário acima dela por um que diga que o fundo de borda a borda usa o gradiente definido no próprio símbolo;
- nas duas montagens (`maskableSvg` e `appleSvg`), o retângulo de fundo passa a `fill="${BRAND_BACKGROUND}"`. Como o `<defs>` do gradiente está dentro de `symbol`, e o `symbol` vem depois do fundo, mover o fundo para depois do `<defs>`: montar como `svgCanvas(`${defs}<rect width="512" height="512" fill="${BRAND_BACKGROUND}"/>...`)`, extraindo `defs` de `symbol` com `const defs = symbol.match(/<defs>[\s\S]*?<\/defs>/)[0];` (o resvg não resolve referência a um `<defs>` que aparece depois do uso em todas as versões; deixar o `<defs>` primeiro evita depender disso).

Run: `pnpm --filter @easy-grades/web icons`
Expected: os 4 PNGs em `apps/web/public/icons/` são reescritos.

Conferir os PNGs abrindo-os (ou com `Read` de imagem): fundo azul em gradiente de borda a borda no maskable e no apple-touch; no maskable, a grade inteira dentro do círculo central de 80%; nenhum pixel transparente no apple-touch.

- [ ] **Step 6: Rodar e commitar**

Run: `pnpm --filter @easy-grades/web exec vitest run --maxWorkers=2 src/components src/pwa`
Expected: PASS.

```bash
git add apps/web/brand/icon.svg apps/web/public/favicon.svg apps/web/public/icons apps/web/src/components/BrandMark.tsx apps/web/src/components/BrandMark.test.tsx apps/web/scripts/generate-icons.mjs
git commit -m "feat(web): pen blue grid symbol for the favicon, the app mark and the PWA icons" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Limpeza do que ficou sem uso

**Files:**
- Modify: `apps/web/src/styles/index.css` e o que mais o grep apontar
- Test: `apps/web/src/styles/legacy-tokens.test.ts` (acrescentar caso)

- [ ] **Step 1: Teste que falha**

No `apps/web/src/styles/legacy-tokens.test.ts`, acrescentar (reaproveitando a leitura do `index.css` que o arquivo já tem; se a variável tiver outro nome, usar o nome real):

```ts
  it('has no leftover Grafite-era names in the stylesheet', () => {
    expect(css).not.toMatch(/esmeralda|grafite|--fundo|--superficie|--suave|--linha|--campo|--erro\b/i);
  });
```

Run: `pnpm --filter @easy-grades/web exec vitest run src/styles/legacy-tokens.test.ts`
Expected: FAIL se ainda houver comentários ou nomes antigos no `index.css`; PASS significa que só a limpeza do Step 2 resta.

- [ ] **Step 2: Remover o que não tem mais uso**

Para cada candidato abaixo, rodar o grep indicado em `apps/web/src`; **remover só se o grep não achar nenhum uso fora da própria definição**:

| Candidato | Grep |
|---|---|
| `--band-pending` | `grep -rn "band-pending" apps/web/src` |
| `--ease-drawer` | `grep -rn "ease-drawer" apps/web/src` |
| keyframes `sheet-drawer-in` / `sheet-drawer-out` e as regras `[data-slot='sheet-content'][data-side='bottom'][data-state=...]` | `grep -rn "sheet-drawer" apps/web/src` e verificar se ainda existe algum `SheetContent` fora da `DetentSheet` (`grep -rn "SheetContent" apps/web/src --include=*.tsx`) |
| `--text-stat` | `grep -rn "text-stat" apps/web/src` |
| `--radius-xl` (só se nenhum `rounded-xl` restar) | `grep -rn "rounded-xl" apps/web/src` |
| `--chart-4` | `grep -rn "chart-4" apps/web/src` |
| comentários do `index.css` que citam a paleta antiga ("esmeralda", "Grafite") | o teste do Step 1 |

Run: `pnpm --filter @easy-grades/web exec vitest run --maxWorkers=2 && pnpm --filter @easy-grades/web typecheck && pnpm --filter @easy-grades/web build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src
git commit -m "chore(web): drop tokens and rules left unused by the Caneta rebrand" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Documentação final

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-10-16-caneta-rebranding-design.md` (status)
- Modify: `docs/superpowers/specs/2026-10-12-ux-mobile-pwa-design.md` (nota de que a direção visual foi substituída)
- Modify: `README.md` (se citar cores, fonte ou identidade antigas)

- [ ] **Step 1: `CLAUDE.md` no estado final**

Na seção "Frontend conventions":
- remover os marcadores de fase ("phase 1", "(phase 2)", "rolled out in phases; phase 1 (foundation) is in") e juntar os itens em um texto que descreva o estado atual;
- o primeiro item começa com: `Design "Caneta" (spec 4.0, docs/superpowers/specs/2026-10-16-caneta-rebranding-design.md, replaces "Grafite"), iOS-inspired, not an iOS copy.`;
- no item da marca: "The brand symbol source is `apps/web/brand/icon.svg` (3×3 grid on a pen blue gradient `#4677EE`→`#1F47B4`, done cells white, pending cells white at 22%); the favicon is a copy, `BrandMark` inlines it (a test compares both, gradient included), and `scripts/generate-icons.mjs` renders the PNGs with the same gradient as the full-bleed background."

Na seção "PWA", conferir que `theme_color` (`#2A5BD7`) e as cores de `theme-color` (`#F4F4F2` / `#0E0F11`) estão registradas.

Run: `grep -nE "esmeralda|Grafite|phase [0-9]|\(phase" CLAUDE.md`
Expected: só a menção histórica "replaces \"Grafite\"".

- [ ] **Step 2: Specs e README**

- No spec Caneta, `**Status:** em revisão` → `**Status:** implementada (2026-10-16)` — usar a data real do merge.
- No topo do `2026-10-12-ux-mobile-pwa-design.md`, logo abaixo do título: `> A direção visual "Grafite" deste spec foi substituída pela identidade "Caneta" (docs/superpowers/specs/2026-10-16-caneta-rebranding-design.md). As regras de UX, responsividade e PWA continuam valendo.`
- `grep -niE "esmeralda|grafite|mona sans" README.md`: atualizar qualquer descrição visual para a identidade Caneta (azul caneta, fonte do sistema no corpo, Mona Sans nos títulos).

- [ ] **Step 3: Verificação final do rebranding**

Run: `pnpm react-doctor:changed` (0 erros) e `pnpm test && pnpm typecheck && pnpm lint && pnpm build` (PASS; se a suíte completa der timeout por carga da máquina, rodar a web com `pnpm --filter @easy-grades/web exec vitest run --maxWorkers=2`).

Manual, com o build de produção (`docker build -t easy-grades . && docker run -p 8080:8080 easy-grades` ou `pnpm build` + `pnpm --filter @easy-grades/api start`, conforme o README):
- todas as telas em 390 px e 1440 px, claro/escuro, contraste aumentado, aparência sólida, movimento reduzido;
- favicon na aba; instalar o PWA no Android (ícone maskable sem corte) e no iPhone (ícone apple-touch, tab bar e sheets no modo instalado; cor das barras do Safari 26 no navegador).

- [ ] **Step 4: Commit e revisão**

```bash
git add CLAUDE.md README.md docs/superpowers/specs
git commit -m "docs: Caneta is the current identity" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

Revisão da branch inteira (Opus 5.5, médio); `gh auth status`, push, PR, merge `--no-ff`.

## Ordem e paralelismo

Task 1 e Task 2 em paralelo (arquivos diferentes; o Task 2 não mexe no símbolo). Task 3 por último.
