# Rebranding "Caneta" (inspirado no iOS) — Design Spec

**Data:** 2026-10-16
**Status:** implementada (2026-10-18)
**Substitui:** a direção visual "Grafite" (spec 3.0, em `2026-10-12-ux-mobile-pwa-design.md`). As regras de UX daquele spec (alvos de 44 px, status com ícone e texto, PWA, offline) continuam valendo.
**Pesquisa de base:** `docs/research/2026-10-16-rebranding-estetica-ios.md`

## 1. Objetivo

Dar ao Easy Grades uma identidade nova, inspirada no iOS moderno (Liquid Glass), sem copiar o iOS. O resultado deve parecer nativo e atual num iPhone e coerente no Android e no desktop, sem perder legibilidade, acessibilidade nem desempenho.

**Escopo:** só o frontend (`apps/web`). API, `packages/core`, parser e regras de domínio não mudam. As 4 seções e as funcionalidades continuam as mesmas; muda a apresentação e a navegação.

**Fora de escopo:** telas ou funcionalidades novas, SF Pro e SF Symbols (licença restrita a plataformas Apple), refração por SVG (só funciona no Chromium), View Transitions entre abas.

## 2. Decisões

| Tema | Decisão |
|---|---|
| Abordagem | Linguagem inspirada no iOS, com identidade própria. |
| Cor de destaque | **Azul caneta** substitui o esmeralda. |
| Status "aprovada" | Verde próprio e discreto, separado do destaque. |
| Tipografia | Mona Sans afinada (peso 750, largura 106%) em títulos, números e códigos; fonte do sistema no corpo. |
| Vidro | Só na camada de navegação e controles flutuantes. Conteúdo sempre opaco. |
| Tab bar | Cápsula de vidro flutuante que encolhe ao rolar; no Planejamento, a barra "Meu semestre" desliza para o lado dela. |
| Ícone | Grade sobre azul caneta: células concluídas em branco, pendentes em branco translúcido. |
| Sheets | Arrastáveis com detents, na última fase de telas. |
| Execução | Em fases, uma branch por fase. |
| Nomenclatura | Todo nome em código em inglês. "Caneta" é o nome da identidade só nos documentos. |

## 3. Fundação

### 3.1 Tokens de cor

Os tokens atuais em PT-BR são renomeados para inglês no app inteiro, junto com as classes Tailwind que os usam (`bg-esmeralda` → `bg-pen`, `text-suave` → `text-ink-muted` etc.).

| Hoje | Novo | Claro | Escuro | Uso |
|---|---|---|---|---|
| `--fundo` | `--canvas` | `#F4F4F2` | `#0E0F11` | Fundo da página (o "grouped background" do iOS). |
| `--superficie` | `--surface` | `#FFFFFF` | `#1B1C1F` | Cartões, grupos de lista, nós. |
| `--texto` | `--ink` | `#18191C` | `#ECEDEE` | Texto e botões grafite. |
| `--suave` | `--ink-muted` | `#5D6068` | `#9A9CA3` | Texto secundário. |
| `--linha` | `--hairline` | `#E2E2DE` | `#2A2C30` | Separadores. |
| `--campo` | `--field` | `#7F848C` | `#6E727B` | Bordas de campo (≥ 3:1). |
| `--esmeralda` | `--pen` | `#2A5BD7` | `#6F9BFF` | Destaque: preenchimentos, progresso, foco, aba ativa. |
| `--esmeralda-texto` | `--pen-ink` | `#2350C2` | `#8FB0FF` | Destaque como texto. |
| `--esmeralda-fundo` | `--pen-tint` | `#E3EAFB` | `#1C2A4D` | Fundo da pílula ativa, badge "Cursando". |
| — | `--pen-foreground` | `#FFFFFF` | `#0E0F11` | Texto sobre `--pen`. |
| — | `--success` | `#2A7348` | `#7FC79A` | Status aprovada (texto e ícone). |
| — | `--success-tint` | `#E2EFE6` | `#1C3326` | Fundo do badge aprovada. |
| `--erro` | `--danger` | `#C23B3B` | `#F07070` | Reprovação, ação destrutiva. |
| `--erro-foreground` | `--danger-foreground` | `#FFFFFF` | `#0E0F11` | Texto sobre `--danger`. |

Contrastes calculados (WCAG): `ink-muted` ≥ 5,7:1 e `pen-ink` ≥ 6,3:1 sobre canvas e surface nos dois modos; `success` sobre `success-tint` 4,86:1 (claro) e 6,8:1 (escuro); `pen-ink` sobre `pen-tint` ≥ 5,8:1; `field` ≥ 3,4:1. Os aliases do shadcn (`--primary`, `--ring`, `--chart-*` etc.) apontam para os novos tokens; `--primary` continua grafite (`--ink`) e `--ring` passa a `--pen`.

**Onde o azul aparece:** aba ativa, foco, progresso, rótulos dos cartões de métrica, status "Cursando" e no máximo **uma** ação principal por tela. Os demais botões são grafite ou neutros.

**Status** (`components/state-style.ts`, sempre ícone + texto):

| Estado | Estilo |
|---|---|
| Concluída | `success` sobre `success-tint`, `CircleCheck`. |
| Em curso | `pen-ink` sobre `pen-tint`, `CircleDot`. |
| Disponível | Contorno tracejado em `ink`, `CircleDashed`. |
| Bloqueada | `ink-muted` sobre `muted`, `Lock`. |
| Reprovada | `danger-foreground` sobre `danger`, `CircleX`. |

**Gráficos:** `--pen` para o dado principal, `--ink` e `--ink-muted` para o resto, `--danger` só para reprovação.

**Contraste aumentado:** sob `@media (prefers-contrast: more)`, `--hairline` e `--field` escurecem (claro) ou clareiam (escuro), `--ink-muted` se aproxima de `--ink` e o vidro vira sólido (3.4).

### 3.2 Tipografia

- **Corpo:** `-apple-system, system-ui, "Segoe UI", Roboto, sans-serif` (`--font-sans`). Mostra SF nos aparelhos Apple sem servir arquivo.
- **Títulos, números grandes e códigos:** Mona Sans Variable self-hosted (`--font-heading`). `heading-ink` passa a peso 750, `font-stretch: 106%`, `letter-spacing: -0.015em`. `code-label` continua (Mona Sans a 87,5% de largura, `--ink-muted`).
- **Escala** (utilitários `text-*`, tamanho/entrelinha em px):

| Utilitário | Tamanho | Uso |
|---|---|---|
| `text-large-title` | 34/41 | Título da tela (`h1`). |
| `text-title1` | 28/34 | — |
| `text-title2` | 22/28 | Título de seção. |
| `text-title3` | 20/25 | Cabeçalho de grupo de cartões. |
| `text-headline` | 17/22, semibold | Título de cartão ou linha. |
| `text-body` | 17/22 (a regra do body usa 16/24 a partir de md; o utilitário é fixo) | Texto corrido. |
| `text-callout` | 16/21 | — |
| `text-subhead` | 15/20 | Rótulos de campo. |
| `text-footnote` | 13/18 | Cabeçalhos de grupo de lista, contexto de métrica. |
| `text-caption` | 12/16 | Rótulos de métrica, badges. |
| `text-stat` | 44–64 (clamp) | Número protagonista. |

  O mínimo é 11 px. `text-display` sai.
- **Troca de fonte sem estranheza:** cada estilo fixa a entrelinha em px. Nenhum layout depende da largura da fonte do corpo (nada de larguras fixas em `ch` para texto corrido que precise caber numa linha). `body` mantém `font-variant-numeric: tabular-nums`.

### 3.3 Forma

| Elemento | Raio |
|---|---|
| Botões, chips, campos, segmented control, badges, tab bar, toasts | Cápsula (`rounded-full`). |
| Cartões | 20 px (`--radius-card`). |
| Grupos de lista, minimapa | 16 px (`--radius-group`). |
| Nós do fluxograma | 12 px. |
| Topo das sheets | 28 px. |
| Diálogos | 20 px. |
| Elementos internos | Concêntricos: `calc(raio-pai − padding)`. |

### 3.4 Material de vidro

Utilitário `glass` em `index.css`:

- tinta: `color-mix(in oklab, var(--surface) var(--glass-opacity), transparent)`, com `--glass-opacity` 84% no claro e 90% no escuro. É o mínimo que mantém `--ink-muted` a 4,5:1 com qualquer cor de conteúdo passando por baixo (garantido por `tokens.test.ts`); os 78% da pesquisa davam 3,9:1;
- `backdrop-filter` e `-webkit-backdrop-filter`: `blur(16px) saturate(170%)`;
- borda especular: `inset 0 1px 0` clara, mais uma hairline translúcida;
- sombra externa suave (`--glass-shadow`, uma por modo);
- fallback sólido (`--surface` + `--hairline`) quando `backdrop-filter` não é suportado.

**Onde é usado:** tab bar, header compacto (mobile) e header sticky (desktop), botão ⋯, menus e popovers, controles e legenda do fluxograma, cápsula "Meu semestre", toasts e sheets.

**Onde nunca é usado:** cartões, listas, tabelas, gráficos, nós, MarkerBand. Nunca vidro sobre vidro.

**Aparência sólida:** o vidro vira `--surface` opaco com borda `--hairline` (ou `--ink` com contraste aumentado) quando:
1. `prefers-contrast: more`; ou
2. `prefers-reduced-transparency: reduce` (onde houver suporte; o Safari não informa); ou
3. o usuário escolhe **"Aparência: sólida"** no menu ⋯. A escolha fica em `localStorage` (`appearance`, com `try/catch`) e é aplicada como `data-appearance="solid"` em `<html>` antes da primeira pintura.

### 3.5 Movimento

- Novos tokens de mola em `linear()`, gerados do modelo `Spring(duration:bounce:)` da Apple (valores na pesquisa, seção 8.3):
  - `--ease-spring-smooth` (sem bounce, assenta em ~380 ms);
  - `--ease-spring-snappy` (bounce leve, assenta em ~430 ms).
- Molas só em movimento espacial: pílula da aba, tab bar encolhendo e expandindo, cápsula do semestre deslizando, sheets.
- Fades e cores continuam com `--ease-snap`, em 250 ms ou menos. `--ease-glide` e `--ease-drawer` saem se ficarem sem uso.
- **Movimento reduzido:** molas viram fade de até 150 ms, sem bounce e sem animar o blur. MarkerBand e stagger do fluxograma seguem a regra atual.

### 3.6 Componentes base

Restyle dos componentes usados no app inteiro:

- `Button`: cápsula; variantes `default` (grafite), `accent` (azul, a ação principal da tela), `ghost`, `outline`, `destructive`. O patch de movimento (scale 0.97) continua.
- `Badge`/`StatusBadge`: cápsula com ícone.
- `Card`: `surface`, raio 20, sem sombra.
- `ListGroup` (novo, `components/list-group.tsx`): grupo de lista no estilo iOS, com cabeçalho em footnote, linhas ≥ 44 px e separador hairline recuado.
- `SegmentedControl`: o `ChoiceGroup` atual ganha visual de segmented em cápsula, com a opção ativa sobre `surface`. A API não muda.
- `Input`: cápsula, com ícone opcional à esquerda.

Patches em `src/components/ui/` seguem a regra atual: só os documentados no `CLAUDE.md`.

## 4. Navegação

### 4.1 Tab bar (abaixo de md)

Componente `TabBar` (`components/TabBar.tsx`); o `SectionNav` fica só para o desktop.

- Cápsula `glass` fixa, afastada 12 px das laterais e da safe area inferior.
- 4 abas (`<nav aria-label="Seções">` com links), cada uma com ícone Lucide e rótulo. Alvo ≥ 44 px.
- Aba ativa: ícone preenchido, `pen-ink`, e uma pílula `pen-tint` única que desliza com `--ease-spring-snappy` (um elemento movido por `transform`, já que as abas têm largura igual).
- **Encolher ao rolar** (hook `useScrollMinimize`):
  - encolhe depois de rolar 48 px para baixo, com histerese de 16 px para não piscar;
  - expande ao rolar para cima, ao voltar a menos de 48 px do topo, ao tocar a pílula e quando o foco entra na tab bar;
  - encolhida, vira uma pílula com o ícone e o rótulo da aba atual; é um botão "Mostrar seções" com `aria-expanded="false"`, e os outros links ficam fora da árvore até expandir;
  - não encolhe no Fluxograma (o canvas não rola a página).
- Movimento reduzido: encolher e expandir viram fade.

### 4.2 Header

**Mobile:**
- O topo da página mostra uma linha de contexto (`text-footnote`, `ink-muted`: curso e currículo, ou uma contagem), o botão ⋯ (cápsula `glass`) e o título grande (`h1`, `text-large-title`).
- Quando o `h1` sai da tela (IntersectionObserver), aparece no topo um header compacto `glass`, fixo, com o título em `text-headline` e o ⋯, e um scroll edge effect (gradiente de 16 px de `--canvas` para transparente) logo abaixo. Ele some ao voltar ao topo. A `border-b` atual sai.
- No Fluxograma, o header compacto aparece sempre e não há título grande.

**Desktop (a partir de md):**
- Header sticky `glass` com a marca, a navegação como segmented control em cápsula (pílula deslizante) e, à direita, "Novo upload", "Instalar app" e "Limpar dados" (`ghost`, cápsula) e o ⋯.
- Abaixo dele, a linha de contexto e o `h1` em `text-large-title`, estáticos.

Cada tela passa a ter seu título como `h1`: "Visão geral", "Fluxograma", "Disciplinas", "Planejamento". Na Visão geral, o título de progresso que hoje é `h1` vira `h2`.

### 4.3 Menu ⋯

`OptionsMenu` vira um menu popover `glass` (mobile e desktop), com as ações atuais (Novo upload, Instalar app, Limpar dados) e o grupo **"Aparência"** (radio: Vidro / Sólida). No desktop, as ações também ficam no header; o menu acrescenta a aparência.

### 4.4 Toasts e espaço inferior

- Sonner com estilo de cápsula `glass` compacta: ícone, texto curto, ação ("Desfazer") em `pen-ink`.
- A casca do app define `--bottom-chrome` em `<body>`: altura da tab bar (expandida ou encolhida) mais a da cápsula do semestre, quando ela está na tela. Os toasts usam `bottom: calc(var(--bottom-chrome) + 12px + env(safe-area-inset-bottom))` (com `!important`, como hoje). `body[data-summary-bar]` sai.
- O padding inferior do `main` usa a mesma variável.

### 4.5 PWA e safe areas

- `theme-color`: `#F4F4F2` (claro) e `#0E0F11` (escuro). Manifest: `background_color` `#F4F4F2`, `theme_color` `#2A5BD7`.
- **A verificar no iPhone:** relatos de que o Safari 26 ignora `theme-color` e tinge as barras a partir de elementos `fixed`. Se a tab bar translúcida causar um tingimento ruim no navegador (fora do PWA instalado), a tinta do vidro da tab bar fica opaca só em `display-mode: browser`.

## 5. Telas

Regras comuns: conteúdo opaco, título grande como `h1`, lógica e dados inalterados.

### 5.1 Visão geral

- A MarkerBand vai para um cartão de destaque ("Progresso do curso"), em azul, com a revelação de 700 ms e o detalhe por categoria de horas. Continua a assinatura visual do app.
- Métricas em cartões no estilo do app Saúde (grade de 2 colunas no mobile, 3–4 no desktop): CR, formatura prevista, horas fora de sala, sequência e as demais que o `OverviewSummary` e as seções já mostram. Cada cartão: rótulo `text-caption` com ícone em `pen-ink`, número `text-stat` menor (26–40 px), contexto em `text-footnote` e, quando há seção de detalhe, um chevron; o cartão inteiro é um link para a âncora da seção.
- Seções de detalhe (ritmo, desempenho, pendências, ENADE, AACC, integralização, gráficos) viram grupos de cartões com cabeçalho `text-title3`.
- Gráficos no estilo Swift Charts: grade mínima, barras com cantos arredondados e eixo a partir de zero, títulos descritivos, cores de 3.1.

### 5.2 Disciplinas

- Agrupamento "Por período / Por categoria" em `SegmentedControl`; filtros de status em chips cápsula com contagem; busca em `Input` cápsula com ícone, no topo.
- Mobile: `ListGroup` por grupo, cabeçalho "2025/1 · CR 8,0 · 360 h"; cada linha tem nome, código (`code-label`), badge de status e nota à direita.
- Desktop: a tabela atual dentro de um cartão (raio 20, hairlines).

### 5.3 Fluxograma

- Canvas de borda a borda (a página não tem padding lateral nesta tela, abaixo do header compacto).
- Os `Controls` do React Flow saem; entram botões próprios em cápsulas `glass` agrupadas: zoom +/−, ajustar, alternar lista/grafo, "Exportar PNG". Os alvos continuam ≥ 44 px no toque.
- Legenda (`FlowLegend`) num popover `glass`. Minimapa num cartão opaco de raio 16 (cores em CSS, como hoje).
- Nós (`CourseNode`): cartão opaco de raio 12 com faixa lateral na cor do status; tamanho, conteúdo e nome acessível como hoje.
- A visualização em lista vira `ListGroup` por período.
- Exportação de PNG inalterada, com as novas cores.

### 5.4 Planejamento

- Catálogo em `ListGroup`, com busca e chips de filtro em cápsula.
- Abaixo de lg: a barra "Meu semestre" vira uma cápsula `glass` flutuante com contagem, créditos e CR projetado (`pen-ink`). Fica acima da tab bar; quando a tab bar encolhe, ela desliza com mola para o lado da tab bar encolhida. Tocar abre a `DetentSheet` em `medium`, expansível a `large`.
- A partir de lg: o painel lateral sticky vira um cartão opaco. `CreditMeter` vira barra em cápsula; `GradeInput` vira campo em cápsula.
- "Usar sugestão" é a única ação `accent` da tela.

### 5.5 Upload

- Título grande, o novo ícone em destaque e o fundo `grid-paper` mantido como textura.
- Os dois campos de PDF (`Dropzone`) viram cartões opacos grandes; selecionado: borda e ícone em `pen`, nome do arquivo.
- "Ler meus PDFs" é a ação `accent`, em cápsula, desabilitada offline como hoje.

### 5.6 Diálogos

`ClearDataDialog` e `IosInstallDialog`: cartão centralizado de raio 20, overlay escurecido, botões em cápsula; a ação destrutiva continua `destructive`.

## 6. Sheets arrastáveis

Componente `DetentSheet` (`components/DetentSheet.tsx`), por cima do `Sheet` do shadcn (Radix Dialog cuida de foco, Esc, `aria-modal` e retorno do foco). `sheet.tsx` continua sem patch. Vaul não é usado (sem manutenção).

- **Aplicado a:** "Meu semestre" (abre em `medium`, pode ir a `large`) e `ExportSheet` (só `medium`, altura do conteúdo).
- **Detents:** `medium` ≈ 50% da altura visível e `large` ≈ 92%.
- **Grabber:** pílula no topo, que também é um botão com rótulo "Expandir" / "Reduzir", alternando os detents por Enter ou Espaço.
- **Arrasto:** só pelo grabber e pelo cabeçalho (pointer events). O conteúdo rola normalmente.
- **Ao soltar:** a função pura `resolveDetent(offset, velocity, detents)` decide entre assentar no detent mais próximo, levando a velocidade em conta, ou fechar (puxão rápido para baixo, ou abaixo de um limite do menor detent). Durante o arrasto não há transição e a opacidade do overlay acompanha. Ao soltar, assenta com `--ease-spring-smooth`.
- **Visual:** `glass` sobre overlay escurecido; em `large`, a tinta sobe para quase opaca. Topo com raio 28. Cabeçalho com título e botão de fechar ou concluir.
- **Movimento reduzido:** troca de detent sem mola, com fade curto.
- **Desktop:** sem mudança (essas sheets só aparecem em toque ou abaixo de lg).

## 7. Ícone e marca

- `apps/web/brand/icon.svg`: fundo em gradiente vertical `#4677EE` → `#1F47B4`; grade 3×3 de células com raio 26 (de 104 px num viewBox de 512); 5 células concluídas em `#FFFFFF`; 4 pendentes em `#FFFFFF` a 22%. Bordas bem definidas, sem máscara pré-aplicada.
- O favicon é uma cópia; `BrandMark` embute a mesma geometria, gradiente e cores do SVG. O teste compara os desenhos com os IDs normalizados e verifica que cada marca usa a referência ao gradiente da própria instância (`useId`). `pnpm --filter @easy-grades/web icons` regenera deterministicamente os PNGs (192, 512, 512 maskable, apple-touch 180), que são commitados. O gerador mantém um único gradiente contínuo de borda a borda no fundo maskable e apple-touch, posiciona as definições antes do uso e reduz a grade para caber no círculo seguro de 80% do maskable.

## 8. Testes e qualidade

- Testes existentes continuam passando; os que dependem de nomes de token ou classe antigos são atualizados.
- Novos testes:
  - `useScrollMinimize`: limiar, histerese, retorno ao topo;
  - `TabBar`: estado encolhido acessível, `aria-expanded`, foco que expande, pílula na aba ativa;
  - preferência de aparência: persiste e aplica `data-appearance`, sobrevive a `localStorage` indisponível;
  - `--bottom-chrome`: soma tab bar e cápsula do semestre;
  - `resolveDetent` e o grabber por teclado (fase 5);
  - **contraste dos tokens:** um teste lê os valores de `index.css` e verifica as razões WCAG de 3.1 nos dois modos, incluindo `ink` e `ink-muted` sobre a tinta do vidro composta sobre `surface` e sobre `pen` (pior caso).
- Gates em toda branch: `pnpm test`, `typecheck`, `lint`, `build`; `pnpm react-doctor:changed` sem erros antes da revisão; o pre-push e o CI rodam `pnpm react-doctor:gate` (nota ≥ 90, 0 erros).
- Verificação manual por fase: claro, escuro, contraste aumentado, aparência sólida, movimento reduzido; FPS de rolagem com vidro (Chrome DevTools e Safari Web Inspector); no iPhone real, o tingimento das barras pelo Safari 26 e a tab bar no PWA instalado.

## 9. Fases

Uma branch por fase a partir de `main`, merge `--no-ff` após a revisão da branch inteira. O CD publica cada merge.

| Fase | Branch | Conteúdo |
|---|---|---|
| 1 | `feat/caneta-foundation` | Tokens em inglês (renomeação no app todo), azul caneta, `success`, tipografia, raios, `glass`, molas, contraste aumentado, preferência de aparência, componentes base (3.6). |
| 2 | `feat/caneta-navigation` | `TabBar` e `useScrollMinimize`, header mobile (título grande e header compacto), header desktop com segmented, menu ⋯ com aparência, toasts, `--bottom-chrome`, `theme-color`. |
| 3 | `feat/caneta-overview-courses` | Visão geral (cartões de métrica, MarkerBand, seções, gráficos) e Disciplinas. |
| 4 | `feat/caneta-flowchart-planning-upload` | Fluxograma em modo "Mapas", Planejamento com a cápsula do semestre, Upload, diálogos. |
| 5 | `feat/caneta-sheets` | `DetentSheet` aplicado a "Meu semestre" e `ExportSheet`. |
| 6 | `feat/caneta-brand` | Ícone, PNGs, manifest, `CLAUDE.md` final, remoção de tokens e código mortos. |

Ao fim de cada fase, a seção "Frontend conventions" do `CLAUDE.md` é atualizada com o que mudou.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Legibilidade sobre o vidro | Tinta de 84% (claro) e 90% (escuro), teste de contraste no pior caso, aparência sólida. |
| Custo de GPU do `backdrop-filter` em Android de entrada | Vidro só em poucos elementos fixos e pequenos; nunca em listas ou nós; nunca animar o blur; medir FPS. |
| Tingimento das barras pelo Safari 26 | Verificação no iPhone; fallback opaco em `display-mode: browser`. |
| "Falso iOS" fora da Apple | Sem SF, SF Symbols, chevron de voltar sem texto ou cópia de componentes do sistema; adaptação por capacidade (`pointer`, `display-mode`, `prefers-*`), nunca por user-agent. |
| Mistura de visuais em produção entre fases | A fase 1 já troca paleta, fonte e componentes base no app inteiro. |
| Corpo de 17 px alonga as telas | Só no mobile; a densidade é compensada pelos grupos de lista e cartões. |
