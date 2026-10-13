# Easy Grades — Design Spec

**Data:** 2026-10-10
**Status:** aguardando revisão

## 1. Objetivo

Plataforma web para qualquer aluno de graduação da UFAM acompanhar sua vida acadêmica a partir de dois PDFs exportados do e-Campus:

1. **Currículo de Curso (por versão e situação)** — lista de disciplinas, créditos, carga horária, período ideal e pré-requisitos.
2. **Histórico Escolar Analítico** — disciplinas cursadas, notas, situações, períodos.

O aluno faz upload dos dois arquivos e recebe: percentual concluído, lista de disciplinas cursadas, previsão de formatura, sugestões de disciplinas para o próximo semestre e projeção de CR.

### Critérios de sucesso

- Com PDFs reais do e-Campus (calibrado em IE17 — Engenharia de Software, currículo 2025/2), a plataforma reproduz **exatamente o CR** e o **% concluído (por carga horária)** impressos no histórico.
- Nenhum dado pessoal sensível (nome, matrícula, CPF, RG, filiação, nascimento, forma de ingresso, docentes) sai do parser.
- O servidor não persiste nada.
- `react-doctor` sem erros no CI.

### Fora de escopo

- Login, contas, persistência no servidor, sincronização entre dispositivos.
- Horários de turmas / oferta real do semestre (não está nos PDFs).
- Outras universidades ou formatos de PDF que não sejam do e-Campus UFAM.

## 2. Arquitetura (Abordagem A)

Monorepo **pnpm workspaces**, TypeScript `strict`.

```
easy-grades/
├─ apps/api          Fastify · @fastify/multipart · @fastify/helmet · @fastify/rate-limit · pdfjs-dist · zod · pino
│   └─ src/parsers/  pdf-rows.ts (extração por coordenadas) · curriculo.ts · historico.ts
├─ apps/web          Vite · React · Tailwind v4 · shadcn/ui · shadcn charts (Recharts) · motion · idb-keyval
├─ packages/core     tipos de domínio · schemas zod · regras puras (pré-requisitos, progresso, sugestões, previsão, CR)
├─ Dockerfile        multi-stage; API serve o build estático do web em "/" e a API em "/api/*"
└─ .github/workflows ci.yml · cd.yml
```

### Fluxo de dados

1. Usuário seleciona os 2 PDFs na tela de upload.
2. `POST /api/parse` (multipart, campos `curriculo` e `historico`).
3. API valida, extrai texto com coordenadas, aplica parsers com whitelist de campos e retorna `{ curriculum, transcript }` validado por zod (sem PII).
4. Web valida a resposta com o mesmo schema de `packages/core`, salva em IndexedDB e calcula todas as análises localmente com `packages/core`.
5. Simulações (CR projetado, seleção de disciplinas) rodam 100% no navegador, sem novas chamadas.

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/parse` | Recebe os 2 PDFs, retorna JSON anonimizado |
| `GET` | `/api/health` | Health check |
| `GET` | `/*` | Build estático do frontend (produção) |

## 3. Parsing de PDF

### Técnica

O texto do currículo, extraído em ordem de leitura, desalinha códigos e nomes. Por isso a extração usa **coordenadas** (`pdfjs-dist`, `getTextContent()`):

- `pdf-rows.ts`: para cada página, agrupa itens de texto por `y` arredondado (tolerância ~1pt) em linhas e ordena cada linha por `x`. Retorna `Row[] = { page, y, cells: { x, text }[] }`.
- Cabeçalhos e rodapés repetidos em cada página são descartados por padrão.

### Currículo (`curriculo.ts`)

- **Seções:** marcadores `ATIVIDADE CURRICULAR DE EXTENSÃO`, `ELETIVAS`, `OBRIGATÓRIAS`, `OPTATIVAS`. Cada seção termina numa linha `TOTAL`.
- **Linha de disciplina:** `[período?] CÓDIGO NOME CRÉD TEOR? PRAT? EXTE? TOTAL`.
  - O código segue o padrão `/^[A-Z]{2,7}\d{2,3}$/` (inclui `ENADE01`).
  - As colunas numéricas são atribuídas pelo `x` dos cabeçalhos `CRÉD. TEOR. PRAT. EXTE. TOTAL`.
- **Pré-requisitos:** o primeiro pré-requisito de uma disciplina fica ~1,8pt **acima** da linha dela. Os demais ficam empilhados nas linhas **abaixo**, antes da próxima disciplina. Logo, uma linha `CÓDIGO BLOCO n` pertence à disciplina mais próxima na mesma altura (até 3pt abaixo) ou acima dela. A regra foi verificada contra a ordem do content stream do PDF real: 117 de 117 disciplinas batem (ex.: ICC150 exige ICC107 e ICC431; ICC418 exige ICC412).
  - Mesmo bloco = todos exigidos (AND).
  - Blocos diferentes = alternativas (OR).
  - Representação: `prerequisites: string[][]`, uma lista de blocos.
- **Nome quebrado em duas linhas:** nomes truncados são aceitos como vêm do PDF.
- **Rodapé de totais:** carga horária total, total de créditos, CH/créditos por componente (obrigatórias, optativas, eletivas, AACC, extensão), mínimo/máximo de períodos e limites de créditos por período.

### Histórico (`historico.ts`)

- **Seções de categoria:**
  - `ATIVIDADE CURRICULAR DE EXTENSÃO`, `Disc. de Outros Currículos do Curso`, `Disciplinas Externas - Origem do Aproveitamento`, `ELETIVAS`, `OBRIGATÓRIAS`, `OPTATIVAS`, `DISCIPLINAS A VENCER (OBRIGATÓRIAS)`.
  - Cada período é marcado por `Periodo: N° Semestre de AAAA`.
- **Linha de disciplina:** `CÓDIGO NOME CR CH MÉDIA SITUAÇÃO`. A média pode ser `*****` (em curso), e o CR pode ser `**` (ENADE).
- **Outros dados extraídos:**
  - `COEFICIENTE DE RENDIMENTO ESCOLAR = x`: CR oficial, usado para conferência.
  - Tabela de componentes curriculares: % oficial, quando parseável.
  - Curso (código + nome) e versão do currículo.
- **Ignorados por design (whitelist):**
  - o bloco de cabeçalho do aluno inteiro: Aluno, Nascimento, CPF, Documento, Filiação, Estado Civil, Naturalidade, Forma de Ingresso;
  - linhas de Docente/Titulação;
  - as Observações.
- **Validação cruzada:** o código do curso e a versão do currículo no histórico devem bater com o PDF de currículo. Se não baterem, retorna erro `CURRICULUM_MISMATCH` com mensagem clara.

### Formato de saída (resumo; schema zod em `packages/core`)

```ts
type Category = 'obrigatoria' | 'optativa' | 'eletiva' | 'extensao' | 'outros' | 'externa';

interface Curriculum {
  courseCode: string; courseName: string; version: string;
  courses: { code: string; name: string; category: Category; idealPeriod: number | null;
             credits: number; hours: { theory: number; practice: number; extension: number; total: number };
             prerequisites: string[][] }[];
  requirements: { totalHours: number; totalCredits: number;
                  byCategory: Record<'obrigatoria'|'optativa'|'eletiva'|'aacc'|'extensao', { hours: number; credits: number }>;
                  minPeriods: number; maxPeriods: number; minCreditsPerPeriod: number; maxCreditsPerPeriod: number | null };
}

type Status = 'aprovado' | 'disp_nota' | 'equivalencia' | 'transf_real' | 'disp_calend' | 'disp'
            | 'matriculado' | 'reprovado_nota' | 'reprovado_freq' | 'trancado' | 'desconhecido';

interface Transcript {
  courseCode: string; curriculumVersion: string; officialCr: number | null;
  entries: { code: string; name: string; category: Category; term: string /* '2025.1' */;
             credits: number | null; hours: number | null; grade: number | null; status: Status; rawStatus: string }[];
  pending: { code: string; name: string; idealPeriod: number | null }[];   // "Disciplinas a vencer"
}
```

## 4. Regras de cálculo (`packages/core`, funções puras)

### Status

| Situação no PDF | Status | Conta como concluída | Entra no CR |
|---|---|---|---|
| Aprovado | `aprovado` | sim | sim |
| Disp Nota | `disp_nota` | sim | sim |
| TransfReal | `transf_real` | sim | sim |
| Equivalenc | `equivalencia` | sim | **não** |
| DispCalend / Disp | `disp_calend` / `disp` | sim | não |
| Matricula | `matriculado` | em curso | não (entra na projeção) |
| Repro Nota | `reprovado_nota` | não | **sim** |
| Repro Freq* | `reprovado_freq` | não | sim, nota registrada ou 0 (*a confirmar*) |
| Trancado* | `trancado` | não | não (*a confirmar*) |
| outro | `desconhecido` | não | não; UI mostra aviso |

\* Não presentes no histórico real usado na calibração; regra conservadora, marcada como a confirmar no CLAUDE.md.

### CR

```
CR = Σ (nota × CH) / Σ CH      sobre entradas com status ∈ {aprovado, disp_nota, transf_real, reprovado_nota, reprovado_freq}
     truncado em 3 casas decimais
```

**Evidência:** testada contra um histórico real. De todas as combinações de status e de pesos (créditos ou CH), **apenas esta** reproduz o CR impresso no documento, e só com truncamento (não arredondamento). Isso é consistente com o Guia do Aluno da UFAM ("qualquer reprovação ainda que por falta baixará seu coeficiente") e com a prática de outras federais. Um teste fixa esse valor.

**CR por semestre:** CR do período (só as entradas daquele termo) e CR acumulado até o termo, ambos com a mesma fórmula.

**Projeção:** dado um conjunto de disciplinas planejadas ou em curso com nota esperada, `projectCr(transcript, planned[])` aplica a mesma fórmula. Também calcula o melhor caso (todas 10) e o pior caso aprovado (todas 5).

### Progresso

- Horas concluídas por componente ÷ exigência do currículo:
  - obrigatória 2370, optativa 180, eletiva 120, AACC 210, extensão 320, total 3200 no currículo de referência; os valores vêm sempre do PDF.
- A categoria de cada entrada vem da **seção do histórico** em que ela aparece, e as horas vêm da **CH do histórico**, não do currículo. Ex.: ICC001 conta 90h.
- Entradas de `Disc. de Outros Currículos` e `Disciplinas Externas` **não contam** para o progresso. Seguem aparecendo na lista de cursadas e, conforme o status, no CR.
- Verificado num histórico real: o percentual calculado assim é igual ao impresso pelo e-Campus.
- Horas acima da exigência numa categoria não transbordam para outra.
- O % total é a soma limitada por categoria ÷ CH total.
- Se o histórico trouxer % oficial, a UI mostra o oficial. Se o cálculo divergir em mais de 0,5 p.p., mostra uma nota explicando.
- AACC não aparece no histórico como disciplinas: mostra o que o histórico declara, ou 0.

### Pré-requisitos

- `isSatisfied(course, doneSet)`: verdadeiro se `prerequisites` estiver vazio ou se **algum bloco** tiver **todos** os códigos em `doneSet`.
- `doneSet` = códigos com status concluído. Toggle "considerar disciplinas em curso como concluídas" (padrão **ligado** no Planejamento).

### Status no fluxograma

- `concluida`, `em_curso`, `reprovada` (reprovada e ainda não concluída), `disponivel` (pré-requisitos ok), `bloqueada`.

### Sugestões para o próximo semestre

1. Candidatas:
   - obrigatórias (e eletivas do currículo) não concluídas e não em curso, com pré-requisitos satisfeitos (com o toggle de "em curso");
   - excluindo ENADE e atividades de extensão, que são listadas à parte como pendências.
2. Ordenação:
   - (a) período ideal crescente;
   - (b) número de disciplinas que ela desbloqueia transitivamente (decrescente);
   - (c) créditos.
3. Seleção gulosa até o máximo de créditos por período (do currículo; se ausente, 30), respeitando o mínimo.
4. Cada sugestão traz um motivo legível, ex.: "Obrigatória, período ideal 8, não é pré-requisito de outras". O "desbloqueia" conta só obrigatórias e eletivas: no currículo real, 7 optativas exigem o TCC, e contá-las distorceria a ordem.

### Previsão de formatura

- Simula semestres a partir do próximo termo, aplicando as sugestões repetidamente com o mesmo limite de créditos. Em curso conta como concluído no próximo termo.
- Resultado:
  - termo previsto de conclusão das obrigatórias;
  - nº de semestres restantes;
  - comparação com o máximo de períodos desde o ingresso, com alerta se ultrapassar.
- Optativas, eletivas, AACC e extensão aparecem como horas pendentes, não agendadas.

## 5. Frontend

### Telas (PT-BR)

1. **Upload:**
   - duas dropzones com guia de onde baixar cada PDF no e-Campus;
   - aviso de privacidade;
   - feedback de progresso;
   - erros específicos por código (`INVALID_PDF`, `NOT_CURRICULUM`, `NOT_TRANSCRIPT`, `CURRICULUM_MISMATCH`, `TOO_LARGE`, `RATE_LIMITED`).
2. **Visão geral:**
   - KPIs: CR, % concluído, créditos, previsão de formatura;
   - radial por componente;
   - linha de CR por semestre e acumulado;
   - barras de créditos por semestre.
3. **Fluxograma do curso** (tela própria, destaque da plataforma):
   - **Layout:** colunas = períodos ideais 1–8, cartões = disciplinas obrigatórias.
   - **Ligações:** setas entre cartões para cada pré-requisito, em curvas suaves. Blocos OR em traço diferente.
   - **Status:** concluída, em curso, reprovada, disponível ou bloqueada. Cada cartão mostra cor + ícone + código, nome curto e créditos. As notas não aparecem no fluxograma: elas vivem em Disciplinas e na Visão geral.
   - **Interação:**
     - hover/foco/clique numa disciplina destaca a cadeia de pré-requisitos (para trás) e o que ela desbloqueia (para frente); o resto fica esmaecido;
     - zoom/pan e minimapa, com "ajustar à tela";
     - legenda com contagem por status;
     - filtro "mostrar só o caminho até a formatura".
   - **Eletivas e optativas cursadas:** faixa lateral com horas acumuladas, sem o grafo completo das ~100 eletivas.
   - **Visualização inicial:** o curso inteiro só aparece de uma vez se os cartões ficarem legíveis (zoom ≥ 0,75). Caso contrário, abre no 1º período com zoom 0,8 e o aluno arrasta para ver o resto.
   - **Implementação:**
     - `@xyflow/react` (React Flow) com nós customizados (shadcn Card + Tooltip) e edges customizadas;
     - posição determinística calculada em `packages/core` (`layoutFlowchart`): x pelo período, y ordenado para minimizar cruzamentos (barycenter simples). Sem dagre/elk;
     - entrada com stagger por coluna (motion), respeitando `prefers-reduced-motion`.
   - **Acessibilidade:** navegação por teclado entre nós, e uma lista alternativa acessível (tabela por período) para leitores de tela.
   - **Exportação:** botão "Exportar PNG" (`html-to-image`), gerado localmente. A imagem é sempre o fluxograma, mesmo com a lista na tela, e sai sem as notas dos cartões. O botão fica em "Exportando…" enquanto a imagem é gerada.
4. **Disciplinas:** tabela filtrável (status, categoria, período, busca) com todas as entradas do histórico.
5. **Planejamento:**
   - sugestões com motivo;
   - seleção de disciplinas com contador de créditos (mín./máx.);
   - sliders de nota esperada;
   - gráfico de CR com projeção tracejada, melhor e pior caso.

### Diretrizes

- **Componentes:**
  - shadcn/ui para todos os componentes de base;
  - **shadcn charts** (Recharts) para todos os gráficos.
- **Estado:**
  - dados parseados em IndexedDB (`idb-keyval`);
  - estado de UI local (React state / `useReducer`), sem lib global de estado;
  - roteamento simples (React Router ou rotas por estado), definido no plano.
- **Design visual:** definido com `/frontend-design` na implementação. Animações e polimento com `/emil-design-eng`, sempre respeitando `prefers-reduced-motion`.
- **Acessibilidade:**
  - navegação por teclado no fluxograma;
  - contraste AA;
  - status não comunicado só por cor (ícone + texto).
- **Botões sempre visíveis:** "Limpar dados" (apaga IndexedDB) e "Novo upload".

## 6. Segurança e privacidade

- **PII:**
  - parsers por whitelist; o cabeçalho do aluno nunca é lido para a saída;
  - teste automatizado garante que o JSON de saída não contém padrão de CPF (`\d{3}\.\d{3}\.\d{3}-\d{2}`), o nome do aluno nem nomes de docentes do fixture.
- **Upload:**
  - `@fastify/multipart` com limites: 2 arquivos, 5 MB cada, campos nomeados;
  - verificação de magic bytes `%PDF-`;
  - máximo de 20 páginas;
  - timeout de parsing de 10s;
  - tudo em memória (sem disco); buffers descartados após a resposta.
- **pdfjs:** `isEvalSupported: false`, `disableFontFace: true`, sem fetch de recursos externos.
- **API:**
  - `@fastify/helmet` com CSP estrita (`default-src 'self'`);
  - `@fastify/rate-limit` (ex.: 10 req/min por IP em `/api/parse`);
  - CORS desabilitado (same-origin);
  - `bodyLimit` adequado;
  - erros padronizados `{ error: { code, message } }`, sem stack trace;
  - logs pino sem corpo, sem nomes de arquivo e sem conteúdo extraído.
- **Frontend:**
  - nenhum script de terceiros nem analytics; fontes self-hosted;
  - Vite com `assetsInlineLimit: 0`, para nenhum asset virar `data:` URI (a CSP `font-src 'self'` bloquearia);
  - Dashboard, fluxograma e gráficos carregam sob demanda, e a tela de upload fica com ~280 kB;
  - IndexedDB guarda só JSON já anonimizado.
- **Container:** imagem multi-stage, usuário não-root, `NODE_ENV=production`, apenas dependências de produção.
- **Repositório:**
  - PDFs reais no `.gitignore`;
  - fixtures de teste **sintéticos**, gerados a partir da estrutura e sem dados reais;
  - teste opcional contra PDFs reais locais (`skip` quando ausentes, sempre no CI);
  - CI com `pnpm audit` e gitleaks.

## 7. Testes

- **`packages/core`:** testes unitários (Vitest) de cada regra.
  - Usa um fixture **fictício** (aluno inventado sobre o currículo real e público), sem nenhum dado real de histórico no repositório. A conferência contra PDFs reais fica num teste local (`real-pdfs.test.ts`), que é pulado quando os arquivos não estão presentes, ou seja, sempre no CI.
- **`apps/api`:**
  - testes dos parsers contra PDFs sintéticos gerados no próprio teste (pdf-lib) que imitam o layout por coordenadas;
  - testes de rota com `fastify.inject` (limites, magic bytes, códigos de erro);
  - teste de vazamento de PII.
- **`apps/web`:** Vitest + Testing Library para componentes com lógica (seleção de planejamento, upload). Mais `react-doctor`.

## 8. CI/CD e workflow

### CI (`.github/workflows/ci.yml`, em PR e push)

- `pnpm install --frozen-lockfile`
- lint (ESLint)
- typecheck
- Vitest
- **`npx react-doctor` em `apps/web`** (falha se houver erros)
- build
- `pnpm audit --prod`
- gitleaks

### CD (`cd.yml`, push em `main`)

- Build da imagem Docker e publicação no **GHCR** (`ghcr.io/<owner>/easy-grades:{sha,latest}`).
- Sem deploy automático.

### Workflow de desenvolvimento

1. Cada tarefa do plano roda em branch `feat/<tarefa>` a partir de `main`.
2. Implementação por subagents **Haiku 5.5 (esforço high)**.
3. Toda branch que toca `apps/web` roda **react-doctor** e corrige os problemas antes da revisão.
4. Revisão por subagent **Opus 5.5 (esforço medium)**, com ciclos de correção até aprovação; depois merge em `main`.
5. O repo atual não tem remote. A branch `main` é criada localmente e o CI fica pronto para quando o remote for adicionado.

### CLAUDE.md

Registra:

- arquitetura e comandos;
- fórmula do CR com evidência;
- regras de status;
- regras de PII/segurança;
- workflow de branches/subagents/react-doctor;
- pendências "a confirmar".
