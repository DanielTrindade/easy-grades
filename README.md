# Easy Grades

O Easy Grades ajuda o estudante da UFAM a acompanhar o curso a partir de dois PDFs do e-Campus: o Currículo de Curso e o Histórico Escolar Analítico. Você envia os dois arquivos e recebe progresso, CR, fluxograma, sugestões para o próximo semestre e uma previsão de formatura.

## O que você vê

- **Progresso por carga horária:** percentual concluído do curso, em faixa esmeralda sobre uma grade de linhas finas (identidade Grafite), com o avanço por categoria (obrigatórias, optativas, eletivas, atividades complementares e extensão).
- **CR e CR por período:** coeficiente de rendimento acumulado e por semestre, calculado a partir das disciplinas do histórico.
- **Fluxograma interativo:** disciplinas obrigatórias em colunas por período ideal, com as ligações de pré-requisito. Cada disciplina mostra o status (concluída, em curso, reprovada, disponível ou bloqueada). Ao passar o cursor ou clicar, a cadeia de pré-requisitos é destacada. O fluxograma pode ser exportado em PNG.
- **Disciplinas:** tudo o que consta no histórico, com filtros por situação, categoria e busca, e agrupamento por período ou por categoria.
- **Planejamento:** sugestões para o próximo semestre, cada uma com o motivo. O catálogo filtra por sugeridas, obrigatórias, eletivas ou bloqueadas, e "Meu semestre" mostra o limite de créditos, as notas esperadas e o CR projetado com melhor e pior caso. Disciplinas com pré-requisito pendente ficam de fora da projeção, e o plano fica salvo neste navegador até você limpar os dados. "Desfazer" reverte remoções e a sugestão aplicada.
- **Previsão de formatura:** termo previsto de conclusão das obrigatórias e comparação com o máximo de períodos do curso.

## Privacidade

- O servidor lê os PDFs em memória, sem gravar nada em disco, e descarta os arquivos depois de responder. Os logs não registram conteúdo, nome de arquivo nem IP.
- Só campos acadêmicos saem do parser: código, nome, créditos, carga horária, notas, situações e períodos das disciplinas. Nome, matrícula, CPF, RG, filiação, data de nascimento, forma de ingresso e nomes de docentes nunca entram no resultado.
- O resultado fica só no IndexedDB do seu navegador. Nada é sincronizado entre dispositivos e não há login.
- O botão "Limpar dados" apaga tudo o que foi salvo neste navegador.
- Não há analytics nem scripts de terceiros. As fontes são servidas pelo próprio site.

## Como obter os PDFs no e-Campus

No e-Campus, gere dois relatórios em PDF:

1. **Currículo de Curso (por versão e situação)**, na versão que aparece no seu histórico.
2. **Histórico Escolar Analítico**.

A versão do currículo precisa ser a mesma indicada no histórico. Se não for, o site recusa os arquivos e mostra a divergência. Cada arquivo pode ter até 5 MB e 20 páginas.

## Como o CR é calculado

```
CR = Σ(nota × CH) / Σ CH      somando só as disciplinas com situação que conta
```

- O peso de cada disciplina é a carga horária (CH) do histórico.
- Contam: Aprovado, Disp Nota, TransfReal, reprovação por nota e reprovação por falta (Repro Freq).
- Não contam: Equivalência, Disp, Disp Calend, matriculado e trancado.
- O resultado é truncado em 3 casas decimais, sem arredondamento.

A fórmula foi calibrada para reproduzir o CR impresso pelo e-Campus. Entre as combinações de situações e pesos testadas, esta é a única que bate com um histórico real, e ela segue o Guia do Aluno da UFAM, que diz que qualquer reprovação, inclusive por falta, reduz o coeficiente.

Dois pontos ainda são **a confirmar**: a reprovação por falta sem nota é contada como 0, e o trancamento não entra no cálculo. Nenhum dos dois apareceu no histórico usado na calibração, então são regras conservadoras.

## Rodando localmente

### Requisitos

- Node.js 22.12 ou superior.
- pnpm 11. A versão está fixada no campo `packageManager` do `package.json`; com `corepack enable`, o pnpm certo é usado automaticamente.

### Comandos

```sh
pnpm install
pnpm dev
```

`pnpm dev` sobe a API em `http://localhost:3001` e o front em `http://localhost:5173`. O Vite encaminha `/api` para a API, então você só precisa abrir a porta 5173.

| Comando | O que faz |
| --- | --- |
| `pnpm test` | Roda os testes de todos os pacotes (Vitest). |
| `pnpm typecheck` | Checa os tipos de todos os pacotes. |
| `pnpm lint` | Roda o ESLint no repositório. |
| `pnpm build` | Gera o build do front e da API. |
| `pnpm --filter @easy-grades/web icons` | Regenera os ícones do app (PNG) a partir de `apps/web/brand/icon.svg`. |
| `pnpm react-doctor` | Analisa o front com react-doctor e falha em erros. |
| `pnpm react-doctor:changed` | Mesma análise, mostrando só os problemas novos em relação à `main`. |

Usamos `pnpm react-doctor` e não `pnpm doctor` porque `doctor` é o comando nativo do pnpm que verifica o ambiente, e ele teria precedência sobre um script com esse nome.

## Docker

```sh
docker build -t easy-grades .
docker run -p 8080:8080 easy-grades
```

Abra `http://localhost:8080`. A imagem serve o front e a API na mesma porta e roda com um usuário sem privilégios de root.

| Variável | Padrão na imagem | Uso |
| --- | --- | --- |
| `PORT` | `8080` | Porta HTTP. |
| `HOST` | `0.0.0.0` | Interface em que o servidor escuta. |
| `STATIC_DIR` | `/app/public` | Pasta com o build do front. |
| `TRUST_PROXY` | não definida | Use `true` apenas atrás de um proxy reverso, para que o limite por IP enxergue o cliente e não o proxy. |

O health check fica em `/api/health`.

## Arquitetura

Monorepo pnpm com três partes:

- `packages/core`: tipos, schemas zod e regras puras (status, CR, progresso, pré-requisitos, sugestões, previsão e layout do fluxograma). Usado pela API e pelo front.
- `apps/api`: Fastify 5, sem estado. Recebe os PDFs em `POST /api/parse`, extrai o texto e devolve o JSON validado.
- `apps/web`: Vite, React 19, Tailwind v4, shadcn/ui, Recharts para os gráficos e React Flow para o fluxograma.

A extração usa `pdfjs-dist` e lê a posição de cada texto (x e y), não a ordem em que ele aparece no arquivo, porque a ordem de leitura desalinha códigos e nomes. O parse roda num worker thread com timeout de 10 s, que consegue interromper a extração de fato.

A especificação e o plano ficam em `docs/superpowers/specs/2026-10-10-easy-grades-design.md` e `docs/superpowers/plans/2026-10-10-easy-grades.md`. As convenções de código, as regras de domínio e os detalhes de cada ferramenta estão em `CLAUDE.md`.

## Aplicativo instalável (PWA)

O Easy Grades pode ser instalado como app no celular e no computador, e o painel continua disponível sem conexão depois da primeira visita.

- **Instalar:** no Chrome e no Edge, use "Instalar app" no menu ou no cabeçalho. No iPhone e no iPad, o Safari não tem essa opção automática; o app mostra o passo a passo: toque em Compartilhar e depois em Adicionar à Tela de Início.
- **Offline:** o painel e os dados já salvos neste navegador funcionam sem conexão. Para ler PDFs novos é preciso estar online, porque a leitura acontece no servidor.
- **Atualizações:** quando uma nova versão é publicada, o app avisa com "Nova versão disponível". Nada é recarregado sem o seu botão "Atualizar".
- **Privacidade:** o service worker guarda só o próprio app (JavaScript, CSS, fontes e ícones). Respostas da API e PDFs nunca são guardados em cache.

## Testes e CI

Os testes usam dados fictícios. O fixture de `packages/core` é um aluno inventado sobre um currículo público, e os testes de parser geram PDFs sintéticos com pdf-lib, imitando o layout do e-Campus.

O teste com PDFs reais (`apps/api/test/real-pdfs.test.ts`) roda só na sua máquina. Para usá-lo, coloque `report.pdf` e `historico.pdf` na raiz do repositório ou aponte `REAL_PDF_DIR` para a pasta em que eles estão. Esses arquivos estão no `.gitignore` e nunca devem ser commitados. Sem os PDFs, o teste é pulado, e no CI ele sempre é pulado.

**CI** (`.github/workflows/ci.yml`, em pull requests e pushes para `main`): lint, typecheck, testes, react-doctor (falha em erros), build, `pnpm audit --prod --audit-level high` e gitleaks, que varre todo o histórico do git.

**CD** (`.github/workflows/cd.yml`): quando o CI termina com sucesso em um push para `main`, a imagem é construída uma vez e publicada no GitHub Container Registry (`ghcr.io/<dono>/<repo>`, tags `sha-<commit>` e `latest`). Em seguida, o job `deploy` (environment `production`, só aceita `main`) copia essa mesma imagem, pelo digest, para o Artifact Registry e a publica no Cloud Run, terminando com um teste de `/api/health`.

O GitHub se autentica no Google Cloud por Workload Identity Federation, sem chave guardada em lugar nenhum, e só um job da `main` neste repositório consegue esse acesso. A conta de deploy só pode publicar imagens e novas revisões do serviço; o app roda com uma conta sem permissões. Produção: https://easy-grades-951677258273.us-central1.run.app

## Limitações conhecidas

- Só funciona com o formato de PDF do e-Campus da UFAM. Outras universidades e outros formatos não são suportados.
- Validado com o currículo de Engenharia de Software (IE17), versão 2025/2. Outros cursos ou versões podem ter estrutura diferente e não foram testados.
- Só semestres 1 e 2 de cada ano. Outros períodos letivos não são suportados.
- Regras a confirmar: reprovação por falta sem nota (contada como 0) e trancamento (não conta).
- Horários de turmas e a oferta do semestre não estão nos PDFs. As sugestões não dizem se a disciplina será oferecida.
- A previsão de formatura é uma simulação. Optativas, eletivas, atividades complementares e extensão aparecem como horas pendentes, não como disciplinas agendadas.
- Limites de envio: até 5 MB e 20 páginas por PDF, 10 s de processamento e 10 envios por minuto por IP.
