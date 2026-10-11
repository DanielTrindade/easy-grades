# Easy Grades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A web platform where a UFAM student uploads the e-Campus "Currículo de Curso" and "Histórico Escolar Analítico" PDFs and gets:
- percentage complete and the list of courses taken;
- a course flowchart with real statuses;
- suggestions for next semester;
- a graduation forecast and a CR projection.

**Architecture:** pnpm monorepo, TypeScript strict, in three packages:
- `packages/core`: pure domain logic plus zod schemas, shared by everyone.
- `apps/api`: stateless Fastify server. It parses PDFs by x/y coordinates with pdfjs-dist and returns PII-free JSON.
- `apps/web`: Vite + React 19 + Tailwind v4 + shadcn/ui + shadcn charts + React Flow. It stores the parsed JSON in IndexedDB and computes all analytics in the browser.

**Tech Stack:**
- Node 22, pnpm 11, TypeScript ~5.9, Vitest 5, zod 4
- API: Fastify 5 (+ multipart, helmet, rate-limit, static), pdfjs-dist 6, pdf-lib (tests only)
- Web: Vite 8, React 19, Tailwind 4, shadcn/ui 4 (`radix-nova`), Recharts 3.8 (via shadcn chart), @xyflow/react 12, idb-keyval, html-to-image. Motion is pure CSS, with no animation library.
- Tooling: react-doctor 0.9.17, Docker, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-10-10-easy-grades-design.md`. Read it before starting any task.

## Global Constraints

- UI copy in **PT-BR**, sentence case. No ALL-CAPS labels, no `→` appended to buttons/links, no "A · B · C" middle-dot meta strings.
- **CR** = `Σ(nota × CH) / Σ CH` over statuses `aprovado, disp_nota, transf_real, reprovado_nota, reprovado_freq`, **truncated** to 3 decimals. `equivalencia` does NOT count. `reprovado_freq` with no grade counts as 0.
- **Progress** uses the transcript section's category and the transcript's CH. Entries in `outros`/`externa` don't count. Per-category hours are capped at the requirement.
- **Prerequisites:** `string[][]`. Same block = AND, different blocks = OR.
- **PII whitelist:** the API output must never contain student name, matrícula, CPF, RG, filiação, birth date, forma de ingresso, or docente names.
- **The server persists nothing:**
  - no disk writes;
  - logs carry no body, no filename, and no client IP;
  - PDF buffers live only for the request.
- **Upload limits:**
  - 2 files, 5 MB each;
  - field names `curriculo` and `historico`;
  - `%PDF-` magic bytes;
  - max 20 pages per PDF;
  - 10 s parse timeout;
  - 10 requests per minute per IP on `/api/parse`.
- **API errors:**
  - shape: `{ "error": { "code": ErrorCode, "message": string } }`;
  - never send a stack trace.
- **Frontend dependencies:** no third-party scripts, analytics, or CDNs. Fonts are self-hosted via `@fontsource-variable/*`.
- **Real PDFs:** never committed (`.gitignore` has `*.pdf`). Test PDFs are generated synthetically by tests.
- **pnpm 11 specifics:**
  - build scripts are allowed via `allowBuilds:` in `pnpm-workspace.yaml` (NOT `onlyBuiltDependencies`);
  - `pnpm deploy` needs `--legacy`.
- **pdfjs 6:**
  - import from `pdfjs-dist/legacy/build/pdf.mjs`;
  - pass a `Uint8Array`, never a Node `Buffer`;
  - destroy the loading task, not the document;
  - use `disableFontFace: true, useSystemFonts: false, useWorkerFetch: false, enableXfa: false`. The `isEvalSupported` option no longer exists, because pdfjs 6 has no eval path.
- **Every branch touching `apps/web`:** run `pnpm react-doctor:changed` before review and fix every error it reports.
- **Branches:** one branch per group (listed in "Branches & review"), created from `main`. Commit after every task.
- **Verification:** every code block in this plan was executed in a scratch copy of this monorepo before the plan was written:
  - 109 tests pass and the real-PDF test passes;
  - react-doctor reports 0 errors;
  - `docker build` and `docker run` work;
  - actionlint, gitleaks and `pnpm audit --prod` are clean.
  Deviations should therefore be rare. If something fails, report it instead of improvising a different design.

## Review Focus

These are failure modes no task's happy-path tests cover. Each one has a pinning test inside the owning task (marked **[RF-n]**).

1. **[RF-1] Unknown status** (e.g. "Cancelado"): mapped to `desconhecido`, excluded from CR and progress, and shown with a warning. Never crashes. *(Task 2, Task 3)*
2. **[RF-2] Swapped files** (histórico uploaded in the currículo field): returns `NOT_CURRICULUM` (422), not 500. *(Task 11)*
3. **[RF-3] Corrupted or outdated IndexedDB data:** the app discards it and shows the upload screen, not a blank page. *(Task 12, Task 18)*
4. **[RF-4] Transcript code absent from the curriculum** (old code, external course): appears in the courses list and is ignored by flowchart and prerequisites without throwing. *(Task 5)*
5. **[RF-5] Student with all mandatory courses done or in progress:** the forecast returns the current or next term with zero remaining, and suggestions return an empty list without looping. *(Task 6)*

## Branches & review

| Branch | Tasks |
|---|---|
| `feat/scaffold` | 1 |
| `feat/core` | 2–7 |
| `feat/api` | 8–11 |
| `feat/web` | 12–18 |
| `feat/ci-cd` | 19 |
| `feat/polish` | 20 |

- Implementer subagents: **Haiku 5.5, effort high**.
- Reviewer subagent: **Opus 5.5, effort medium**. It reviews after every task and does a whole-branch review before the branch merges into `main` with `git merge --no-ff`.

## File Structure

```
easy-grades/
├─ package.json                 root scripts (dev/build/test/typecheck/lint/doctor)
├─ pnpm-workspace.yaml          workspaces + allowBuilds
├─ tsconfig.base.json           shared strict TS options
├─ eslint.config.js             flat config (TS + react-hooks)
├─ .prettierrc, .gitattributes   (LF everywhere: Dockerfile/YAML run on Linux)
├─ CLAUDE.md                    project memory: rules, CR evidence, workflow
├─ Dockerfile, .dockerignore
├─ .github/workflows/ci.yml, cd.yml
├─ packages/core/
│  ├─ package.json, tsconfig.json, vitest.config.ts
│  └─ src/
│     ├─ index.ts               barrel
│     ├─ schemas.ts             zod schemas + inferred types
│     ├─ errors.ts              ErrorCode list + PT-BR messages
│     ├─ terms.ts               '2025.1' helpers
│     ├─ status.ts              raw status → Status, predicates, labels
│     ├─ cr.ts                  computeCr, crByTerm, projectCr, crScenarios
│     ├─ progress.ts            computeProgress
│     ├─ prerequisites.ts       isSatisfied, courseStates, closures, unlock counts
│     ├─ suggestions.ts         rankCandidates, suggestNextTerm
│     ├─ forecast.ts            forecastGraduation
│     ├─ flowchart.ts           layoutFlowchart
│     └─ __fixtures__/sample.ts      fictional student on the real curriculum (exported as ./fixtures)
│     (tests: src/*.test.ts next to each module)
├─ apps/api/
│  ├─ package.json, tsconfig.json, tsup.config.ts, vitest.config.ts
│  ├─ src/
│  │  ├─ server.ts              entry: reads env, listens
│  │  ├─ app.ts                 buildApp(opts): plugins, error handler, static
│  │  ├─ errors.ts              ParseError + HTTP status map
│  │  ├─ routes/parse.ts        POST /api/parse
│  │  ├─ pdf/extract.ts         extractItems, groupRows, rowText, valueRightOf
│  │  ├─ parsers/curriculum.ts  parseCurriculum
│  │  ├─ parsers/transcript.ts  parseTranscript
│  │  └─ parsers/documents.ts   parseDocuments (both + mismatch check)
│  └─ test/
│     ├─ fixtures/build-pdf.ts           buildPdf(pages) with pdf-lib
│     ├─ fixtures/curriculum-fixture.ts  synthetic curriculum layout
│     ├─ fixtures/transcript-fixture.ts  synthetic transcript layout (fake PII)
│     ├─ extract.test.ts, curriculum.test.ts, transcript.test.ts, routes.test.ts
│     └─ real-pdfs.test.ts               skipped unless ../../historico.pdf exists
└─ apps/web/
   ├─ package.json, tsconfig.json, vite.config.ts, index.html, components.json, doctor.config.json
   └─ src/
      ├─ main.tsx, App.tsx, App.test.tsx, test-setup.ts
      ├─ styles/index.css                tokens (palette, type, motion, React Flow theming)
      ├─ components/ui/*                 shadcn generated (not hand-edited except the button motion patch)
      ├─ components/state-style.ts       CourseState → icon/colors
      ├─ components/StatusBadge.tsx, ClearDataButton.tsx, Dashboard.tsx
      ├─ lib/utils.ts (shadcn), api.ts, storage.ts, format.ts, use-hash-view.ts, use-analysis.ts (+ tests)
      ├─ features/upload/validate-pdf.ts, Dropzone.tsx, UploadScreen.tsx (+ test)
      ├─ features/overview/chart-utils.ts, WatersBand.tsx, CrChart.tsx, HoursChart.tsx, OverviewScreen.tsx
      ├─ features/flowchart/highlight.ts, CourseNode.tsx, FlowLegend.tsx, FlowchartList.tsx, FlowchartScreen.tsx (+ test)
      ├─ features/courses/filter-entries.ts, CoursesScreen.tsx
      └─ features/planning/planning-state.ts, ProjectionChart.tsx, PlanningScreen.tsx (+ test)
```

## Visual direction (decided with /frontend-design and /emil-design-eng; applies to Tasks 12–19)

**Subject:** a UFAM (Manaus) student mapping their path through the course. The identity comes from the **Encontro das Águas**, the meeting of the dark Rio Negro and the clay-colored Solimões in front of Manaus. Done work is dark water; the remaining path is clay water.

**Palette (CSS custom properties in `styles/index.css`):**

| Token | Light | Dark | Use |
|---|---|---|---|
| `--negro` | `#2B2118` | `#ECE4D8` | ink / text; completed water |
| `--solimoes` | `#C7A15A` | `#D4B072` | remaining, in progress |
| `--igapo` | `#2E5E4E` | `#6FA58F` | completed status |
| `--varzea` | `#EEF1EC` | `#191511` | page background |
| `--vitoria` | `#8FB57F` | `#9CC48C` | available status |
| `--urucum` | `#B4432A` | `#E07257` | failed, destructive |
| `--neblina` | `#A3ABA4` | `#5E655F` | blocked, muted |

**Type:**
- **Literata** (variable, `@fontsource-variable/literata`) for headings and the big numbers.
- **Hanken Grotesk** (variable, `@fontsource-variable/hanken-grotesk`) for UI and body. Use `font-variant-numeric: tabular-nums` for every number.
- Scale: 14 / 16 / 20 / 28 / 44 / 64 px. Body line-height 1.55, headings 1.1.

**Layout:**
- Left-aligned, content `max-w-6xl` with a 16 px gutter on mobile. The flowchart is full-bleed.
- Top bar: wordmark (Literata), nav tabs (underline indicator), and on the right "Novo upload" and "Limpar dados".

**Signature element:** the **WatersBand** on the overview. A wide 56 px band where dark `--negro` (completed hours) blends into `--solimoes` (remaining) through a soft 24 px gradient seam. The percentage sits above it in Literata 64 px, and the per-component breakdown sits below as plain text. Everything else stays quiet: no card grid of identical KPI boxes and no gradient washes.

**Status encoding:** always color + icon + text, never color alone. Icons from lucide:

| Status | Color | Icon |
|---|---|---|
| concluída | igapó | `CircleCheck` |
| em curso | solimões | `CircleDot` |
| disponível | vitória-régia outline | `CircleDashed` |
| bloqueada | neblina | `Lock` |
| reprovada | urucum | `CircleX` |

**Motion rules (Emil):**
- **Easing tokens:** `--ease-out: cubic-bezier(0.23,1,0.32,1)` and `--ease-in-out: cubic-bezier(0.77,0,0.175,1)`. Never use `ease-in` and never `transition: all`.
- **Duration:** UI transitions ≤ 250 ms.
- **Buttons:** `:active { transform: scale(0.97) }` with a 160 ms transition.
- **Tooltips:**
  - 125 ms;
  - Radix `TooltipProvider delayDuration={300} skipDelayDuration={300}`, so the next tooltip opens instantly;
  - origin-aware via `--radix-tooltip-content-transform-origin`.
- **Hover effects** gated behind `@media (hover:hover) and (pointer:fine)`.
- **Choreographed motion (rare):**
  - **WatersBand first reveal:** `clip-path: inset(0 100% 0 0)` → `inset(0)`, 900 ms `--ease-out`, played only once per stored dataset;
  - **flowchart column stagger:** 40 ms per column, opacity + `translateY(6px)`.
- **Keyboard navigation** in the flowchart is NOT animated.
- **`prefers-reduced-motion`:** remove all transforms and clip reveals; keep opacity/color changes ≤ 150 ms.

---

## Task 1: Monorepo scaffold, tooling and CLAUDE.md

**Branch:** `feat/scaffold` (create from `main`: `git checkout main && git checkout -b feat/scaffold`)

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc`, `.gitattributes`, `CLAUDE.md`
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/vitest.config.ts`, `packages/core/src/index.ts`, `packages/core/src/index.test.ts`

**Interfaces:**
- Produces: workspace package `@easy-grades/core`, whose `exports` points at `./src/index.ts` (TS source consumed directly by Vite, Vitest and tsup). Root scripts are `build`, `test`, `typecheck`, `lint`, `doctor`, `doctor:changed`.

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "easy-grades",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.18.0",
  "engines": { "node": ">=22.12" },
  "scripts": {
    "dev": "pnpm -r --parallel --if-present dev",
    "build": "pnpm -r --if-present build",
    "test": "pnpm -r --if-present test",
    "typecheck": "pnpm -r --if-present typecheck",
    "lint": "eslint .",
    "doctor": "react-doctor apps/web --verbose --blocking error --no-telemetry",
    "doctor:changed": "react-doctor apps/web --verbose --scope changed --base main --blocking error --no-telemetry"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.0",
    "eslint": "^9.39.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "globals": "^16.4.0",
    "prettier": "^3.6.0",
    "react-doctor": "0.9.17",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.46.0"
  }
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
allowBuilds:
  esbuild: true
```

- [ ] **Step 3: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

- [ ] **Step 4: Create `eslint.config.js` and `.prettierrc`**

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', 'apps/web/src/components/ui/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['apps/api/**/*.ts', 'packages/**/*.ts', '*.js'],
    languageOptions: { globals: globals.node },
  },
);
```

`.prettierrc`:

```json
{ "singleQuote": true, "semi": true, "printWidth": 110, "trailingComma": "all" }
```

`.gitattributes`, so files stay LF on Windows. The Dockerfile and workflows run on Linux.

```
* text=auto eol=lf
*.png binary
*.woff2 binary
```

- [ ] **Step 5: Create the `packages/core` skeleton**

`packages/core/package.json`:

```json
{
  "name": "@easy-grades/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "dependencies": { "zod": "^4.6.5" },
  "devDependencies": { "vitest": "^5.0.3" }
}
```

`packages/core/tsconfig.json`:

```json
{ "extends": "../../tsconfig.base.json", "include": ["src", "vitest.config.ts"] }
```

`packages/core/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['src/**/*.test.ts'] } });
```

`packages/core/src/index.ts`:

```ts
export const CORE_VERSION = '0.0.0';
```

`packages/core/src/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CORE_VERSION } from './index';

describe('core package', () => {
  it('is importable', () => {
    expect(CORE_VERSION).toBe('0.0.0');
  });
});
```

- [ ] **Step 6: Install and verify**

Run: `pnpm install`
Expected: completes with no `ERR_PNPM_IGNORED_BUILDS`.

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: 1 test passes. Typecheck and lint exit 0.

- [ ] **Step 7: Create `CLAUDE.md`**

````markdown
# Easy Grades — project memory

Platform for UFAM students: upload e-Campus "Currículo de Curso" + "Histórico Escolar Analítico" PDFs and get progress, a flowchart, suggestions, a forecast and a CR projection.
Spec: `docs/superpowers/specs/2026-10-10-easy-grades-design.md`. Plan: `docs/superpowers/plans/2026-10-10-easy-grades.md`.

## Architecture
- `packages/core`: pure TS domain logic + zod schemas. Shared by api and web. Exported as TS source (`exports: ./src/index.ts`).
- `apps/api`: Fastify 5, stateless. `POST /api/parse` (multipart `curriculo`, `historico`) returns `{ curriculum, transcript }`. Serves the web build in production.
- `apps/web`: Vite + React 19 + Tailwind v4 + shadcn/ui + shadcn charts + @xyflow/react. Parsed JSON lives in IndexedDB only.

## Commands
- `pnpm install` / `pnpm dev` (api :3001, web :5173 with /api proxy)
- `pnpm test` · `pnpm typecheck` · `pnpm lint` · `pnpm build`
- `pnpm react-doctor` (full react-doctor) · `pnpm react-doctor:changed` (only new issues vs main)
- `docker build -t easy-grades . && docker run -p 8080:8080 easy-grades`

## Domain rules (do not change without evidence)
- **CR** = Σ(nota × CH) / Σ CH over statuses aprovado, disp_nota, transf_real, reprovado_nota, reprovado_freq; **truncated** to 3 decimals. `equivalencia`, `disp`, `disp_calend`, `matriculado`, `trancado` do NOT count.
  - Evidence: on a real e-Campus histórico, this is the only combination (status set × weight) that reproduces the CR printed on the document. It matches the UFAM Guia do Aluno: "qualquer reprovação ainda que por falta baixará seu coeficiente". Checked locally by `apps/api/test/real-pdfs.test.ts` (parsed CR must equal the printed one) and pinned in CI by `packages/core/src/cr.test.ts` on the fictional sample history.
  - **To confirm:** `reprovado_freq` without a grade → counted as 0; `trancado` → not counted. Neither appeared in the real histórico used for calibration.
- **Progress:** hours from the transcript CH (not the curriculum), category from the transcript section. `outros`/`externa` don't count. Capped per category. Sample fixture: 2070/3200 = 64.69%.
- **Prerequisites:** `string[][]`; same BLOCO = AND, different BLOCOs = OR.
- **PDF parsing is coordinate-based.** In the curriculum, a course's first prerequisite is printed ~1.8pt above the course baseline and extra ones are stacked on the lines BELOW it. So a prerequisite belongs to the nearest course row at (≤3pt below) or above it on the same page. This was verified against the content-stream order of the real PDF: 117/117 courses match. In the transcript, everything above the "Situação do Aluno:" label on each page is the student header and is ignored, except the whitelisted Curso / Versão (Currículo) / Ano/Período Ingresso values.

## Security & privacy (hard rules)
- The parser output is whitelisted. Never add student name, matrícula, CPF, RG, filiação, birth date, forma de ingresso or docente names to any schema. `apps/api/test/transcript.test.ts` has a PII leak test; keep it.
- The server persists nothing: no disk writes, logs carry no body/filename/IP, buffers live only for the request.
- Real PDFs are never committed (`*.pdf` in .gitignore). Tests build synthetic PDFs with pdf-lib.
- No third-party scripts, CDNs or analytics in the web app; fonts self-hosted.

## Accounts (personal project — never the work identity)
- git identity is set **repo-locally**: `Daniel Trindade <danieloliveiratrindade@gmail.com>`. The machine's global git config is the WORK identity; never commit with it here and never change `git config --local`.
- GitHub: this is a personal project. Before creating remotes or pushing, run `gh auth status` and make sure the active account is the owner's personal account.

## Workflow
- One branch per group from `main` (see plan "Branches & review"). Merge with `--no-ff` after the whole-branch review.
- Implementation: subagents on **Haiku 5.5 (effort high)**; review: subagent on **Opus 5.5 (effort medium)** after each task and per branch.
- **Every branch touching `apps/web`: run `pnpm react-doctor:changed` and fix every error before requesting review.** CI runs `pnpm react-doctor` with `--blocking error`.
- TDD: failing test first. Commit per task.

## Gotchas
- pnpm 11: `allowBuilds:` in pnpm-workspace.yaml (not `onlyBuiltDependencies`); `pnpm deploy` requires `--legacy`.
- pdfjs-dist 6: import `pdfjs-dist/legacy/build/pdf.mjs`; pass `Uint8Array` (not Buffer); destroy the loading task (`task.destroy()`), not the doc; options `disableFontFace, useSystemFonts:false, useWorkerFetch:false, enableXfa:false` (`isEvalSupported` was removed in v6).
- Windows: keep the repo at a short path; pnpm's nested store can exceed MAX_PATH (260 chars) and break Vitest startup with `ERR_PACKAGE_IMPORT_NOT_DEFINED`.
- `react-doctor` always with `--no-telemetry` (otherwise it sends the score to an external API).
````

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm monorepo, core package and CLAUDE.md"
```

Review, then `git checkout main && git merge --no-ff feat/scaffold -m "Merge feat/scaffold"`.

---

## Task 2: Core schemas, error codes, terms and status mapping

**Branch:** `feat/core` (create from `main` after `feat/scaffold` is merged)

**Files:**
- Create: `packages/core/src/schemas.ts`, `errors.ts`, `terms.ts`, `status.ts`
- Create: `packages/core/src/terms.test.ts`, `status.test.ts`, `schemas.test.ts`
- Modify: `packages/core/src/index.ts` (replace content with the barrel)
- Delete: `packages/core/src/index.test.ts`

**Interfaces:**
- Produces (all exported from `@easy-grades/core`):
  - Constants: `CATEGORIES`, `STATUSES`, `REQUIREMENT_KEYS`, `ERROR_CODES`, `ERROR_MESSAGES`
  - Schemas: `CategorySchema`, `StatusSchema`, `CurriculumCourseSchema`, `CurriculumSchema`, `TranscriptEntrySchema`, `PendingCourseSchema`, `TranscriptSchema`, `ParseResponseSchema`, `ErrorResponseSchema`
  - Types: `Category`, `Status`, `CurriculumCourse`, `Curriculum`, `TranscriptEntry`, `PendingCourse`, `Transcript`, `ParseResponse`, `ErrorCode`, `RequirementKey`
  - Terms: `termFromLabel(label: string): string | null`, `termFromAdmission(label: string): string | null`, `termIndex(term: string): number`, `compareTerms(a: string, b: string): number`, `nextTerm(term: string): string`, `addTerms(term: string, n: number): string`, `formatTerm(term: string): string`
  - Status: `mapStatus(raw: string): Status`, `isCompleted(s: Status): boolean`, `countsInCr(s)`, `isFailed(s)`, `isInProgress(s)`, `STATUS_LABELS: Record<Status, string>`

- [ ] **Step 1: Write failing tests**

`packages/core/src/terms.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { addTerms, compareTerms, formatTerm, nextTerm, termFromAdmission, termFromLabel, termIndex } from './terms';

describe('terms', () => {
  it('parses "Periodo" labels from the transcript', () => {
    expect(termFromLabel('Periodo: 1° Semestre de 2024')).toBe('2024.1');
    expect(termFromLabel('Periodo: 2º Semestre de 2026')).toBe('2026.2');
    expect(termFromLabel('Periodo: qualquer coisa')).toBeNull();
  });
  it('parses the admission label', () => {
    expect(termFromAdmission('2024/1° Semestre')).toBe('2024.1');
    expect(termFromAdmission('sem data')).toBeNull();
  });
  it('orders and advances terms', () => {
    expect(termIndex('2024.2') - termIndex('2024.1')).toBe(1);
    expect(compareTerms('2025.1', '2024.2')).toBeGreaterThan(0);
    expect(nextTerm('2024.1')).toBe('2024.2');
    expect(nextTerm('2024.2')).toBe('2025.1');
    expect(addTerms('2024.1', 11)).toBe('2029.2');
    expect(formatTerm('2025.1')).toBe('2025/1');
  });
});
```

`packages/core/src/status.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { countsInCr, isCompleted, isFailed, isInProgress, mapStatus } from './status';

describe('mapStatus', () => {
  it.each([
    ['Aprovado', 'aprovado'],
    ['Disp Nota', 'disp_nota'],
    ['Equivalenc', 'equivalencia'],
    ['TransfReal', 'transf_real'],
    ['DispCalend', 'disp_calend'],
    ['Disp', 'disp'],
    ['Matricula', 'matriculado'],
    ['Repro Nota', 'reprovado_nota'],
    ['Repro Freq', 'reprovado_freq'],
    ['Trancado', 'trancado'],
  ])('maps %s', (raw, expected) => {
    expect(mapStatus(raw)).toBe(expected);
  });

  it('[RF-1] maps unknown statuses to desconhecido', () => {
    expect(mapStatus('Cancelado')).toBe('desconhecido');
    expect(mapStatus('')).toBe('desconhecido');
  });

  it('classifies statuses', () => {
    expect(isCompleted('equivalencia')).toBe(true);
    expect(countsInCr('equivalencia')).toBe(false);
    expect(countsInCr('reprovado_nota')).toBe(true);
    expect(isFailed('reprovado_freq')).toBe(true);
    expect(isInProgress('matriculado')).toBe(true);
    expect(isCompleted('desconhecido')).toBe(false);
    expect(countsInCr('desconhecido')).toBe(false);
  });
});
```

`packages/core/src/schemas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TranscriptEntrySchema, TranscriptSchema } from './schemas';

const entry = {
  code: 'ICC001', name: 'INTRODUÇÃO À COMPUTAÇÃO', category: 'obrigatoria', term: '2025.1',
  credits: 5, hours: 90, grade: 9.5, status: 'equivalencia', rawStatus: 'Equivalenc',
};

describe('schemas', () => {
  it('accepts a valid entry and ENADE-style codes', () => {
    expect(TranscriptEntrySchema.parse(entry)).toEqual(entry);
    expect(
      TranscriptEntrySchema.parse({ ...entry, code: 'ENADE01', credits: null, hours: null, grade: null }).code,
    ).toBe('ENADE01');
  });
  it('rejects grades outside 0..10 and bad terms', () => {
    expect(() => TranscriptEntrySchema.parse({ ...entry, grade: 11 })).toThrow();
    expect(() => TranscriptEntrySchema.parse({ ...entry, term: '2025-1' })).toThrow();
  });
  it('strips unknown keys (PII can never pass through the schema)', () => {
    const parsed = TranscriptSchema.parse({
      courseCode: 'IE17', curriculumVersion: '2025/2', admissionTerm: '2024.1', officialCr: 7.757,
      officialProgressPercent: 64.69, aaccDoneHours: 0, extensaoDoneHours: 0, entries: [entry], pending: [],
      cpf: '123.456.789-00', studentName: 'FULANO',
    });
    expect(JSON.stringify(parsed)).not.toContain('123.456.789-00');
    expect(JSON.stringify(parsed)).not.toContain('FULANO');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @easy-grades/core test`
Expected: FAIL. Cannot resolve `./terms`, `./status`, `./schemas`.

- [ ] **Step 3: Implement `schemas.ts`**

```ts
import { z } from 'zod';

export const CATEGORIES = ['obrigatoria', 'optativa', 'eletiva', 'extensao', 'outros', 'externa'] as const;
export const CategorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategorySchema>;

export const STATUSES = [
  'aprovado', 'disp_nota', 'equivalencia', 'transf_real', 'disp_calend', 'disp',
  'matriculado', 'reprovado_nota', 'reprovado_freq', 'trancado', 'desconhecido',
] as const;
export const StatusSchema = z.enum(STATUSES);
export type Status = z.infer<typeof StatusSchema>;

const CodeSchema = z.string().regex(/^[A-Z]{2,7}\d{2,3}$/);
const TermSchema = z.string().regex(/^\d{4}\.[12]$/);
const NameSchema = z.string().min(1).max(200);
const Int = z.number().int().min(0);

export const CurriculumCourseSchema = z.object({
  code: CodeSchema,
  name: NameSchema,
  category: CategorySchema,
  idealPeriod: z.number().int().min(1).max(20).nullable(),
  credits: Int,
  hours: z.object({ theory: Int, practice: Int, extension: Int, total: Int }),
  prerequisites: z.array(z.array(CodeSchema).min(1)),
});
export type CurriculumCourse = z.infer<typeof CurriculumCourseSchema>;

const RequirementSchema = z.object({ hours: Int, credits: Int });
export const REQUIREMENT_KEYS = ['obrigatoria', 'optativa', 'eletiva', 'aacc', 'extensao'] as const;
export type RequirementKey = (typeof REQUIREMENT_KEYS)[number];

export const CurriculumSchema = z.object({
  courseCode: z.string().regex(/^[A-Z0-9]{2,8}$/),
  courseName: z.string().max(200),
  version: z.string().regex(/^\d{4}\/\d$/),
  courses: z.array(CurriculumCourseSchema),
  requirements: z.object({
    totalHours: Int,
    totalCredits: Int,
    byCategory: z.object({
      obrigatoria: RequirementSchema,
      optativa: RequirementSchema,
      eletiva: RequirementSchema,
      aacc: RequirementSchema,
      extensao: RequirementSchema,
    }),
    minPeriods: Int,
    maxPeriods: Int,
    minCreditsPerPeriod: Int,
    maxCreditsPerPeriod: Int.nullable(),
  }),
});
export type Curriculum = z.infer<typeof CurriculumSchema>;

export const TranscriptEntrySchema = z.object({
  code: CodeSchema,
  name: NameSchema,
  category: CategorySchema,
  term: TermSchema,
  credits: Int.nullable(),
  hours: Int.nullable(),
  grade: z.number().min(0).max(10).nullable(),
  status: StatusSchema,
  rawStatus: z.string().max(40),
});
export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;

export const PendingCourseSchema = z.object({
  code: CodeSchema,
  name: NameSchema,
  idealPeriod: z.number().int().min(1).max(20).nullable(),
});
export type PendingCourse = z.infer<typeof PendingCourseSchema>;

export const TranscriptSchema = z.object({
  courseCode: z.string().regex(/^[A-Z0-9]{2,8}$/),
  curriculumVersion: z.string().regex(/^\d{4}\/\d$/),
  admissionTerm: TermSchema.nullable(),
  officialCr: z.number().min(0).max(10).nullable(),
  officialProgressPercent: z.number().min(0).max(100).nullable(),
  aaccDoneHours: Int.nullable(),
  extensaoDoneHours: Int.nullable(),
  entries: z.array(TranscriptEntrySchema),
  pending: z.array(PendingCourseSchema),
});
export type Transcript = z.infer<typeof TranscriptSchema>;

export const ParseResponseSchema = z.object({ curriculum: CurriculumSchema, transcript: TranscriptSchema });
export type ParseResponse = z.infer<typeof ParseResponseSchema>;
```

- [ ] **Step 4: Implement `errors.ts`**

```ts
import { z } from 'zod';

export const ERROR_CODES = [
  'INVALID_UPLOAD', 'MISSING_FILE', 'INVALID_PDF', 'TOO_LARGE', 'TOO_MANY_PAGES', 'NOT_CURRICULUM',
  'NOT_TRANSCRIPT', 'CURRICULUM_MISMATCH', 'PARSE_TIMEOUT', 'RATE_LIMITED', 'NOT_FOUND', 'INTERNAL',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  INVALID_UPLOAD: 'Envio inválido. Selecione os dois PDFs e tente de novo.',
  MISSING_FILE: 'Falta um dos arquivos. Envie o currículo e o histórico.',
  INVALID_PDF: 'Um dos arquivos não é um PDF válido.',
  TOO_LARGE: 'Arquivo grande demais. O limite é 5 MB por PDF.',
  TOO_MANY_PAGES: 'Esse PDF tem páginas demais para ser um currículo ou histórico do e-Campus.',
  NOT_CURRICULUM: 'O arquivo do currículo não parece ser um "Currículo de Curso" do e-Campus.',
  NOT_TRANSCRIPT: 'O arquivo do histórico não parece ser um "Histórico Escolar Analítico" do e-Campus.',
  CURRICULUM_MISMATCH:
    'O histórico e o currículo são de cursos ou versões diferentes. Baixe o currículo da versão indicada no seu histórico.',
  PARSE_TIMEOUT: 'A leitura do PDF demorou demais. Confira se enviou o arquivo certo.',
  RATE_LIMITED: 'Muitas tentativas em pouco tempo. Aguarde um minuto e tente de novo.',
  NOT_FOUND: 'Endereço não encontrado.',
  INTERNAL: 'Não foi possível ler os arquivos agora. Tente de novo em instantes.',
};

export const ErrorResponseSchema = z.object({
  error: z.object({ code: z.enum(ERROR_CODES), message: z.string() }),
});
```

- [ ] **Step 5: Implement `terms.ts`**

```ts
/** Terms are 'YYYY.S' strings, S ∈ {1,2}. */
export function termFromLabel(label: string): string | null {
  const m = /(\d)\s*[°º]?\s*Semestre\s+de\s+(\d{4})/i.exec(label);
  return m ? `${m[2]}.${m[1]}` : null;
}

export function termFromAdmission(label: string): string | null {
  const m = /(\d{4})\s*\/\s*(\d)/.exec(label);
  return m ? `${m[1]}.${m[2]}` : null;
}

export function termIndex(term: string): number {
  const [year, sem] = term.split('.');
  return Number(year) * 2 + Number(sem) - 1;
}

function fromIndex(index: number): string {
  return `${Math.floor(index / 2)}.${(index % 2) + 1}`;
}

export function compareTerms(a: string, b: string): number {
  return termIndex(a) - termIndex(b);
}

export function nextTerm(term: string): string {
  return fromIndex(termIndex(term) + 1);
}

export function addTerms(term: string, n: number): string {
  return fromIndex(termIndex(term) + n);
}

export function formatTerm(term: string): string {
  return term.replace('.', '/');
}
```

- [ ] **Step 6: Implement `status.ts`**

```ts
import type { Status } from './schemas';

const RAW_TO_STATUS: Record<string, Status> = {
  aprovado: 'aprovado',
  dispnota: 'disp_nota',
  equivalenc: 'equivalencia',
  equivalencia: 'equivalencia',
  transfreal: 'transf_real',
  dispcalend: 'disp_calend',
  disp: 'disp',
  matricula: 'matriculado',
  matriculado: 'matriculado',
  repronota: 'reprovado_nota',
  reprofreq: 'reprovado_freq',
  trancado: 'trancado',
  tranc: 'trancado',
};

function normalize(raw: string): string {
  return raw.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z]/gi, '').toLowerCase();
}

export function mapStatus(raw: string): Status {
  return RAW_TO_STATUS[normalize(raw)] ?? 'desconhecido';
}

const COMPLETED = new Set<Status>(['aprovado', 'disp_nota', 'equivalencia', 'transf_real', 'disp_calend', 'disp']);
const IN_CR = new Set<Status>(['aprovado', 'disp_nota', 'transf_real', 'reprovado_nota', 'reprovado_freq']);
const FAILED = new Set<Status>(['reprovado_nota', 'reprovado_freq']);

export const isCompleted = (s: Status): boolean => COMPLETED.has(s);
export const countsInCr = (s: Status): boolean => IN_CR.has(s);
export const isFailed = (s: Status): boolean => FAILED.has(s);
export const isInProgress = (s: Status): boolean => s === 'matriculado';

export const STATUS_LABELS: Record<Status, string> = {
  aprovado: 'Aprovado',
  disp_nota: 'Dispensa com nota',
  equivalencia: 'Equivalência',
  transf_real: 'Transferência',
  disp_calend: 'Dispensa (calendário)',
  disp: 'Dispensa',
  matriculado: 'Matriculado',
  reprovado_nota: 'Reprovado por nota',
  reprovado_freq: 'Reprovado por falta',
  trancado: 'Trancado',
  desconhecido: 'Situação não reconhecida',
};
```

- [ ] **Step 7: Replace `index.ts` with the barrel and delete the placeholder test**

```ts
export * from './schemas';
export * from './errors';
export * from './terms';
export * from './status';
```

Run: `git rm packages/core/src/index.test.ts`

- [ ] **Step 8: Run tests and typecheck**

Run: `pnpm --filter @easy-grades/core test && pnpm --filter @easy-grades/core typecheck`
Expected: all tests in terms/status/schemas PASS, and typecheck exits 0.

- [ ] **Step 9: Commit**

```bash
git add -A packages/core
git commit -m "feat(core): domain schemas, error codes, term and status helpers"
```

---

## Task 3: CR calculation (with the sample fixture)

**Files:**
- Create: `packages/core/src/__fixtures__/sample.ts`
- Create: `packages/core/src/cr.ts`, `packages/core/src/cr.test.ts`
- Modify: `packages/core/src/index.ts` (add `export * from './cr';`)

**Interfaces:**
- Consumes: `Transcript`, `Status`, `countsInCr`, `compareTerms`, `mapStatus`.
- Produces:
  - `truncate3(n: number): number`
  - `computeCr(items: readonly CrItem[]): number | null`
  - `crByTerm(t: Transcript): TermCr[]`
  - `projectCr(t: Transcript, planned: readonly PlannedGrade[]): number | null`
  - `crScenarios(t: Transcript, planned: readonly { code: string; hours: number }[]): { best: number | null; worst: number | null }`
  - Types: `CrItem = { grade: number | null; hours: number | null; status: Status }`, `TermCr = { term: string; termCr: number | null; cumulativeCr: number | null }`, `PlannedGrade = { code: string; hours: number; grade: number }`
  - The fixture exports `sampleCurriculum: Curriculum` and `sampleTranscript: Transcript`, reused by Tasks 4–7. It is NOT exported from the barrel.

- [ ] **Step 1: Create the fictional sample fixture**

This is a **fictional** student on the real, public IE17 2025/2 curriculum. The grades, external courses and optional-course codes are invented, so no real transcript data enters the repository (the real PDFs are only used by the local, git-ignored `real-pdfs.test.ts`). The curriculum covers every mandatory course plus a few electives, one extension activity and one optional course.

`packages/core/src/__fixtures__/sample.ts`:

```ts
/**
 * FICTIONAL student on the real (public) IE17 2025/2 curriculum. Grades, external courses and optional course
 * codes are invented; no real transcript data lives in this repository. The official CR/percent below are what
 * an e-Campus transcript for this fictional history would print (computed with the documented formula).
 */
import type { Category, Curriculum, CurriculumCourse, Transcript, TranscriptEntry } from '../schemas';
import { mapStatus } from '../status';

type C = [code: string, name: string, period: number | null, credits: number, theory: number, practice: number, extension: number, prereqs: string[][]];

function course(category: Category, [code, name, period, credits, theory, practice, extension, prereqs]: C): CurriculumCourse {
  return {
    code, name, category, idealPeriod: period, credits,
    hours: { theory, practice, extension, total: theory + practice + extension },
    prerequisites: prereqs,
  };
}

const mandatory: C[] = [
  ['ICC001', 'INTRODUÇÃO À COMPUTAÇÃO', 1, 5, 60, 30, 0, []],
  ['ICC112', 'TEXTOS ACADÊMICOS EM COMPUTAÇÃO', 1, 3, 30, 30, 0, []],
  ['ICC114', 'COMPUTAÇÃO E UNIVERSIDADE', 1, 4, 60, 0, 0, []],
  ['ICC120', 'MATEMÁTICA DISCRETA', 1, 4, 60, 0, 0, []],
  ['IEM075', 'CÁLCULO DIFERENCIAL E INTEGRAL I', 1, 4, 60, 0, 0, []],
  ['ICC002', 'ALGORITMOS E ESTRUTURA DE DADOS I', 2, 5, 60, 30, 0, [['ICC001']]],
  ['ICC040', 'LINGUAGENS FORMAIS E AUTÔMATOS', 2, 4, 60, 0, 0, [['ICC120']]],
  ['ICC107', 'METODOLOGIA CIENTÍFICA EM COMPUTAÇÃO', 2, 4, 60, 0, 0, []],
  ['ICC260', 'FUNDAMENTOS DE INTELIGÊNCIA ARTIFICIAL', 2, 4, 60, 0, 0, [['ICC120']]],
  ['IEM012', 'ÁLGEBRA LINEAR I', 2, 4, 60, 0, 0, []],
  ['IEM076', 'CÁLCULO DIFERENCIAL E INTEGRAL II', 2, 4, 60, 0, 0, [['IEM075']]],
  ['ICC003', 'ALGORITMOS E ESTRUTURAS DE DADOS II', 3, 5, 60, 30, 0, [['ICC002']]],
  ['ICC066', 'INTRODUÇÃO A ORGANIZAÇÃO DE COMPUTADORES', 3, 4, 60, 0, 0, []],
  ['ICC430', 'ENGENHARIA DE SOFTWARE I', 3, 4, 60, 0, 0, [['ICC001']]],
  ['IEE001', 'PROBABILIDADE E ESTATISTICA', 3, 4, 60, 0, 0, []],
  ['IEM022', 'ÁLGEBRA LINEAR II', 3, 4, 60, 0, 0, [['IEM012']]],
  ['ICC027', 'PROGRAMAÇÃO ORIENTADA A OBJETOS', 4, 3, 30, 30, 0, [['ICC002']]],
  ['ICC065', 'SISTEMAS OPERACIONAIS I', 4, 4, 60, 0, 0, [['ICC066']]],
  ['ICC205', 'INTRODUÇÃO A BANCO DE DADOS', 4, 4, 60, 0, 0, [['ICC003']]],
  ['ICC253', 'CIÊNCIA DE DADOS', 4, 3, 30, 30, 0, [['ICC002']]],
  ['ICC431', 'ENGENHARIA DE SOFTWARE II', 4, 4, 60, 0, 0, [['ICC430']]],
  ['ICC045', 'LINGUAGENS DE PROGRAMAÇÃO', 5, 4, 60, 0, 0, [['ICC003']]],
  ['ICC309', 'REDES DE COMPUTADORES', 5, 4, 60, 0, 0, [['ICC002']]],
  ['ICC404', 'GERÊNCIA DE PROJETOS', 5, 4, 60, 0, 0, [['ICC431']]],
  ['ICC408', 'VERIFICAÇÃO E VALIDAÇÃO DE SOFTWARE', 5, 4, 60, 0, 0, [['ICC430']]],
  ['ICC006', 'PROJETO E ANÁLISE DE ALGORITMOS', 6, 4, 60, 0, 0, [['ICC003']]],
  ['ICC330', 'FUNDAMENTOS DE CIBERSEGURANÇA E DESENVOLVIMENTO', 6, 4, 60, 0, 0, [['ICC003']]],
  ['ICC412', 'PROCESSO DE DESENVOLVIMENTO DE SOFTWARE', 6, 4, 60, 0, 0, [['ICC430']]],
  ['ICC417', 'GERÊNCIA DE CONFIGURAÇÃO', 6, 3, 30, 30, 0, [['ICC431']]],
  ['ICC007', 'PROGRAMAÇÃO PARA WEB', 7, 3, 30, 30, 0, [['ICC205']]],
  ['ICC406', 'INTERAÇÃO HUMANO-COMPUTADOR', 7, 4, 60, 0, 0, [['ICC430']]],
  ['ICC103', 'EMPREENDEDORISMO EM INFORMÁTICA', 8, 4, 60, 0, 0, []],
  ['ICC106', 'COMPUTAÇÃO, ÉTICA E SOCIEDADE', 8, 4, 60, 0, 0, []],
  ['ICC150', 'TRABALHO DE CONCLUSÃO DE CURSO', 8, 5, 0, 150, 0, [['ICC107', 'ICC431']]],
  ['ICC418', 'PROJETOS PRÁTICOS EM ENGENHARIA DE SOFTWARE', 8, 5, 0, 150, 0, [['ICC412']]],
  ['ENADE01', 'ENADE - INGRESSANTE', null, 0, 0, 0, 0, []],
  ['ENADE02', 'ENADE - CONCLUINTE', null, 0, 0, 0, 0, []],
];

const electives: C[] = [
  ['ICC004', 'ALGORITMOS E ESTRUTURA DE DADOS AVANÇADOS', null, 4, 60, 0, 0, []],
  ['ICC010', 'PROGRAMAÇÃO PARA WEB II', null, 4, 60, 0, 0, [['ICC007']]],
  ['ICC014', 'LABORATÓRIO DE PROGRAMAÇÃO AVANÇADA', null, 2, 0, 60, 0, [['ICC003']]],
];

const extension: C[] = [['ICC600', 'PRÁTICAS EXTENSIONISTAS EM COMPUTAÇÃO I', 7, 12, 0, 0, 180, [['ICC001']]]];
const optional: C[] = [['IHP123', 'LINGUA BRASILEIRA DE SINAIS B', null, 4, 60, 0, 0, []]];

export const sampleCurriculum: Curriculum = {
  courseCode: 'IE17',
  courseName: 'Engenharia de Software',
  version: '2025/2',
  courses: [
    ...mandatory.map((c) => course('obrigatoria', c)),
    ...electives.map((c) => course('eletiva', c)),
    ...extension.map((c) => course('extensao', c)),
    ...optional.map((c) => course('optativa', c)),
  ],
  requirements: {
    totalHours: 3200,
    totalCredits: 150,
    byCategory: {
      obrigatoria: { hours: 2370, credits: 140 },
      optativa: { hours: 180, credits: 6 },
      eletiva: { hours: 120, credits: 4 },
      aacc: { hours: 210, credits: 0 },
      extensao: { hours: 320, credits: 0 },
    },
    minPeriods: 8,
    maxPeriods: 12,
    minCreditsPerPeriod: 12,
    maxCreditsPerPeriod: 30,
  },
};

type E = [code: string, name: string, category: Category, term: string, credits: number | null, hours: number | null, grade: number | null, rawStatus: string];

const rawEntries: E[] = [
  ['ICC600', 'PRÁTICAS EXTENSIONISTAS EM COMPUTAÇÃO I', 'extensao', '2026.2', 12, 180, null, 'Matricula'],
  ['LNG101', 'INGLÊS INSTRUMENTAL', 'outros', '2024.1', 4, 60, 7.8, 'Disp Nota'],
  ['EXT101', 'INTRODUÇÃO À PROGRAMAÇÃO (OUTRA IES)', 'externa', '2024.1', 5, 90, 8.4, 'Aprovado'],
  ['EXT102', 'FUNDAMENTOS DE ENGENHARIA DE SOFTWARE (OUTRA IES)', 'externa', '2024.1', 4, 60, 7.25, 'Aprovado'],
  ['EXT103', 'LABORATÓRIO DE PROGRAMAÇÃO (OUTRA IES)', 'externa', '2024.2', 2, 60, 9.1, 'Aprovado'],
  ['EXT104', 'INFORMÁTICA E SOCIEDADE (OUTRA IES)', 'externa', '2025.1', 2, 30, 6.9, 'Aprovado'],
  ['ICC014', 'LABORATÓRIO DE PROGRAMAÇÃO AVANÇADA', 'eletiva', '2025.1', 2, 60, 8.65, 'Aprovado'],
  ['ENADE01', 'ENADE - INGRESSANTE', 'obrigatoria', '2024.1', null, null, null, 'DispCalend'],
  ['ICC002', 'ALGORITMOS E ESTRUTURA DE DADOS I', 'obrigatoria', '2024.1', 5, 90, 7.4, 'TransfReal'],
  ['ICC003', 'ALGORITMOS E ESTRUTURAS DE DADOS II', 'obrigatoria', '2024.1', 5, 90, 8.05, 'Disp Nota'],
  ['ICC120', 'MATEMÁTICA DISCRETA', 'obrigatoria', '2024.1', 4, 60, 6.7, 'Aprovado'],
  ['IEM012', 'ÁLGEBRA LINEAR I', 'obrigatoria', '2024.1', 4, 60, 9, 'Aprovado'],
  ['IEM022', 'ÁLGEBRA LINEAR II', 'obrigatoria', '2024.1', 4, 60, 8.8, 'TransfReal'],
  ['ICC205', 'INTRODUÇÃO A BANCO DE DADOS', 'obrigatoria', '2024.2', 4, 60, 7.15, 'Aprovado'],
  ['ICC406', 'INTERAÇÃO HUMANO-COMPUTADOR', 'obrigatoria', '2024.2', 4, 60, 8.9, 'Aprovado'],
  ['IEE001', 'PROBABILIDADE E ESTATISTICA', 'obrigatoria', '2024.2', 4, 60, 5.6, 'Disp Nota'],
  ['IEM075', 'CÁLCULO DIFERENCIAL E INTEGRAL I', 'obrigatoria', '2024.2', 4, 60, 6.35, 'Aprovado'],
  ['ICC001', 'INTRODUÇÃO À COMPUTAÇÃO', 'obrigatoria', '2025.1', 5, 90, 8.7, 'Equivalenc'],
  ['ICC007', 'PROGRAMAÇÃO PARA WEB', 'obrigatoria', '2025.1', 3, 60, 9.3, 'Aprovado'],
  ['ICC027', 'PROGRAMAÇÃO ORIENTADA A OBJETOS', 'obrigatoria', '2025.1', 3, 60, 7.9, 'Equivalenc'],
  ['ICC066', 'INTRODUÇÃO A ORGANIZAÇÃO DE COMPUTADORES', 'obrigatoria', '2025.1', 4, 60, 8.15, 'Aprovado'],
  ['ICC107', 'METODOLOGIA CIENTÍFICA EM COMPUTAÇÃO', 'obrigatoria', '2025.1', 4, 60, 9.4, 'Equivalenc'],
  ['ICC112', 'TEXTOS ACADÊMICOS EM COMPUTAÇÃO', 'obrigatoria', '2025.1', 3, 60, 7.6, 'Equivalenc'],
  ['ICC114', 'COMPUTAÇÃO E UNIVERSIDADE', 'obrigatoria', '2025.1', 4, 60, 8, 'Equivalenc'],
  ['ICC430', 'ENGENHARIA DE SOFTWARE I', 'obrigatoria', '2025.1', 4, 60, 8.25, 'Equivalenc'],
  ['IEM076', 'CÁLCULO DIFERENCIAL E INTEGRAL II', 'obrigatoria', '2025.1', 4, 60, 5.9, 'Disp Nota'],
  ['ICC040', 'LINGUAGENS FORMAIS E AUTÔMATOS', 'obrigatoria', '2025.2', 4, 60, 7.05, 'Disp Nota'],
  ['ICC065', 'SISTEMAS OPERACIONAIS I', 'obrigatoria', '2025.2', 4, 60, 6.8, 'Aprovado'],
  ['ICC106', 'COMPUTAÇÃO, ÉTICA E SOCIEDADE', 'obrigatoria', '2025.2', 4, 60, 9.2, 'Equivalenc'],
  ['ICC253', 'CIÊNCIA DE DADOS', 'obrigatoria', '2025.2', 3, 60, 8.45, 'Aprovado'],
  ['ICC260', 'FUNDAMENTOS DE INTELIGÊNCIA ARTIFICIAL', 'obrigatoria', '2025.2', 4, 60, 7.7, 'Aprovado'],
  ['ICC431', 'ENGENHARIA DE SOFTWARE II', 'obrigatoria', '2025.2', 4, 60, 8.6, 'Aprovado'],
  ['ICC045', 'LINGUAGENS DE PROGRAMAÇÃO', 'obrigatoria', '2026.1', 4, 60, 7.35, 'Aprovado'],
  ['ICC309', 'REDES DE COMPUTADORES', 'obrigatoria', '2026.1', 4, 60, 8.1, 'Aprovado'],
  ['ICC404', 'GERÊNCIA DE PROJETOS', 'obrigatoria', '2026.1', 4, 60, 9.05, 'Aprovado'],
  ['ICC408', 'VERIFICAÇÃO E VALIDAÇÃO DE SOFTWARE', 'obrigatoria', '2026.1', 4, 60, 7.85, 'Aprovado'],
  ['ICC417', 'GERÊNCIA DE CONFIGURAÇÃO', 'obrigatoria', '2026.1', 3, 60, 8.3, 'Aprovado'],
  ['ICC006', 'PROJETO E ANÁLISE DE ALGORITMOS', 'obrigatoria', '2026.2', 4, 60, null, 'Matricula'],
  ['ICC103', 'EMPREENDEDORISMO EM INFORMÁTICA', 'obrigatoria', '2026.2', 4, 60, null, 'Matricula'],
  ['ICC330', 'FUNDAMENTOS DE CIBERSEGURANÇA E DESENVOLVIMENTO SEGURO', 'obrigatoria', '2026.2', 4, 60, null, 'Matricula'],
  ['ICC412', 'PROCESSO DE DESENVOLVIMENTO DE SOFTWARE', 'obrigatoria', '2026.2', 4, 60, null, 'Matricula'],
  ['DO060', 'DISCIPLINA OPTATIVA - 60H', 'optativa', '2024.1', 4, 60, 9.5, 'Disp Nota'],
  ['OPT201', 'ECONOMIA BÁSICA', 'optativa', '2024.1', 4, 60, 8.2, 'Disp Nota'],
  ['DO060', 'DISCIPLINA OPTATIVA - 60H', 'optativa', '2024.2', 4, 60, 7.75, 'Disp Nota'],
  ['DO060', 'DISCIPLINA OPTATIVA - 60H', 'optativa', '2024.2', 4, 60, 8.95, 'Disp Nota'],
  ['DO060', 'DISCIPLINA OPTATIVA - 60H', 'optativa', '2024.2', 4, 60, 8.4, 'Disp Nota'],
  ['DO060', 'DISCIPLINA OPTATIVA - 60H', 'optativa', '2024.2', 4, 60, 9.65, 'Disp Nota'],
  ['OPT202', 'ADMINISTRAÇÃO GERAL', 'optativa', '2024.2', 4, 60, 3.9, 'Repro Nota'],
  ['ICC204', 'APRENDIZAGEM DE MÁQUINA E MINERAÇÃO DE DADOS', 'optativa', '2025.1', 4, 60, 7.1, 'Aprovado'],
  ['OPT203', 'GEOMETRIA ANALÍTICA', 'optativa', '2025.2', 4, 60, 4.2, 'Repro Nota'],
];

const entries: TranscriptEntry[] = rawEntries.map(([code, name, category, term, credits, hours, grade, rawStatus]) => ({
  code, name, category, term, credits, hours, grade, rawStatus, status: mapStatus(rawStatus),
}));

export const sampleTranscript: Transcript = {
  courseCode: 'IE17',
  curriculumVersion: '2025/2',
  admissionTerm: '2024.1',
  officialCr: 7.757,
  officialProgressPercent: 64.69,
  aaccDoneHours: 0,
  extensaoDoneHours: 0,
  entries,
  pending: [
    { code: 'ICC006', name: 'PROJETO E ANÁLISE DE ALGORITMOS', idealPeriod: 6 },
    { code: 'ICC330', name: 'FUNDAMENTOS DE CIBERSEGURANÇA E DESENVOLVIMENTO', idealPeriod: 6 },
    { code: 'ICC412', name: 'PROCESSO DE DESENVOLVIMENTO DE SOFTWARE', idealPeriod: 6 },
    { code: 'ICC103', name: 'EMPREENDEDORISMO EM INFORMÁTICA', idealPeriod: 8 },
    { code: 'ICC150', name: 'TRABALHO DE CONCLUSÃO DE CURSO', idealPeriod: 8 },
    { code: 'ICC418', name: 'PROJETOS PRÁTICOS EM ENGENHARIA DE SOFTWARE', idealPeriod: 8 },
    { code: 'ENADE02', name: 'ENADE - CONCLUINTE', idealPeriod: null },
  ],
};
```

- [ ] **Step 2: Write the failing test**

`packages/core/src/cr.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sampleTranscript } from './__fixtures__/sample';
import { computeCr, crByTerm, crScenarios, projectCr, truncate3 } from './cr';

describe('truncate3', () => {
  it('truncates instead of rounding', () => {
    expect(truncate3(7.4568)).toBe(7.456);
    expect(truncate3(7.9999)).toBe(7.999);
    expect(truncate3(7.456)).toBe(7.456);
  });
});

describe('computeCr', () => {
  it('reproduces the CR the e-Campus prints for the sample history (7.757)', () => {
    expect(computeCr(sampleTranscript.entries)).toBe(sampleTranscript.officialCr);
    expect(computeCr(sampleTranscript.entries)).toBe(7.757);
  });
  it('weights by hours, includes failures, excludes equivalência', () => {
    expect(
      computeCr([
        { grade: 10, hours: 60, status: 'aprovado' },
        { grade: 4, hours: 30, status: 'reprovado_nota' },
        { grade: 0, hours: 600, status: 'equivalencia' },
        { grade: null, hours: 60, status: 'matriculado' },
      ]),
    ).toBe(8);
  });
  it('counts reprovado_freq without grade as zero', () => {
    expect(
      computeCr([
        { grade: 10, hours: 60, status: 'aprovado' },
        { grade: null, hours: 60, status: 'reprovado_freq' },
      ]),
    ).toBe(5);
  });
  it('[RF-1] ignores unknown statuses', () => {
    expect(
      computeCr([
        { grade: 10, hours: 60, status: 'aprovado' },
        { grade: 0, hours: 60, status: 'desconhecido' },
      ]),
    ).toBe(10);
  });
  it('returns null when nothing counts', () => {
    expect(computeCr([])).toBeNull();
  });
});

describe('crByTerm', () => {
  it('returns chronologically sorted terms whose last cumulative CR is the official one', () => {
    const terms = crByTerm(sampleTranscript);
    expect(terms.map((t) => t.term)).toEqual(['2024.1', '2024.2', '2025.1', '2025.2', '2026.1']);
    expect(terms.at(-1)?.cumulativeCr).toBe(7.757);
  });
});

describe('projectCr / crScenarios', () => {
  it('adds planned grades with the same formula', () => {
    expect(projectCr(sampleTranscript, [])).toBe(7.757);
    expect(projectCr(sampleTranscript, [{ code: 'ICC006', hours: 60, grade: 10 }])!).toBeGreaterThan(7.757);
  });
  it('gives best > current > worst for planned courses', () => {
    const { best, worst } = crScenarios(sampleTranscript, [
      { code: 'ICC006', hours: 60 },
      { code: 'ICC412', hours: 60 },
    ]);
    expect(best!).toBeGreaterThan(7.757);
    expect(worst!).toBeLessThan(7.757);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @easy-grades/core test cr`
Expected: FAIL. Cannot resolve `./cr`.

- [ ] **Step 4: Implement `cr.ts`**

```ts
import type { Status, Transcript } from './schemas';
import { countsInCr } from './status';
import { compareTerms } from './terms';

export interface CrItem {
  grade: number | null;
  hours: number | null;
  status: Status;
}
export interface TermCr {
  term: string;
  termCr: number | null;
  cumulativeCr: number | null;
}
export interface PlannedGrade {
  code: string;
  hours: number;
  grade: number;
}

/** UFAM truncates the CR to 3 decimals (7.4568 → 7.456). The epsilon guards float noise like 7455.9999999. */
export function truncate3(n: number): number {
  return Math.trunc(n * 1000 + 1e-7) / 1000;
}

export function computeCr(items: readonly CrItem[]): number | null {
  let weighted = 0;
  let hours = 0;
  for (const item of items) {
    if (!countsInCr(item.status) || !item.hours) continue;
    const grade = item.grade ?? (item.status === 'reprovado_freq' ? 0 : null);
    if (grade === null) continue;
    weighted += grade * item.hours;
    hours += item.hours;
  }
  return hours === 0 ? null : truncate3(weighted / hours);
}

export function crByTerm(t: Transcript): TermCr[] {
  const terms = [...new Set(t.entries.filter((e) => countsInCr(e.status)).map((e) => e.term))].sort(compareTerms);
  return terms.map((term) => ({
    term,
    termCr: computeCr(t.entries.filter((e) => e.term === term)),
    cumulativeCr: computeCr(t.entries.filter((e) => compareTerms(e.term, term) <= 0)),
  }));
}

export function projectCr(t: Transcript, planned: readonly PlannedGrade[]): number | null {
  return computeCr([
    ...t.entries,
    ...planned.map((p) => ({ grade: p.grade, hours: p.hours, status: 'aprovado' as const })),
  ]);
}

export function crScenarios(
  t: Transcript,
  planned: readonly { code: string; hours: number }[],
): { best: number | null; worst: number | null } {
  return {
    best: projectCr(t, planned.map((p) => ({ ...p, grade: 10 }))),
    worst: projectCr(t, planned.map((p) => ({ ...p, grade: 5 }))),
  };
}
```

Add `export * from './cr';` to `index.ts`.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @easy-grades/core test`
Expected: PASS. If `computeCr(sampleTranscript.entries)` ≠ 7.757, do NOT change the formula: re-check the fixture rows against the spec's status table and report back.

- [ ] **Step 6: Commit**

```bash
git add packages/core
git commit -m "feat(core): CR calculation with hours weighting, failures included and truncation"
```

---

## Task 4: Progress by curricular component

**Files:**
- Create: `packages/core/src/progress.ts`, `packages/core/src/progress.test.ts`
- Modify: `packages/core/src/index.ts` (add `export * from './progress';`)

**Interfaces:**
- Consumes: `Curriculum`, `Transcript`, `RequirementKey`, `isCompleted`.
- Produces: `REQUIREMENT_LABELS: Record<RequirementKey, string>` and `computeProgress(c: Curriculum, t: Transcript): Progress`, where:

```ts
interface CategoryProgress { key: RequirementKey; label: string; requiredHours: number; doneHours: number /* capped */; rawHours: number; percent: number }
interface Progress { categories: CategoryProgress[]; requiredHours: number; doneHours: number; percent: number; officialPercent: number | null; divergent: boolean }
```

- [ ] **Step 1: Write the failing test**

`packages/core/src/progress.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sampleCurriculum, sampleTranscript } from './__fixtures__/sample';
import { computeProgress } from './progress';

describe('computeProgress', () => {
  const p = computeProgress(sampleCurriculum, sampleTranscript);
  const byKey = Object.fromEntries(p.categories.map((c) => [c.key, c]));

  it('matches the official 64.69% (2070/3200h)', () => {
    expect(p.doneHours).toBe(2070);
    expect(p.requiredHours).toBe(3200);
    expect(p.percent).toBe(64.69);
    expect(p.divergent).toBe(false);
  });

  it('uses transcript CH and caps per category', () => {
    expect(byKey.obrigatoria).toMatchObject({ rawHours: 1830, doneHours: 1830, requiredHours: 2370 });
    expect(byKey.optativa).toMatchObject({ rawHours: 420, doneHours: 180, percent: 100 });
    expect(byKey.eletiva).toMatchObject({ rawHours: 60, doneHours: 60, percent: 50 });
    expect(byKey.extensao).toMatchObject({ doneHours: 0 });
    expect(byKey.aacc).toMatchObject({ doneHours: 0, requiredHours: 210 });
  });

  it('flags divergence above 0.5 p.p. from the official percentage', () => {
    const q = computeProgress(sampleCurriculum, { ...sampleTranscript, officialProgressPercent: 70 });
    expect(q.divergent).toBe(true);
  });

  it('[RF-1] ignores entries with unknown status', () => {
    const extra = {
      ...sampleTranscript.entries[0]!,
      code: 'XXX999', category: 'obrigatoria' as const, status: 'desconhecido' as const, hours: 600,
    };
    const q = computeProgress(sampleCurriculum, { ...sampleTranscript, entries: [...sampleTranscript.entries, extra] });
    expect(q.doneHours).toBe(2070);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @easy-grades/core test progress`
Expected: FAIL. Cannot resolve `./progress`.

- [ ] **Step 3: Implement `progress.ts`**

```ts
import type { Curriculum, RequirementKey, Transcript } from './schemas';
import { isCompleted } from './status';

export interface CategoryProgress {
  key: RequirementKey;
  label: string;
  requiredHours: number;
  doneHours: number;
  rawHours: number;
  percent: number;
}
export interface Progress {
  categories: CategoryProgress[];
  requiredHours: number;
  doneHours: number;
  percent: number;
  officialPercent: number | null;
  divergent: boolean;
}

export const REQUIREMENT_LABELS: Record<RequirementKey, string> = {
  obrigatoria: 'Obrigatórias',
  optativa: 'Optativas',
  eletiva: 'Eletivas',
  aacc: 'Atividades complementares',
  extensao: 'Extensão',
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const pct = (done: number, required: number) => (required === 0 ? 100 : round2((done / required) * 100));

function completedHours(t: Transcript, category: 'obrigatoria' | 'optativa' | 'eletiva' | 'extensao'): number {
  return t.entries
    .filter((e) => e.category === category && isCompleted(e.status))
    .reduce((sum, e) => sum + (e.hours ?? 0), 0);
}

export function computeProgress(c: Curriculum, t: Transcript): Progress {
  const raw: Record<RequirementKey, number> = {
    obrigatoria: completedHours(t, 'obrigatoria'),
    optativa: completedHours(t, 'optativa'),
    eletiva: completedHours(t, 'eletiva'),
    extensao: Math.max(completedHours(t, 'extensao'), t.extensaoDoneHours ?? 0),
    aacc: t.aaccDoneHours ?? 0,
  };
  const keys: RequirementKey[] = ['obrigatoria', 'optativa', 'eletiva', 'aacc', 'extensao'];
  const categories = keys.map((key) => {
    const requiredHours = c.requirements.byCategory[key].hours;
    const doneHours = Math.min(raw[key], requiredHours);
    return { key, label: REQUIREMENT_LABELS[key], requiredHours, rawHours: raw[key], doneHours, percent: pct(doneHours, requiredHours) };
  });
  const doneHours = categories.reduce((s, x) => s + x.doneHours, 0);
  const requiredHours = c.requirements.totalHours;
  const percent = pct(doneHours, requiredHours);
  const officialPercent = t.officialProgressPercent;
  return {
    categories,
    requiredHours,
    doneHours,
    percent,
    officialPercent,
    divergent: officialPercent !== null && Math.abs(officialPercent - percent) > 0.5,
  };
}
```

Add `export * from './progress';` to `index.ts`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @easy-grades/core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat(core): progress by curricular component matching official percentage"
```

---

## Task 5: Prerequisites, course states and dependency closures

**Files:**
- Create: `packages/core/src/prerequisites.ts`, `packages/core/src/prerequisites.test.ts`
- Modify: `packages/core/src/index.ts` (add `export * from './prerequisites';`)

**Interfaces:**
- Consumes: `Curriculum`, `Transcript`, `isCompleted`, `isFailed`, `isInProgress`.
- Produces:
  - `type CourseState = 'concluida' | 'em_curso' | 'reprovada' | 'disponivel' | 'bloqueada'`
  - `completedCodes(t: Transcript): Set<string>`, `inProgressCodes(t): Set<string>`, `failedCodes(t): Set<string>`
  - `isSatisfied(prereqs: readonly (readonly string[])[], done: ReadonlySet<string>): boolean`
  - `courseStates(c: Curriculum, t: Transcript, opts?: { countInProgress?: boolean }): Map<string, CourseState>`
  - `dependentsMap(c: Curriculum): Map<string, string[]>`
  - `prerequisiteClosure(c: Curriculum, code: string): Set<string>`
  - `dependentClosure(c: Curriculum, code: string): Set<string>`
  - `unlockCount(c: Curriculum, code: string): number`
  - `COURSE_STATE_LABELS: Record<CourseState, string>`

- [ ] **Step 1: Write the failing test**

`packages/core/src/prerequisites.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sampleCurriculum as c, sampleTranscript as t } from './__fixtures__/sample';
import { courseStates, dependentClosure, isSatisfied, prerequisiteClosure, unlockCount } from './prerequisites';

describe('isSatisfied', () => {
  it('handles AND within a block and OR across blocks', () => {
    expect(isSatisfied([], new Set())).toBe(true);
    expect(isSatisfied([['A', 'B']], new Set(['A']))).toBe(false);
    expect(isSatisfied([['A', 'B']], new Set(['A', 'B']))).toBe(true);
    expect(isSatisfied([['A', 'B'], ['C']], new Set(['C']))).toBe(true);
  });
});

describe('courseStates', () => {
  it('derives states from the sample transcript', () => {
    const s = courseStates(c, t);
    expect(s.get('ICC001')).toBe('concluida');
    expect(s.get('ICC006')).toBe('em_curso');
    expect(s.get('ICC150')).toBe('disponivel');
    expect(s.get('ICC418')).toBe('bloqueada');
    expect(s.get('ICC010')).toBe('disponivel');
  });
  it('treats in-progress courses as done when asked', () => {
    expect(courseStates(c, t, { countInProgress: true }).get('ICC418')).toBe('disponivel');
  });
  it('marks failed-and-not-passed courses as reprovada', () => {
    const failed = { ...t.entries[0]!, code: 'IHP123', category: 'optativa' as const, status: 'reprovado_nota' as const, grade: 3 };
    expect(courseStates(c, { ...t, entries: [...t.entries, failed] }).get('IHP123')).toBe('reprovada');
  });
  it('[RF-4] ignores transcript codes that are not in the curriculum', () => {
    const s = courseStates(c, t);
    expect(s.has('ICC020')).toBe(false);
    expect(s.size).toBe(c.courses.length);
  });
});

describe('closures', () => {
  it('walks prerequisites backwards', () => {
    expect([...prerequisiteClosure(c, 'ICC418')].sort()).toEqual(['ICC001', 'ICC412', 'ICC430']);
    expect([...prerequisiteClosure(c, 'ICC150')].sort()).toEqual(['ICC001', 'ICC107', 'ICC430', 'ICC431']);
  });
  it('walks dependents forwards and counts unlocks', () => {
    expect([...dependentClosure(c, 'ICC430')].sort()).toEqual(['ICC150', 'ICC404', 'ICC406', 'ICC408', 'ICC412', 'ICC417', 'ICC418', 'ICC431']);
    expect(unlockCount(c, 'ICC430')).toBe(8);
    expect(unlockCount(c, 'ICC418')).toBe(0);
  });
  it('[RF-4] tolerates prerequisite codes missing from the curriculum', () => {
    const withGhost = { ...c, courses: [...c.courses, { ...c.courses[0]!, code: 'ICC999', prerequisites: [['ZZZ999']] }] };
    expect([...prerequisiteClosure(withGhost, 'ICC999')]).toEqual(['ZZZ999']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @easy-grades/core test prerequisites`
Expected: FAIL. Cannot resolve `./prerequisites`.

- [ ] **Step 3: Implement `prerequisites.ts`**

```ts
import type { Curriculum, Transcript } from './schemas';
import { isCompleted, isFailed, isInProgress } from './status';

export type CourseState = 'concluida' | 'em_curso' | 'reprovada' | 'disponivel' | 'bloqueada';

export const COURSE_STATE_LABELS: Record<CourseState, string> = {
  concluida: 'Concluída',
  em_curso: 'Em curso',
  reprovada: 'Reprovada',
  disponivel: 'Disponível',
  bloqueada: 'Bloqueada',
};

export const completedCodes = (t: Transcript): Set<string> =>
  new Set(t.entries.filter((e) => isCompleted(e.status)).map((e) => e.code));
export const inProgressCodes = (t: Transcript): Set<string> =>
  new Set(t.entries.filter((e) => isInProgress(e.status)).map((e) => e.code));
export const failedCodes = (t: Transcript): Set<string> =>
  new Set(t.entries.filter((e) => isFailed(e.status)).map((e) => e.code));

export function isSatisfied(prereqs: readonly (readonly string[])[], done: ReadonlySet<string>): boolean {
  return prereqs.length === 0 || prereqs.some((block) => block.every((code) => done.has(code)));
}

export function courseStates(
  c: Curriculum,
  t: Transcript,
  opts: { countInProgress?: boolean } = {},
): Map<string, CourseState> {
  const done = completedCodes(t);
  const inProgress = inProgressCodes(t);
  const failed = failedCodes(t);
  const effective = opts.countInProgress ? new Set([...done, ...inProgress]) : done;
  const states = new Map<string, CourseState>();
  for (const course of c.courses) {
    let state: CourseState;
    if (done.has(course.code)) state = 'concluida';
    else if (inProgress.has(course.code)) state = 'em_curso';
    else if (failed.has(course.code)) state = 'reprovada';
    else state = isSatisfied(course.prerequisites, effective) ? 'disponivel' : 'bloqueada';
    states.set(course.code, state);
  }
  return states;
}

export function dependentsMap(c: Curriculum): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const course of c.courses) {
    for (const code of new Set(course.prerequisites.flat())) {
      const list = map.get(code) ?? [];
      list.push(course.code);
      map.set(code, list);
    }
  }
  return map;
}

function walk(start: string, next: (code: string) => readonly string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...next(start)];
  while (stack.length > 0) {
    const code = stack.pop()!;
    if (seen.has(code) || code === start) continue;
    seen.add(code);
    stack.push(...next(code));
  }
  return seen;
}

export function prerequisiteClosure(c: Curriculum, code: string): Set<string> {
  const byCode = new Map(c.courses.map((course) => [course.code, course]));
  return walk(code, (x) => byCode.get(x)?.prerequisites.flat() ?? []);
}

export function dependentClosure(c: Curriculum, code: string): Set<string> {
  const dependents = dependentsMap(c);
  return walk(code, (x) => dependents.get(x) ?? []);
}

export function unlockCount(c: Curriculum, code: string): number {
  return dependentClosure(c, code).size;
}
```

Add `export * from './prerequisites';` to `index.ts`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @easy-grades/core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat(core): prerequisite evaluation, course states and dependency closures"
```

---

## Task 6: Next-term suggestions and graduation forecast

**Files:**
- Create: `packages/core/src/suggestions.ts`, `packages/core/src/suggestions.test.ts`
- Create: `packages/core/src/forecast.ts`, `packages/core/src/forecast.test.ts`
- Modify: `packages/core/src/index.ts` (add `export * from './suggestions';` and `export * from './forecast';`)

**Interfaces:**
- Consumes: `completedCodes`, `inProgressCodes`, `isSatisfied`, `dependentClosure`, `computeProgress`, `nextTerm`, `addTerms`, `compareTerms`. `Suggestion.unlocks` counts only mandatory/elective dependents (in the real curriculum, 7 optional courses require the TCC; counting them would rank the TCC wrongly).
- Produces:
  - `interface Suggestion { code: string; name: string; category: Category; credits: number; hours: number; idealPeriod: number | null; unlocks: number; reason: string }`
  - `interface SuggestOptions { countInProgress?: boolean /* default true */; includeElectives?: boolean /* default true */; maxCredits?: number; assumeDone?: ReadonlySet<string> }`
  - `rankCandidates(c: Curriculum, t: Transcript, opts?: SuggestOptions): Suggestion[]`
  - `suggestNextTerm(c: Curriculum, t: Transcript, opts?: SuggestOptions): Suggestion[]`
  - `latestTerm(t: Transcript): string | null`
  - `interface ForecastTerm { term: string; courses: Suggestion[]; credits: number }`
  - `interface Forecast { terms: ForecastTerm[]; graduationTerm: string | null; remainingTerms: number; maxTerm: string | null; exceedsMax: boolean; pendingHours: { optativa: number; eletiva: number; aacc: number; extensao: number }; unschedulable: string[] }`
  - `forecastGraduation(c: Curriculum, t: Transcript, opts?: { maxCredits?: number }): Forecast`

- [ ] **Step 1: Write the failing tests**

`packages/core/src/suggestions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sampleCurriculum as c, sampleTranscript as t } from './__fixtures__/sample';
import type { TranscriptEntry } from './schemas';
import { rankCandidates, suggestNextTerm } from './suggestions';

const passed = (code: string, category: TranscriptEntry['category'] = 'obrigatoria'): TranscriptEntry => ({
  code, name: code, category, term: '2027.1', credits: 4, hours: 60, grade: 9, status: 'aprovado', rawStatus: 'Aprovado',
});

describe('suggestNextTerm', () => {
  it('suggests the remaining mandatory courses first, then just enough electives', () => {
    expect(suggestNextTerm(c, t).map((s) => s.code)).toEqual(['ICC150', 'ICC418', 'ICC004']);
  });
  it('does not count in-progress courses as done when disabled', () => {
    expect(suggestNextTerm(c, t, { countInProgress: false }).map((s) => s.code)).toEqual(['ICC150', 'ICC004']);
  });
  it('respects the credit limit', () => {
    expect(suggestNextTerm(c, t, { maxCredits: 5 }).map((s) => s.code)).toEqual(['ICC150']);
  });
  it('explains each suggestion in plain Portuguese', () => {
    const [first] = suggestNextTerm(c, t);
    expect(first!.reason).toBe('Obrigatória, período ideal 8, não é pré-requisito de outras');
  });
  it('never suggests ENADE, extension or in-progress courses', () => {
    const codes = rankCandidates(c, t).map((s) => s.code);
    expect(codes).not.toContain('ENADE02');
    expect(codes).not.toContain('ICC600');
    expect(codes).not.toContain('ICC006');
  });
  it('[RF-5] returns an empty list when everything is done', () => {
    const done = { ...t, entries: [...t.entries, passed('ICC150'), passed('ICC418'), passed('ICC004', 'eletiva')] };
    expect(suggestNextTerm(c, done)).toEqual([]);
  });
});
```

`packages/core/src/forecast.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sampleCurriculum as c, sampleTranscript as t } from './__fixtures__/sample';
import { forecastGraduation } from './forecast';
import type { TranscriptEntry } from './schemas';

const passed = (code: string, term = '2027.1'): TranscriptEntry => ({
  code, name: code, category: 'obrigatoria', term, credits: 4, hours: 60, grade: 9, status: 'aprovado', rawStatus: 'Aprovado',
});

describe('forecastGraduation', () => {
  it('forecasts the sample student graduating in 2027.1', () => {
    const f = forecastGraduation(c, t);
    expect(f.terms.map((x) => x.term)).toEqual(['2027.1']);
    expect(f.terms[0]!.courses.map((x) => x.code)).toEqual(['ICC150', 'ICC418']);
    expect(f.graduationTerm).toBe('2027.1');
    expect(f.remainingTerms).toBe(1);
    expect(f.maxTerm).toBe('2029.2');
    expect(f.exceedsMax).toBe(false);
    expect(f.pendingHours).toEqual({ optativa: 0, eletiva: 60, aacc: 210, extensao: 320 });
    expect(f.unschedulable).toEqual([]);
  });

  it('schedules a beginner respecting prerequisites and the credit cap', () => {
    const beginner = { ...t, entries: [passed('ICC001', '2024.1')] };
    const f = forecastGraduation(c, beginner);
    const when = new Map<string, number>();
    f.terms.forEach((term, i) => term.courses.forEach((course) => when.set(course.code, i)));
    for (const course of c.courses.filter((x) => when.has(x.code))) {
      for (const pre of course.prerequisites.flat()) {
        if (pre === 'ICC001') continue;
        expect(when.get(pre)!).toBeLessThan(when.get(course.code)!);
      }
    }
    expect(Math.max(...f.terms.map((x) => x.credits))).toBeLessThanOrEqual(30);
    expect(f.terms[0]!.term).toBe('2024.2');
    expect(f.unschedulable).toEqual([]);
  });

  it('[RF-5] returns zero remaining terms when all mandatory courses are done or in progress', () => {
    const done = { ...t, entries: [...t.entries, passed('ICC150', '2026.2'), passed('ICC418', '2026.2')] };
    const f = forecastGraduation(c, done);
    expect(f.terms).toEqual([]);
    expect(f.remainingTerms).toBe(0);
    expect(f.graduationTerm).toBe('2026.2');
  });

  it('stops and reports courses whose prerequisites can never be met', () => {
    const ghost = { ...c, courses: [...c.courses, { ...c.courses[0]!, code: 'ICC998', idealPeriod: 8, prerequisites: [['ZZZ999']] }] };
    const f = forecastGraduation(ghost, t);
    expect(f.unschedulable).toEqual(['ICC998']);
    expect(f.graduationTerm).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @easy-grades/core test suggestions forecast`
Expected: FAIL. Cannot resolve `./suggestions` and `./forecast`.

- [ ] **Step 3: Implement `suggestions.ts`**

```ts
import { completedCodes, dependentClosure, inProgressCodes, isSatisfied } from './prerequisites';
import { computeProgress } from './progress';
import type { Category, Curriculum, Transcript } from './schemas';
import { compareTerms } from './terms';

export interface Suggestion {
  code: string;
  name: string;
  category: Category;
  credits: number;
  hours: number;
  idealPeriod: number | null;
  unlocks: number;
  reason: string;
}
export interface SuggestOptions {
  countInProgress?: boolean;
  includeElectives?: boolean;
  maxCredits?: number;
  assumeDone?: ReadonlySet<string>;
}

export const isEnade = (code: string): boolean => code.startsWith('ENADE');

export function latestTerm(t: Transcript): string | null {
  return t.entries.map((e) => e.term).sort(compareTerms).at(-1) ?? null;
}

function pendingElectiveHours(c: Curriculum, t: Transcript): number {
  const elective = computeProgress(c, t).categories.find((x) => x.key === 'eletiva')!;
  return Math.max(0, elective.requiredHours - elective.rawHours);
}

/** Mandatory or elective courses this one unlocks, directly or not. Optional courses are left out on purpose. */
function relevantUnlocks(c: Curriculum, code: string): number {
  const categories = new Map(c.courses.map((course) => [course.code, course.category]));
  return [...dependentClosure(c, code)].filter((dep) => {
    const category = categories.get(dep);
    return category === 'obrigatoria' || category === 'eletiva';
  }).length;
}

function reasonFor(s: Omit<Suggestion, 'reason'>): string {
  const parts = [s.category === 'obrigatoria' ? 'Obrigatória' : 'Eletiva'];
  if (s.idealPeriod !== null) parts.push(`período ideal ${s.idealPeriod}`);
  if (s.unlocks === 0) parts.push('não é pré-requisito de outras');
  else parts.push(s.unlocks === 1 ? 'libera 1 disciplina' : `libera ${s.unlocks} disciplinas`);
  return parts.join(', ');
}

export function rankCandidates(c: Curriculum, t: Transcript, opts: SuggestOptions = {}): Suggestion[] {
  const countInProgress = opts.countInProgress ?? true;
  const includeElectives = (opts.includeElectives ?? true) && pendingElectiveHours(c, t) > 0;
  const inProgress = inProgressCodes(t);
  const effective = new Set([...completedCodes(t), ...(countInProgress ? inProgress : []), ...(opts.assumeDone ?? [])]);

  const candidates = c.courses.filter(
    (course) =>
      (course.category === 'obrigatoria' || (includeElectives && course.category === 'eletiva')) &&
      !isEnade(course.code) &&
      !effective.has(course.code) &&
      !inProgress.has(course.code) &&
      isSatisfied(course.prerequisites, effective),
  );

  return candidates
    .map((course) => {
      const base = {
        code: course.code,
        name: course.name,
        category: course.category,
        credits: course.credits,
        hours: course.hours.total,
        idealPeriod: course.idealPeriod,
        unlocks: relevantUnlocks(c, course.code),
      };
      return { ...base, reason: reasonFor(base) };
    })
    .sort(
      (a, b) =>
        Number(a.category !== 'obrigatoria') - Number(b.category !== 'obrigatoria') ||
        (a.idealPeriod ?? 99) - (b.idealPeriod ?? 99) ||
        b.unlocks - a.unlocks ||
        b.credits - a.credits ||
        a.code.localeCompare(b.code),
    );
}

export function pickWithinCredits(ranked: readonly Suggestion[], maxCredits: number, electiveHoursLeft: number): Suggestion[] {
  const picked: Suggestion[] = [];
  let credits = 0;
  let electiveLeft = electiveHoursLeft;
  for (const s of ranked) {
    if (s.category === 'eletiva' && electiveLeft <= 0) continue;
    if (credits + s.credits > maxCredits) continue;
    picked.push(s);
    credits += s.credits;
    if (s.category === 'eletiva') electiveLeft -= s.hours;
  }
  return picked;
}

export function suggestNextTerm(c: Curriculum, t: Transcript, opts: SuggestOptions = {}): Suggestion[] {
  const maxCredits = opts.maxCredits ?? c.requirements.maxCreditsPerPeriod ?? 30;
  return pickWithinCredits(rankCandidates(c, t, opts), maxCredits, pendingElectiveHours(c, t));
}
```

- [ ] **Step 4: Implement `forecast.ts`**

```ts
import { completedCodes, inProgressCodes } from './prerequisites';
import { computeProgress } from './progress';
import type { Curriculum, Transcript } from './schemas';
import { isEnade, latestTerm, pickWithinCredits, rankCandidates, type Suggestion } from './suggestions';
import { addTerms, compareTerms, nextTerm } from './terms';

export interface ForecastTerm {
  term: string;
  courses: Suggestion[];
  credits: number;
}
export interface Forecast {
  terms: ForecastTerm[];
  graduationTerm: string | null;
  remainingTerms: number;
  maxTerm: string | null;
  exceedsMax: boolean;
  pendingHours: { optativa: number; eletiva: number; aacc: number; extensao: number };
  unschedulable: string[];
}

const MAX_SIMULATED_TERMS = 30;

export function forecastGraduation(c: Curriculum, t: Transcript, opts: { maxCredits?: number } = {}): Forecast {
  const maxCredits = opts.maxCredits ?? c.requirements.maxCreditsPerPeriod ?? 30;
  const latest = latestTerm(t);
  const assumeDone = new Set([...completedCodes(t), ...inProgressCodes(t)]);
  const remaining = () =>
    c.courses.filter((x) => x.category === 'obrigatoria' && !isEnade(x.code) && !assumeDone.has(x.code));

  const terms: ForecastTerm[] = [];
  let term = latest ? nextTerm(latest) : t.admissionTerm;
  for (let i = 0; term && i < MAX_SIMULATED_TERMS && remaining().length > 0; i++) {
    const ranked = rankCandidates(c, t, { includeElectives: false, assumeDone, countInProgress: true });
    const picks = pickWithinCredits(ranked, maxCredits, 0);
    if (picks.length === 0) break;
    terms.push({ term, courses: picks, credits: picks.reduce((s, x) => s + x.credits, 0) });
    for (const p of picks) assumeDone.add(p.code);
    term = nextTerm(term);
  }

  const unschedulable = remaining().map((x) => x.code);
  const graduationTerm = unschedulable.length > 0 ? null : (terms.at(-1)?.term ?? latest);
  const maxTerm = t.admissionTerm ? addTerms(t.admissionTerm, c.requirements.maxPeriods - 1) : null;
  const progress = computeProgress(c, t);
  const pending = (key: 'optativa' | 'eletiva' | 'aacc' | 'extensao') => {
    const cat = progress.categories.find((x) => x.key === key)!;
    return Math.max(0, cat.requiredHours - cat.rawHours);
  };

  return {
    terms,
    graduationTerm,
    remainingTerms: terms.length,
    maxTerm,
    exceedsMax: graduationTerm !== null && maxTerm !== null && compareTerms(graduationTerm, maxTerm) > 0,
    pendingHours: { optativa: pending('optativa'), eletiva: pending('eletiva'), aacc: pending('aacc'), extensao: pending('extensao') },
    unschedulable,
  };
}
```

Add both modules to `index.ts`.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @easy-grades/core test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core
git commit -m "feat(core): next-term suggestions and graduation forecast"
```

---

## Task 7: Deterministic flowchart layout

**Files:**
- Create: `packages/core/src/flowchart.ts`, `packages/core/src/flowchart.test.ts`
- Modify: `packages/core/src/index.ts` (add `export * from './flowchart';`)

**Interfaces:**
- Consumes: `courseStates`, `CourseState`, `isCompleted`, `compareTerms`.
- Produces:
  - `interface FlowNode { code: string; name: string; credits: number; hours: number; idealPeriod: number; state: CourseState; grade: number | null; column: number; row: number; x: number; y: number }`
  - `interface FlowEdge { id: string; source: string; target: string; alternative: boolean; satisfied: boolean }`
  - `interface FlowLayout { nodes: FlowNode[]; edges: FlowEdge[]; columns: { period: number; x: number; count: number }[]; width: number; height: number }`
  - `latestGrades(t: Transcript): Map<string, number>`
  - `layoutFlowchart(c: Curriculum, t: Transcript, opts?: { columnWidth?: number; rowHeight?: number; countInProgress?: boolean }): FlowLayout` (defaults: columnWidth 280, rowHeight 128)

- [ ] **Step 1: Write the failing test**

`packages/core/src/flowchart.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sampleCurriculum as c, sampleTranscript as t } from './__fixtures__/sample';
import { layoutFlowchart } from './flowchart';

describe('layoutFlowchart', () => {
  const layout = layoutFlowchart(c, t);
  const node = (code: string) => layout.nodes.find((n) => n.code === code)!;
  const column = (i: number) => layout.nodes.filter((n) => n.column === i).sort((a, b) => a.row - b.row).map((n) => n.code);

  it('contains only mandatory courses with an ideal period (no ENADE)', () => {
    expect(layout.nodes).toHaveLength(35);
    expect(layout.nodes.some((n) => n.code.startsWith('ENADE'))).toBe(false);
    expect(layout.columns.map((x) => x.period)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('orders the first column by code and later columns by prerequisite barycenter', () => {
    expect(column(0)).toEqual(['ICC001', 'ICC112', 'ICC114', 'ICC120', 'IEM075']);
    expect(column(1)).toEqual(['ICC002', 'ICC040', 'ICC260', 'IEM076', 'ICC107', 'IEM012']);
  });

  it('positions nodes on a grid', () => {
    expect(node('ICC002')).toMatchObject({ x: 280, y: 0, column: 1, row: 0 });
    expect(layout.width).toBe(8 * 280);
  });

  it('carries state and latest grade', () => {
    expect(node('ICC001')).toMatchObject({ state: 'concluida', grade: 8.7 });
    expect(node('ICC006')).toMatchObject({ state: 'em_curso', grade: null });
  });

  it('builds prerequisite edges with satisfaction info', () => {
    const edge = (id: string) => layout.edges.find((e) => e.id === id);
    expect(edge('ICC001->ICC002')).toMatchObject({ satisfied: true, alternative: false });
    expect(edge('ICC412->ICC418')).toMatchObject({ satisfied: false });
    expect(edge('ICC431->ICC150')).toMatchObject({ satisfied: true });
    expect(edge('ICC431->ICC418')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @easy-grades/core test flowchart`
Expected: FAIL. Cannot resolve `./flowchart`.

- [ ] **Step 3: Implement `flowchart.ts`**

```ts
import { courseStates, type CourseState } from './prerequisites';
import type { Curriculum, CurriculumCourse, Transcript } from './schemas';
import { isCompleted } from './status';
import { compareTerms } from './terms';

export interface FlowNode {
  code: string;
  name: string;
  credits: number;
  hours: number;
  idealPeriod: number;
  state: CourseState;
  grade: number | null;
  column: number;
  row: number;
  x: number;
  y: number;
}
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  alternative: boolean;
  satisfied: boolean;
}
export interface FlowLayout {
  nodes: FlowNode[];
  edges: FlowEdge[];
  columns: { period: number; x: number; count: number }[];
  width: number;
  height: number;
}

export function latestGrades(t: Transcript): Map<string, number> {
  const grades = new Map<string, number>();
  const sorted = [...t.entries].filter((e) => isCompleted(e.status) && e.grade !== null).sort((a, b) => compareTerms(a.term, b.term));
  for (const e of sorted) grades.set(e.code, e.grade!);
  return grades;
}

export function layoutFlowchart(
  c: Curriculum,
  t: Transcript,
  opts: { columnWidth?: number; rowHeight?: number; countInProgress?: boolean } = {},
): FlowLayout {
  const columnWidth = opts.columnWidth ?? 280;
  const rowHeight = opts.rowHeight ?? 128;
  const states = courseStates(c, t, { countInProgress: opts.countInProgress ?? false });
  const grades = latestGrades(t);
  const mandatory = c.courses.filter(
    (x): x is CurriculumCourse & { idealPeriod: number } =>
      x.category === 'obrigatoria' && x.idealPeriod !== null && !x.code.startsWith('ENADE'),
  );
  const codes = new Set(mandatory.map((m) => m.code));
  const periods = [...new Set(mandatory.map((m) => m.idealPeriod))].sort((a, b) => a - b);
  const rowOf = new Map<string, number>();
  const nodes: FlowNode[] = [];

  const barycenter = (course: CurriculumCourse): number => {
    const rows = course.prerequisites.flat().map((p) => rowOf.get(p)).filter((r): r is number => r !== undefined);
    return rows.length === 0 ? Number.POSITIVE_INFINITY : rows.reduce((a, b) => a + b, 0) / rows.length;
  };

  const columns = periods.map((period, column) => {
    const sorted = mandatory
      .filter((m) => m.idealPeriod === period)
      .map((m) => ({ m, b: barycenter(m) }))
      .sort((a, b) => {
        const diff = a.b - b.b;
        return Number.isNaN(diff) || diff === 0 ? a.m.code.localeCompare(b.m.code) : diff;
      });
    sorted.forEach(({ m }, row) => {
      rowOf.set(m.code, row);
      nodes.push({
        code: m.code,
        name: m.name,
        credits: m.credits,
        hours: m.hours.total,
        idealPeriod: period,
        state: states.get(m.code) ?? 'bloqueada',
        grade: grades.get(m.code) ?? null,
        column,
        row,
        x: column * columnWidth,
        y: row * rowHeight,
      });
    });
    return { period, x: column * columnWidth, count: sorted.length };
  });

  const edges = new Map<string, FlowEdge>();
  for (const m of mandatory) {
    for (const block of m.prerequisites) {
      for (const source of block) {
        if (!codes.has(source)) continue;
        const id = `${source}->${m.code}`;
        edges.set(id, {
          id,
          source,
          target: m.code,
          alternative: m.prerequisites.length > 1,
          satisfied: states.get(source) === 'concluida',
        });
      }
    }
  }

  return {
    nodes,
    edges: [...edges.values()],
    columns,
    width: periods.length * columnWidth,
    height: Math.max(0, ...columns.map((x) => x.count)) * rowHeight,
  };
}
```

Add `export * from './flowchart';` to `index.ts`.

- [ ] **Step 4: Run tests, typecheck and lint**

Run: `pnpm --filter @easy-grades/core test && pnpm --filter @easy-grades/core typecheck && pnpm lint`
Expected: PASS, exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat(core): deterministic flowchart layout with prerequisite edges"
```

Request the Opus whole-branch review of `feat/core`, fix any findings, then `git checkout main && git merge --no-ff feat/core -m "Merge feat/core"`.

---

## Task 8: API package, PDF text extraction and synthetic PDF fixtures

**Branch:** `feat/api` (create from `main` after `feat/core` is merged)

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/vitest.config.ts`, `apps/api/tsup.config.ts`
- Create: `apps/api/src/errors.ts`, `apps/api/src/pdf/extract.ts`
- Create: `apps/api/test/fixtures/build-pdf.ts`, `apps/api/test/fixtures/curriculum-fixture.ts`, `apps/api/test/fixtures/transcript-fixture.ts`
- Test: `apps/api/test/extract.test.ts`

**Interfaces:**
- Consumes: `ERROR_MESSAGES`, `ErrorCode` from `@easy-grades/core`.
- Produces:
  - `class ParseError extends Error { code: ErrorCode; statusCode: number }`
  - `ERROR_STATUS: Record<ErrorCode, number>`
  - `interface TextItem { page: number; x: number; y: number; width: number; text: string }`
  - `interface Row { page: number; y: number; items: TextItem[] }`
  - `extractItems(data: Uint8Array): Promise<TextItem[]>` (throws `INVALID_PDF`, `TOO_MANY_PAGES`)
  - `groupRows(items, tolerance = 1): Row[]`, `rowText(row): string`
  - `valueRightOf(items, label): string | null`
  - `valueNear(items, anchor, xMin, xMax, dyMin = -1.5, dyMax = 1.5): string | null`
  - Test helpers: `buildPdf(pages: Cell[][]): Promise<Uint8Array>`, `curriculumPages(opts?)`, `transcriptPages(opts?)`, `FAKE_PII: string[]`

**Why coordinates:** in reading order, the e-Campus PDFs separate course codes from names. Every item carries x/y, and PDF y grows upwards. Measured layout:
- **Curriculum columns:** period x≈37, code x≈75, name x=118, credits≈376, theory≈402, practice≈430, extension≈458, total≈487 (printed 0.5pt lower), prerequisite code x=512, then `BLOCO n` x=547.
- **Transcript columns:** code x=19, name x=70, CR x≈392–397, CH x≈418–424, grade x≈462–466, status x=498.

- [ ] **Step 1: Create the package files**

`apps/api/package.json`:

```json
{
  "name": "@easy-grades/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsup",
    "start": "node dist/server.js",
    "test": "vitest run",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "@fastify/helmet": "^13.1.2",
    "@fastify/multipart": "^10.1.3",
    "@fastify/rate-limit": "^11.2.1",
    "@fastify/static": "^10.1.6",
    "fastify": "^5.12.5",
    "pdfjs-dist": "6.4.299",
    "zod": "^4.6.5"
  },
  "devDependencies": {
    "@easy-grades/core": "workspace:*",
    "@types/node": "^22.18.0",
    "pdf-lib": "^1.17.1",
    "tsup": "^8.5.1",
    "tsx": "^4.20.0",
    "vitest": "^5.0.3"
  }
}
```

`@easy-grades/core` is a **devDependency** on purpose. tsup bundles it into `dist/server.js`, and `pnpm deploy --prod` then installs only the real runtime deps. `zod` stays a runtime dependency because the bundled core imports it.

`apps/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["node"] },
  "include": ["src", "test", "vitest.config.ts", "tsup.config.ts"]
}
```

`apps/api/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['test/**/*.test.ts'], testTimeout: 20000 } });
```

`apps/api/tsup.config.ts`:

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  // Core is TS source in the workspace: bundle it. Runtime deps stay external.
  noExternal: ['@easy-grades/core'],
});
```

Run: `pnpm install`
Expected: installs without `ERR_PNPM_IGNORED_BUILDS` (esbuild is allowed in `pnpm-workspace.yaml`).

- [ ] **Step 2: Write `apps/api/src/errors.ts`**

```ts
import { ERROR_MESSAGES, type ErrorCode } from '@easy-grades/core';

export const ERROR_STATUS: Record<ErrorCode, number> = {
  INVALID_UPLOAD: 400,
  MISSING_FILE: 400,
  INVALID_PDF: 400,
  TOO_LARGE: 413,
  TOO_MANY_PAGES: 422,
  NOT_CURRICULUM: 422,
  NOT_TRANSCRIPT: 422,
  CURRICULUM_MISMATCH: 422,
  PARSE_TIMEOUT: 422,
  RATE_LIMITED: 429,
  NOT_FOUND: 404,
  INTERNAL: 500,
};

export class ParseError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(code: ErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = 'ParseError';
    this.code = code;
    this.statusCode = ERROR_STATUS[code];
  }
}
```

- [ ] **Step 3: Write the synthetic PDF helpers (test-only, fake data)**

`apps/api/test/fixtures/build-pdf.ts`:

```ts
import { PDFDocument, StandardFonts } from 'pdf-lib';

export interface Cell {
  x: number;
  y: number;
  text: string;
}

/** Builds an A4 PDF where every cell is drawn as its own text run at (x, y), like e-Campus reports. */
export async function buildPdf(pages: Cell[][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const cells of pages) {
    const page = doc.addPage([595, 842]);
    for (const cell of cells) page.drawText(cell.text, { x: cell.x, y: cell.y, size: 7, font });
  }
  return doc.save();
}
```

`apps/api/test/fixtures/curriculum-fixture.ts`:

```ts
import type { Cell } from './build-pdf';

/** Synthetic "Currículo de Curso" laid out with the coordinates measured on real e-Campus PDFs. */
type Course = [period: number | null, code: string, name: string, credits: number, theory: number, practice: number, extension: number, prereqs: [string, number][]];

function columnHeader(y: number): Cell[] {
  return [
    { x: 24.4, y, text: 'PERÍODO' },
    { x: 78.5, y, text: 'CÓD.' },
    { x: 192, y, text: 'NOME DA DISCIPLINA' },
    { x: 367.1, y: y + 2, text: 'CRÉD.' },
    { x: 395.3, y: y + 2, text: 'TEOR.' },
    { x: 423.5, y: y + 2, text: 'PRAT.' },
    { x: 452.4, y: y + 2, text: 'EXTE.' },
    { x: 479.8, y: y + 2, text: 'TOTAL' },
    { x: 511.5, y, text: 'PRÉ-REQUISITO' },
  ];
}

/** Lays out courses top-down from `startY`; returns cells and the next free y. */
function courseRows(courses: Course[], startY: number): { cells: Cell[]; nextY: number } {
  const cells: Cell[] = [];
  let y = startY;
  for (const [period, code, name, credits, theory, practice, extension, prereqs] of courses) {
    if (period !== null) cells.push({ x: 36.8, y, text: String(period) });
    cells.push({ x: code.startsWith('ENADE') ? 70.3 : 74.9, y, text: code }, { x: 118, y, text: name });
    if (credits) cells.push({ x: 375.8, y, text: String(credits) });
    if (theory) cells.push({ x: 401.6, y, text: String(theory) });
    if (practice) cells.push({ x: 429.6, y, text: String(practice) });
    if (extension) cells.push({ x: 458.1, y, text: String(extension) });
    const total = theory + practice + extension;
    if (total) cells.push({ x: 487.1, y: y - 0.5, text: String(total) });
    // First prerequisite ~1.8pt above the baseline, extra ones stacked on the lines below.
    prereqs.forEach(([pre, block], k) => {
      const py = y + 1.77 - 15 * k;
      cells.push({ x: 512, y: py, text: pre }, { x: 547, y: py, text: `BLOCO ${block}` });
    });
    y -= 15 * Math.max(1, prereqs.length);
  }
  return { cells, nextY: y };
}

export function curriculumPages(opts: { courseCode?: string; version?: string } = {}): Cell[][] {
  const page1: Cell[] = [
    { x: 182, y: 797, text: 'UNIVERSIDADE FEDERAL DO AMAZONAS' },
    { x: 182.6, y: 769.7, text: 'Currículo de Curso (por versão e situação)' },
    { x: 21, y: 730.7, text: 'Curso:' },
    { x: 66, y: 730.7, text: `${opts.courseCode ?? 'IE17'} - Engenharia de Software` },
    { x: 454, y: 730.7, text: 'Versão:' },
    { x: 500, y: 730.7, text: opts.version ?? '2025/2' },
    ...columnHeader(661.6),
    { x: 261.5, y: 640, text: 'OBRIGATÓRIAS' },
  ];
  const mandatory = courseRows(
    [
      [1, 'ICC001', 'INTRODUÇÃO À COMPUTAÇÃO', 5, 60, 30, 0, []],
      [1, 'ICC120', 'MATEMÁTICA DISCRETA', 4, 60, 0, 0, []],
      [2, 'ICC002', 'ALGORITMOS E ESTRUTURA DE DADOS I', 5, 60, 30, 0, [['ICC001', 1]]],
      [2, 'ICC040', 'LINGUAGENS FORMAIS E AUTÔMATOS', 4, 60, 0, 0, [['ICC120', 1]]],
      [3, 'ICC044', 'COMPILADORES', 4, 60, 0, 0, [['ICC040', 1], ['ICC120', 2]]],
      [8, 'ICC150', 'TRABALHO DE CONCLUSÃO DE CURSO', 5, 0, 150, 0, [['ICC107', 1], ['ICC431', 1]]],
      [8, 'ICC418', 'PROJETOS PRÁTICOS EM ENGENHARIA DE SOFTWARE', 5, 0, 150, 0, [['ICC412', 1]]],
      [null, 'ENADE01', 'ENADE - INGRESSANTE', 0, 0, 0, 0, []],
    ],
    625,
  );
  page1.push(...mandatory.cells, { x: 25, y: mandatory.nextY, text: 'TOTAL' }, { x: 371.3, y: mandatory.nextY, text: '140' });

  const page2: Cell[] = [...columnHeader(801.6), { x: 272, y: 780, text: 'ELETIVAS' }];
  const electives = courseRows(
    [
      [null, 'ICC004', 'ALGORITMOS E ESTRUTURA DE DADOS AVANÇADOS', 4, 60, 0, 0, []],
      [null, 'ICC010', 'PROGRAMAÇÃO PARA WEB II', 4, 60, 0, 0, [['ICC007', 1]]],
    ],
    765,
  );
  page2.push(...electives.cells, { x: 270.8, y: electives.nextY - 10, text: 'OPTATIVAS' });
  const optional = courseRows([[null, 'IHP123', 'LINGUA BRASILEIRA DE SINAIS B', 4, 60, 0, 0, []]], electives.nextY - 25);
  page2.push(...optional.cells, { x: 207.5, y: optional.nextY - 10, text: 'ATIVIDADE CURRICULAR DE EXTENSÃO' });
  const extension = courseRows([[5, 'ICC606', 'PRÁTICAS EXTENSIONISTAS EM COMPUTAÇÃO VII', 6, 0, 0, 90, [['ICC001', 1]]]], optional.nextY - 25);
  page2.push(...extension.cells);

  const footer: [string, string, number][] = [
    ['CARGA HORÁRIA TOTAL', '3200', 424.65],
    ['CARGA HORÁRIA DE OPTATIVAS', '180', 410.65],
    ['CARGA HORÁRIA DE OBRIGATÓRIAS', '2370', 397.65],
    ['CARGA HORÁRIA DE ELETIVAS', '120', 384.65],
    ['CARGA HORÁRIA DE ATIVIDADES-ACADÊMICO-', '210', 371.65],
    ['CARGA HORÁRIA DE ATIVIDADE CURRICULAR DE', '320', 350.65],
    ['MÍNIMO DE PERÍODOS', '8', 325.65],
    ['MÁXIMO DE PERÍODOS', '12', 312.65],
  ];
  for (const [label, value, y] of footer) {
    const labelY = label.includes('ATIVIDADE') ? y + 1 : y;
    page2.push({ x: 25, y: labelY, text: label }, { x: 258, y, text: '=' }, { x: 268, y, text: value });
  }
  const credits: [string, string, number][] = [
    ['TOTAL DE CRÉDITOS', '150', 423.65],
    ['CRÉDITOS DE OPTATIVAS', '6', 410.65],
    ['CRÉDITOS DE OBRIGATÓRIAS', '140', 397.65],
    ['CRÉDITOS DE ELETIVAS', '4', 384.65],
  ];
  for (const [label, value, y] of credits) page2.push({ x: 325, y: y + 1, text: label }, { x: 526, y, text: '=' }, { x: 536, y, text: value });
  page2.push(
    { x: 25, y: 281.65, text: 'MÍNIMO DE CRÉDITOS' },
    { x: 258, y: 281.65, text: '= 12' },
    { x: 25, y: 265.65, text: 'MÁXIMO DE CRÉDITOS' },
    { x: 258, y: 265.65, text: '= 30' },
  );
  return [page1, page2];
}
```

`apps/api/test/fixtures/transcript-fixture.ts`:

```ts
import type { Cell } from './build-pdf';

/** Fake personal data. The parser must never let any of these strings reach its output. */
export const FAKE_PII = [
  'FULANO DE TAL FICTICIO',
  '99999999',
  '123.456.789-00',
  '01/01/2000',
  'MAE FICTICIA DA SILVA',
  '1234567 / SSP-AM',
  'SISU - AMPLA CONCORRENCIA',
  'PROFESSORA FICTICIA',
  'Doutorado',
  'Sem Evasão',
];

function studentHeader(opts: { courseCode: string; version: string }): Cell[] {
  return [
    { x: 197.6, y: 800, text: 'UNIVERSIDADE FEDERAL DO AMAZONAS' },
    { x: 230, y: 760, text: 'Histórico Escolar Analítico' },
    { x: 21, y: 720, text: 'Aluno:' },
    { x: 89, y: 720, text: '99999999 - FULANO DE TAL FICTICIO' },
    { x: 340, y: 720, text: 'Data de Nascimento:' },
    { x: 430, y: 720, text: '01/01/2000' },
    { x: 340, y: 705, text: 'CPF:' },
    { x: 370, y: 705, text: '123.456.789-00' },
    { x: 21, y: 700, text: 'Documento de' },
    { x: 89, y: 695, text: '1234567 / SSP-AM' },
    { x: 21, y: 680, text: 'Filiação:' },
    { x: 89, y: 680, text: 'MAE FICTICIA DA SILVA' },
    { x: 22, y: 650.08, text: 'Curso:' },
    { x: 89, y: 649.73, text: `${opts.courseCode} - Engenharia de Software` },
    { x: 21, y: 591.08, text: 'Forma de Ingresso:' },
    { x: 89, y: 590.73, text: 'SISU - AMPLA CONCORRENCIA' },
    { x: 340, y: 591.08, text: 'Versão (Currículo) :' },
    { x: 409, y: 590.73, text: opts.version },
    { x: 21, y: 576.08, text: 'Situação do Aluno:' },
    { x: 89, y: 575.73, text: 'Sem Evasão' },
    { x: 339, y: 576.08, text: 'Ano/Período Ingresso:' },
    { x: 417, y: 575.73, text: '2024/1° Semestre' },
  ];
}

function entry(y: number, code: string, name: string, credits: string, hours: string, grade: string, status: string): Cell[] {
  const cells: Cell[] = [
    { x: 19, y, text: code },
    { x: 70, y, text: name },
    { x: credits.length > 1 ? 392.1 : 396.6, y, text: credits },
    { x: hours.length > 2 ? 419.7 : 424.1, y, text: hours },
  ];
  if (grade) cells.push({ x: grade.length > 4 ? 462 : 466.4, y, text: grade });
  if (status) cells.push({ x: 498, y, text: status });
  return cells;
}

function teacher(y: number): Cell[] {
  return [
    { x: 70, y: y - 13, text: 'Docente(s):' },
    { x: 480, y: y - 13, text: 'Titulação:' },
    { x: 70, y: y - 26, text: 'PROFESSORA FICTICIA' },
    { x: 480, y: y - 26, text: 'Doutorado' },
  ];
}

export function transcriptPages(opts: { courseCode?: string; version?: string } = {}): Cell[][] {
  const header = studentHeader({ courseCode: opts.courseCode ?? 'IE17', version: opts.version ?? '2025/2' });
  const page1: Cell[] = [
    ...header,
    { x: 20, y: 555.65, text: 'Código' },
    { x: 82, y: 555.65, text: 'Nome da Disciplina/Atividade' },
    { x: 387.5, y: 555.65, text: 'CR.' },
    { x: 415.5, y: 555.65, text: 'C.H.' },
    { x: 457.3, y: 555.65, text: 'Média' },
    { x: 498, y: 555.65, text: 'Situação' },
    { x: 197.6, y: 532.7, text: 'ATIVIDADE CURRICULAR DE EXTENSÃO' },
    { x: 19, y: 511.65, text: 'Periodo: 2° Semestre de 2026' },
    ...entry(496.57, 'ICC600', 'PRÁTICAS EXTENSIONISTAS EM COMPUTAÇÃO I', '12', '180', '*****', 'Matricula'),
    ...teacher(496.57),
    { x: 178.7, y: 440, text: 'Disciplinas Externas - Origem do Aproveitamento' },
    { x: 19, y: 420, text: 'Periodo: 1° Semestre de 2024' },
    ...entry(405, 'ICC020', 'INTRODUÇAO A PROGRAMAÇÃO', '5', '90', '9.50', 'Aprovado'),
    { x: 261.5, y: 365, text: 'OBRIGATÓRIAS' },
    { x: 19, y: 350, text: 'Periodo: 1° Semestre de 2024' },
    { x: 19, y: 335, text: 'ENADE01' },
    { x: 70, y: 335, text: 'ENADE - INGRESSANTE' },
    { x: 394.8, y: 335, text: '**' },
    { x: 426.8, y: 335, text: '**' },
    { x: 466.4, y: 335, text: '*****' },
    { x: 498, y: 335, text: 'DispCalend' },
    { x: 562, y: 335, text: '(1)' },
    ...entry(310, 'ICC001', 'INTRODUÇÃO À COMPUTAÇÃO', '5', '90', '9.50', 'Equivalenc'),
    ...teacher(310),
    ...entry(260, 'ICC002', 'ALGORITMOS E ESTRUTURA DE DADOS I', '5', '90', '8.10', 'TransfReal'),
    { x: 19, y: 230, text: 'Periodo: 2° Semestre de 2024' },
    ...entry(215, 'ICC120', 'MATEMÁTICA DISCRETA', '4', '60', '2.30', 'Repro Nota'),
    ...entry(195, 'ICC040', 'LINGUAGENS FORMAIS E AUTÔMATOS', '4', '60', '10.00', 'Aprovado'),
  ];

  const page2: Cell[] = [
    ...header,
    { x: 19, y: 560, text: 'Periodo: 2° Semestre de 2026' },
    ...entry(545, 'ICC003', 'ALGORITMOS E ESTRUTURAS DE DADOS II', '5', '90', '*****', 'Matricula'),
    { x: 267.9, y: 515, text: 'OPTATIVAS' },
    { x: 19, y: 495, text: 'Periodo: 2° Semestre de 2025' },
    ...entry(480, 'IHP123', 'LINGUA BRASILEIRA DE SINAIS B', '4', '60', '7.00', 'Disp Nota'),
    ...entry(460, 'FAA011', 'INTRODUÇÃO À ADMINISTRAÇÃO', '4', '60', '3.00', 'Cancelado'),
    { x: 194, y: 430, text: 'DISCIPLINAS A VENCER (OBRIGATÓRIAS)' },
    { x: 20, y: 412, text: 'Código' },
    { x: 70, y: 412, text: 'Nome da Disciplina/Atividade' },
    { x: 19, y: 395, text: 'Período Ideal: 8' },
    ...entry(380, 'ICC150', 'TRABALHO DE CONCLUSÃO DE CURSO', '5', '150', '', ''),
    { x: 19, y: 360, text: 'Período Ideal:' },
    { x: 19, y: 345, text: 'ENADE02' },
    { x: 70, y: 345, text: 'ENADE - CONCLUINTE' },
    { x: 163.6, y: 320, text: '** COEFICIENTE DE RENDIMENTO ESCOLAR = 7.250 **' },
    { x: 23, y: 290, text: 'COMPONENTES CURRICULARES' },
    { x: 23, y: 270, text: 'ATIVIDADE CURRICULAR DE EXTENSÃO' },
    { x: 232.8, y: 270, text: '320' },
    { x: 298.3, y: 270, text: '0' },
    { x: 350.1, y: 270.3, text: '0,00 %' },
    { x: 23, y: 257.7, text: 'ATIVIDADES-ACADÊMICO-CIENTÍFICO-' },
    { x: 232.8, y: 253, text: '210' },
    { x: 296, y: 253, text: '30' },
    { x: 348.2, y: 253.3, text: '14,29 %' },
    { x: 23, y: 248.3, text: 'CULTURAIS' },
    { x: 23, y: 230, text: 'TOTAL' },
    { x: 230.6, y: 230, text: '3200' },
    { x: 291.6, y: 230, text: '450' },
    { x: 348.2, y: 230.3, text: '14,06 %' },
  ];

  const page3: Cell[] = [
    ...header,
    { x: 259.6, y: 557.6, text: 'OBSERVAÇÕES' },
    { x: 20, y: 540, text: 'A disciplina ICC001 - INTRODUÇÃO À COMPUTAÇÃO foi o aproveitamento de estudo realizado pela(s)' },
    { x: 20, y: 528, text: 'FAE011 - INTRODUCÃO À ECONOMIA.' },
  ];
  return [page1, page2, page3];
}
```

- [ ] **Step 4: Write the failing extraction test**

`apps/api/test/extract.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ParseError } from '../src/errors';
import { extractItems, groupRows, rowText, valueRightOf } from '../src/pdf/extract';
import { buildPdf } from './fixtures/build-pdf';

describe('extractItems', () => {
  it('returns non-blank text items with coordinates', async () => {
    const pdf = await buildPdf([[{ x: 75, y: 414.7, text: 'ICC001' }, { x: 118, y: 414.7, text: 'INTRODUÇÃO À COMPUTAÇÃO' }]]);
    const items = await extractItems(pdf);
    expect(items.map((i) => i.text)).toEqual(['ICC001', 'INTRODUÇÃO À COMPUTAÇÃO']);
    expect(items[0]).toMatchObject({ page: 1, x: 75, y: 414.7 });
    expect(items[0]!.width).toBeGreaterThan(0);
  });

  it('rejects bytes that are not a PDF', async () => {
    await expect(extractItems(new TextEncoder().encode('%PDF-1.7 garbage'))).rejects.toMatchObject({ code: 'INVALID_PDF' });
  });

  it('rejects documents with more than 20 pages', async () => {
    const pdf = await buildPdf(Array.from({ length: 21 }, () => [{ x: 10, y: 10, text: 'x' }]));
    const error = await extractItems(pdf).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ParseError);
    expect((error as ParseError).code).toBe('TOO_MANY_PAGES');
  });
});

describe('groupRows / valueRightOf', () => {
  const items = [
    { page: 1, x: 512, y: 636.5, width: 20, text: 'ICC001' },
    { page: 1, x: 74.9, y: 634.73, width: 20, text: 'ICC606' },
    { page: 1, x: 487, y: 634.23, width: 9, text: '90' },
    { page: 1, x: 21, y: 730.7, width: 20, text: 'Curso:' },
    { page: 1, x: 66, y: 730.7, width: 90, text: 'IE17 - Engenharia de Software' },
    { page: 1, x: 454, y: 730.7, width: 20, text: 'Versão:' },
  ];

  it('merges items within 1pt and separates a prerequisite printed 1.8pt above', () => {
    const rows = groupRows(items);
    expect(rows.map(rowText)).toEqual(['Curso: IE17 - Engenharia de Software Versão:', 'ICC001', 'ICC606 90']);
  });

  it('reads the closest value to the right of a label', () => {
    expect(valueRightOf(items, 'Curso:')).toBe('IE17 - Engenharia de Software');
    expect(valueRightOf(items, 'Inexistente:')).toBeNull();
  });
});
```

Run: `pnpm --filter @easy-grades/api test extract`
Expected: FAIL. Cannot resolve `../src/pdf/extract`.

- [ ] **Step 5: Implement `apps/api/src/pdf/extract.ts`**

pdfjs 6 note: the loading task (not the document) is destroyed, and the `isEvalSupported` option no longer exists. Pass a `Uint8Array`, never a `Buffer`.

```ts
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ParseError } from '../errors';

export interface TextItem {
  page: number;
  x: number;
  y: number;
  width: number;
  text: string;
}
export interface Row {
  page: number;
  y: number;
  items: TextItem[];
}

export const MAX_PAGES = 20;

/** Extracts every non-blank text item with its page coordinates. PDF y grows upwards. */
export async function extractItems(data: Uint8Array): Promise<TextItem[]> {
  // pdfjs 6 has no eval-based font path; also disable font faces, system fonts, worker fetches and XFA.
  const task = getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false,
    useWorkerFetch: false,
    enableXfa: false,
    stopAtErrors: true,
    verbosity: 0,
  });
  let doc;
  try {
    doc = await task.promise;
  } catch {
    await task.destroy();
    throw new ParseError('INVALID_PDF');
  }
  try {
    if (doc.numPages > MAX_PAGES) throw new ParseError('TOO_MANY_PAGES');
    const items: TextItem[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      for (const raw of content.items) {
        if (!('str' in raw)) continue;
        const text = raw.str.replace(/\s+/g, ' ').trim();
        if (!text) continue;
        items.push({ page: p, x: raw.transform[4] ?? 0, y: raw.transform[5] ?? 0, width: raw.width, text });
      }
      page.cleanup();
    }
    return items;
  } catch (err) {
    if (err instanceof ParseError) throw err;
    throw new ParseError('INVALID_PDF');
  } finally {
    await task.destroy();
  }
}

/** Groups items into visual rows: same page, y within `tolerance` of the row's first (highest) item. */
export function groupRows(items: readonly TextItem[], tolerance = 1): Row[] {
  const sorted = [...items].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  const rows: Row[] = [];
  for (const item of sorted) {
    const last = rows.at(-1);
    if (last && last.page === item.page && last.y - item.y <= tolerance) last.items.push(item);
    else rows.push({ page: item.page, y: item.y, items: [item] });
  }
  for (const row of rows) row.items.sort((a, b) => a.x - b.x);
  return rows;
}

export const rowText = (row: Row): string => row.items.map((i) => i.text).join(' ');

/** Text of the closest item to the right of `label`, on the same visual line. */
export function valueRightOf(items: readonly TextItem[], label: string): string | null {
  const anchor = items.find((i) => i.text === label);
  if (!anchor) return null;
  const candidates = items.filter(
    (i) => i.page === anchor.page && Math.abs(i.y - anchor.y) <= 1.5 && i.x >= anchor.x + anchor.width - 1 && i !== anchor,
  );
  candidates.sort((a, b) => a.x - b.x);
  return candidates[0]?.text ?? null;
}

/** Text of the first item inside an x window, aligned (dy range) with `label`. */
export function valueNear(
  items: readonly TextItem[],
  anchor: TextItem,
  xMin: number,
  xMax: number,
  dyMin = -1.5,
  dyMax = 1.5,
): string | null {
  const hit = items.find(
    (i) => i.page === anchor.page && i.x >= xMin && i.x <= xMax && i.y - anchor.y >= dyMin && i.y - anchor.y <= dyMax && /\d/.test(i.text),
  );
  return hit?.text ?? null;
}
```

- [ ] **Step 6: Run tests and typecheck**

Run: `pnpm --filter @easy-grades/api test && pnpm --filter @easy-grades/api typecheck`
Expected: extract tests PASS, typecheck exits 0.

- [ ] **Step 7: Commit**

```bash
git add apps/api pnpm-lock.yaml
git commit -m "feat(api): coordinate-based PDF text extraction and synthetic PDF fixtures"
```

---

## Task 9: Curriculum parser

**Files:**
- Create: `apps/api/src/parsers/curriculum.ts`
- Test: `apps/api/test/curriculum.test.ts`

**Interfaces:**
- Consumes: `extractItems`, `groupRows`, `rowText`, `valueRightOf`, `valueNear`, `ParseError`, and core types `Curriculum`, `CurriculumCourse`, `Category`.
- Produces: `parseCurriculum(items: readonly TextItem[]): Curriculum` (throws `NOT_CURRICULUM`).

**Prerequisite rule (verified on real PDFs, 117/117 courses):**
- A course's first prerequisite is printed ~1.8pt **above** the course baseline.
- Extra prerequisites are stacked on the lines **below** it, before the next course.
- So a loose prerequisite row belongs to the nearest course row whose y is ≥ (prereq y − 3), i.e. the course at or just above it.
- Same `BLOCO n` = AND; different BLOCO numbers = alternatives (OR).

- [ ] **Step 1: Write the failing test**

`apps/api/test/curriculum.test.ts`:

```ts
import { CurriculumSchema } from '@easy-grades/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseCurriculum } from '../src/parsers/curriculum';
import { extractItems, type TextItem } from '../src/pdf/extract';
import { buildPdf } from './fixtures/build-pdf';
import { curriculumPages } from './fixtures/curriculum-fixture';
import { transcriptPages } from './fixtures/transcript-fixture';

describe('parseCurriculum', () => {
  let items: TextItem[];
  beforeAll(async () => {
    items = await extractItems(await buildPdf(curriculumPages()));
  });
  const course = (code: string) => parseCurriculum(items).courses.find((c) => c.code === code);

  it('reads course identity and validates against the schema', () => {
    const c = parseCurriculum(items);
    expect(CurriculumSchema.parse(c)).toEqual(c);
    expect(c).toMatchObject({ courseCode: 'IE17', courseName: 'Engenharia de Software', version: '2025/2' });
  });

  it('reads every course row with category, period, credits and hours', () => {
    const c = parseCurriculum(items);
    expect(c.courses.map((x) => x.code)).toEqual([
      'ICC001', 'ICC120', 'ICC002', 'ICC040', 'ICC044', 'ICC150', 'ICC418', 'ENADE01', 'ICC004', 'ICC010', 'IHP123', 'ICC606',
    ]);
    expect(course('ICC001')).toMatchObject({
      category: 'obrigatoria', idealPeriod: 1, credits: 5, hours: { theory: 60, practice: 30, extension: 0, total: 90 }, prerequisites: [],
    });
    expect(course('ICC150')!.hours).toEqual({ theory: 0, practice: 150, extension: 0, total: 150 });
    expect(course('ICC004')).toMatchObject({ category: 'eletiva', idealPeriod: null });
    expect(course('IHP123')).toMatchObject({ category: 'optativa' });
    expect(course('ICC606')).toMatchObject({ category: 'extensao', idealPeriod: 5, hours: { extension: 90, total: 90 } });
    expect(course('ENADE01')).toMatchObject({ credits: 0, idealPeriod: null });
  });

  it('attaches prerequisites: first beside the row, extra ones stacked below it', () => {
    expect(course('ICC002')!.prerequisites).toEqual([['ICC001']]);
    expect(course('ICC150')!.prerequisites).toEqual([['ICC107', 'ICC431']]);
    expect(course('ICC418')!.prerequisites).toEqual([['ICC412']]);
    expect(course('ICC010')!.prerequisites).toEqual([['ICC007']]);
  });

  it('keeps different BLOCOs as alternatives', () => {
    expect(course('ICC044')!.prerequisites).toEqual([['ICC040'], ['ICC120']]);
  });

  it('reads the requirements footer', () => {
    expect(parseCurriculum(items).requirements).toEqual({
      totalHours: 3200,
      totalCredits: 150,
      byCategory: {
        obrigatoria: { hours: 2370, credits: 140 },
        optativa: { hours: 180, credits: 6 },
        eletiva: { hours: 120, credits: 4 },
        aacc: { hours: 210, credits: 0 },
        extensao: { hours: 320, credits: 0 },
      },
      minPeriods: 8,
      maxPeriods: 12,
      minCreditsPerPeriod: 12,
      maxCreditsPerPeriod: 30,
    });
  });

  it('rejects a transcript given as curriculum', async () => {
    const transcriptItems = await extractItems(await buildPdf(transcriptPages()));
    expect(() => parseCurriculum(transcriptItems)).toThrow(expect.objectContaining({ code: 'NOT_CURRICULUM' }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @easy-grades/api test curriculum`
Expected: FAIL. Cannot resolve `../src/parsers/curriculum`.

- [ ] **Step 3: Implement `apps/api/src/parsers/curriculum.ts`**

```ts
import type { Category, Curriculum, CurriculumCourse } from '@easy-grades/core';
import { ParseError } from '../errors';
import { groupRows, rowText, valueNear, valueRightOf, type Row, type TextItem } from '../pdf/extract';

const CODE_RE = /^[A-Z]{2,7}\d{2,3}$/;
const SECTIONS: Record<string, Category> = {
  'ATIVIDADE CURRICULAR DE EXTENSÃO': 'extensao',
  ELETIVAS: 'eletiva',
  OBRIGATÓRIAS: 'obrigatoria',
  OPTATIVAS: 'optativa',
};
const COLUMN_HEADERS = { 'CRÉD.': 'credits', 'TEOR.': 'theory', 'PRAT.': 'practice', 'EXTE.': 'extension', TOTAL: 'total' } as const;
type NumericColumn = (typeof COLUMN_HEADERS)[keyof typeof COLUMN_HEADERS];

// Column x ranges measured on e-Campus "Currículo de Curso" PDFs (points).
const PERIOD_MAX_X = 60;
const CODE_MIN_X = 60;
const CODE_MAX_X = 115;
const NAME_MAX_X = 360;
const PREREQ_MIN_X = 505;
/**
 * The first prerequisite is printed ~1.8pt above its course baseline; extra ones are stacked on the
 * lines BELOW it (before the next course). Verified against the content-stream order of real PDFs.
 */
const PREREQ_ABOVE_TOLERANCE = 3;
const MAX_PREREQ_GAP = 60;

interface Located {
  page: number;
  y: number;
}
type LocatedCourse = CurriculumCourse & Located & { blocks: Map<number, string[]> };

function readColumns(items: readonly TextItem[]): { key: NumericColumn; center: number }[] {
  return Object.entries(COLUMN_HEADERS).map(([label, key]) => {
    const header = items.find((i) => i.text === label && i.x > NAME_MAX_X && i.x < PREREQ_MIN_X);
    if (!header) throw new ParseError('NOT_CURRICULUM');
    return { key, center: header.x + header.width / 2 };
  });
}

function nearestColumn(columns: { key: NumericColumn; center: number }[], item: TextItem): NumericColumn {
  const center = item.x + item.width / 2;
  let best = columns[0]!;
  for (const col of columns) if (Math.abs(col.center - center) < Math.abs(best.center - center)) best = col;
  return best.key;
}

function prereqPairs(items: readonly TextItem[]): { code: string; block: number }[] {
  const pairs: { code: string; block: number }[] = [];
  const right = items.filter((i) => i.x >= PREREQ_MIN_X);
  for (let k = 0; k < right.length; k++) {
    const block = /^BLOCO\s+(\d+)$/.exec(right[k + 1]?.text ?? '');
    if (CODE_RE.test(right[k]!.text) && block) {
      pairs.push({ code: right[k]!.text, block: Number(block[1]) });
      k++;
    }
  }
  return pairs;
}

function addToBlock(course: LocatedCourse, block: number, code: string): void {
  const list = course.blocks.get(block) ?? [];
  if (!list.includes(code)) list.push(code);
  course.blocks.set(block, list);
}

function parseCourseRow(row: Row, category: Category, columns: { key: NumericColumn; center: number }[]): LocatedCourse | null {
  const codeItem = row.items.find((i) => i.x >= CODE_MIN_X && i.x < CODE_MAX_X && CODE_RE.test(i.text));
  if (!codeItem) return null;
  const periodItem = row.items.find((i) => i.x < PERIOD_MAX_X && /^\d{1,2}$/.test(i.text));
  const name = row.items
    .filter((i) => i.x >= CODE_MAX_X && i.x < NAME_MAX_X)
    .map((i) => i.text)
    .join(' ');
  const nums: Record<NumericColumn, number> = { credits: 0, theory: 0, practice: 0, extension: 0, total: 0 };
  for (const item of row.items) {
    if (item.x >= NAME_MAX_X && item.x < PREREQ_MIN_X && /^\d+$/.test(item.text)) nums[nearestColumn(columns, item)] = Number(item.text);
  }
  const course: LocatedCourse = {
    page: row.page,
    y: row.y,
    code: codeItem.text,
    name: name || codeItem.text,
    category,
    idealPeriod: periodItem ? Number(periodItem.text) : null,
    credits: nums.credits,
    hours: {
      theory: nums.theory,
      practice: nums.practice,
      extension: nums.extension,
      total: nums.total || nums.theory + nums.practice + nums.extension,
    },
    prerequisites: [],
    blocks: new Map(),
  };
  for (const pair of prereqPairs(row.items)) addToBlock(course, pair.block, pair.code);
  return course;
}

function footerNumber(items: readonly TextItem[], label: string, xMin: number, xMax: number): number | null {
  const anchor = items.find((i) => i.text === label);
  if (!anchor) return null;
  const match = /(\d+)/.exec(valueNear(items, anchor, xMin, xMax) ?? '');
  return match ? Number(match[1]) : null;
}

function readRequirements(items: readonly TextItem[]): Curriculum['requirements'] {
  const left = (label: string) => footerNumber(items, label, 250, 322);
  const right = (label: string) => footerNumber(items, label, 520, 590);
  const totalHours = left('CARGA HORÁRIA TOTAL');
  if (totalHours === null) throw new ParseError('NOT_CURRICULUM');
  return {
    totalHours,
    totalCredits: right('TOTAL DE CRÉDITOS') ?? 0,
    byCategory: {
      obrigatoria: { hours: left('CARGA HORÁRIA DE OBRIGATÓRIAS') ?? 0, credits: right('CRÉDITOS DE OBRIGATÓRIAS') ?? 0 },
      optativa: { hours: left('CARGA HORÁRIA DE OPTATIVAS') ?? 0, credits: right('CRÉDITOS DE OPTATIVAS') ?? 0 },
      eletiva: { hours: left('CARGA HORÁRIA DE ELETIVAS') ?? 0, credits: right('CRÉDITOS DE ELETIVAS') ?? 0 },
      aacc: { hours: left('CARGA HORÁRIA DE ATIVIDADES-ACADÊMICO-') ?? 0, credits: 0 },
      extensao: { hours: left('CARGA HORÁRIA DE ATIVIDADE CURRICULAR DE') ?? 0, credits: 0 },
    },
    minPeriods: left('MÍNIMO DE PERÍODOS') ?? 0,
    maxPeriods: left('MÁXIMO DE PERÍODOS') ?? 0,
    minCreditsPerPeriod: left('MÍNIMO DE CRÉDITOS') ?? 0,
    maxCreditsPerPeriod: left('MÁXIMO DE CRÉDITOS'),
  };
}

export function parseCurriculum(items: readonly TextItem[]): Curriculum {
  if (!items.some((i) => i.text.startsWith('Currículo de Curso'))) throw new ParseError('NOT_CURRICULUM');
  const courseMatch = /^([A-Z0-9]{2,8})\s*-\s*(.+)$/.exec(valueRightOf(items, 'Curso:') ?? '');
  const version = valueRightOf(items, 'Versão:');
  if (!courseMatch || !version || !/^\d{4}\/\d$/.test(version)) throw new ParseError('NOT_CURRICULUM');
  const columns = readColumns(items);

  const courses: LocatedCourse[] = [];
  const loosePrereqs: (Located & { code: string; block: number })[] = [];
  let category: Category | null = null;

  for (const row of groupRows(items)) {
    const section = SECTIONS[rowText(row)];
    if (section) {
      category = section;
      continue;
    }
    if (!category) continue;
    if (row.items.every((i) => i.x >= PREREQ_MIN_X)) {
      for (const pair of prereqPairs(row.items)) loosePrereqs.push({ page: row.page, y: row.y, ...pair });
      continue;
    }
    const course = parseCourseRow(row, category, columns);
    if (course) courses.push(course);
  }

  // A loose prerequisite belongs to the nearest course row at (≤3pt below) or above it on the same page.
  for (const pre of [...loosePrereqs].sort((a, b) => b.y - a.y)) {
    let owner: LocatedCourse | undefined;
    for (const course of courses) {
      if (course.page !== pre.page) continue;
      if (course.y < pre.y - PREREQ_ABOVE_TOLERANCE || course.y - pre.y > MAX_PREREQ_GAP) continue;
      if (!owner || course.y < owner.y) owner = course;
    }
    if (owner) addToBlock(owner, pre.block, pre.code);
  }

  if (courses.length === 0) throw new ParseError('NOT_CURRICULUM');
  return {
    courseCode: courseMatch[1]!,
    courseName: courseMatch[2]!.trim(),
    version,
    courses: courses.map(({ page: _page, y: _y, blocks, ...course }) => ({
      ...course,
      prerequisites: [...blocks.entries()].sort((a, b) => a[0] - b[0]).map(([, codes]) => codes),
    })),
    requirements: readRequirements(items),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @easy-grades/api test && pnpm --filter @easy-grades/api typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): curriculum parser with prerequisite blocks and requirements footer"
```

---

## Task 10: Transcript parser, document pairing and PII leak tests

**Files:**
- Create: `apps/api/src/parsers/transcript.ts`, `apps/api/src/parsers/documents.ts`
- Test: `apps/api/test/transcript.test.ts`, `apps/api/test/real-pdfs.test.ts`

**Interfaces:**
- Consumes: the extract helpers, `parseCurriculum`, and core `mapStatus`, `termFromLabel`, `termFromAdmission`, `ParseResponseSchema`.
- Produces:
  - `parseTranscript(items: readonly TextItem[]): Transcript` (throws `NOT_TRANSCRIPT`)
  - `parseDocuments(curriculumPdf: Uint8Array, transcriptPdf: Uint8Array): Promise<ParseResponse>` (throws `CURRICULUM_MISMATCH` plus everything the parsers throw)

**PII design:**
- On every page, items at or above the `Situação do Aluno:` label are the student header. They are dropped before parsing.
- Only three header values are read, by label: `Curso:`, `Versão (Currículo) :` and `Ano/Período Ingresso:`.
- Docente rows never start with a code at x≤30, so they are skipped.
- Parsing stops at `OBSERVAÇÕES`.
- `parseDocuments` re-validates with the zod schema, which strips unknown keys.

- [ ] **Step 1: Write the failing tests**

`apps/api/test/transcript.test.ts`:

```ts
import { TranscriptSchema } from '@easy-grades/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseDocuments } from '../src/parsers/documents';
import { parseTranscript } from '../src/parsers/transcript';
import { extractItems, type TextItem } from '../src/pdf/extract';
import { buildPdf } from './fixtures/build-pdf';
import { curriculumPages } from './fixtures/curriculum-fixture';
import { FAKE_PII, transcriptPages } from './fixtures/transcript-fixture';

describe('parseTranscript', () => {
  let items: TextItem[];
  beforeAll(async () => {
    items = await extractItems(await buildPdf(transcriptPages()));
  });

  it('reads only the whitelisted header values', () => {
    const t = parseTranscript(items);
    expect(TranscriptSchema.parse(t)).toEqual(t);
    expect(t).toMatchObject({ courseCode: 'IE17', curriculumVersion: '2025/2', admissionTerm: '2024.1' });
  });

  it('reads entries with section category, term, numbers and status', () => {
    const t = parseTranscript(items);
    expect(t.entries.map((e) => [e.code, e.category, e.term, e.credits, e.hours, e.grade, e.status])).toEqual([
      ['ICC600', 'extensao', '2026.2', 12, 180, null, 'matriculado'],
      ['ICC020', 'externa', '2024.1', 5, 90, 9.5, 'aprovado'],
      ['ENADE01', 'obrigatoria', '2024.1', null, null, null, 'disp_calend'],
      ['ICC001', 'obrigatoria', '2024.1', 5, 90, 9.5, 'equivalencia'],
      ['ICC002', 'obrigatoria', '2024.1', 5, 90, 8.1, 'transf_real'],
      ['ICC120', 'obrigatoria', '2024.2', 4, 60, 2.3, 'reprovado_nota'],
      ['ICC040', 'obrigatoria', '2024.2', 4, 60, 10, 'aprovado'],
      ['ICC003', 'obrigatoria', '2026.2', 5, 90, null, 'matriculado'],
      ['IHP123', 'optativa', '2025.2', 4, 60, 7, 'disp_nota'],
      ['FAA011', 'optativa', '2025.2', 4, 60, 3, 'desconhecido'],
    ]);
  });

  it('[RF-1] keeps the raw text of unknown statuses', () => {
    expect(parseTranscript(items).entries.find((e) => e.code === 'FAA011')!.rawStatus).toBe('Cancelado');
  });

  it('reads pending courses, official CR and the summary table', () => {
    const t = parseTranscript(items);
    expect(t.pending).toEqual([
      { code: 'ICC150', name: 'TRABALHO DE CONCLUSÃO DE CURSO', idealPeriod: 8 },
      { code: 'ENADE02', name: 'ENADE - CONCLUINTE', idealPeriod: null },
    ]);
    expect(t.officialCr).toBe(7.25);
    expect(t.officialProgressPercent).toBe(14.06);
    expect(t.aaccDoneHours).toBe(30);
    expect(t.extensaoDoneHours).toBe(0);
  });

  it('never leaks personal data from the header, teacher rows or observations', async () => {
    const result = await parseDocuments(await buildPdf(curriculumPages()), await buildPdf(transcriptPages()));
    const json = JSON.stringify(result);
    for (const pii of FAKE_PII) expect(json).not.toContain(pii);
    expect(json).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
    expect(json).not.toContain('FAE011');
  });

  it('rejects a curriculum given as transcript', async () => {
    const curriculumItems = await extractItems(await buildPdf(curriculumPages()));
    expect(() => parseTranscript(curriculumItems)).toThrow(expect.objectContaining({ code: 'NOT_TRANSCRIPT' }));
  });
});

describe('parseDocuments', () => {
  it('rejects a transcript from another curriculum version', async () => {
    await expect(
      parseDocuments(await buildPdf(curriculumPages()), await buildPdf(transcriptPages({ version: '2018/1' }))),
    ).rejects.toMatchObject({ code: 'CURRICULUM_MISMATCH' });
  });
});
```

`apps/api/test/real-pdfs.test.ts` is a local-only check against the real PDFs at the repo root. It is skipped in CI because the files are git-ignored.

```ts
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeCr, computeProgress } from '@easy-grades/core';
import { describe, expect, it } from 'vitest';
import { parseDocuments } from '../src/parsers/documents';

// Local-only check against real e-Campus PDFs placed at the repo root (never committed).
const ROOT = process.env.REAL_PDF_DIR ?? resolve(__dirname, '../../..');
const curriculoPath = resolve(ROOT, 'report.pdf');
const historicoPath = resolve(ROOT, 'historico.pdf');
const hasPdfs = existsSync(curriculoPath) && existsSync(historicoPath);

describe.skipIf(!hasPdfs)('real e-Campus PDFs', () => {
  it('parses both documents and reproduces the official numbers', async () => {
    const result = await parseDocuments(
      new Uint8Array(readFileSync(curriculoPath)),
      new Uint8Array(readFileSync(historicoPath)),
    );
    const { curriculum, transcript } = result;

    expect(curriculum.courseCode).toBe(transcript.courseCode);
    expect(curriculum.requirements.totalHours).toBeGreaterThan(0);
    expect(curriculum.courses.length).toBeGreaterThan(50);
    expect(curriculum.courses.every((c) => c.name.length > 0)).toBe(true);
    expect(transcript.entries.length).toBeGreaterThan(10);
    expect(transcript.officialCr).not.toBeNull();
    expect(computeCr(transcript.entries)).toBe(transcript.officialCr);
    expect(computeProgress(curriculum, transcript).percent).toBe(transcript.officialProgressPercent);

    const json = JSON.stringify(result);
    expect(json).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/); // CPF
    expect(json).not.toMatch(/\d{2}\/\d{2}\/\d{4}/); // dates (birth date, emission date)
    for (const forbidden of ['Filiação', 'Docente', 'Doutorado', 'Mestrado', 'SISU', 'SSP-']) {
      expect(json).not.toContain(forbidden);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @easy-grades/api test transcript`
Expected: FAIL. Cannot resolve `../src/parsers/transcript` / `documents`.

- [ ] **Step 3: Implement `apps/api/src/parsers/transcript.ts`**

```ts
import {
  mapStatus,
  termFromAdmission,
  termFromLabel,
  type Category,
  type PendingCourse,
  type Transcript,
  type TranscriptEntry,
} from '@easy-grades/core';
import { ParseError } from '../errors';
import { groupRows, rowText, valueNear, valueRightOf, type Row, type TextItem } from '../pdf/extract';

const CODE_RE = /^[A-Z]{2,7}\d{2,3}$/;
const SECTIONS: Record<string, Category | 'pending'> = {
  'ATIVIDADE CURRICULAR DE EXTENSÃO': 'extensao',
  'Disc. de Outros Currículos do Curso': 'outros',
  'Disciplinas Externas - Origem do Aproveitamento': 'externa',
  ELETIVAS: 'eletiva',
  OBRIGATÓRIAS: 'obrigatoria',
  OPTATIVAS: 'optativa',
  'DISCIPLINAS A VENCER (OBRIGATÓRIAS)': 'pending',
};

/** Everything at or above this label on each page is the student header (PII) and is discarded. */
const HEADER_END_LABEL = 'Situação do Aluno:';

// Column x ranges measured on e-Campus "Histórico Escolar Analítico" PDFs (points).
const CODE_MAX_X = 30;
const NAME = [60, 380] as const;
const CREDITS = [380, 412] as const;
const HOURS = [412, 455] as const;
const GRADE = [455, 495] as const;
const STATUS_MIN_X = 495;

function dropStudentHeader(items: readonly TextItem[]): TextItem[] {
  const cutoff = new Map<number, number>();
  for (const item of items) if (item.text === HEADER_END_LABEL) cutoff.set(item.page, item.y);
  return items.filter((item) => {
    const limit = cutoff.get(item.page);
    return limit !== undefined && item.y < limit - 1;
  });
}

const cell = (row: Row, [min, max]: readonly [number, number]): string =>
  row.items
    .filter((i) => i.x >= min && i.x < max)
    .map((i) => i.text)
    .join(' ');

const intOrNull = (text: string): number | null => (/^\d+$/.test(text) ? Number(text) : null);
const gradeOrNull = (text: string): number | null => (/^\d{1,2}[.,]\d{1,2}$/.test(text) ? Number(text.replace(',', '.')) : null);

function tableNumber(items: readonly TextItem[], label: string, xMin: number, xMax: number, dyMin = -1.5): number | null {
  const anchor = items.find((i) => i.x < 30 && i.text === label);
  if (!anchor) return null;
  const match = /(\d+(?:,\d+)?)/.exec(valueNear(items, anchor, xMin, xMax, dyMin) ?? '');
  return match ? Number(match[1]!.replace(',', '.')) : null;
}

export function parseTranscript(items: readonly TextItem[]): Transcript {
  if (!items.some((i) => i.text === 'Histórico Escolar Analítico')) throw new ParseError('NOT_TRANSCRIPT');

  // Whitelisted header values. Nothing else from the header is ever read.
  const courseCode = /^([A-Z0-9]{2,8})\s*-/.exec(valueRightOf(items, 'Curso:') ?? '')?.[1];
  const curriculumVersion = valueRightOf(items, 'Versão (Currículo) :');
  const admissionTerm = termFromAdmission(valueRightOf(items, 'Ano/Período Ingresso:') ?? '');
  if (!courseCode || !curriculumVersion || !/^\d{4}\/\d$/.test(curriculumVersion)) throw new ParseError('NOT_TRANSCRIPT');

  const body = dropStudentHeader(items);
  const entries: TranscriptEntry[] = [];
  const pending: PendingCourse[] = [];
  let officialCr: number | null = null;
  let section: Category | 'pending' | null = null;
  let term: string | null = null;
  let idealPeriod: number | null = null;

  for (const row of groupRows(body)) {
    const text = rowText(row);
    if (text.startsWith('OBSERVAÇÕES')) break;
    const cr = /COEFICIENTE DE RENDIMENTO ESCOLAR\s*=\s*(\d+[.,]\d+)/.exec(text);
    if (cr) {
      officialCr = Number(cr[1]!.replace(',', '.'));
      continue;
    }
    const nextSection = SECTIONS[text];
    if (nextSection) {
      section = nextSection;
      term = null;
      continue;
    }
    if (text.startsWith('Periodo:')) {
      term = termFromLabel(text);
      continue;
    }
    if (text.startsWith('Período Ideal:')) {
      idealPeriod = intOrNull(text.replace('Período Ideal:', '').trim());
      continue;
    }
    const first = row.items[0];
    if (!first || first.x > CODE_MAX_X || !CODE_RE.test(first.text)) continue;
    const name = cell(row, NAME) || first.text;
    if (section === 'pending') {
      pending.push({ code: first.text, name, idealPeriod });
      continue;
    }
    if (!section || !term) continue;
    const rawStatus = row.items.find((i) => i.x >= STATUS_MIN_X)?.text ?? '';
    entries.push({
      code: first.text,
      name,
      category: section,
      term,
      credits: intOrNull(cell(row, CREDITS)),
      hours: intOrNull(cell(row, HOURS)),
      grade: gradeOrNull(cell(row, GRADE)),
      status: mapStatus(rawStatus),
      rawStatus: rawStatus.slice(0, 40),
    });
  }

  if (entries.length === 0 && pending.length === 0) throw new ParseError('NOT_TRANSCRIPT');
  return {
    courseCode,
    curriculumVersion,
    admissionTerm,
    officialCr,
    officialProgressPercent: tableNumber(body, 'TOTAL', 340, 380),
    aaccDoneHours: tableNumber(body, 'ATIVIDADES-ACADÊMICO-CIENTÍFICO-', 280, 330, -8),
    extensaoDoneHours: tableNumber(body, 'ATIVIDADE CURRICULAR DE EXTENSÃO', 280, 330),
    entries,
    pending,
  };
}
```

- [ ] **Step 4: Implement `apps/api/src/parsers/documents.ts`**

```ts
import { ParseResponseSchema, type ParseResponse } from '@easy-grades/core';
import { ParseError } from '../errors';
import { extractItems } from '../pdf/extract';
import { parseCurriculum } from './curriculum';
import { parseTranscript } from './transcript';

export async function parseDocuments(curriculumPdf: Uint8Array, transcriptPdf: Uint8Array): Promise<ParseResponse> {
  const curriculum = parseCurriculum(await extractItems(curriculumPdf));
  const transcript = parseTranscript(await extractItems(transcriptPdf));
  if (curriculum.courseCode !== transcript.courseCode || curriculum.version !== transcript.curriculumVersion) {
    throw new ParseError('CURRICULUM_MISMATCH');
  }
  // Re-validating strips any key not in the whitelisted schema.
  return ParseResponseSchema.parse({ curriculum, transcript });
}
```

- [ ] **Step 5: Run tests (synthetic + real if present)**

Run: `pnpm --filter @easy-grades/api test`
Expected: PASS.
- If `report.pdf` and `historico.pdf` exist at the repo root, `real-pdfs.test.ts` also runs and must PASS: CR equals the official CR, progress equals the official %, and no CPF or date patterns appear.
- Otherwise it shows as skipped.

- [ ] **Step 6: Commit**

```bash
git add apps/api
git commit -m "feat(api): transcript parser with PII whitelist and curriculum/transcript pairing"
```

---

## Task 11: HTTP server, upload route and security hardening

**Files:**
- Create: `apps/api/src/routes/parse.ts`, `apps/api/src/app.ts`, `apps/api/src/server.ts`
- Test: `apps/api/test/routes.test.ts`

**Interfaces:**
- Consumes: `parseDocuments`, `ParseError`, `ERROR_STATUS`, and core `ERROR_MESSAGES`.
- Produces:
  - `buildApp(opts?: AppOptions): Promise<FastifyInstance>` with `AppOptions = { staticDir?, rateLimitMax? (10), parseTimeoutMs? (10000), logger?, trustProxy? }`
  - `MAX_FILE_BYTES`, `isPdf(bytes)`
  - Routes: `GET /api/health`, `POST /api/parse`, and with `staticDir` the SPA files plus an `index.html` fallback for non-`/api` GETs.
  - Env vars read by `server.ts`: `PORT` (3001), `HOST` (0.0.0.0), `STATIC_DIR`, `TRUST_PROXY=true` (only behind a reverse proxy, so the rate limit sees real client IPs).

**Security notes:**
- The CSP disables `upgrade-insecure-requests`. It would break `http://localhost` runs of the container.
- `style-src 'unsafe-inline'` is required by React Flow / Recharts inline styles.
- `img-src data: blob:` is required by the PNG export.

- [ ] **Step 1: Write the failing route tests**

`apps/api/test/routes.test.ts`:

```ts
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp, type AppOptions } from '../src/app';
import { buildPdf } from './fixtures/build-pdf';
import { curriculumPages } from './fixtures/curriculum-fixture';
import { FAKE_PII, transcriptPages } from './fixtures/transcript-fixture';

let curriculo: Uint8Array;
let historico: Uint8Array;
let app: FastifyInstance | undefined;

beforeAll(async () => {
  curriculo = await buildPdf(curriculumPages());
  historico = await buildPdf(transcriptPages());
});
afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function start(opts: AppOptions = {}): Promise<FastifyInstance> {
  app = await buildApp(opts);
  return app;
}

function form(files: Record<string, Uint8Array>): FormData {
  const body = new FormData();
  for (const [field, bytes] of Object.entries(files)) {
    body.append(field, new Blob([bytes], { type: 'application/pdf' }), `${field}.pdf`);
  }
  return body;
}

const upload = (server: FastifyInstance, files: Record<string, Uint8Array>) =>
  server.inject({ method: 'POST', url: '/api/parse', payload: form(files) });

describe('GET /api/health', () => {
  it('answers with security headers', async () => {
    const res = await (await start()).inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('POST /api/parse', () => {
  it('returns the parsed, PII-free documents', async () => {
    const res = await upload(await start(), { curriculo, historico });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.curriculum.courseCode).toBe('IE17');
    expect(body.transcript.entries.length).toBeGreaterThan(0);
    for (const pii of FAKE_PII) expect(res.body).not.toContain(pii);
  });

  it('[RF-2] reports swapped files as NOT_CURRICULUM', async () => {
    const res = await upload(await start(), { curriculo: historico, historico: curriculo });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ error: { code: 'NOT_CURRICULUM', message: expect.any(String) } });
  });

  // Factories: the PDFs only exist after beforeAll runs.
  it.each([
    ['a missing file', () => ({ curriculo }), 400, 'MISSING_FILE'],
    ['a non-PDF file', () => ({ curriculo, historico: new TextEncoder().encode('hello') }), 400, 'INVALID_PDF'],
    ['an unexpected field', () => ({ curriculo, outro: historico }), 400, 'INVALID_UPLOAD'],
  ] as const)('rejects %s', async (_label, files, status, code) => {
    const res = await upload(await start(), files());
    expect(res.statusCode).toBe(status);
    expect(res.json().error.code).toBe(code);
  });

  it('rejects more than two files', async () => {
    const body = form({ curriculo, historico });
    body.append('historico', new Blob([historico]), 'x.pdf');
    const res = await (await start()).inject({ method: 'POST', url: '/api/parse', payload: body });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_UPLOAD');
  });

  it('rejects files above 5 MB', async () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 10);
    big.set(new TextEncoder().encode('%PDF-'));
    const res = await upload(await start(), { curriculo: big, historico });
    expect(res.statusCode).toBe(413);
    expect(res.json().error.code).toBe('TOO_LARGE');
  });

  it('rejects non-multipart requests', async () => {
    const res = await (await start()).inject({ method: 'POST', url: '/api/parse', payload: { a: 1 } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_UPLOAD');
  });

  it('rate-limits per IP', async () => {
    const server = await start({ rateLimitMax: 2 });
    await upload(server, { curriculo });
    await upload(server, { curriculo });
    const res = await upload(server, { curriculo });
    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe('RATE_LIMITED');
  });

  it('times out slow parses', async () => {
    const res = await upload(await start({ parseTimeoutMs: 1 }), { curriculo, historico });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('PARSE_TIMEOUT');
  });

  it('never sends stack traces', async () => {
    const res = await upload(await start(), { curriculo, historico: new TextEncoder().encode('%PDF-broken') });
    expect(Object.keys(res.json())).toEqual(['error']);
    expect(res.body).not.toContain('at ');
  });
});

describe('static hosting', () => {
  it('serves the SPA and falls back to index.html, but not for /api', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'eg-static-'));
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Easy Grades</title>');
    const server = await start({ staticDir: dir });
    expect((await server.inject({ method: 'GET', url: '/' })).body).toContain('Easy Grades');
    expect((await server.inject({ method: 'GET', url: '/planejamento' })).body).toContain('Easy Grades');
    const api = await server.inject({ method: 'GET', url: '/api/nope' });
    expect(api.statusCode).toBe(404);
    expect(api.json().error.code).toBe('NOT_FOUND');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @easy-grades/api test routes`
Expected: FAIL. Cannot resolve `../src/app`.

- [ ] **Step 3: Implement `apps/api/src/routes/parse.ts`**

```ts
import type { FastifyPluginAsync } from 'fastify';
import { ParseError } from '../errors';
import { parseDocuments } from '../parsers/documents';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FIELDS = ['curriculo', 'historico'] as const;
type Field = (typeof FIELDS)[number];
const isField = (name: string): name is Field => (FIELDS as readonly string[]).includes(name);

export function isPdf(bytes: Uint8Array): boolean {
  return bytes.length > 5 && Buffer.from(bytes.subarray(0, 5)).toString('latin1') === '%PDF-';
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ParseError('PARSE_TIMEOUT')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export interface ParseRouteOptions {
  rateLimitMax: number;
  parseTimeoutMs: number;
}

export const parseRoute: FastifyPluginAsync<ParseRouteOptions> = async (app, opts) => {
  app.post('/api/parse', { config: { rateLimit: { max: opts.rateLimitMax, timeWindow: '1 minute' } } }, async (request) => {
    if (!request.isMultipart()) throw new ParseError('INVALID_UPLOAD');
    // Files stay in memory for this request only; nothing is written to disk or logged.
    const files = new Map<Field, Uint8Array>();
    for await (const part of request.parts()) {
      if (part.type !== 'file' || !isField(part.fieldname) || files.has(part.fieldname)) {
        throw new ParseError('INVALID_UPLOAD');
      }
      const buffer = await part.toBuffer();
      if (!isPdf(buffer)) throw new ParseError('INVALID_PDF');
      files.set(part.fieldname, new Uint8Array(buffer));
    }
    const curriculo = files.get('curriculo');
    const historico = files.get('historico');
    if (!curriculo || !historico) throw new ParseError('MISSING_FILE');
    return withTimeout(parseDocuments(curriculo, historico), opts.parseTimeoutMs);
  });
};
```

- [ ] **Step 4: Implement `apps/api/src/app.ts`**

```ts
import { ERROR_MESSAGES, type ErrorCode } from '@easy-grades/core';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyError, type FastifyInstance, type FastifyReply } from 'fastify';
import { ERROR_STATUS, ParseError } from './errors';
import { MAX_FILE_BYTES, parseRoute } from './routes/parse';

export interface AppOptions {
  staticDir?: string;
  rateLimitMax?: number;
  parseTimeoutMs?: number;
  logger?: boolean;
  trustProxy?: boolean;
}

const MULTIPART_ERRORS: Record<string, ErrorCode> = {
  FST_REQ_FILE_TOO_LARGE: 'TOO_LARGE',
  FST_FILES_LIMIT: 'INVALID_UPLOAD',
  FST_PARTS_LIMIT: 'INVALID_UPLOAD',
  FST_FIELDS_LIMIT: 'INVALID_UPLOAD',
  FST_INVALID_MULTIPART_CONTENT_TYPE: 'INVALID_UPLOAD',
  FST_PROTO_VIOLATION: 'INVALID_UPLOAD',
};

function sendError(reply: FastifyReply, code: ErrorCode): FastifyReply {
  return reply.code(ERROR_STATUS[code]).send({ error: { code, message: ERROR_MESSAGES[code] } });
}

export async function buildApp(opts: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    // Logs never include bodies, file names, headers or client IPs.
    logger: opts.logger
      ? {
          level: 'info',
          serializers: {
            req: (req) => ({ method: req.method, url: req.url }),
            res: (res) => ({ statusCode: res.statusCode }),
          },
        }
      : false,
    trustProxy: opts.trustProxy ?? false,
    bodyLimit: 1024 * 1024,
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: null,
      },
    },
    crossOriginEmbedderPolicy: false,
  });
  await app.register(rateLimit, { global: false });
  await app.register(multipart, {
    limits: { fileSize: MAX_FILE_BYTES, files: 2, fields: 0, parts: 2, fieldNameSize: 32, headerPairs: 50 },
  });

  app.setErrorHandler((err: FastifyError, request, reply) => {
    if (err instanceof ParseError) return sendError(reply, err.code);
    if (err.statusCode === 429) return sendError(reply, 'RATE_LIMITED');
    const mapped = err.code ? MULTIPART_ERRORS[err.code] : undefined;
    if (mapped) return sendError(reply, mapped);
    if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) return sendError(reply, 'INVALID_UPLOAD');
    // Log only the error identity: messages may echo user content.
    request.log.error({ code: err.code, name: err.name }, 'unhandled error');
    return sendError(reply, 'INTERNAL');
  });

  app.get('/api/health', async () => ({ ok: true }));
  await app.register(parseRoute, { rateLimitMax: opts.rateLimitMax ?? 10, parseTimeoutMs: opts.parseTimeoutMs ?? 10_000 });

  if (opts.staticDir) {
    await app.register(fastifyStatic, { root: opts.staticDir, wildcard: false });
    app.setNotFoundHandler((request, reply) => {
      if (request.method !== 'GET' || request.url.startsWith('/api/')) return sendError(reply, 'NOT_FOUND');
      return reply.sendFile('index.html');
    });
  } else {
    app.setNotFoundHandler((_request, reply) => sendError(reply, 'NOT_FOUND'));
  }
  return app;
}
```

- [ ] **Step 5: Implement `apps/api/src/server.ts`**

```ts
import { resolve } from 'node:path';
import { buildApp } from './app';

const app = await buildApp({
  staticDir: process.env.STATIC_DIR ? resolve(process.env.STATIC_DIR) : undefined,
  logger: true,
  trustProxy: process.env.TRUST_PROXY === 'true',
});
await app.listen({ port: Number(process.env.PORT ?? 3001), host: process.env.HOST ?? '0.0.0.0' });
```

- [ ] **Step 6: Run all API checks and a real boot**

Run: `pnpm --filter @easy-grades/api test && pnpm --filter @easy-grades/api typecheck && pnpm lint`
Expected: PASS (route tests: 13 passing).

Run: `pnpm --filter @easy-grades/api build && PORT=3999 node apps/api/dist/server.js`. In another terminal, run `curl -s localhost:3999/api/health`.
Expected: `{"ok":true}`. The request log lines show only `method`, `url` and `statusCode`. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat(api): parse endpoint with upload limits, rate limit, CSP and SPA hosting"
```

Request the Opus whole-branch review of `feat/api`, fix any findings, then `git checkout main && git merge --no-ff feat/api -m "Merge feat/api"`.

---

## Task 12: Web foundation (Vite, Tailwind v4, shadcn 4, tokens, storage, API client)

**Branch:** `feat/web` (create from `main` after `feat/api` is merged). Tasks 12–18 all live on this branch, and it merges only after Task 18 wires the shell. That way `main` never contains a half-built app.

**Before starting:** read the "Visual direction" section at the top of this plan.

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/doctor.config.json`
- Create: `apps/web/src/main.tsx` (temporary, replaced in Task 18), `apps/web/src/test-setup.ts`, `apps/web/src/styles/index.css`
- Create: `apps/web/src/lib/api.ts`, `storage.ts`, `format.ts`, `use-hash-view.ts`, `use-analysis.ts`
- Create: `apps/web/src/components/state-style.ts`, `apps/web/src/components/StatusBadge.tsx`
- Generated by shadcn: `apps/web/components.json`, `apps/web/src/lib/utils.ts`, `apps/web/src/components/ui/*`
- Modify: `packages/core/package.json` (add the `./fixtures` export)
- Test: `apps/web/src/lib/storage.test.ts`, `api.test.ts`, `format.test.ts`

**Interfaces:**
- Consumes: everything exported by `@easy-grades/core`, plus `@easy-grades/core/fixtures` (`sampleCurriculum`, `sampleTranscript`) in tests.
- Produces:
  - `api.ts`: `class ApiError { code: ErrorCode }`, `OFFLINE_MESSAGE`, `uploadDocuments(curriculo: File, historico: File, signal?): Promise<ParseResponse>`
  - `storage.ts`: `STORAGE_VERSION`, `interface Dataset { data; savedAt; revealed }`, `loadDataset()`, `saveDataset(data): Promise<Dataset>`, `markRevealed()`, `clearDataset()`, `writeRawForTests(value)`
  - `format.ts`: `formatCr`, `formatGrade`, `formatPercent`, `formatHours`, `toTitleCase`
  - `use-hash-view.ts`: `VIEWS`, `type View`, `VIEW_LABELS`, `viewFromHash(hash)`, `useHashView(): View`
  - `use-analysis.ts`: `analyze(data)`, `type Analysis`, `useAnalysis(data)`
  - `state-style.ts`: `STATE_STYLE: Record<CourseState, { icon; badge; accent; iconColor }>`
  - `StatusBadge.tsx`: `<StateBadge state />`, `<EntryStatusBadge status rawStatus />`

- [ ] **Step 1: Expose the core fixtures for web tests**

In `packages/core/package.json`, replace the `exports` field with:

```json
"exports": {
  ".": "./src/index.ts",
  "./fixtures": "./src/__fixtures__/sample.ts"
}
```

- [ ] **Step 2: Create the web package files**

`apps/web/package.json`. shadcn adds its own dependencies in Step 3; these are the ones it doesn't manage.

```json
{
  "name": "@easy-grades/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit -p tsconfig.json && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "@easy-grades/core": "workspace:*",
    "@fontsource-variable/hanken-grotesk": "^5.3.0",
    "@fontsource-variable/literata": "^5.3.0",
    "@xyflow/react": "^12.12.0",
    "html-to-image": "^1.11.13",
    "idb-keyval": "^6.3.0",
    "react": "^19.3.0",
    "react-dom": "^19.3.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.3",
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.3",
    "@testing-library/user-event": "^14.6.7",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.2",
    "fake-indexeddb": "^6.2.5",
    "jsdom": "^30.1.2",
    "tailwindcss": "^4.3.3",
    "vite": "^8.3.4",
    "vitest": "^5.0.3"
  }
}
```

`apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "vite.config.ts"]
}
```

`apps/web/vite.config.ts`. `assetsInlineLimit: 0` matters: Vite would otherwise inline small font subsets as `data:` URIs, which the server's CSP (`font-src 'self'`) blocks. This was found in a real browser run.

```ts
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, proxy: { '/api': 'http://localhost:3001' } },
  // No data: URIs for small assets: the CSP only allows same-origin fonts and scripts.
  build: { sourcemap: false, assetsInlineLimit: 0 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

`apps/web/index.html`:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Acompanhe seu curso na UFAM a partir do currículo e do histórico do e-Campus." />
    <title>Easy Grades</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`apps/web/src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// jsdom lacks these browser APIs used by Recharts, React Flow, Radix and motion.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
```

Temporary `apps/web/src/main.tsx` (Task 18 replaces it with the real app):

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <p>Easy Grades</p>
  </StrictMode>,
);
```

Create a one-line `apps/web/src/styles/index.css` containing `@import "tailwindcss";`. shadcn's preflight needs it, and Step 4 overwrites the file.

Run: `pnpm install`
Expected: installs cleanly.

- [ ] **Step 3: Initialize shadcn 4 non-interactively and add the components**

Run from `apps/web`. The `< /dev/null` prevents any prompt from hanging. In PowerShell, use `$null | pnpm dlx ...` instead.

```bash
cd apps/web
pnpm dlx shadcn@4.21.4 init -t vite -b radix -p nova --no-monorepo --no-rtl -y < /dev/null
pnpm dlx shadcn@4.21.4 add tooltip alert-dialog slider checkbox table input select sonner chart switch label -y < /dev/null
pnpm remove @fontsource-variable/geist shadcn
pnpm add -D shadcn@4.21.4
cd ../..
```

Expected:
- `components.json` (style `radix-nova`), `src/lib/utils.ts` (`export { cn } from "cn"`, the official shadcn `cn` package) and `src/components/ui/{button,tooltip,alert-dialog,slider,checkbox,table,input,select,sonner,chart,switch,label}.tsx` are created.
- `recharts` is pinned at `3.8.0` by shadcn.
- `shadcn` ends up in **devDependencies**. It is only needed at build time for `shadcn/tailwind.css`; as a runtime dependency it pulled a high-severity advisory into `pnpm audit --prod`.

Then patch the generated button's motion (Emil rules: no `transition-all`, press = scale 0.97):

```bash
sed -i 's/active:not-aria-\[haspopup\]:translate-y-px/active:not-aria-[haspopup]:scale-[0.97]/; s/transition-all/transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-snap/' apps/web/src/components/ui/button.tsx
```

Do not edit other files in `components/ui/`. They are generated, react-doctor ignores them (Step 5) and ESLint ignores them (Task 1 config).

- [ ] **Step 4: Replace `apps/web/src/styles/index.css` with the design tokens**

This file replaces what shadcn generated. It keeps shadcn's semantic variables but maps them to the Encontro das Águas palette, puts dark mode on `prefers-color-scheme`, and adds the motion keyframes.

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "@fontsource-variable/literata";
@import "@fontsource-variable/hanken-grotesk";
@import "@xyflow/react/dist/style.css";

/* Dark mode follows the operating system. */
@custom-variant dark (@media (prefers-color-scheme: dark));

@theme inline {
  --font-sans: "Hanken Grotesk Variable", ui-sans-serif, system-ui, sans-serif;
  --font-heading: "Literata Variable", ui-serif, Georgia, serif;

  --color-negro: var(--negro);
  --color-solimoes: var(--solimoes);
  --color-igapo: var(--igapo);
  --color-varzea: var(--varzea);
  --color-vitoria: var(--vitoria);
  --color-urucum: var(--urucum);
  --color-neblina: var(--neblina);

  --ease-snap: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-glide: cubic-bezier(0.77, 0, 0.175, 1);

  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --color-foreground: var(--foreground);
  --color-background: var(--background);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
}

/* Encontro das Águas palette: dark Rio Negro (done) meets clay Solimões (remaining). */
:root {
  --negro: #2b2118;
  --solimoes: #c7a15a;
  --igapo: #2e5e4e;
  --varzea: #eef1ec;
  --vitoria: #8fb57f;
  --urucum: #b4432a;
  --neblina: #a3aba4;
  --water-done: #2b2118;
  --water-left: #c7a15a;

  --background: var(--varzea);
  --foreground: var(--negro);
  --card: #f7f8f5;
  --card-foreground: var(--negro);
  --popover: #fbfbf9;
  --popover-foreground: var(--negro);
  --primary: var(--igapo);
  --primary-foreground: #f4f7f3;
  --secondary: #e2e7e0;
  --secondary-foreground: var(--negro);
  --muted: #e2e7e0;
  --muted-foreground: #565d57;
  --accent: #dde5d9;
  --accent-foreground: var(--negro);
  --destructive: var(--urucum);
  --border: #d3d9d1;
  --input: #c3cbc1;
  --ring: var(--igapo);
  --chart-1: var(--igapo);
  --chart-2: var(--solimoes);
  --chart-3: var(--negro);
  --chart-4: var(--vitoria);
  --chart-5: var(--urucum);
  --radius: 0.5rem;
  --sidebar: var(--card);
  --sidebar-foreground: var(--negro);
  --sidebar-primary: var(--igapo);
  --sidebar-primary-foreground: #f4f7f3;
  --sidebar-accent: var(--accent);
  --sidebar-accent-foreground: var(--negro);
  --sidebar-border: var(--border);
  --sidebar-ring: var(--igapo);
}

@media (prefers-color-scheme: dark) {
  :root {
    --negro: #ece4d8;
    --solimoes: #d4b072;
    --igapo: #6fa58f;
    --varzea: #191511;
    --vitoria: #9cc48c;
    --urucum: #e07257;
    --neblina: #5e655f;
    --water-done: #6b4a2e;
    --water-left: #d4b072;

    --card: #221d18;
    --popover: #27211b;
    --primary-foreground: #10140f;
    --secondary: #2c2620;
    --muted: #2c2620;
    --muted-foreground: #b3aa9c;
    --accent: #332c25;
    --border: #3a332b;
    --input: #453d34;
    --sidebar-primary-foreground: #10140f;
  }
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  html {
    @apply font-sans;
  }
  body {
    @apply bg-background text-foreground antialiased;
    font-variant-numeric: tabular-nums;
    line-height: 1.55;
  }
  h1,
  h2,
  h3 {
    font-family: var(--font-heading);
    line-height: 1.1;
    letter-spacing: -0.01em;
  }
}

/* Press feedback for anything clickable. */
.press {
  transition: transform 160ms var(--ease-snap);
}
.press:active {
  transform: scale(0.97);
}

/* WatersBand: one-time reveal when a dataset is first shown. */
@keyframes waters-in {
  from {
    clip-path: inset(0 100% 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}
.waters-band[data-reveal] {
  animation: waters-in 900ms var(--ease-snap) both;
}

/* Flowchart: column-staggered entrance (40ms per column). */
@keyframes node-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
.course-node {
  animation: node-in 260ms var(--ease-snap) both;
  animation-delay: calc(var(--col, 0) * 40ms);
}

.react-flow {
  --xy-background-color: transparent;
  --xy-node-boxshadow-selected: 0 0 0 2px var(--igapo);
  --xy-minimap-background-color: var(--card);
  --xy-controls-button-background-color: var(--card);
  --xy-controls-button-color: var(--foreground);
  --xy-controls-button-border-color: var(--border);
}
.react-flow__minimap {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
/* SVG presentation attributes ignore CSS variables, so React Flow colors are set here. */
.react-flow__minimap-node.mini-done {
  fill: var(--igapo);
}
.react-flow__minimap-node.mini-left {
  fill: var(--solimoes);
}
.react-flow__background {
  --xy-background-pattern-dots-color-default: var(--border);
}
.react-flow__minimap-mask {
  fill: color-mix(in oklch, var(--background) 70%, transparent);
}
.react-flow__node:focus-visible {
  outline: 2px solid var(--igapo);
  outline-offset: 3px;
  border-radius: var(--radius);
}

@media (prefers-reduced-motion: reduce) {
  .waters-band[data-reveal],
  .course-node {
    animation: none;
  }
  .press:active {
    transform: none;
  }
}
```

- [ ] **Step 5: Configure react-doctor to skip generated shadcn files**

`apps/web/doctor.config.json`:

```json
{
  "ignore": { "files": ["src/components/ui/**"] }
}
```

- [ ] **Step 6: Write the failing lib tests**

`apps/web/src/lib/storage.test.ts`:

```ts
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearDataset, loadDataset, markRevealed, saveDataset, STORAGE_VERSION, writeRawForTests } from './storage';

const data = { curriculum: sampleCurriculum, transcript: sampleTranscript };

describe('storage', () => {
  beforeEach(async () => {
    await clearDataset();
  });

  it('round-trips a dataset and remembers the reveal', async () => {
    await saveDataset(data);
    const loaded = await loadDataset();
    expect(loaded?.data).toEqual(data);
    expect(loaded?.revealed).toBe(false);
    await markRevealed();
    expect((await loadDataset())?.revealed).toBe(true);
  });

  it('[RF-3] discards corrupted data', async () => {
    await writeRawForTests({ version: STORAGE_VERSION, data: { curriculum: 'nope' } });
    expect(await loadDataset()).toBeNull();
  });

  it('[RF-3] discards data saved by an older version', async () => {
    await writeRawForTests({ version: STORAGE_VERSION - 1, data });
    expect(await loadDataset()).toBeNull();
  });

  it('returns null when nothing is stored', async () => {
    expect(await loadDataset()).toBeNull();
  });
});
```

`apps/web/src/lib/api.test.ts`:

```ts
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, OFFLINE_MESSAGE, uploadDocuments } from './api';

const pdf = (name: string) => new File(['%PDF-1.7'], name, { type: 'application/pdf' });
const respond = (status: number, body: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('uploadDocuments', () => {
  it('posts both files and returns the validated response', async () => {
    const fetchSpy = respond(200, { curriculum: sampleCurriculum, transcript: sampleTranscript });
    const result = await uploadDocuments(pdf('c.pdf'), pdf('h.pdf'));
    expect(result.transcript.officialCr).toBe(7.757);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/api/parse');
    const body = init!.body as FormData;
    expect(body.get('curriculo')).toBeInstanceOf(File);
    expect(body.get('historico')).toBeInstanceOf(File);
  });

  it('surfaces the server error code and message', async () => {
    respond(422, { error: { code: 'NOT_CURRICULUM', message: 'Arquivo errado.' } });
    await expect(uploadDocuments(pdf('c.pdf'), pdf('h.pdf'))).rejects.toMatchObject({ code: 'NOT_CURRICULUM', message: 'Arquivo errado.' });
  });

  it('maps network failures to an offline message', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(uploadDocuments(pdf('c.pdf'), pdf('h.pdf'))).rejects.toMatchObject({ code: 'INTERNAL', message: OFFLINE_MESSAGE });
  });

  it('rejects responses that do not match the schema', async () => {
    respond(200, { curriculum: {}, transcript: {} });
    await expect(uploadDocuments(pdf('c.pdf'), pdf('h.pdf'))).rejects.toBeInstanceOf(ApiError);
  });
});
```

`apps/web/src/lib/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatCr, formatHours, formatPercent, toTitleCase } from './format';
import { viewFromHash } from './use-hash-view';

describe('format', () => {
  it('formats numbers the Brazilian way', () => {
    expect(formatCr(7.456)).toBe('7,456');
    expect(formatCr(null)).toBe('sem nota');
    expect(formatPercent(64.69)).toBe('64,69%');
    expect(formatHours(3200)).toBe('3.200 h');
  });

  it('title-cases course names keeping roman numerals and connectives', () => {
    expect(toTitleCase('ALGORITMOS E ESTRUTURAS DE DADOS II')).toBe('Algoritmos e Estruturas de Dados II');
    expect(toTitleCase('INTRODUÇÃO À COMPUTAÇÃO')).toBe('Introdução à Computação');
    expect(toTitleCase('LABORATÓRIO DE PROGRAMAÇÃO A')).toBe('Laboratório de Programação A');
  });
});

describe('viewFromHash', () => {
  it('reads known views and falls back to the overview', () => {
    expect(viewFromHash('#/fluxograma')).toBe('fluxograma');
    expect(viewFromHash('#/qualquer')).toBe('visao-geral');
    expect(viewFromHash('')).toBe('visao-geral');
  });
});
```

Run: `pnpm --filter @easy-grades/web test`
Expected: FAIL. Modules `./storage`, `./api`, `./format`, `./use-hash-view` not found.

- [ ] **Step 7: Implement the lib modules**

`apps/web/src/lib/api.ts`. The status is checked before the body is read.

```ts
import {
  ERROR_MESSAGES,
  ErrorResponseSchema,
  ParseResponseSchema,
  type ErrorCode,
  type ParseResponse,
} from '@easy-grades/core';

export class ApiError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = 'ApiError';
    this.code = code;
  }
}

export const OFFLINE_MESSAGE = 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';

export async function uploadDocuments(curriculo: File, historico: File, signal?: AbortSignal): Promise<ParseResponse> {
  const body = new FormData();
  body.append('curriculo', curriculo);
  body.append('historico', historico);

  let response: Response;
  try {
    response = await fetch('/api/parse', { method: 'POST', body, signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError('INTERNAL', OFFLINE_MESSAGE);
  }

  if (!response.ok) {
    const parsed = ErrorResponseSchema.safeParse(await response.json().catch(() => null));
    if (parsed.success) throw new ApiError(parsed.data.error.code, parsed.data.error.message);
    throw new ApiError(response.status === 429 ? 'RATE_LIMITED' : 'INTERNAL');
  }
  const data = ParseResponseSchema.safeParse(await response.json().catch(() => null));
  if (!data.success) throw new ApiError('INTERNAL');
  return data.data;
}
```

`apps/web/src/lib/storage.ts`. Only the already-anonymized JSON is stored; data that is corrupted or from an older version is discarded.

```ts
import { ParseResponseSchema, type ParseResponse } from '@easy-grades/core';
import { createStore, del, get, set, type UseStore } from 'idb-keyval';

/** Bump when the stored shape changes; older records are discarded. */
export const STORAGE_VERSION = 1;
const KEY = 'dataset';

interface StoredDataset {
  version: number;
  savedAt: string;
  revealed: boolean;
  data: ParseResponse;
}

export interface Dataset {
  data: ParseResponse;
  savedAt: string;
  /** Whether the first-visit reveal animation already played for this dataset. */
  revealed: boolean;
}

let store: UseStore | undefined;
const db = (): UseStore => (store ??= createStore('easy-grades', 'kv'));

export async function loadDataset(): Promise<Dataset | null> {
  try {
    const raw = await get<Partial<StoredDataset>>(KEY, db());
    if (!raw) return null;
    const parsed = ParseResponseSchema.safeParse(raw.data);
    if (raw.version !== STORAGE_VERSION || !parsed.success) {
      await del(KEY, db());
      return null;
    }
    return { data: parsed.data, savedAt: String(raw.savedAt ?? ''), revealed: raw.revealed === true };
  } catch {
    // Private mode or blocked storage: behave as if nothing was saved.
    return null;
  }
}

export async function saveDataset(data: ParseResponse): Promise<Dataset> {
  const record: StoredDataset = { version: STORAGE_VERSION, savedAt: new Date().toISOString(), revealed: false, data };
  try {
    await set(KEY, record, db());
  } catch {
    // Storage unavailable: the dashboard still works for this session.
  }
  return { data, savedAt: record.savedAt, revealed: false };
}

export async function markRevealed(): Promise<void> {
  try {
    const raw = await get<StoredDataset>(KEY, db());
    if (raw) await set(KEY, { ...raw, revealed: true }, db());
  } catch {
    // Non-critical.
  }
}

export async function clearDataset(): Promise<void> {
  try {
    await del(KEY, db());
  } catch {
    // Nothing to clear.
  }
}

/** Test helper: write an arbitrary value under the dataset key. */
export async function writeRawForTests(value: unknown): Promise<void> {
  await set(KEY, value, db());
}
```

`apps/web/src/lib/format.ts`:

```ts
const decimals = (n: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: n, maximumFractionDigits: n });
const integer = new Intl.NumberFormat('pt-BR');

export const formatCr = (value: number | null): string => (value === null ? 'sem nota' : decimals(3).format(value));
export const formatGrade = (value: number | null): string => (value === null ? '—' : decimals(2).format(value));
export const formatPercent = (value: number): string => `${decimals(2).format(value)}%`;
export const formatHours = (value: number): string => `${integer.format(value)} h`;

const LOWERCASE_WORDS = new Set(['a', 'à', 'ao', 'as', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'na', 'no', 'o', 'os', 'para', 'por']);
const ROMAN = /^(?=[IVXLC]+$)C{0,3}(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

/** "ALGORITMOS E ESTRUTURA DE DADOS II" → "Algoritmos e Estrutura de Dados II" */
export function toTitleCase(name: string): string {
  const words = name.split(/\s+/);
  return words
    .map((word, index) => {
      if (ROMAN.test(word)) return word;
      const lower = word.toLocaleLowerCase('pt-BR');
      if (index > 0 && index < words.length - 1 && LOWERCASE_WORDS.has(lower)) return lower;
      return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
    })
    .join(' ');
}
```

`apps/web/src/lib/use-hash-view.ts`:

```ts
import { useSyncExternalStore } from 'react';

export const VIEWS = ['visao-geral', 'fluxograma', 'disciplinas', 'planejamento'] as const;
export type View = (typeof VIEWS)[number];

export const VIEW_LABELS: Record<View, string> = {
  'visao-geral': 'Visão geral',
  fluxograma: 'Fluxograma',
  disciplinas: 'Disciplinas',
  planejamento: 'Planejamento',
};

export function viewFromHash(hash: string): View {
  const name = hash.replace(/^#\/?/, '');
  return (VIEWS as readonly string[]).includes(name) ? (name as View) : 'visao-geral';
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/** Current dashboard view, driven by `#/<view>` links so back/forward work. */
export function useHashView(): View {
  return useSyncExternalStore(
    subscribe,
    () => viewFromHash(window.location.hash),
    () => 'visao-geral',
  );
}
```

`apps/web/src/lib/use-analysis.ts`:

```ts
import {
  computeCr,
  computeProgress,
  crByTerm,
  forecastGraduation,
  latestTerm,
  type ParseResponse,
} from '@easy-grades/core';
import { useMemo } from 'react';

export function analyze({ curriculum, transcript }: ParseResponse) {
  return {
    cr: computeCr(transcript.entries),
    crHistory: crByTerm(transcript),
    progress: computeProgress(curriculum, transcript),
    forecast: forecastGraduation(curriculum, transcript),
    currentTerm: latestTerm(transcript),
    unknownStatuses: transcript.entries.filter((e) => e.status === 'desconhecido'),
  };
}

export type Analysis = ReturnType<typeof analyze>;

export function useAnalysis(data: ParseResponse): Analysis {
  return useMemo(() => analyze(data), [data]);
}
```

- [ ] **Step 8: Implement the status styling and badges**

`apps/web/src/components/state-style.ts`. This is kept out of the component file so react-doctor's `only-export-components` stays quiet.

```ts
import type { CourseState } from '@easy-grades/core';
import { CircleCheck, CircleDashed, CircleDot, CircleX, Lock, type LucideIcon } from 'lucide-react';

export interface StateStyle {
  icon: LucideIcon;
  badge: string;
  accent: string;
  iconColor: string;
}

/** Status is always color + icon + text, never color alone. */
export const STATE_STYLE: Record<CourseState, StateStyle> = {
  concluida: { icon: CircleCheck, badge: 'bg-igapo text-primary-foreground border-igapo', accent: 'border-l-igapo', iconColor: 'text-igapo' },
  em_curso: { icon: CircleDot, badge: 'bg-solimoes text-[#2b2118] border-solimoes', accent: 'border-l-solimoes', iconColor: 'text-solimoes' },
  disponivel: { icon: CircleDashed, badge: 'bg-transparent text-foreground border-vitoria border-dashed', accent: 'border-l-vitoria', iconColor: 'text-vitoria' },
  bloqueada: { icon: Lock, badge: 'bg-muted text-muted-foreground border-neblina', accent: 'border-l-neblina', iconColor: 'text-neblina' },
  reprovada: { icon: CircleX, badge: 'bg-urucum text-white border-urucum', accent: 'border-l-urucum', iconColor: 'text-urucum' },
};
```

`apps/web/src/components/StatusBadge.tsx`:

```tsx
import { COURSE_STATE_LABELS, STATUS_LABELS, isCompleted, isFailed, isInProgress, type CourseState, type Status } from '@easy-grades/core';
import { CircleHelp } from 'lucide-react';
import { STATE_STYLE } from '@/components/state-style';
import { cn } from '@/lib/utils';

const badgeBase = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium';

export function StateBadge({ state, className }: { state: CourseState; className?: string }) {
  const { icon: Icon, badge } = STATE_STYLE[state];
  return (
    <span className={cn(badgeBase, badge, className)}>
      <Icon aria-hidden className="size-3.5" />
      {COURSE_STATE_LABELS[state]}
    </span>
  );
}

function stateForStatus(status: Status): CourseState | null {
  if (isCompleted(status)) return 'concluida';
  if (isInProgress(status)) return 'em_curso';
  if (isFailed(status)) return 'reprovada';
  return null;
}

/** Badge for a transcript entry: keeps the precise label (e.g. "Equivalência"). */
export function EntryStatusBadge({ status, rawStatus }: { status: Status; rawStatus: string }) {
  const state = stateForStatus(status);
  if (!state) {
    return (
      <span className={cn(badgeBase, 'border-dashed border-urucum text-urucum')} title={`No histórico: ${rawStatus || 'vazio'}`}>
        <CircleHelp aria-hidden className="size-3.5" />
        {status === 'trancado' ? STATUS_LABELS.trancado : STATUS_LABELS.desconhecido}
      </span>
    );
  }
  const { icon: Icon, badge } = STATE_STYLE[state];
  return (
    <span className={cn(badgeBase, badge)}>
      <Icon aria-hidden className="size-3.5" />
      {STATUS_LABELS[status]}
    </span>
  );
}
```

- [ ] **Step 9: Verify**

Run: `pnpm --filter @easy-grades/web test && pnpm --filter @easy-grades/web typecheck && pnpm lint`
Expected: storage (4), api (4) and format (3) tests PASS, with typecheck and lint at exit 0.

Run: `pnpm react-doctor:changed`
Expected: exit 0, no errors.

- [ ] **Step 10: Commit**

```bash
git add apps/web packages/core/package.json pnpm-lock.yaml
git commit -m "feat(web): Vite + Tailwind v4 + shadcn foundation, design tokens, storage and API client"
```

---

## Task 13: Upload screen

**Files:**
- Create: `apps/web/src/features/upload/validate-pdf.ts`, `Dropzone.tsx`, `UploadScreen.tsx`
- Test: `apps/web/src/features/upload/Dropzone.test.tsx`

**Interfaces:**
- Consumes: `uploadDocuments`, `ApiError`, `ERROR_MESSAGES`, and shadcn `Button`.
- Produces:
  - `MAX_PDF_BYTES`, `validatePdf(file): string | null`
  - `<Dropzone id label documentName file onFile disabled? />`
  - `<UploadScreen onParsed={(data) => Promise<void>} onCancel? />`

**Copy rules:**
- e-Campus menu paths are not known, so do not invent them. Name the reports exactly as the PDFs title them.
- The steps really are a sequence, so a numbered list is correct here.

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/upload/Dropzone.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dropzone } from './Dropzone';
import { MAX_PDF_BYTES, validatePdf } from './validate-pdf';

describe('validatePdf', () => {
  it('accepts PDFs up to 5 MB', () => {
    expect(validatePdf(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toBeNull();
    expect(validatePdf(new File(['x'], 'a.txt', { type: 'text/plain' }))).toBe('Esse arquivo não é um PDF.');
    const big = new File([new Uint8Array(MAX_PDF_BYTES + 1)], 'a.pdf', { type: 'application/pdf' });
    expect(validatePdf(big)).toBe('Arquivo grande demais. O limite é 5 MB.');
  });
});

describe('Dropzone', () => {
  it('passes a valid PDF to onFile', async () => {
    const onFile = vi.fn();
    render(<Dropzone id="curriculo" label="Currículo do curso" documentName="Currículo de Curso" file={null} onFile={onFile} />);
    const file = new File(['%PDF-1.7'], 'curriculo.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText(/Currículo do curso/), file);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('explains why a file was rejected', async () => {
    const onFile = vi.fn();
    render(<Dropzone id="historico" label="Histórico escolar" documentName="Histórico" file={null} onFile={onFile} />);
    await userEvent.upload(screen.getByLabelText(/Histórico escolar/), new File(['x'], 'foto.png', { type: 'image/png' }), {
      applyAccept: false,
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Esse arquivo não é um PDF.');
    expect(onFile).toHaveBeenCalledWith(null);
  });
});
```

Run: `pnpm --filter @easy-grades/web test Dropzone`
Expected: FAIL. Modules not found.

- [ ] **Step 2: Implement**

`apps/web/src/features/upload/validate-pdf.ts`:

```ts
export const MAX_PDF_BYTES = 5 * 1024 * 1024;

export function validatePdf(file: File): string | null {
  const looksLikePdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!looksLikePdf) return 'Esse arquivo não é um PDF.';
  if (file.size > MAX_PDF_BYTES) return 'Arquivo grande demais. O limite é 5 MB.';
  return null;
}
```

`apps/web/src/features/upload/Dropzone.tsx`:

```tsx
import { FileText } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { validatePdf } from './validate-pdf';

interface DropzoneProps {
  id: string;
  label: string;
  documentName: string;
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
}

export function Dropzone({ id, label, documentName, file, onFile, disabled }: DropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function accept(candidate: File | undefined) {
    if (!candidate) return;
    const problem = validatePdf(candidate);
    setError(problem);
    onFile(problem ? null : candidate);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) accept(event.dataTransfer.files[0]);
  }

  const errorId = `${id}-erro`;
  return (
    <div>
      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        data-dragging={dragging || undefined}
        data-filled={file ? true : undefined}
        className="flex cursor-pointer items-start gap-4 rounded-xl border-2 border-dashed border-input bg-card p-5 transition-[border-color,background-color] duration-150 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 data-[dragging]:border-igapo data-[dragging]:bg-accent data-[filled]:border-solid data-[filled]:border-igapo"
      >
        <FileText aria-hidden className="mt-0.5 size-5 shrink-0 text-igapo" />
        <span className="grid gap-1">
          <span className="font-medium">{label}</span>
          <span className="text-sm text-muted-foreground">
            {file ? file.name : `Arraste o PDF "${documentName}" para cá ou clique para escolher.`}
          </span>
        </span>
        <input
          id={id}
          name={id}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          disabled={disabled}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => accept(event.target.files?.[0])}
        />
      </label>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-urucum">
          {error}
        </p>
      )}
    </div>
  );
}
```

`apps/web/src/features/upload/UploadScreen.tsx`:

```tsx
import { ERROR_MESSAGES, type ParseResponse } from '@easy-grades/core';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError, uploadDocuments } from '@/lib/api';
import { Dropzone } from './Dropzone';

interface UploadScreenProps {
  onParsed: (data: ParseResponse) => Promise<void>;
  onCancel?: () => void;
}

export function UploadScreen({ onParsed, onCancel }: UploadScreenProps) {
  const [curriculo, setCurriculo] = useState<File | null>(null);
  const [historico, setHistorico] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!curriculo || !historico) return;
    setSending(true);
    setError(null);
    try {
      await onParsed(await uploadDocuments(curriculo, historico));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : ERROR_MESSAGES.INTERNAL);
      setSending(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-dvh max-w-6xl content-center gap-12 px-4 py-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      <section>
        <p className="font-heading text-lg font-semibold">Easy Grades</p>
        <h1 className="mt-8 max-w-[18ch] text-4xl font-semibold sm:text-[44px]">
          Veja onde você está no curso e o que cabe no próximo semestre.
        </h1>
        <p className="mt-5 max-w-[60ch] text-muted-foreground">
          Envie dois PDFs do e-Campus da UFAM. O servidor lê os arquivos e não guarda nada; o resultado fica salvo só
          neste navegador.
        </p>
        <ol className="mt-8 grid max-w-[60ch] list-decimal gap-2 pl-5 text-sm">
          <li>No e-Campus, gere o relatório "Currículo de Curso (por versão e situação)" da versão que aparece no seu histórico.</li>
          <li>Gere também o seu "Histórico Escolar Analítico".</li>
          <li>Salve os dois em PDF e envie aqui ao lado.</li>
        </ol>
      </section>

      <form onSubmit={handleSubmit} className="grid content-start gap-4" aria-busy={sending}>
        <Dropzone
          id="curriculo"
          label="Currículo do curso"
          documentName="Currículo de Curso"
          file={curriculo}
          onFile={setCurriculo}
          disabled={sending}
        />
        <Dropzone
          id="historico"
          label="Histórico escolar"
          documentName="Histórico Escolar Analítico"
          file={historico}
          onFile={setHistorico}
          disabled={sending}
        />
        {error && (
          <p role="alert" className="rounded-lg border border-urucum/40 bg-urucum/10 p-3 text-sm text-urucum">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="lg" className="press" disabled={!curriculo || !historico || sending}>
            {sending ? 'Lendo os PDFs…' : 'Ler meus PDFs'}
          </Button>
          {onCancel && (
            <Button type="button" size="lg" variant="ghost" className="press" onClick={onCancel}>
              Voltar ao painel
            </Button>
          )}
        </div>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Verify and commit**

Run: `pnpm --filter @easy-grades/web test && pnpm --filter @easy-grades/web typecheck && pnpm lint && pnpm react-doctor:changed`
Expected: PASS / exit 0.

```bash
git add apps/web
git commit -m "feat(web): upload screen with client-side PDF validation"
```

---

## Task 14: Overview screen (WatersBand + charts)

**Files:**
- Create: `apps/web/src/features/overview/chart-utils.ts`, `WatersBand.tsx`, `CrChart.tsx`, `HoursChart.tsx`, `OverviewScreen.tsx`

**Interfaces:**
- Consumes: `Analysis` (from `use-analysis`), core `Progress`, `TermCr`, `Transcript`, `formatTerm`, and shadcn `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, `ChartConfig`.
- Produces:
  - `chart-utils.ts`: `crDomain(values): [number, number]`, `crTicks(domain): number[]`, `hoursByTerm(t)`, `projectionData(history, projected, projectedTerm)`. Task 17 reuses `projectionData` and `crDomain`/`crTicks`.
  - `<WatersBand progress reveal onRevealed />` and `<OverviewScreen data analysis reveal onRevealed />`
  - `CrChart` and `HoursChart` are **default exports**, because they are loaded with `React.lazy`.

**Notes:**
- Recharts is heavy, so the charts are lazy so the numbers paint first.
- react-doctor will show 3 `prefer-dynamic-import` warnings on the chart files. They are false positives: those files are only reached through `React.lazy`. Keep the rule on, since it catches real eager imports.
- Use explicit integer `ticks` (`crTicks`). Recharts' automatic ticks on a CR domain like [5, 10] come out irregular (5, 7, 9, 10).

- [ ] **Step 1: Implement the chart helpers**

`apps/web/src/features/overview/chart-utils.ts`:

```ts
import { compareTerms, formatTerm, isCompleted, isFailed, type TermCr, type Transcript } from '@easy-grades/core';

export function crDomain(values: (number | null)[]): [number, number] {
  const present = values.filter((v): v is number => v !== null);
  const min = present.length ? Math.min(...present) : 0;
  return [Math.max(0, Math.floor(min) - 1), 10];
}

export function crTicks([min, max]: [number, number]): number[] {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

export function hoursByTerm(t: Transcript): { term: string; done: number; failed: number }[] {
  const terms = [...new Set(t.entries.map((e) => e.term))].sort(compareTerms);
  return terms
    .map((term) => {
      const entries = t.entries.filter((e) => e.term === term);
      const sum = (pick: (s: (typeof entries)[number]['status']) => boolean) =>
        entries.filter((e) => pick(e.status)).reduce((total, e) => total + (e.hours ?? 0), 0);
      return { term: formatTerm(term), done: sum(isCompleted), failed: sum(isFailed) };
    })
    .filter((row) => row.done + row.failed > 0);
}

export function projectionData(history: TermCr[], projected: number | null, projectedTerm: string | null) {
  const rows: { term: string; cumulativeCr: number | null; projected: number | null }[] = history.map((h) => ({
    term: formatTerm(h.term),
    cumulativeCr: h.cumulativeCr,
    projected: null,
  }));
  const last = rows.at(-1);
  if (last && projected !== null && projectedTerm) {
    last.projected = last.cumulativeCr; // the dashed line starts where the real one ends
    rows.push({ term: formatTerm(projectedTerm), cumulativeCr: null, projected });
  }
  return rows;
}
```

- [ ] **Step 2: Implement the WatersBand (signature element)**

`apps/web/src/features/overview/WatersBand.tsx`:

```tsx
import type { Progress } from '@easy-grades/core';
import { formatHours, formatPercent } from '@/lib/format';

interface WatersBandProps {
  progress: Progress;
  /** Play the one-time reveal (first time this dataset is shown). */
  reveal: boolean;
  onRevealed: () => void;
}

/**
 * Signature element: completed hours as dark Rio Negro water blending into the clay Solimões of what remains,
 * like the Encontro das Águas in front of Manaus.
 */
export function WatersBand({ progress, reveal, onRevealed }: WatersBandProps) {
  const percent = progress.officialPercent ?? progress.percent;
  const seam = `linear-gradient(90deg, var(--water-done) 0%, var(--water-done) calc(${percent}% - 12px), var(--water-left) calc(${percent}% + 12px), var(--water-left) 100%)`;

  return (
    <section aria-labelledby="progresso">
      <h1 id="progresso" className="text-[clamp(2.75rem,8vw,4rem)] font-semibold">
        {formatPercent(percent)}
      </h1>
      <p className="mt-2 max-w-[60ch] text-muted-foreground">
        do curso concluído: {formatHours(progress.doneHours)} de {formatHours(progress.requiredHours)}.
      </p>
      <div
        role="img"
        aria-label={`${formatPercent(percent)} do curso concluído`}
        className="waters-band mt-6 h-14 rounded-md"
        style={{ background: seam }}
        data-reveal={reveal || undefined}
        onAnimationEnd={reveal ? onRevealed : undefined}
      />
      {progress.divergent && progress.officialPercent !== null && (
        <p className="mt-3 text-sm text-muted-foreground">
          O e-Campus informa {formatPercent(progress.officialPercent)}; pelas disciplinas do histórico calculamos{' '}
          {formatPercent(progress.percent)}. Mostramos o valor do e-Campus.
        </p>
      )}
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
        {progress.categories.map((category) => (
          <div key={category.key}>
            <dt className="text-sm text-muted-foreground">{category.label}</dt>
            <dd className="mt-0.5 font-medium">
              {formatHours(category.doneHours)} <span className="font-normal text-muted-foreground">de {formatHours(category.requiredHours)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
```

- [ ] **Step 3: Implement the charts**

`apps/web/src/features/overview/CrChart.tsx`:

```tsx
import { formatTerm, type TermCr } from '@easy-grades/core';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { crDomain, crTicks } from './chart-utils';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const config = {
  termCr: { label: 'CR do período', color: 'var(--solimoes)' },
  cumulativeCr: { label: 'CR acumulado', color: 'var(--igapo)' },
} satisfies ChartConfig;

export default function CrChart({ history }: { history: TermCr[] }) {
  const data = history.map((h) => ({ term: formatTerm(h.term), termCr: h.termCr, cumulativeCr: h.cumulativeCr }));
  const domain = crDomain(history.flatMap((h) => [h.termCr, h.cumulativeCr]));

  return (
    <figure>
      <figcaption>
        <h2 className="text-xl font-semibold">Coeficiente por período</h2>
      </figcaption>
      <ChartContainer config={config} className="mt-4 aspect-auto h-64 w-full">
        <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="term" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis domain={domain} ticks={crTicks(domain)} tickLine={false} axisLine={false} width={32} />
          <ChartTooltip content={<ChartTooltipContent className="min-w-44" />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Line dataKey="termCr" type="monotone" stroke="var(--color-termCr)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          <Line dataKey="cumulativeCr" type="monotone" stroke="var(--color-cumulativeCr)" strokeWidth={3} dot={false} isAnimationActive={false} />
        </LineChart>
      </ChartContainer>
    </figure>
  );
}
```

`apps/web/src/features/overview/HoursChart.tsx`:

```tsx
import type { Transcript } from '@easy-grades/core';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { hoursByTerm } from './chart-utils';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const config = {
  done: { label: 'Horas concluídas', color: 'var(--igapo)' },
  failed: { label: 'Horas reprovadas', color: 'var(--urucum)' },
} satisfies ChartConfig;

export default function HoursChart({ transcript }: { transcript: Transcript }) {
  return (
    <figure>
      <figcaption>
        <h2 className="text-xl font-semibold">Horas por período</h2>
      </figcaption>
      <ChartContainer config={config} className="mt-4 aspect-auto h-64 w-full">
        <BarChart data={hoursByTerm(transcript)} margin={{ left: 0, right: 12, top: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="term" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={40} />
          <ChartTooltip content={<ChartTooltipContent className="min-w-44" />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="done" stackId="h" fill="var(--color-done)" radius={[0, 0, 4, 4]} isAnimationActive={false} />
          <Bar dataKey="failed" stackId="h" fill="var(--color-failed)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
    </figure>
  );
}
```

- [ ] **Step 4: Implement the screen**

`apps/web/src/features/overview/OverviewScreen.tsx`:

```tsx
import { formatTerm, type ParseResponse } from '@easy-grades/core';
import { TriangleAlert } from 'lucide-react';
import { lazy, Suspense } from 'react';
import type { Analysis } from '@/lib/use-analysis';
import { formatCr } from '@/lib/format';
import { WatersBand } from './WatersBand';

// Recharts is heavy: charts stream in after the numbers are on screen.
const CrChart = lazy(() => import('./CrChart'));
const HoursChart = lazy(() => import('./HoursChart'));
const chartFallback = <div aria-hidden className="h-72 rounded-lg bg-muted/60" />;

interface OverviewScreenProps {
  data: ParseResponse;
  analysis: Analysis;
  reveal: boolean;
  onRevealed: () => void;
}

export function OverviewScreen({ data, analysis, reveal, onRevealed }: OverviewScreenProps) {
  const { cr, crHistory, progress, forecast, unknownStatuses } = analysis;
  const officialCr = data.transcript.officialCr;
  const graduation = forecast.graduationTerm ? formatTerm(forecast.graduationTerm) : 'sem previsão';

  return (
    <div className="grid gap-14">
      <WatersBand progress={progress} reveal={reveal} onRevealed={onRevealed} />

      <section aria-label="Resumo" className="grid gap-8 border-y border-border py-8 sm:grid-cols-3">
        <div>
          <h2 className="font-sans text-sm font-normal tracking-normal text-muted-foreground">
            Coeficiente de rendimento
          </h2>
          <p className="mt-1 font-heading text-[44px] font-semibold leading-none">{formatCr(officialCr ?? cr)}</p>
          {officialCr !== null && cr !== null && officialCr !== cr && (
            <p className="mt-2 text-sm text-muted-foreground">Pelas notas do histórico: {formatCr(cr)}.</p>
          )}
        </div>
        <div>
          <h2 className="font-sans text-sm font-normal tracking-normal text-muted-foreground">
            Previsão de formatura
          </h2>
          <p className="mt-1 font-heading text-[44px] font-semibold leading-none">{graduation}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {forecast.remainingTerms === 0
              ? 'Sem obrigatórias pendentes além das que estão em curso.'
              : `${forecast.remainingTerms} ${forecast.remainingTerms === 1 ? 'semestre' : 'semestres'} de obrigatórias pela frente.`}
            {forecast.exceedsMax && forecast.maxTerm && ` Passa do prazo máximo (${formatTerm(forecast.maxTerm)}).`}
          </p>
        </div>
        <div>
          <h2 className="font-sans text-sm font-normal tracking-normal text-muted-foreground">
            Fora das disciplinas
          </h2>
          <p className="mt-1 font-heading text-[44px] font-semibold leading-none">
            {forecast.pendingHours.aacc + forecast.pendingHours.extensao} h
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            de atividades complementares e extensão ainda por cumprir.
          </p>
        </div>
      </section>

      {unknownStatuses.length > 0 && (
        <p role="status" className="flex gap-2 rounded-lg border border-urucum/40 bg-urucum/10 p-3 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-urucum" />
          <span>
            {unknownStatuses.length === 1 ? 'Uma disciplina tem' : `${unknownStatuses.length} disciplinas têm`} situação que
            não reconhecemos ({[...new Set(unknownStatuses.map((e) => e.rawStatus || 'vazia'))].join(', ')}) e ficaram fora
            das contas.
          </span>
        </p>
      )}

      <div className="grid gap-12 lg:grid-cols-2">
        <Suspense fallback={chartFallback}>
          <CrChart history={crHistory} />
        </Suspense>
        <Suspense fallback={chartFallback}>
          <HoursChart transcript={data.transcript} />
        </Suspense>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify and commit**

Run: `pnpm --filter @easy-grades/web test && pnpm --filter @easy-grades/web typecheck && pnpm lint && pnpm react-doctor:changed`
Expected: PASS / exit 0. react-doctor reports only the documented `prefer-dynamic-import` warnings.

```bash
git add apps/web
git commit -m "feat(web): overview with Encontro das Águas progress band and CR/hours charts"
```

---

## Task 15: Course flowchart (React Flow)

**Files:**
- Create: `apps/web/src/features/flowchart/highlight.ts`, `CourseNode.tsx`, `FlowLegend.tsx`, `FlowchartList.tsx`, `FlowchartScreen.tsx`
- Test: `apps/web/src/features/flowchart/highlight.test.ts`

**Interfaces:**
- Consumes: core `layoutFlowchart`, `FlowNode`, `FlowEdge`, `prerequisiteClosure`, `dependentClosure`, `COURSE_STATE_LABELS`, plus `STATE_STYLE`, `StateBadge`, `toTitleCase`, `formatGrade`.
- Produces:
  - `highlightSet(curriculum, code | null): Set<string> | null`
  - `visibleGraph(nodes, edges, onlyRemaining)`
  - `CourseNode` (memoized React Flow node, `type: 'course'`) and `type CourseNodeType`
  - `FlowchartScreen` as a **default export** (lazy-loaded by the Dashboard)

**Behaviour:**
- **Viewport:** the whole course is fitted only when cards stay readable (zoom ≥ 0.75). Otherwise it opens at zoom 0.8 on the 1st period and the student pans. Fitting 8 columns at ~0.5 zoom was unreadable in the real browser check.
- **Focus highlight:** hover or select (click, or keyboard Enter) dims everything outside the course's prerequisite chain and its unlocks, with opacity at 150 ms.
- **Edges:** satisfied edges are igapó, unmet ones neblina, and OR blocks are dashed.
- **Minimap and background colors live in CSS:** SVG presentation attributes ignore `var(--x)`, so React Flow's `nodeColor`/`color` props with CSS variables render nothing. Use `nodeClassName` plus the CSS in `index.css`.
- **Accessibility:** the "Ver como lista" switch shows `FlowchartList`, a screen-reader friendly view grouped by period.
- **Export:** `html-to-image` renders the PNG locally, with no network. `img-src data: blob:` is already in the CSP.

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/flowchart/highlight.test.ts`:

```ts
import { layoutFlowchart } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { describe, expect, it } from 'vitest';
import { highlightSet, visibleGraph } from './highlight';

describe('highlightSet', () => {
  it('returns null without focus', () => {
    expect(highlightSet(sampleCurriculum, null)).toBeNull();
  });
  it('includes the course, its prerequisites and what it unlocks', () => {
    const set = highlightSet(sampleCurriculum, 'ICC431')!;
    expect(set.has('ICC431')).toBe(true);
    expect(set.has('ICC430')).toBe(true);
    expect(set.has('ICC001')).toBe(true);
    expect(set.has('ICC404')).toBe(true);
    expect(set.has('ICC150')).toBe(true);
    expect(set.has('IEM075')).toBe(false);
  });
});

describe('visibleGraph', () => {
  it('drops completed courses and their edges when only the remaining path is shown', () => {
    const { nodes, edges } = layoutFlowchart(sampleCurriculum, sampleTranscript);
    const remaining = visibleGraph(nodes, edges, true);
    expect(remaining.nodes.every((n) => n.state !== 'concluida')).toBe(true);
    expect(remaining.nodes.map((n) => n.code)).toContain('ICC418');
    expect(remaining.edges.map((e) => e.id)).toEqual(['ICC412->ICC418']);
    expect(visibleGraph(nodes, edges, false).nodes).toHaveLength(nodes.length);
  });
});
```

Run: `pnpm --filter @easy-grades/web test highlight`
Expected: FAIL. Module not found.

- [ ] **Step 2: Implement `apps/web/src/features/flowchart/highlight.ts`**

```ts
import { dependentClosure, prerequisiteClosure, type Curriculum, type FlowEdge, type FlowNode } from '@easy-grades/core';

/** The focused course plus everything it depends on and everything it unlocks; null when nothing is focused. */
export function highlightSet(curriculum: Curriculum, code: string | null): Set<string> | null {
  if (!code) return null;
  return new Set([code, ...prerequisiteClosure(curriculum, code), ...dependentClosure(curriculum, code)]);
}

/** Hides completed courses (and edges touching them) when only the remaining path matters. */
export function visibleGraph(nodes: FlowNode[], edges: FlowEdge[], onlyRemaining: boolean): { nodes: FlowNode[]; edges: FlowEdge[] } {
  if (!onlyRemaining) return { nodes, edges };
  const kept = nodes.filter((n) => n.state !== 'concluida');
  const codes = new Set(kept.map((n) => n.code));
  return { nodes: kept, edges: edges.filter((e) => codes.has(e.source) && codes.has(e.target)) };
}
```

- [ ] **Step 3: Implement the node, legend and list**

`apps/web/src/features/flowchart/CourseNode.tsx`:

```tsx
import { COURSE_STATE_LABELS, type FlowNode } from '@easy-grades/core';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { memo, type CSSProperties } from 'react';
import { STATE_STYLE } from '@/components/state-style';
import { formatGrade, toTitleCase } from '@/lib/format';
import { cn } from '@/lib/utils';

export type CourseNodeData = { course: FlowNode; dimmed: boolean };
export type CourseNodeType = Node<CourseNodeData, 'course'>;

export const COURSE_NODE_WIDTH = 232;

function CourseNodeView({ data }: NodeProps<CourseNodeType>) {
  const { course, dimmed } = data;
  const style = STATE_STYLE[course.state];
  const Icon = style.icon;
  return (
    <div
      data-dimmed={dimmed || undefined}
      style={{ '--col': course.column, width: COURSE_NODE_WIDTH } as CSSProperties}
      className={cn(
        'course-node h-[84px] rounded-lg border border-l-4 bg-card px-3 py-2 text-left transition-opacity duration-150 data-[dimmed]:opacity-25',
        style.accent,
      )}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} className="!size-1.5 !border-0 !bg-neblina" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{course.code}</span>
        <Icon aria-hidden className={cn('size-4', style.iconColor)} />
      </div>
      <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug">{toTitleCase(course.name)}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {course.credits} créditos
        {course.grade !== null && `, nota ${formatGrade(course.grade)}`}
      </p>
      <span className="sr-only">{COURSE_STATE_LABELS[course.state]}</span>
      <Handle type="source" position={Position.Right} isConnectable={false} className="!size-1.5 !border-0 !bg-neblina" />
    </div>
  );
}

export const CourseNode = memo(CourseNodeView);
```

`apps/web/src/features/flowchart/FlowLegend.tsx`:

```tsx
import { COURSE_STATE_LABELS, type CourseState, type FlowNode } from '@easy-grades/core';
import { STATE_STYLE } from '@/components/state-style';
import { cn } from '@/lib/utils';

const ORDER: CourseState[] = ['concluida', 'em_curso', 'disponivel', 'bloqueada', 'reprovada'];

export function FlowLegend({ nodes }: { nodes: FlowNode[] }) {
  const counts = new Map<CourseState, number>();
  for (const node of nodes) counts.set(node.state, (counts.get(node.state) ?? 0) + 1);
  return (
    <ul aria-label="Legenda" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      {ORDER.filter((state) => counts.has(state)).map((state) => {
        const { icon: Icon, iconColor } = STATE_STYLE[state];
        return (
          <li key={state} className="flex items-center gap-1.5">
            <Icon aria-hidden className={cn('size-4', iconColor)} />
            {COURSE_STATE_LABELS[state]}
            <span className="text-muted-foreground">{counts.get(state)}</span>
          </li>
        );
      })}
    </ul>
  );
}
```

`apps/web/src/features/flowchart/FlowchartList.tsx`:

```tsx
import type { Curriculum, FlowNode } from '@easy-grades/core';
import { StateBadge } from '@/components/StatusBadge';
import { formatGrade, toTitleCase } from '@/lib/format';

/** Screen-reader and keyboard friendly alternative to the graph. */
export function FlowchartList({ nodes, curriculum }: { nodes: FlowNode[]; curriculum: Curriculum }) {
  const prereqs = new Map(curriculum.courses.map((c) => [c.code, c.prerequisites]));
  const periods = [...new Set(nodes.map((n) => n.idealPeriod))].sort((a, b) => a - b);
  return (
    <div className="grid gap-8">
      {periods.map((period) => (
        <section key={period} aria-labelledby={`periodo-${period}`}>
          <h3 id={`periodo-${period}`} className="text-lg font-semibold">
            {period}º período
          </h3>
          <ul className="mt-3 grid gap-2">
            {nodes
              .filter((n) => n.idealPeriod === period)
              .map((n) => {
                const blocks = prereqs.get(n.code) ?? [];
                return (
                  <li key={n.code} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-2">
                    <span className="text-sm text-muted-foreground">{n.code}</span>
                    <span className="font-medium">{toTitleCase(n.name)}</span>
                    <StateBadge state={n.state} />
                    {n.grade !== null && <span className="text-sm">nota {formatGrade(n.grade)}</span>}
                    {blocks.length > 0 && (
                      <span className="w-full text-sm text-muted-foreground">
                        Pré-requisitos: {blocks.map((b) => b.join(' e ')).join(' ou ')}
                      </span>
                    )}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement the screen**

`apps/web/src/features/flowchart/FlowchartScreen.tsx`:

```tsx
import { layoutFlowchart, type ParseResponse } from '@easy-grades/core';
import {
  Background,
  Controls,
  getNodesBounds,
  getViewportForBounds,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import { toPng } from 'html-to-image';
import { Download } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CourseNode, type CourseNodeType } from './CourseNode';
import { FlowchartList } from './FlowchartList';
import { FlowLegend } from './FlowLegend';
import { highlightSet, visibleGraph } from './highlight';

const nodeTypes = { course: CourseNode };

function Graph({ data }: { data: ParseResponse }) {
  const { curriculum, transcript } = data;
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [onlyRemaining, setOnlyRemaining] = useState(false);
  const [asList, setAsList] = useState(false);
  const { getNodes, fitView, setViewport } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  const layout = useMemo(() => layoutFlowchart(curriculum, transcript, { columnWidth: 264, rowHeight: 104 }), [curriculum, transcript]);
  const graph = useMemo(() => visibleGraph(layout.nodes, layout.edges, onlyRemaining), [layout, onlyRemaining]);
  const focus = hovered ?? pinned;
  const highlighted = useMemo(() => highlightSet(curriculum, focus), [curriculum, focus]);

  const nodes = useMemo<CourseNodeType[]>(
    () =>
      graph.nodes.map((course) => ({
        id: course.code,
        type: 'course',
        position: { x: course.x, y: course.y },
        data: { course, dimmed: highlighted !== null && !highlighted.has(course.code) },
        draggable: false,
        connectable: false,
        ariaLabel: `${course.code} ${course.name}`,
      })),
    [graph.nodes, highlighted],
  );

  const edges = useMemo<Edge[]>(
    () =>
      graph.edges.map((edge) => {
        const inChain = highlighted !== null && highlighted.has(edge.source) && highlighted.has(edge.target);
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          focusable: false,
          style: {
            stroke: edge.satisfied ? 'var(--igapo)' : 'var(--neblina)',
            strokeWidth: inChain ? 2.5 : 1.5,
            strokeDasharray: edge.alternative ? '5 4' : undefined,
            opacity: highlighted === null || inChain ? 1 : 0.15,
            transition: 'opacity 150ms ease, stroke-width 150ms ease',
          },
        };
      }),
    [graph.edges, highlighted],
  );

  // Fit the whole course only when cards stay readable; otherwise start at the 1st period and let the student pan.
  const onInit = useCallback(() => {
    const width = containerRef.current?.clientWidth ?? 0;
    if ((width - 48) / layout.width >= 0.75) void fitView({ padding: 0.06 });
    else void setViewport({ x: 24, y: 24, zoom: 0.8 });
  }, [fitView, setViewport, layout.width]);

  const onSelectionChange = useCallback(({ nodes: selected }: OnSelectionChangeParams) => {
    setPinned(selected[0]?.id ?? null);
  }, []);

  async function exportPng() {
    const viewportEl = document.querySelector<HTMLElement>('.react-flow__viewport');
    if (!viewportEl) return;
    const bounds = getNodesBounds(getNodes());
    const width = Math.ceil(bounds.width + 160);
    const height = Math.ceil(bounds.height + 160);
    const viewport = getViewportForBounds(bounds, width, height, 0.5, 2, 0.08);
    try {
      const url = await toPng(viewportEl, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        width,
        height,
        style: { width: `${width}px`, height: `${height}px`, transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` },
      });
      const link = document.createElement('a');
      link.download = 'fluxograma.png';
      link.href = url;
      link.click();
      toast.success('Fluxograma exportado.');
    } catch {
      toast.error('Não foi possível exportar a imagem. Tente de novo.');
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-[44px]">Fluxograma do curso</h1>
          <p className="mt-2 max-w-[60ch] text-muted-foreground">
            Passe o mouse ou selecione uma disciplina para ver o que ela exige e o que ela libera. Arraste o fundo para
            percorrer os períodos.
          </p>
        </div>
        <Button variant="outline" size="sm" className="press" onClick={exportPng} disabled={asList}>
          <Download aria-hidden />
          Exportar PNG
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <FlowLegend nodes={layout.nodes} />
        <div className="flex flex-wrap gap-5">
          <div className="flex items-center gap-2">
            <Switch id="so-pendentes" checked={onlyRemaining} onCheckedChange={setOnlyRemaining} />
            <Label htmlFor="so-pendentes">Mostrar só o que falta</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="como-lista" checked={asList} onCheckedChange={setAsList} />
            <Label htmlFor="como-lista">Ver como lista</Label>
          </div>
        </div>
      </div>

      {asList ? (
        <FlowchartList nodes={graph.nodes} curriculum={curriculum} />
      ) : (
        <div ref={containerRef} className="-mx-4 h-[min(75dvh,760px)] border-y border-border sm:mx-0 sm:rounded-xl sm:border">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeMouseEnter={(_, node) => setHovered(node.id)}
            onNodeMouseLeave={() => setHovered(null)}
            onSelectionChange={onSelectionChange}
            nodesDraggable={false}
            nodesConnectable={false}
            onInit={onInit}
            minZoom={0.2}
            maxZoom={1.75}
            proOptions={{ hideAttribution: true }}
            aria-label="Fluxograma das disciplinas obrigatórias"
          >
            <Background gap={24} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              className="hidden sm:block"
              nodeStrokeWidth={0}
              nodeClassName={(n) => ((n.data as CourseNodeType['data']).course.state === 'concluida' ? 'mini-done' : 'mini-left')}
            />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}

export default function FlowchartScreen({ data }: { data: ParseResponse }) {
  return (
    <ReactFlowProvider>
      <Graph data={data} />
    </ReactFlowProvider>
  );
}
```

- [ ] **Step 5: Verify and commit**

Run: `pnpm --filter @easy-grades/web test && pnpm --filter @easy-grades/web typecheck && pnpm lint && pnpm react-doctor:changed`
Expected: PASS / exit 0.

```bash
git add apps/web
git commit -m "feat(web): interactive course flowchart with prerequisite highlighting and PNG export"
```

---

## Task 16: Courses table

**Files:**
- Create: `apps/web/src/features/courses/filter-entries.ts`, `apps/web/src/features/courses/CoursesScreen.tsx`

**Interfaces:**
- Consumes: core `compareTerms`, `formatTerm`, status predicates, `Category`, `TranscriptEntry`, plus `EntryStatusBadge` and shadcn `Table`, `Select`, `Input`, `Label`.
- Produces:
  - `CATEGORY_LABELS`, `STATUS_FILTERS`, `type StatusFilter`
  - `keyEntries(entries): KeyedEntry[]`, which gives stable keys because codes repeat (e.g. DO060 four times in one term)
  - `filterEntries(entries, query, status, category)`
  - `<CoursesScreen data />`

- [ ] **Step 1: Implement**

`apps/web/src/features/courses/filter-entries.ts`:

```ts
import { compareTerms, isCompleted, isFailed, isInProgress, type Category, type TranscriptEntry } from '@easy-grades/core';

export type StatusFilter = 'todas' | 'concluidas' | 'em_curso' | 'reprovadas' | 'outras';

export const CATEGORY_LABELS: Record<Category, string> = {
  obrigatoria: 'Obrigatória',
  optativa: 'Optativa',
  eletiva: 'Eletiva',
  extensao: 'Extensão',
  outros: 'Outro currículo',
  externa: 'Aproveitamento externo',
};

export const STATUS_FILTERS: Record<StatusFilter, { label: string; test: (e: TranscriptEntry) => boolean }> = {
  todas: { label: 'Todas', test: () => true },
  concluidas: { label: 'Concluídas', test: (e) => isCompleted(e.status) },
  em_curso: { label: 'Em curso', test: (e) => isInProgress(e.status) },
  reprovadas: { label: 'Reprovadas', test: (e) => isFailed(e.status) },
  outras: { label: 'Outras situações', test: (e) => e.status === 'trancado' || e.status === 'desconhecido' },
};

const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export type KeyedEntry = TranscriptEntry & { key: string };

/** Stable key from the entry's position in the transcript (codes can repeat, e.g. DO060). */
export function keyEntries(entries: TranscriptEntry[]): KeyedEntry[] {
  return entries.map((entry, position) => ({ ...entry, key: `${entry.term}-${entry.code}-${position}` }));
}

export function filterEntries(entries: KeyedEntry[], query: string, status: StatusFilter, category: Category | 'todas'): KeyedEntry[] {
  const q = normalize(query.trim());
  return entries
    .filter((e) => STATUS_FILTERS[status].test(e))
    .filter((e) => category === 'todas' || e.category === category)
    .filter((e) => !q || normalize(`${e.code} ${e.name}`).includes(q))
    .sort((a, b) => compareTerms(b.term, a.term) || a.code.localeCompare(b.code));
}
```

`apps/web/src/features/courses/CoursesScreen.tsx`:

```tsx
import { formatTerm, type Category, type ParseResponse } from '@easy-grades/core';
import { useDeferredValue, useMemo, useState } from 'react';
import { EntryStatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatGrade, toTitleCase } from '@/lib/format';
import { CATEGORY_LABELS, filterEntries, keyEntries, STATUS_FILTERS, type StatusFilter } from './filter-entries';

export function CoursesScreen({ data }: { data: ParseResponse }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('todas');
  const [category, setCategory] = useState<Category | 'todas'>('todas');
  const deferredQuery = useDeferredValue(query);
  const entries = useMemo(() => keyEntries(data.transcript.entries), [data.transcript.entries]);
  const rows = useMemo(() => filterEntries(entries, deferredQuery, status, category), [entries, deferredQuery, status, category]);
  const categories = [...new Set(entries.map((e) => e.category))];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-semibold sm:text-[44px]">Disciplinas cursadas</h1>
        <p className="mt-2 text-muted-foreground">
          {entries.length} registros no histórico. {rows.length !== entries.length && `${rows.length} com os filtros atuais.`}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="grid gap-1.5">
          <Label htmlFor="busca">Buscar</Label>
          <Input id="busca" type="search" placeholder="Código ou nome" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filtro-situacao">Situação</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger id="filtro-situacao" className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_FILTERS) as StatusFilter[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {STATUS_FILTERS[key].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filtro-categoria">Categoria</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as Category | 'todas')}>
            <SelectTrigger id="filtro-categoria" className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-muted-foreground">
          Nenhuma disciplina com esses filtros. Limpe a busca ou escolha outra situação.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Disciplina</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="hidden md:table-cell">Categoria</TableHead>
              <TableHead className="text-right">CH</TableHead>
              <TableHead className="text-right">Nota</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.key}>
                <TableCell className="whitespace-normal">
                  <span className="block text-xs text-muted-foreground">{e.code}</span>
                  {toTitleCase(e.name)}
                </TableCell>
                <TableCell>{formatTerm(e.term)}</TableCell>
                <TableCell className="hidden md:table-cell">{CATEGORY_LABELS[e.category]}</TableCell>
                <TableCell className="text-right">{e.hours ?? '—'}</TableCell>
                <TableCell className="text-right">{formatGrade(e.grade)}</TableCell>
                <TableCell>
                  <EntryStatusBadge status={e.status} rawStatus={e.rawStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

Run: `pnpm --filter @easy-grades/web typecheck && pnpm lint && pnpm react-doctor:changed`
Expected: exit 0. react-doctor must not report `no-array-index-as-key`: keys come from `keyEntries`.

```bash
git add apps/web
git commit -m "feat(web): filterable table of transcript courses"
```

---

## Task 17: Planning screen (suggestions, expected grades, CR projection, path to graduation)

**Files:**
- Create: `apps/web/src/features/planning/planning-state.ts`, `ProjectionChart.tsx`, `PlanningScreen.tsx`
- Test: `apps/web/src/features/planning/planning-state.test.ts`

**Interfaces:**
- Consumes: core `rankCandidates`, `suggestNextTerm`, `projectCr`, `crScenarios`, `nextTerm`, `formatTerm`, `PlannedGrade`, `Suggestion`, plus `Analysis`, `projectionData`, `crDomain`, `crTicks`.
- Produces:
  - `planning-state.ts`: `interface PlanningState { current: Record<code, grade>; next: Record<code, grade> }`, `type PlanningAction`, `clampGrade`, `initialPlanning(suggested, inProgress, defaultGrade)`, `planningReducer`, `plannedGrades(state, hoursByCode)`
  - `ProjectionChart` as a **default export** (lazy)
  - `<PlanningScreen data analysis />`

**Behaviour:**
- **List:** shows mandatory candidates plus the chosen ones. The other unlocked electives (94 in the real curriculum) sit behind "Ver mais N eletivas liberadas"; listing them all made the page about 8,000 px tall.
- **Defaults:** expected grades default to the current CR rounded to one decimal.
- **"Supor aprovação no que está em curso"** recomputes the suggestions and resets the selection inside the event handler, with no effect.
- **CR projection** includes the courses in progress now (their sliders sit under "Em curso agora") plus next term's picks.

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/planning/planning-state.test.ts`:

```ts
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { suggestNextTerm } from '@easy-grades/core';
import { describe, expect, it } from 'vitest';
import { clampGrade, initialPlanning, plannedGrades, planningReducer } from './planning-state';

const inProgress = sampleTranscript.entries.filter((e) => e.status === 'matriculado');
const initial = initialPlanning(suggestNextTerm(sampleCurriculum, sampleTranscript), inProgress, 7.757);

describe('planning state', () => {
  it('starts with the suggestions and the courses in progress at the current CR', () => {
    expect(Object.keys(initial.next)).toEqual(['ICC150', 'ICC418', 'ICC004']);
    expect(Object.keys(initial.current).sort()).toEqual(['ICC006', 'ICC103', 'ICC330', 'ICC412', 'ICC600']);
    expect(initial.next.ICC150).toBe(7.8);
  });

  it('toggles courses in and out of the next term', () => {
    const removed = planningReducer(initial, { type: 'toggle', code: 'ICC004', grade: 7 });
    expect('ICC004' in removed.next).toBe(false);
    const added = planningReducer(removed, { type: 'toggle', code: 'ICC010', grade: 7 });
    expect(added.next.ICC010).toBe(7);
  });

  it('clamps grades to 0..10 with one decimal and ignores unknown codes', () => {
    expect(clampGrade(11)).toBe(10);
    expect(clampGrade(-1)).toBe(0);
    expect(clampGrade(7.25)).toBe(7.3);
    const same = planningReducer(initial, { type: 'setGrade', group: 'next', code: 'NOPE01', grade: 5 });
    expect(same).toBe(initial);
  });

  it('turns the plan into planned grades with hours', () => {
    const grades = plannedGrades({ current: { ICC006: 9 }, next: { ICC150: 10 } }, new Map([['ICC006', 60], ['ICC150', 150]]));
    expect(grades).toEqual([
      { code: 'ICC006', grade: 9, hours: 60 },
      { code: 'ICC150', grade: 10, hours: 150 },
    ]);
  });
});
```

Run: `pnpm --filter @easy-grades/web test planning`
Expected: FAIL. Module not found.

- [ ] **Step 2: Implement the state**

`apps/web/src/features/planning/planning-state.ts`:

```ts
import type { PlannedGrade, Suggestion, TranscriptEntry } from '@easy-grades/core';

/** Expected grade per course code. `current` = courses in progress now, `next` = courses picked for next term. */
export interface PlanningState {
  current: Record<string, number>;
  next: Record<string, number>;
}

export type PlanningAction =
  | { type: 'toggle'; code: string; grade: number }
  | { type: 'setGrade'; group: keyof PlanningState; code: string; grade: number }
  | { type: 'reset'; state: PlanningState };

export function clampGrade(grade: number): number {
  if (Number.isNaN(grade)) return 0;
  return Math.round(Math.min(10, Math.max(0, grade)) * 10) / 10;
}

export function initialPlanning(suggested: Suggestion[], inProgress: TranscriptEntry[], defaultGrade: number): PlanningState {
  const grade = clampGrade(defaultGrade);
  return {
    current: Object.fromEntries(inProgress.map((e) => [e.code, grade])),
    next: Object.fromEntries(suggested.map((s) => [s.code, grade])),
  };
}

export function planningReducer(state: PlanningState, action: PlanningAction): PlanningState {
  switch (action.type) {
    case 'toggle': {
      if (action.code in state.next) {
        const { [action.code]: _removed, ...rest } = state.next;
        return { ...state, next: rest };
      }
      return { ...state, next: { ...state.next, [action.code]: clampGrade(action.grade) } };
    }
    case 'setGrade': {
      if (!(action.code in state[action.group])) return state;
      return { ...state, [action.group]: { ...state[action.group], [action.code]: clampGrade(action.grade) } };
    }
    case 'reset':
      return action.state;
  }
}

/** Converts the plan into grades for `projectCr`, using the hours of each course. */
export function plannedGrades(state: PlanningState, hoursByCode: ReadonlyMap<string, number>): PlannedGrade[] {
  return [...Object.entries(state.current), ...Object.entries(state.next)]
    .filter(([code]) => (hoursByCode.get(code) ?? 0) > 0)
    .map(([code, grade]) => ({ code, grade, hours: hoursByCode.get(code)! }));
}
```

- [ ] **Step 3: Implement the chart and the screen**

`apps/web/src/features/planning/ProjectionChart.tsx`:

```tsx
import type { TermCr } from '@easy-grades/core';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { crDomain, crTicks, projectionData } from '@/features/overview/chart-utils';

const config = {
  cumulativeCr: { label: 'CR acumulado', color: 'var(--igapo)' },
  projected: { label: 'CR projetado', color: 'var(--solimoes)' },
} satisfies ChartConfig;

export default function ProjectionChart({ history, projected, projectedTerm }: { history: TermCr[]; projected: number | null; projectedTerm: string | null }) {
  const data = projectionData(history, projected, projectedTerm);
  const domain = crDomain([...history.map((h) => h.cumulativeCr), projected]);
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="term" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis domain={domain} ticks={crTicks(domain)} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent className="min-w-44" />} />
        <Line dataKey="cumulativeCr" stroke="var(--color-cumulativeCr)" strokeWidth={3} dot={false} isAnimationActive={false} connectNulls={false} />
        <Line dataKey="projected" stroke="var(--color-projected)" strokeWidth={3} strokeDasharray="6 5" dot={{ r: 4 }} isAnimationActive={false} connectNulls />
      </LineChart>
    </ChartContainer>
  );
}
```

`apps/web/src/features/planning/PlanningScreen.tsx`:

```tsx
import {
  crScenarios,
  formatTerm,
  nextTerm,
  projectCr,
  rankCandidates,
  suggestNextTerm,
  type ParseResponse,
  type Suggestion,
} from '@easy-grades/core';
import { lazy, Suspense, useMemo, useReducer, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { formatCr, formatGrade, formatHours, toTitleCase } from '@/lib/format';
import type { Analysis } from '@/lib/use-analysis';
import { initialPlanning, plannedGrades, planningReducer } from './planning-state';

const ProjectionChart = lazy(() => import('./ProjectionChart'));

function GradeSlider({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (grade: number) => void }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="font-normal">
          {label}
        </Label>
        <span className="text-sm font-medium">{formatGrade(value)}</span>
      </div>
      <Slider id={id} min={0} max={10} step={0.1} value={[value]} onValueChange={([v]) => onChange(v ?? value)} aria-label={`Nota esperada em ${label}`} />
    </div>
  );
}

export function PlanningScreen({ data, analysis }: { data: ParseResponse; analysis: Analysis }) {
  const { curriculum, transcript } = data;
  const inProgress = useMemo(() => transcript.entries.filter((e) => e.status === 'matriculado'), [transcript]);
  const defaultGrade = analysis.cr ?? 7;
  const [countInProgress, setCountInProgress] = useState(true);
  const [showAllElectives, setShowAllElectives] = useState(false);
  const [plan, dispatch] = useReducer(planningReducer, undefined, () =>
    initialPlanning(suggestNextTerm(curriculum, transcript), inProgress, defaultGrade),
  );

  const candidates = useMemo(() => rankCandidates(curriculum, transcript, { countInProgress }), [curriculum, transcript, countInProgress]);
  const byCode = useMemo(() => new Map<string, Suggestion>(candidates.map((c) => [c.code, c])), [candidates]);
  const hoursByCode = useMemo(() => {
    const map = new Map<string, number>(candidates.map((c) => [c.code, c.hours]));
    for (const e of inProgress) map.set(e.code, e.hours ?? 0);
    return map;
  }, [candidates, inProgress]);

  const visible = candidates.filter((c) => showAllElectives || c.category === 'obrigatoria' || c.code in plan.next);
  const hiddenElectives = candidates.length - visible.length;
  const nextCodes = Object.keys(plan.next).filter((code) => byCode.has(code));
  const credits = nextCodes.reduce((sum, code) => sum + (byCode.get(code)?.credits ?? 0), 0);
  const maxCredits = curriculum.requirements.maxCreditsPerPeriod ?? 30;
  const minCredits = curriculum.requirements.minCreditsPerPeriod;
  const planned = plannedGrades({ current: plan.current, next: Object.fromEntries(nextCodes.map((c) => [c, plan.next[c]!])) }, hoursByCode);
  const projected = projectCr(transcript, planned);
  const scenarios = crScenarios(transcript, planned);
  const projectedTerm = analysis.currentTerm ? nextTerm(analysis.currentTerm) : null;

  function changeCountInProgress(value: boolean) {
    setCountInProgress(value);
    dispatch({
      type: 'reset',
      state: initialPlanning(suggestNextTerm(curriculum, transcript, { countInProgress: value }), inProgress, defaultGrade),
    });
  }

  const creditNote =
    credits > maxCredits
      ? `Passa do máximo de ${maxCredits} créditos por período.`
      : credits > 0 && credits < minCredits
        ? `Abaixo do mínimo de ${minCredits} créditos por período.`
        : `Entre ${minCredits} e ${maxCredits} créditos por período.`;

  return (
    <div className="grid gap-12">
      <div>
        <h1 className="text-3xl font-semibold sm:text-[44px]">Planejamento</h1>
        <p className="mt-2 max-w-[60ch] text-muted-foreground">
          Escolha as disciplinas do próximo semestre e as notas que você espera. O CR projetado muda na hora.
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
        <section aria-labelledby="sugestoes" className="grid content-start gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="sugestoes" className="text-2xl font-semibold">
              Próximo semestre{projectedTerm && `, ${formatTerm(projectedTerm)}`}
            </h2>
            <div className="flex items-center gap-2">
              <Switch id="contar-em-curso" checked={countInProgress} onCheckedChange={changeCountInProgress} />
              <Label htmlFor="contar-em-curso" className="font-normal">
                Supor aprovação no que está em curso
              </Label>
            </div>
          </div>
          <p className={credits > maxCredits ? 'text-sm text-urucum' : 'text-sm text-muted-foreground'} aria-live="polite">
            <strong className="font-semibold text-foreground">{credits} créditos</strong> escolhidos. {creditNote}
          </p>

          {candidates.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-muted-foreground">
              Não há disciplinas obrigatórias ou eletivas liberadas para o próximo semestre.
            </p>
          ) : (
            <ul className="grid gap-2">
              {visible.map((c) => {
                const checked = c.code in plan.next;
                const id = `escolha-${c.code}`;
                return (
                  <li key={c.code} className="rounded-lg border border-border bg-card p-3 has-[:checked]:border-igapo">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={id}
                        checked={checked}
                        onCheckedChange={() => dispatch({ type: 'toggle', code: c.code, grade: defaultGrade })}
                        className="mt-1"
                      />
                      <Label htmlFor={id} className="grid flex-1 cursor-pointer gap-0.5 font-normal">
                        <span className="font-medium">
                          {toTitleCase(c.name)} <span className="text-sm font-normal text-muted-foreground">{c.code}</span>
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {c.reason}. {c.credits} créditos, {formatHours(c.hours)}.
                        </span>
                      </Label>
                    </div>
                    {checked && (
                      <div className="mt-3 pl-7">
                        <GradeSlider
                          id={`nota-${c.code}`}
                          label="Nota esperada"
                          value={plan.next[c.code]!}
                          onChange={(grade) => dispatch({ type: 'setGrade', group: 'next', code: c.code, grade })}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {hiddenElectives > 0 && (
            <Button variant="outline" className="press justify-self-start" onClick={() => setShowAllElectives(true)}>
              Ver mais {hiddenElectives} eletivas liberadas
            </Button>
          )}
          {showAllElectives && (
            <Button variant="ghost" className="press justify-self-start" onClick={() => setShowAllElectives(false)}>
              Mostrar só as escolhidas e obrigatórias
            </Button>
          )}
        </section>

        <aside aria-labelledby="projecao" className="grid content-start gap-8">
          <section className="grid gap-4">
            <h2 id="projecao" className="text-2xl font-semibold">
              CR projetado
            </h2>
            <p className="font-heading text-[64px] font-semibold leading-none">{formatCr(projected)}</p>
            <p className="text-sm text-muted-foreground">
              Hoje: {formatCr(analysis.cr)}. Com notas entre 5 e 10 nessas disciplinas, ficaria entre {formatCr(scenarios.worst)} e{' '}
              {formatCr(scenarios.best)}.
            </p>
            <Suspense fallback={<div aria-hidden className="h-56 rounded-lg bg-muted/60" />}>
              <ProjectionChart history={analysis.crHistory} projected={projected} projectedTerm={projectedTerm} />
            </Suspense>
          </section>

          {inProgress.length > 0 && (
            <section aria-labelledby="em-curso" className="grid gap-4">
              <h3 id="em-curso" className="text-lg font-semibold">
                Em curso agora
              </h3>
              {inProgress.map((e) =>
                (e.hours ?? 0) > 0 ? (
                  <GradeSlider
                    key={e.code}
                    id={`atual-${e.code}`}
                    label={toTitleCase(e.name)}
                    value={plan.current[e.code] ?? defaultGrade}
                    onChange={(grade) => dispatch({ type: 'setGrade', group: 'current', code: e.code, grade })}
                  />
                ) : null,
              )}
            </section>
          )}

          <section aria-labelledby="caminho" className="grid gap-3">
            <h3 id="caminho" className="text-lg font-semibold">
              Caminho até a formatura
            </h3>
            {analysis.forecast.terms.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma obrigatória pendente além das que estão em curso.</p>
            ) : (
              <ol className="grid gap-3 border-l-2 border-solimoes pl-4">
                {analysis.forecast.terms.map((term) => (
                  <li key={term.term}>
                    <p className="font-medium">
                      {formatTerm(term.term)} <span className="text-sm font-normal text-muted-foreground">{term.credits} créditos</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{term.courses.map((c) => toTitleCase(c.name)).join(', ')}</p>
                  </li>
                ))}
              </ol>
            )}
            {analysis.forecast.unschedulable.length > 0 && (
              <p className="text-sm text-urucum">
                Não conseguimos encaixar {analysis.forecast.unschedulable.join(', ')}: os pré-requisitos não aparecem no currículo.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Fora das obrigatórias ainda faltam {formatHours(analysis.forecast.pendingHours.optativa)} de optativas,{' '}
              {formatHours(analysis.forecast.pendingHours.eletiva)} de eletivas, {formatHours(analysis.forecast.pendingHours.aacc)} de
              atividades complementares e {formatHours(analysis.forecast.pendingHours.extensao)} de extensão.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify and commit**

Run: `pnpm --filter @easy-grades/web test && pnpm --filter @easy-grades/web typecheck && pnpm lint && pnpm react-doctor:changed`
Expected: PASS / exit 0.

```bash
git add apps/web
git commit -m "feat(web): planning with suggestions, expected grades and CR projection"
```

---

## Task 18: App shell, dashboard navigation and end-to-end check

**Files:**
- Create: `apps/web/src/components/ClearDataButton.tsx`, `apps/web/src/components/Dashboard.tsx`, `apps/web/src/App.tsx`
- Modify: `apps/web/src/main.tsx` (replace the temporary content)
- Test: `apps/web/src/App.test.tsx`

**Interfaces:**
- Consumes: every screen from Tasks 13–17, plus `loadDataset`, `saveDataset`, `markRevealed`, `clearDataset`, `useHashView`, `useAnalysis`.
- Produces: the running app. The upload screen is shown when nothing valid is stored. The Dashboard loads lazily, so the upload screen's bundle stays around 280 kB instead of 900 kB.

- [ ] **Step 1: Write the failing test**

`apps/web/src/App.test.tsx`:

```tsx
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { clearDataset, saveDataset, STORAGE_VERSION, writeRawForTests } from './lib/storage';

describe('App', () => {
  beforeEach(async () => {
    await clearDataset();
    window.location.hash = '';
  });

  it('shows the upload screen when nothing is stored', async () => {
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Ler meus PDFs' })).toBeDisabled();
  });

  it('[RF-3] falls back to the upload screen when stored data is corrupted', async () => {
    await writeRawForTests({ version: STORAGE_VERSION, data: 42 });
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Ler meus PDFs' })).toBeInTheDocument();
  });

  it('opens the dashboard with the stored dataset', async () => {
    await saveDataset({ curriculum: sampleCurriculum, transcript: sampleTranscript });
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: '64,69%' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('7,757')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('aria-current', 'page');
  });
});
```

Run: `pnpm --filter @easy-grades/web test App`
Expected: FAIL. `./App` not found.

- [ ] **Step 2: Implement the shell**

`apps/web/src/components/ClearDataButton.tsx`:

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export function ClearDataButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="press text-urucum hover:text-urucum">
          Limpar dados
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Limpar dados deste navegador?</AlertDialogTitle>
          <AlertDialogDescription>
            O currículo e o histórico lidos serão apagados deste navegador. Você pode enviar os PDFs de novo quando quiser.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-urucum text-white hover:bg-urucum/90">
            Limpar dados
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

`apps/web/src/components/Dashboard.tsx`:

```tsx
import { lazy, Suspense } from 'react';
import { ClearDataButton } from '@/components/ClearDataButton';
import { Button } from '@/components/ui/button';
import { CoursesScreen } from '@/features/courses/CoursesScreen';
import { OverviewScreen } from '@/features/overview/OverviewScreen';
import { PlanningScreen } from '@/features/planning/PlanningScreen';
import type { Dataset } from '@/lib/storage';
import { useAnalysis } from '@/lib/use-analysis';
import { useHashView, VIEW_LABELS, VIEWS } from '@/lib/use-hash-view';

// React Flow is the heaviest dependency: load it only when the flowchart is opened.
const FlowchartScreen = lazy(() => import('@/features/flowchart/FlowchartScreen'));

interface DashboardProps {
  dataset: Dataset;
  onRevealed: () => void;
  onNewUpload: () => void;
  onClear: () => void;
}

export function Dashboard({ dataset, onRevealed, onNewUpload, onClear }: DashboardProps) {
  const view = useHashView();
  const analysis = useAnalysis(dataset.data);
  const { curriculum } = dataset.data;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 px-4 pt-3 sm:py-3">
          <p className="font-heading text-xl font-semibold">Easy Grades</p>
          <p className="hidden text-sm text-muted-foreground md:block">
            {curriculum.courseName}, currículo {curriculum.version}
          </p>
          <div className="ml-auto flex gap-1">
            <Button variant="ghost" size="sm" className="press" onClick={onNewUpload}>
              Novo upload
            </Button>
            <ClearDataButton onConfirm={onClear} />
          </div>
          <nav aria-label="Seções" className="-mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:w-auto sm:px-0">
            <ul className="flex gap-6">
              {VIEWS.map((v) => (
                <li key={v}>
                  <a
                    href={`#/${v}`}
                    aria-current={view === v ? 'page' : undefined}
                    className="block whitespace-nowrap border-b-2 border-transparent py-3 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground aria-[current=page]:border-igapo aria-[current=page]:font-medium aria-[current=page]:text-foreground sm:py-1"
                  >
                    {VIEW_LABELS[v]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        {view === 'visao-geral' && (
          <OverviewScreen data={dataset.data} analysis={analysis} reveal={!dataset.revealed} onRevealed={onRevealed} />
        )}
        {view === 'fluxograma' && (
          <Suspense fallback={<p className="text-muted-foreground">Montando o fluxograma…</p>}>
            <FlowchartScreen data={dataset.data} />
          </Suspense>
        )}
        {view === 'disciplinas' && <CoursesScreen data={dataset.data} />}
        {view === 'planejamento' && <PlanningScreen data={dataset.data} analysis={analysis} />}
      </main>
    </div>
  );
}
```

`apps/web/src/App.tsx`:

```tsx
import type { ParseResponse } from '@easy-grades/core';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UploadScreen } from '@/features/upload/UploadScreen';
import { clearDataset, loadDataset, markRevealed, saveDataset, type Dataset } from '@/lib/storage';

// Charts and the dashboard load only after there is data to show; the upload screen stays light.
const Dashboard = lazy(() => import('@/components/Dashboard').then((m) => ({ default: m.Dashboard })));

type AppState =
  | { status: 'loading' }
  | { status: 'upload'; previous: Dataset | null }
  | { status: 'ready'; dataset: Dataset };

export default function App() {
  const [state, setState] = useState<AppState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void loadDataset().then((dataset) => {
      if (!cancelled) setState(dataset ? { status: 'ready', dataset } : { status: 'upload', previous: null });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleParsed(data: ParseResponse) {
    const dataset = await saveDataset(data);
    window.location.hash = '/visao-geral';
    setState({ status: 'ready', dataset });
  }

  async function handleClear() {
    await clearDataset();
    setState({ status: 'upload', previous: null });
  }

  function handleRevealed() {
    void markRevealed();
  }

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={300}>
      {state.status === 'loading' && <div aria-busy="true" className="min-h-dvh" />}
      {state.status === 'upload' && (
        <UploadScreen
          onParsed={handleParsed}
          onCancel={state.previous ? () => setState({ status: 'ready', dataset: state.previous! }) : undefined}
        />
      )}
      {state.status === 'ready' && (
        <Suspense fallback={<div aria-busy="true" className="min-h-dvh" />}>
          <Dashboard
            dataset={state.dataset}
            onRevealed={handleRevealed}
            onNewUpload={() => setState({ status: 'upload', previous: state.dataset })}
            onClear={handleClear}
          />
        </Suspense>
      )}
      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}
```

`apps/web/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 3: Run the whole suite**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build`
Expected:
- core 54, api 31 (+1 skipped), web 24 tests PASS;
- the build succeeds, with an entry chunk of about 280 kB and `Dashboard`, `FlowchartScreen` and `chart` as separate chunks.

Run: `pnpm react-doctor`
Expected: exit 0. The only warnings are the 3 documented `prefer-dynamic-import` false positives.

- [ ] **Step 4: Manual end-to-end check with the real PDFs**

Run: `pnpm dev`. This starts the API on :3001 and the web app on :5173. Open http://localhost:5173 and upload `report.pdf` and `historico.pdf` from the repo root. Confirm:
- **Overview:** the percentage and the CR match what is printed on the histórico (the CR exactly, the percentage within 0.5 p.p. or with the divergence note); the forecast shows a term.
- **Fluxograma:** the legend counts match the histórico. Hovering a course highlights its prerequisite chain and what it unlocks. "Exportar PNG" downloads an image.
- **Disciplinas:** the record count matches the histórico, and the filters work.
- **Planejamento:** the suggestions only include courses whose prerequisites are met. Moving a slider changes the projected CR.
- **Data persistence:** reloading keeps the data, and "Limpar dados" returns to the upload screen.
- **Console:** the browser console has no CSP errors.

- [ ] **Step 5: Commit, review and merge**

```bash
git add apps/web
git commit -m "feat(web): app shell with lazy dashboard, navigation and data lifecycle"
```

Request the Opus whole-branch review of `feat/web`, address its findings, re-run `pnpm react-doctor`, then:

```bash
git checkout main && git merge --no-ff feat/web -m "Merge feat/web"
```

---

## Task 19: Docker image and CI/CD

**Branch:** `feat/ci-cd` from `main`.

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `.github/workflows/ci.yml`, `.github/workflows/cd.yml`

**Interfaces:**
- Consumes: the root scripts `lint`, `typecheck`, `test`, `doctor`, `build`; `@easy-grades/api` `build` (tsup); `@easy-grades/web` `build`.
- Produces:
  - Image: `node dist/server.js` on port 8080, running as the non-root `node` user, with `STATIC_DIR=/app/public`.
  - CI on every PR and push to main.
  - CD that pushes `ghcr.io/<owner>/<repo>:{sha,latest}` only after CI succeeds on a push to `main`.

- [ ] **Step 1: Write the Dockerfile and .dockerignore**

`Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1.7

# ---- build: install, test-free build of web + api, then a prod-only deploy of the api ----
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @easy-grades/web build && pnpm --filter @easy-grades/api build
RUN pnpm --filter @easy-grades/api deploy --legacy --prod /out

# ---- runtime: only the bundled server, its prod deps and the static web build ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    STATIC_DIR=/app/public
WORKDIR /app
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/api/dist ./dist
COPY --from=build --chown=node:node /repo/apps/web/dist ./public
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "dist/server.js"]
```

`.dockerignore` (real PDFs never enter the build context):

```
**/node_modules
**/dist
**/coverage
**/*.pdf
.git
.github
.env*
docs
```

- [ ] **Step 2: Build and smoke-test the image**

```bash
docker build -t easy-grades:local .
docker run -d --name eg-local -p 8080:8080 easy-grades:local
curl -s localhost:8080/api/health                       # {"ok":true}
curl -sI localhost:8080/ | grep -i content-security     # CSP header present
docker exec eg-local whoami                             # node
docker rm -f eg-local
```

Expected: as commented. If the real PDFs are at the repo root, this must return JSON starting with `{"curriculum":`:

```bash
curl -s -F curriculo=@report.pdf -F historico=@historico.pdf localhost:8080/api/parse | head -c 80
```

- [ ] **Step 3: Write the workflows**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  checks:
    name: Lint, types, tests, React Doctor, build
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0 # react-doctor compares against main
      - uses: pnpm/action-setup@v6 # version comes from package.json "packageManager"
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - name: React Doctor (fails on errors)
        run: pnpm react-doctor
      - run: pnpm build
      - name: Dependency audit (production deps)
        run: pnpm audit --prod --audit-level high

  secrets:
    name: Secret scan
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - name: gitleaks
        run: docker run --rm -v "$PWD:/repo" ghcr.io/gitleaks/gitleaks:v8.30.1 git /repo --redact --verbose
```

`.github/workflows/cd.yml`:

```yaml
name: CD

# Publishes the image only after CI succeeded on main.
on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [main]

permissions:
  contents: read
  packages: write

jobs:
  image:
    name: Build and push image to GHCR
    if: github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.event == 'push'
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
        with:
          ref: ${{ github.event.workflow_run.head_sha }}
      - uses: docker/setup-buildx-action@v4
      - uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - id: meta
        uses: docker/metadata-action@v6
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=sha,format=long
            type=raw,value=latest
      - uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 4: Lint the workflows and scan for secrets locally**

In Git Bash, set `MSYS_NO_PATHCONV=1` so Docker volume paths are not rewritten.

```bash
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -color
docker run --rm -v "$PWD:/repo" ghcr.io/gitleaks/gitleaks:v8.30.1 git /repo --redact
pnpm audit --prod --audit-level high
```

Expected: actionlint prints nothing (exit 0), gitleaks reports "no leaks found", and audit reports "No known vulnerabilities found".

- [ ] **Step 5: Commit, review, merge**

```bash
git add Dockerfile .dockerignore .github
git commit -m "ci: CI with lint/types/tests/react-doctor/audit/gitleaks and CD to GHCR"
```

Review, then `git checkout main && git merge --no-ff feat/ci-cd -m "Merge feat/ci-cd"`.

There is no GitHub remote yet. Once one is added (`git remote add origin ...` and `git push -u origin main`), CI runs on every push. The image needs no secrets beyond the built-in `GITHUB_TOKEN`.

---

## Task 20: Final polish pass and project memory

**Branch:** `feat/polish` from `main`.

**Files:**
- Modify: `CLAUDE.md`
- Modify: anything the review finds

- [ ] **Step 1: Motion and design audit**
  - Run `pnpm exec react-doctor design apps/web --verbose --no-telemetry` and fix every error.
  - Then review the UI against the Emil checklist in the "Visual direction" section, with a Before/After table:
    - no `transition: all` in our code;
    - no `ease-in`;
    - press feedback on buttons;
    - tooltips at 125 ms with skip-delay;
    - reduced motion removes transforms.
  - Fix only real deviations.

- [ ] **Step 2: Responsive and accessibility check**

At 390 px wide, check that:
- the header nav scrolls horizontally;
- the overview stacks;
- the flowchart opens at the 1st period.

Keyboard only:
- Tab reaches every control;
- flowchart nodes are focusable and Enter selects them;
- the "Ver como lista" toggle works.

Status is always icon + text.

- [ ] **Step 3: Update `CLAUDE.md`**

Append these sections:

````markdown
## Frontend conventions
- Design: Encontro das Águas palette and tokens live in `apps/web/src/styles/index.css` (light + `prefers-color-scheme: dark`). Literata for headings/big numbers, Hanken Grotesk for UI. Copy in PT-BR, sentence case, no ALL-CAPS labels, no "→".
- Motion: `--ease-snap` / `--ease-glide` tokens, ≤250 ms UI transitions, `.press` for press feedback, one-time WatersBand reveal, 40 ms column stagger in the flowchart; everything off under reduced motion.
- shadcn 4 (`radix-nova`): generated files in `src/components/ui/` are not hand-edited except the documented button motion patch; react-doctor ignores them via `apps/web/doctor.config.json`.
- Heavy code is lazy: Dashboard (from App), FlowchartScreen, and every Recharts chart. react-doctor's 3 `prefer-dynamic-import` warnings on chart files are known false positives — keep the rule on.
- React Flow colors that end up in SVG attributes (minimap nodes, background dots) must be set in CSS, not via props with `var(--x)`.
- Vite `assetsInlineLimit: 0` keeps fonts out of `data:` URIs (CSP `font-src 'self'`).

## Deploy
- `docker build -t easy-grades .` → single image; `PORT` (8080), `STATIC_DIR`, `TRUST_PROXY=true` only behind a reverse proxy.
- CD pushes `ghcr.io/<owner>/<repo>:{sha,latest}` after CI passes on main.
````

- [ ] **Step 4: Final verification and merge**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm react-doctor && docker build -t easy-grades:final .`
Expected: everything passes.

```bash
git add -A
git commit -m "chore: polish pass and project memory"
```

Final whole-branch review by Opus, then `git checkout main && git merge --no-ff feat/polish -m "Merge feat/polish"`.
