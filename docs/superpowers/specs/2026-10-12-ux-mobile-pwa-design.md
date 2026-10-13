# UX, responsividade e PWA — Design Spec

**Data:** 2026-10-12
**Status:** aprovada (rebrand "Caderno" adicionado em 2026-10-12)
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

### 3.0 Rebrand: "Caderno"

**Por quê.** A identidade atual ("Encontro das Águas": fundo creme quente, serifa de alto contraste e acento de argila) cai no visual genérico de app gerado e não fala do assunto. O assunto é a **grade curricular**, e o material do estudante é o **caderno quadriculado**: caneta azul, marca-texto, caneta vermelha de correção e lápis. A marca nasce daí, e o trocadilho do nome (grade = currículo, grades = notas) vira imagem.

**Ícone / símbolo.** Um quadrado de cantos arredondados em tinta azul com uma grade 3×3 de células.
- As células são preenchidas em marca-texto **por coluna**, como semestres concluídos: a coluna 1 inteira e 2 células da coluna 2. As outras 4 células ficam só com contorno (papel a 45%).
- Fonte única em `apps/web/brand/icon.svg` (viewBox 512, raio 112). O favicon, os ícones do PWA (192, 512, 512 maskable com área segura de 80%) e o apple-touch-icon 180 são gerados dele por script.
- **Wordmark:** símbolo seguido de "Easy Grades" em Bricolage Grotesque condensada, peso 800. Nenhuma palavra recebe destaque à parte.

**Paleta** (tokens novos, que substituem negro/solimões/igapó/várzea/vitória/urucum/neblina):

| Token | Claro | Escuro | Papel |
|---|---|---|---|
| `--papel` | #F4F6FA | #0E1424 | Fundo: papel frio, nunca creme. O escuro é o caderno à noite, azul-marinho e não preto neutro. |
| `--pauta` | #C9D3E6 | #26304A | Bordas, linhas e o quadriculado. |
| `--tinta` | #1D3FA0 | #8FA8FF | Caneta azul: primária, links, foco e "em curso". Contraste de 8,5:1 sobre o papel. |
| `--marca` | #F2E94E | #E8DD45 | Marca-texto: **só preenchimento**, nunca texto. O texto por cima é sempre `--tinta-escura` (#14275F). Indica "concluída" e o progresso. |
| `--correcao` | #C4302B | #FF7A70 | Caneta vermelha: reprovação e ações destrutivas. |
| `--grafite` | #5B6170 | #A4ABBA | Lápis: texto secundário, "bloqueada" e "restante". |

- **Status** (sempre ícone + texto):
  - concluída = fundo marca-texto, borda tinta de 1 px e texto tinta-escura;
  - em curso = fundo tinta e texto papel;
  - disponível = contorno tinta tracejado;
  - bloqueada = grafite;
  - reprovada = correção.
- Elementos gráficos em marca-texto sobre o papel têm contraste baixo, então levam borda tinta de 1 px (WCAG 1.4.11).

**Tipografia.**
- **Bricolage Grotesque** (variável, `@fontsource-variable/bricolage-grotesque`) para títulos e números grandes, condensada (`wdth` 75–80 se o eixo estiver disponível) e com peso de 700 a 800. Os *ink traps* lembram tinta de caneta.
- **Hanken Grotesk** continua no texto e na interface, com `tabular-nums`.
- Literata sai, e os tokens `text-display` (44 px) e `text-stat` (64 px) continuam.

**Elemento-assinatura (onde a ousadia fica).**
- A faixa de progresso da Visão geral vira uma **passada de marca-texto sobre papel quadriculado**:
  - o trecho restante mostra o quadriculado (linhas `--pauta` a cada 8 px);
  - o trecho concluído é marca-texto;
  - as atividades registradas por você aparecem como hachura de marca-texto a 50%.
- `WatersBand` passa a se chamar `MarkerBand`.
- Fora dela e do upload, o resto fica quieto: papel liso, sem gradientes, sem sombras decorativas. O raio é de 6 px no geral e de 12 px só em sheets e diálogos.
- O herói do upload ganha o quadriculado de fundo e o símbolo grande. A copy continua a mesma.

**Movimento** (base: Emil Kowalski):
- **Momento único:** a passada de marca-texto revela o trecho concluído uma vez por dataset (`clip-path` da esquerda para a direita, 700 ms, `--ease-snap`).
- **Frequentes, sem animação de movimento:**
  - abas, chips e o campo de nota mudam só de cor (150 ms, `ease`);
  - nada se anima por atalho de teclado.
- **Pressionar:** `scale(0.97)` vem do `Button`.
- **"Adicionar" → "Adicionada":** troca do ícone com opacidade e `blur(2px)` em 200 ms.
- **Sheet inferior:** `translateY(100%)` → 0 com `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`, 300 ms na entrada e 200 ms na saída. O overlay só muda a opacidade.
- **Medidor de créditos:** `transform: scaleX()` com origem à esquerda, 200 ms e `--ease-snap` (sem animar `width`).
- **Movimento reduzido:** sem transforms, sem clip e sem stagger; só fades de no máximo 150 ms.

**PWA:** `theme_color` #1D3FA0 (claro) e #0E1424 (escuro, via `<meta media>`); `background_color` #F4F6FA.

### 3.1 Shell do app (mobile-first)

- **< md:** barra de abas **embaixo**, fixa, com ícone e rótulo para Visão geral, Fluxograma, Disciplinas e Planejamento.
  - Altura ≥ 56 px, alvo ≥ 44 px, `padding-bottom: env(safe-area-inset-bottom)`, aba ativa com `aria-current`.
  - O topo mostra só a marca e um menu "Mais opções" (⋯) com Novo upload, Instalar app (quando houver) e Limpar dados (em vermelho, separado por divisor, com a confirmação de hoje).
- **≥ md:** mantém o topo atual.
- **Alvos de toque:** ≥ 44 px no mobile em botões, links, switch, checkbox e "Remover". Use padding ou área de toque estendida, sem aumentar o visual quando não precisar.
- **Safe areas:** `viewport-fit=cover`; o conteúdo respeita `env(safe-area-inset-*)`.
- **Fluxograma no mobile (< md):** abre por padrão em "Ver como lista". O switch continua permitindo o grafo, e a escolha é lembrada (localStorage, conveniência).

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
- **Medidor de créditos:** barra com as marcas de mínimo e máximo do currículo. Abaixo do mínimo fica em aviso (tinta, com ícone e texto); acima do máximo fica em erro (correção, com ícone e texto). Adicionar continua permitido, mas o aviso explica o limite (prevenção de erros sem bloquear).
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
  - `background_color` #F4F6FA, `theme_color` #1D3FA0;
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

0. **Rebrand "Caderno":** tokens, fontes, símbolo e wordmark, `MarkerBand`, cores de status, React Flow e favicon.
1. **Shell mobile:** barra de abas inferior, menu "Mais opções", safe areas, alvos de toque e fluxograma em lista no mobile.
2. **Disciplinas:** chips com contagem, agrupamento com cabeçalho fixo, tabela no desktop e cartões no mobile.
3. **Planejamento:**
   - `missingPrerequisites` no core;
   - catálogo com busca, filtros e bloqueadas;
   - painel "Meu semestre" com medidor, campo de nota e desfazer;
   - persistência e switch sem descarte.
4. **PWA:** manifest, ícones, service worker, UX de atualização, instalação e offline, e headers no servidor.

Cada tarefa é implementada pelo Haiku 5.5 (high) e revisada pelo Opus 5.5 (medium). Ao final há revisão da branch, verificação no Chrome e o PR.
