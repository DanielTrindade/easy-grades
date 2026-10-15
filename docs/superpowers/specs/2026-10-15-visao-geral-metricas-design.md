# Visão geral narrativa — métricas de trajetória

**Status:** aprovada (2026-10-15). Implementa-se pelo plano `docs/superpowers/plans/2026-10-15-visao-geral-metricas.md`.

## 1. Objetivo

A tela de Visão geral hoje responde "como eu estou" (CR, % concluído, ritmo, desempenho, integralização), mas não responde três perguntas que dão sentido aos números: **quando eu termino?**, **o que falta e o que destrava?** e **como estou evoluindo?**.

Esta feature adiciona métricas de trajetória a partir dos dados que já existem (histórico + currículo), cada número com uma frase de leitura (microcopy), no tom do app: PT-BR, sentence case, voz "você". Sem parágrafo-resumo gerado, sem grade de cards de KPI, sem dados de coorte (não existem e iriam contra o design local).

Pesquisa de apoio (2026-10-15):

- A UFAM estruturou em 2025 a CEREEG (retenção e evasão) e o SAUIM (monitoramento de matrícula, retenção, evasão e desempenho) — tempo de integralização, atraso em relação ao período ideal e risco de estourar o prazo máximo são a língua oficial da instituição (ufam.edu.br/noticias/7311).
- Reprovação em disciplinas básicas é sistêmica nas federais: Cálculo I entre 40% e 75% de reprovação em estudos da UFRGS, UFJF, UFRJ e UFSCar; ~10% dos alunos repetem Cálculo I duas ou mais vezes (UFRJ, REUCP 2014). "Nº de matrículas até a aprovação" é indicador institucional (relatórios UFMG/INEP).
- Formar fora do prazo ideal é comum: Eng. Mecânica Noturna da UFMG (ingressos 2014–2015) concluiu em 11,6–13,7 semestres contra 10 ideais.

## 2. Escopo

Todas as métricas ficam em `packages/core` (funções puras, testadas) e são consumidas pela Visão geral. Nenhuma dependência nova, nenhum dado sai do navegador.

Entram:

1. Linha do tempo do curso (ingresso → hoje → previsão → prazo máximo).
2. Próxima meta (25/50/75/90/100%) com horas e termo estimado.
3. Em curso ("se aprovar tudo neste semestre").
4. O que falta (disciplinas e horas), liberadas × bloqueadas e gargalos.
5. CR na formatura (melhor e pior caso).
6. Atraso médio em relação ao período ideal.
7. Tentativas até a aprovação (pedras no caminho).
8. Sequência sem reprovação.
9. Distribuição das notas (mediana e faixas).
10. Custo das reprovações (horas, créditos e equivalência em períodos).
11. CR por categoria (comparação com as obrigatórias).
12. Gráfico de horas por período com "em curso" e a média.

Fora (com justificativa):

- **Percentil/ranking de turma:** não há dados de coorte e a plataforma é local por design.
- **`transcript.pending` (lista de pendências do e-Campus):** avaliada e descartada — o diff do currículo já é completo (inclui as disciplinas em curso) e a lista pode estar desatualizada; mostrá-la seria redundante (YAGNI).
- **Projeção "mantendo o CR atual":** matematicamente igual ao CR atual (média ponderada com o mesmo valor), não informa nada; a projeção usa os limites (10 e 5).
- **Horas de estudo, dificuldade por docente:** não existem nos PDFs.

## 3. Definições das métricas

Todas usam o histórico e o currículo já parseados. `round1(n) = Math.round(n * 10) / 10 + 0` (o `+ 0` evita `-0`). `round2` como em `insights.ts`.

### 3.1 `timelineInsights(c, t, forecast?)`

| Campo | Definição |
|---|---|
| `admissionTerm` | `t.admissionTerm` |
| `currentTerm` | último termo do histórico (`latestTerm`) |
| `currentPeriod` | períodos entre ingresso e o termo atual, ambos incluídos (`pace.termsElapsed`); `null` sem ingresso |
| `maxTerm` | `addTerms(admissionTerm, maxPeriods - 1)`; `null` sem ingresso |
| `usedPercent` | `currentPeriod / maxPeriods` em %, capado em 100; `null` sem ingresso |
| `forecastTerm` | `forecast.graduationTerm` (caminho das obrigatórias) |
| `forecastSlack` | `termIndex(maxTerm) - termIndex(forecastTerm)`; negativo = além do limite |
| `paceTerm` | formatura estimada pelo ritmo: `addTerms(currentTerm, ceil(remainingHours / avgHoursPerTerm))` |
| `pacePeriods` | o `ceil` acima; `0` quando nada falta |
| `paceSlack` | igual a `forecastSlack`, para `paceTerm` |

Regras: `paceTerm`/`pacePeriods` são `null` quando `completedTerms === 0` ou `avgHoursPerTerm <= 0`; `pacePeriods = 0` quando `remainingHours === 0` (nada falta). O ritmo usa horas médias por período concluído, então é uma estimativa — a UI diz "no seu ritmo médio".

### 3.2 `milestoneInsights(c, t)`

Próxima meta da escada `[25, 50, 75, 90, 100]` acima do percentual exibido (`officialPercent ?? percent`, o mesmo do MarkerBand). `hoursLeft = ceil(((target - percent) / 100) * requiredHours)`; `term` pelo ritmo médio (ou `null` sem ritmo). Retorna `null` quando o percentual já é 100.

### 3.3 `inProgressInsights(c, t)`

Entradas com status `matriculado` (fora o ENADE): `courses`, `hours` (soma de `hours`) e `percentIfApproved = min(100, round2(base + round2((hours / requiredHours) * 100)))`, onde `base = officialPercent ?? percent`. `null` quando não há disciplinas em curso. O duplo arredondamento é intencional: mantém o número determinístico sobre a base exibida.

### 3.4 `pendingInsights(c, t)`

- `mandatoryTotal` / `mandatoryRemaining`: obrigatórias fora o ENADE, no currículo / sem entrada concluída (inclui em curso).
- `mandatoryInProgress`: das restantes, com `matriculado`.
- `mandatoryHoursLeft`: soma de `hours.total` do currículo das restantes.
- `available` / `blocked`: restantes com pré-requisitos satisfeitos contando concluídas **e em curso** / as demais.
- `hours`: `{ optativa, eletiva, aacc, extensao }` = `max(0, requiredHours - rawHours)` de cada categoria (mesma base do `forecast.pendingHours`).
- `bottlenecks`: até 3 restantes com `unlocks > 0`, onde `unlocks = |dependentClosure(code) ∩ restantes|`, ordenado por `unlocks` desc, código asc.

### 3.5 `crProjectionInsights(c, t)`

Obrigatórias fora o ENADE sem entrada concluída (inclui em curso; horas da entrada quando existir, senão do currículo). `best` = todas as restantes com nota 10; `worst` = com nota 5 (`crScenarios`). `remainingCourses` e `remainingHours`. Números `null` quando não há notas para projetar. A tela mostra "Na formatura: entre pior e melhor" e só quando há disciplinas restantes.

### 3.6 `delayInsights(c, t)`

Para cada disciplina obrigatória (fora o ENADE) com `idealPeriod` e ao menos uma entrada "cursada" (`aprovado`, `disp_nota`, `reprovado_nota`, `reprovado_freq`), usa a **última** tentativa; `delta = termIndex(term) - termIndex(ingresso + idealPeriod - 1)`. Exclui `equivalencia`, `transf_real`, `disp` e `disp_calend` (não foram cursadas na UFAM e distorceriam a média). Campos: `courses`, `averageDelay` (round1), `onTime` (`delta <= 0`) e `onTimePercent` (round2). `null` sem `admissionTerm` ou sem disciplinas elegíveis.

### 3.7 `attemptInsights(t)`

Por código (fora o ENADE): `attempts` = entradas com `aprovado`/`disp_nota`/`reprovado_nota`/`reprovado_freq`; `approved` = alguma concluída; `retakingNow` = alguma `matriculado`. Só entram `attempts >= 2`, ordenado por "não aprovada" primeiro, depois tentativas desc, depois código.

### 3.8 `streakInsights(t)`

Termos julgados: termos com ao menos uma entrada em `aprovado`/`disp_nota`/`reprovado_nota`/`reprovado_freq` (ignora termos só com matrícula, trancamento, equivalência ou dispensa). `terms` = termos julgados mais recentes consecutivos sem reprovação; `lastFailureTerm` = termo mais recente com reprovação; `neverFailed` = nenhuma reprovação; `judgedTerms` = total de termos julgados (a UI não mostra nada quando é 0).

### 3.9 `gradeInsights(t)`

Notas de entradas que contam no CR e têm nota. `count`, `median` (média das duas centrais em contagem par, round2), `ninePlus` e `bands` nas faixas fixas `abaixo6` (< 6), `6a7`, `7a8`, `8a9`, `9a10`. `null` sem notas.

### 3.10 Extensões em `performanceInsights`

- `failedCredits`: soma de `credits` das entradas reprovadas.
- `crByCategory`: `{ optativa, eletiva, extensao }`, CR de cada categoria (`null` sem notas que contem).

### 3.11 Gráfico de horas

`hoursByTerm` ganha `inProgress` (horas `matriculado` do termo) e passa a incluir termos só com disciplinas em curso. `hoursAverage(rows)` = média inteira de `done + failed` dos termos com alguma dessas horas (o termo em curso não entra na média); `null` sem termos.

## 4. Colocação na tela

1. **MarkerBand** (existente): linha "Em curso: N disciplinas, X h. Se aprovar tudo: Y% do curso." e linha "Próxima meta: 75%. Faltam X h — no seu ritmo, até 2027/1.", mais um traço pontilhado discreto na posição da meta dentro da faixa.
2. **Resumo** extraído para `OverviewSummary`: o card do CR ganha "Na formatura: entre pior e melhor."; os demais cards ficam iguais.
3. **`TimelineBand`** (nova seção): trilha com Ingresso, Hoje, Previsão e Limite; sentença "Você está no 6º período de 8 ideais — 50,00% do prazo máximo de 12. As obrigatórias terminam em 2027/1. No seu ritmo médio, contando as horas fora das disciplinas, o curso fecha em 2028/1, com 3 períodos de folga até 2029/2." Alerta em `text-erro` com `TriangleAlert` quando o ritmo estoura o limite. Só renderiza com `maxTerm` (ingresso presente).
4. **`PendingSection`** (nova seção) depois da linha do tempo: "N obrigatórias (X h), M delas em curso."; "N já cumprem os pré-requisitos; M ainda bloqueadas."; "Fora delas: 180 h de optativas, 120 h de eletivas, …"; "As que mais seguram:" com até 3 gargalos ("Cálculo diferencial e integral I (IEM075) trava 5 disciplinas."); link "Montar o próximo semestre" para `#/planejamento`.
5. **PaceSection** ganha a linha de atraso: "Suas obrigatórias ficam, em média, 1,4 período depois do período ideal (65,00% no prazo ou antes)." Quando a média é ≤ 0: "…no período ideal ou antes".
6. **PerformanceSection** ganha: custo das reprovações ("Custo: 120 h e 8 créditos — o equivalente a 0,3 período no seu ritmo.", equivalência só quando ≥ 0,1), bloco "Mais de uma tentativa" (até 3), sequência ("Faz 1 período sem reprovar nenhuma disciplina." / "Última reprovação: 2025/2." / "Você nunca reprovou em uma disciplina."), comparação de categoria ("Você rende mais em eletivas (8,650) do que nas obrigatórias (7,751).", diferença > 0,1) e `GradeStrip` (mediana + faixas com contagem).
7. **HoursChart** ganha a barra "Em curso" e a linha de referência "sua média".

## 5. Convenções e acessibilidade

- Copy PT-BR, sentence case, sem "→", sem ALL-CAPS; números pelos helpers (`formatCr`, `formatHours`, `formatPercent`, `formatGrade`, `formatOneDecimal`, `pluralize`, `toTitleCase`).
- Status/números não dependem de cor: a trilha da linha do tempo é `aria-hidden` (os rótulos e a sentença carregam o sentido); as barras de notas têm rótulo e contagem visíveis; o alerta de prazo é ícone + texto.
- Motion: sem animação nova; `prefers-reduced-motion` continua valendo para a faixa e o fluxo.
- Cada métrica sem base (sem ingresso, sem notas, sem pendências) desaparece, nunca mostra zero enganoso.
- Novas funções de core são puras e testadas; a tela não calcula domínio.
