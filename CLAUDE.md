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
- `pnpm react-doctor` (full react-doctor) · `pnpm react-doctor:changed` (only new issues vs main). Not `pnpm doctor`: that name is pnpm's built-in environment check.
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
- `pnpm doctor` is pnpm's built-in environment check and shadows any script with that name, so react-doctor runs as `pnpm react-doctor` / `pnpm react-doctor:changed`.

## Frontend conventions
- Design: Encontro das Águas palette and tokens live in `apps/web/src/styles/index.css` (light + `prefers-color-scheme: dark`). Literata for headings and big numbers (`text-display` 44 px and `text-stat` 64 px tokens), Hanken Grotesk for UI. Copy in PT-BR, sentence case, no ALL-CAPS labels, no "→".
- Status is always icon + text (`components/state-style.ts`), never color alone. Flowchart nodes show the status word, and their accessible name ends with it.
- Motion: `--ease-snap` / `--ease-glide` tokens, ≤250 ms UI transitions. Press feedback (scale 0.97) comes from `Button`; there is no `.press` class. Tooltips are 125 ms (set in `index.css`, read by tw-animate). Also: one-time WatersBand reveal and a 40 ms column stagger in the flowchart. Reduced motion removes transforms, clip reveals and the stagger, and keeps opacity fades at ≤150 ms.
- Hover styles are gated to `(hover: hover) and (pointer: fine)` by the `hover` variant in `index.css`.
- shadcn 4 (`radix-nova`): generated files in `src/components/ui/` are not hand-edited, except these documented patches:
  - `button.tsx`: motion patch (press scale, explicit transition list, `motion-reduce` override).
  - `slider.tsx`: forwards `aria-label` / `aria-labelledby` to the Thumb, because Radix reads the accessible name from the Thumb.
  - `switch.tsx`: explicit transition list instead of `transition-all`, and the thumb adds `motion-reduce:transition-none`.
  
  react-doctor ignores the folder via `apps/web/doctor.config.json`.
- Heavy code is lazy: Dashboard (from App), FlowchartScreen, and every Recharts chart. react-doctor's 3 `prefer-dynamic-import` warnings on chart files are known false positives (their parents already load them lazily); keep the rule on.
- React Flow colors that end up in SVG attributes (minimap nodes, background dots) must be set in CSS, not via props with `var(--x)`.
- Vite `assetsInlineLimit: 0` keeps fonts out of `data:` URIs (CSP `font-src 'self'`).

## API parsing
- PDF parsing runs in a terminable worker thread: `apps/api/src/parser-worker.ts`, started by `parser-worker-client.ts`. This is what lets the 10 s timeout actually stop pdfjs; a main-thread parse could not be interrupted.
- tsup emits `dist/parser-worker.js` next to `dist/server.js`. The Docker image needs it, and it copies all of `dist/`.

## Core fixture
- `packages/core/src/__fixtures__/sample.ts` is FICTIONAL (`@easy-grades/core/fixtures`). Conference against real PDFs exists only in the local test `apps/api/test/real-pdfs.test.ts`, which is skipped unless `report.pdf` and `historico.pdf` sit at the repo root (or in `REAL_PDF_DIR`). Never commit those PDFs.

## Deploy
- `docker build -t easy-grades .` → single image; `PORT` (8080), `STATIC_DIR`, `TRUST_PROXY=true` only behind a reverse proxy.
- CD pushes `ghcr.io/<owner>/<repo>:{sha,latest}` after CI passes on main.
