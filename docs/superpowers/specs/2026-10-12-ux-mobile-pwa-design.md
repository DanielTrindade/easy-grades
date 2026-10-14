# UX, responsividade e PWA — Design Spec

**Data:** 2026-10-12
**Status:** aprovada (identidade "Grafite" em 2026-10-12, substituindo "Caderno")
**Branch:** `feat/ux-mobile-pwa`

## 1. Objetivo

1. Melhorar a página **Disciplinas**.
2. Refazer a seleção de disciplinas do **Planejamento** seguindo padrões de UI/UX e as heurísticas de Nielsen.
3. Corrigir os problemas de responsividade do app inteiro.
4. Tornar o app um **PWA instalável**, com funcionamento offline dos dados já lidos.

## 2. Auditoria (Chrome, 390 px e 1440 px, com um histórico real)

| Área | Achado | Heurística / critério |
|---|---|---|
| Geral | Nenhuma tela rola na horizontal (ok). | — |
| Geral (390 px) | Alvos de toque menores que 44 px: Planejamento 15 de 19, Visão geral 7 de 11, Fluxograma 8 de 12, Disciplinas 5 de 9 (links do menu, botões do topo, switch, checkbox, slider, "Remover"). | WCAG 2.5.5 / Apple HIG 44 pt |
| Geral (mobile) | A navegação fica no topo e rola na horizontal, longe do polegar. "Novo upload" e "Limpar dados" (destrutivo) ficam lado a lado, sem respiro. | Prevenção de erros; ergonomia |
| Geral (PWA) | Sem manifest, ícones, service worker, `theme-color`, metas iOS nem safe areas (`viewport-fit=cover`). | Requisitos de instalabilidade |
| Disciplinas (mobile) | Uma tabela de 6 colunas espremida em 390 px: a coluna Situação é **cortada** ("Matri", "Aprov"), os nomes quebram em 3–4 linhas e a página tem ~4.300 px sem agrupamento. | Visibilidade do estado; estética e minimalismo |
| Disciplinas | Os filtros são selects (situação/categoria) sem contagem. O aluno não vê quantas disciplinas há em cada situação sem abrir o select. | Reconhecer em vez de lembrar |
| Planejamento | A seleção mistura escolher e dar nota no mesmo cartão (checkbox + slider). O slider é impreciso e tem alvo pequeno no toque. Não dá para digitar a nota. | Eficiência; prevenção de erros |
| Planejamento | Não há busca nem filtro: as eletivas ficam atrás de "Ver mais 94 eletivas", uma lista longa sem ordenação útil. | Flexibilidade; reconhecer em vez de lembrar |
| Planejamento | O resumo (créditos, CR projetado) não fica visível enquanto a lista rola, sobretudo no mobile. | Visibilidade do estado do sistema |
| Planejamento | O switch "Supor aprovação no que está em curso" **descarta a seleção** sem aviso nem desfazer. | Controle e liberdade do usuário |
| Planejamento | O plano **se perde** ao trocar de aba ou recarregar. | Controle e liberdade; consistência |
| Planejamento | Disciplinas bloqueadas não aparecem, e o aluno não sabe o que falta para liberá-las. | Ajuda a reconhecer e recuperar |
| Fluxograma (mobile) | O grafo com pan/zoom num celular é difícil; a lista acessível existe, mas não é o padrão. | Adequação ao contexto |

## 3. Design

### 3.0 Identidade "Grafite" (substitui "Caderno", decidido em 2026-10-12)

**Por quê.** O "Caderno" (azul royal + amarelo) lembrava as cores do Boca Juniors, e a Bricolage virou fonte da moda. O aluno escolheu, entre três direções renderizadas, a **Grafite + esmeralda**: neutros frios de grafite e um único acento, o esmeralda, que já significa "aprovado".

**Paleta** (tokens):

| Token | Claro | Escuro | Papel |
|---|---|---|---|
| `--fundo` | #F4F4F2 | #141517 | Fundo da página. |
| `--superficie` | #FFFFFF | #1C1D20 | Painéis e cartões elevados. |
| `--texto` | #18191C | #ECEDEE | Texto principal. Também é o fundo de "em curso". |
| `--suave` | #5D6068 | #9A9CA3 | Texto secundário. |
| `--linha` | #E2E2DE | #2A2C30 | Divisórias e trilhos. |
| `--campo` | #8E9198 | #474A51 | Borda de inputs (≥ 3:1). |
| `--esmeralda` | #0F8F61 | #2FBF8A | Acento único: concluída, progresso, CR projetado e foco. |
| `--esmeralda-texto` | #0B7651 | #4FD6A2 | Esmeralda usado como texto (≥ 4.5:1). |
| `--esmeralda-fundo` | #DCF1E8 | #173A2E | Fundo suave do acento (por exemplo "No semestre"). |
| `--erro` | #C23B3B | #F07070 | Reprovação e ações destrutivas. |

- **Status** (sempre ícone + texto):
  - concluída = `--esmeralda-fundo` com texto `--esmeralda-texto`;
  - em curso = `--texto` como fundo, com texto `--fundo`;
  - disponível = contorno tracejado em `--texto`;
  - bloqueada = `--suave`;
  - reprovada = `--erro`.
- Não existe segundo acento, gradiente nem brilho.

**Tipografia:** **Mona Sans** (variável, `@fontsource-variable/mona-sans`, eixos `wdth` 75–125 e `wght`), uma família só.
- **Títulos e números grandes:** `font-stretch: 125%`, peso 800, `letter-spacing: -0.02em`.
- **Texto e interface:** largura 100%, peso 400–600, `tabular-nums`.
- **Códigos de disciplina:** Mona Sans a 87,5% de largura, em `--suave`. Sem fonte monoespaçada.
- Saem Bricolage Grotesque e Hanken Grotesk.

**Forma:** raio de 8 px em controles, 14 px em painéis e sheets, e pílula só nos chips de filtro.

**Símbolo:** a mesma grade 3×3 de `apps/web/brand/icon.svg`, recolorida:
- fundo grafite #18191C;
- células concluídas em esmeralda #2FBF8A;
- células restantes só com contorno #ECEDEE a 35%.

O favicon, os ícones do PWA e o `BrandMark` são regenerados a partir dele.

**Elemento-assinatura:** a faixa de progresso (`MarkerBand`) mantém a revelação única. A grade 3×3 do símbolo se repete:
- no **medidor de créditos em células**, uma por crédito, com marca no mínimo;
- nas disciplinas concluídas do fluxograma, com fundo `--esmeralda-fundo` e borda esquerda esmeralda.

**Planejamento (topo e "Meu semestre")**, conforme a referência `.superpowers/sdd/ux-pwa/reference-grafite.html`:
- **Topo:** o título e uma frase de no máximo 12 palavras à esquerda. À direita, o CR projetado grande em `--esmeralda-texto`, com "2027/1, CR projetado" acima e "hoje 8,161" abaixo.
- **Painel:**
  - créditos e CR projetado lado a lado;
  - medidor em células (máximo do currículo; células preenchidas = créditos escolhidos; marca no mínimo);
  - lista enxuta com `divide-y`, nome, código e créditos, stepper compacto (34 px no desktop, 44 px no toque) e remover como botão × discreto com `aria-label`;
  - no rodapé, "Em curso agora (N)" recolhível e "Usar sugestão".
- **Sem barra de rolagem interna:** o painel é sticky e cresce com a página.

**PWA:** `theme_color` #18191C (claro e escuro) e `background_color` #F4F4F2.

### 3.1 Shell do app (mobile-first)

- **< md:** barra de abas **embaixo**, fixa, com ícone e rótulo para Visão geral, Fluxograma, Disciplinas e Planejamento.
  - Altura ≥ 56 px, alvo ≥ 44 px, `padding-bottom: env(safe-area-inset-bottom)`, aba ativa com `aria-current`.
  - O topo mostra só a marca e um menu "Mais opções" (⋯) com Novo upload, Instalar app (quando houver) e Limpar dados (em vermelho, separado por divisor, com a confirmação de hoje).
- **≥ md:** mantém o topo atual.
- **Alvos de toque:** ≥ 44 px no mobile em botões, links, switch, checkbox e "Remover". Use padding ou área de toque estendida, sem aumentar o visual quando não precisar.
- **Safe areas:** `viewport-fit=cover`; o conteúdo respeita `env(safe-area-inset-*)`.
- **Fluxograma no mobile (< md):** abre no grafo, como no desktop; "Ver como lista" fica a um toque e a escolha é lembrada (localStorage, conveniência). O "Exportar PNG" funciona nas duas visões: a imagem é sempre o grafo (mesmo com a lista na tela), sem as notas dos cartões.
- **Exportar PNG no celular:** um PWA instalado no iOS não tem pasta de downloads, então o `<a download>` não faz nada. A imagem abre numa folha inferior com prévia e o botão "Salvar ou compartilhar" (Web Share API: Fotos, Arquivos, outros apps); a prévia também aceita toque e segure. No mouse o arquivo baixa direto, como antes.

### 3.2 Disciplinas

- **Topo:** chips de situação com contagem (Todas · Concluídas · Em curso · Reprovadas · Outras), que funcionam como filtro de seleção única (`role="radiogroup"`). Em seguida, a busca e o filtro de categoria. "Limpar filtros" aparece quando algum filtro está ativo.
- **Agrupamento:** por período (padrão) ou por categoria, com um seletor segmentado.
  - Cada grupo tem cabeçalho fixo ao rolar (sticky) com período, CR do período e horas.
  - Os grupos são ordenados do mais recente ao mais antigo; dentro do grupo, por código.
- **≥ md:** tabela por grupo, com colunas Disciplina (código + nome), Categoria, CH, Nota e Situação, e cabeçalho fixo.
- **< md:** **cartões** em lista no lugar da tabela.
  - Linha 1: nome (até 2 linhas).
  - Linha 2: código, categoria e CH.
  - À direita: nota em destaque e o badge de situação inteiro, nunca cortado.
- Mantém o estado vazio com instrução e a contagem de resultados.

### 3.3 Planejamento — catálogo + "Meu semestre"

**Catálogo** (coluna principal)
- Busca por código ou nome.
- Chips de filtro: **Sugeridas** (padrão), Obrigatórias, Eletivas, Bloqueadas.
- Cada item mostra nome, código, categoria, período ideal, créditos, CH e o motivo ("libera N disciplinas").
- Botão **Adicionar**, que vira **Adicionada ✓** com opção de remover.
- **Bloqueadas** lista as disciplinas ainda não liberadas, com "Falta: ICC431, ICC412" (pré-requisitos ausentes, respeitando blocos E/OU). Essas disciplinas não podem ser adicionadas.
- O "Ver mais 94 eletivas" sai e é substituído pelos filtros e pela busca.

**Meu semestre** (painel)
- **≥ lg:** coluna lateral fixa ao rolar.
- **< lg:** barra fixa embaixo, acima da barra de abas no mobile. Mostra "N disciplinas · X créditos · CR projetado" e abre um painel inferior (bottom sheet, `Sheet` do shadcn) com o conteúdo completo.
- **Medidor de créditos:** barra com as marcas de mínimo e máximo do currículo. Abaixo do mínimo fica em aviso (texto suave, com ícone e texto); acima do máximo fica em erro (`--erro`, com ícone e texto). Adicionar continua permitido, mas o aviso explica o limite (prevenção de erros sem bloquear).
- **Lista das escolhidas**, cada uma com:
  - **nota esperada** em campo numérico (0–10, passo 0,1, `inputMode="decimal"`, aceita vírgula), com botões − e + de 44 px e rótulo acessível "Nota esperada em <disciplina>";
  - botão **Remover**, que dispara um toast "Removida. Desfazer".
- **Em curso agora:** grupo recolhível com as notas esperadas das disciplinas matriculadas, no mesmo controle.
- **Projeção:** CR projetado, faixa (com notas de 5 a 10), o gráfico de projeção e o botão **"Usar sugestão"**, que substitui a seleção e mostra toast com Desfazer.
- **Switch "Supor aprovação no que está em curso":** não descarta mais a seleção. Só recalcula o que está liberado. Uma escolhida que deixar de estar liberada continua na lista, marcada como "pré-requisito pendente".

**Comportamento**
- **Persistência:** o plano (escolhidas + notas + switch) é salvo no IndexedDB, associado ao dataset (`savedAt`). Ele sobrevive à troca de aba e ao recarregamento, e é apagado por "Limpar dados".
- **Teclado:** Enter no item do catálogo adiciona; foco visível; o anúncio "Adicionada ao semestre" vai por `aria-live`.

**Core:** nova função `missingPrerequisites(c, done, code): string[][]`, que devolve os blocos ainda não satisfeitos, para o texto "Falta: …".

### 3.4 PWA

- **Plugin:** `vite-plugin-pwa` 2.x (Workbox).
  - `registerType: 'prompt'`.
  - Precache do app shell (JS, CSS, fontes, ícones).
  - Rotas `/api/*` em **NetworkOnly**: nada da API vai para cache.
  - `navigateFallback` para `index.html`, exceto `/api`.
- **Manifest (`manifest.webmanifest`):**
  - `name` "Easy Grades", `short_name` "Easy Grades", descrição PT-BR, `lang` pt-BR;
  - `start_url` "/", `scope` "/", `display` standalone, `orientation` any;
  - `background_color` #F4F4F2, `theme_color` #18191C;
  - ícones 192, 512 e 512 maskable, além do `apple-touch-icon` 180, todos gerados de `apps/web/brand/icon.svg` (seção 3.0) por um script versionado.
- **`index.html`:**
  - `viewport-fit=cover`;
  - `theme-color` claro e escuro via `media`;
  - `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` e `apple-touch-icon`.
- **UX:**
  - **Nova versão:** quando o SW detecta uma, aparece o toast "Nova versão disponível" com o botão "Atualizar".
  - **Instalar app:** o item do menu aparece quando houver `beforeinstallprompt`. No iOS, a dica é "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início".
  - **Offline:** com o navegador offline, a tela de upload avisa: "Você está offline. Para ler novos PDFs, conecte-se. Seus dados já salvos continuam disponíveis." O painel funciona offline com os dados do IndexedDB.
- **Servidor (Fastify):**
  - `sw.js` e `manifest.webmanifest` são servidos com `Cache-Control: no-cache` e o content-type correto;
  - a CSP continua `default-src 'self'` (SW e manifest são same-origin).
- **Privacidade:** o service worker nunca guarda respostas da API nem PDFs. Os PDFs continuam só na memória do request.

## 4. Testes e verificação

- Testes unitários e de componente para:
  - chips com contagem e agrupamento (Disciplinas);
  - catálogo, busca, filtros e "Bloqueadas" com motivo;
  - campo de nota (vírgula, limites, ±);
  - medidor (abaixo, dentro e acima);
  - desfazer;
  - persistência do plano;
  - switch sem descartar;
  - `missingPrerequisites` (E/OU).
- **Teste de PWA:** o build gera `manifest.webmanifest` válido, ícones e `sw.js`; a configuração do Workbox não inclui `/api`.
- **Verificação no Chrome (390 px e 1440 px):**
  - 0 rolagem horizontal;
  - alvos de toque < 44 px = 0 no mobile (exceto links de texto corrido);
  - o SW registra;
  - o app abre offline depois da primeira visita;
  - o manifest é instalável (critérios do Chrome).
- `pnpm react-doctor:gate` ≥ 90, além de lint, typecheck, test e build.

## 5. Fora do escopo

- Notificações push e sincronização em segundo plano.
- Upload de PDF offline: depende da API.
- Mudanças no parser ou nas regras de cálculo.

## 6. Tarefas (ordem de implementação)

0. **Identidade "Grafite" (antes "Caderno"):** tokens, fontes, símbolo e wordmark, `MarkerBand`, cores de status, React Flow e favicon.
1. **Shell mobile:** barra de abas inferior, menu "Mais opções", safe areas, alvos de toque e fluxograma em lista no mobile.
2. **Disciplinas:** chips com contagem, agrupamento com cabeçalho fixo, tabela no desktop e cartões no mobile.
3. **Planejamento:**
   - `missingPrerequisites` no core;
   - catálogo com busca, filtros e bloqueadas;
   - painel "Meu semestre" com medidor, campo de nota e desfazer;
   - persistência e switch sem descarte.
4. **PWA:** manifest, ícones, service worker, UX de atualização, instalação e offline, e headers no servidor.

Cada tarefa é implementada pelo Haiku 5.5 (high) e revisada pelo Opus 5.5 (medium). Ao final há revisão da branch, verificação no Chrome e o PR.
