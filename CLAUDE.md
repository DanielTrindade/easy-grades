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
- `pnpm react-doctor` (full react-doctor) · `pnpm react-doctor:changed` (only new issues vs main) · `pnpm react-doctor:gate` (score ≥ 90, 0 errors; same check as pre-push and CI). Not `pnpm doctor`: that name is pnpm's built-in environment check.
- `docker build -t easy-grades . && docker run -p 8080:8080 easy-grades`
- `pnpm --filter @easy-grades/web icons` regenerates `apps/web/public/icons/` from `apps/web/brand/icon.svg` (commit the PNGs).

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
- **Every branch touching `apps/web`: run `pnpm react-doctor:changed` and fix every error before requesting review.**
- **Score gate:** the pre-push hook (simple-git-hooks, installed by `prepare`) runs `pnpm react-doctor:gate` (score ≥ 90 and 0 errors) before any push or PR. CI runs the same gate in the "Lint, types, tests, React Doctor, build" job and blocks the merge when it fails. The gate calls react-doctor's score API and sends the diagnostics report (rules, files and lines) to that service, so it does not use `--no-telemetry`. `REACT_DOCTOR_MIN_SCORE` overrides the minimum. `pnpm react-doctor:changed` stays local and without telemetry.
- TDD: failing test first. Commit per task.

## Gotchas
- pnpm 11: `allowBuilds:` in pnpm-workspace.yaml (not `onlyBuiltDependencies`); `pnpm deploy` requires `--legacy`.
- pdfjs-dist 6: import `pdfjs-dist/legacy/build/pdf.mjs`; pass `Uint8Array` (not Buffer); destroy the loading task (`task.destroy()`), not the doc; options `disableFontFace, useSystemFonts:false, useWorkerFetch:false, enableXfa:false` (`isEvalSupported` was removed in v6).
- Windows: keep the repo at a short path; pnpm's nested store can exceed MAX_PATH (260 chars) and break Vitest startup with `ERR_PACKAGE_IMPORT_NOT_DEFINED`.
- `react-doctor` local runs (`pnpm react-doctor`, `pnpm react-doctor:changed`) use `--no-telemetry`, which turns off the score API, share URL and crash reporting. The score gate (`pnpm react-doctor:gate`) is the one place that uses the score API, so it does not pass `--no-telemetry`.
- `pnpm doctor` is pnpm's built-in environment check and shadows any script with that name, so react-doctor runs as `pnpm react-doctor` / `pnpm react-doctor:changed`.

## Frontend conventions
- Design "Grafite" (spec 3.0, replaces "Caderno"): palette tokens (`--fundo`, `--superficie`, `--texto`, `--suave`, `--linha`, `--campo`, `--esmeralda`, `--esmeralda-texto`, `--esmeralda-fundo`, `--erro`, `--erro-foreground`; light + `prefers-color-scheme: dark`) live in `apps/web/src/styles/index.css`, with Tailwind aliases such as `bg-esmeralda` and `text-suave`. Esmeralda is the one accent (progress, approval, CR projetado, focus); buttons and `primary` are graphite (`--texto`). Esmeralda as text is `text-esmeralda-texto`, which is the only token that passes 4.5:1 on fundo. Field borders (`--campo`) must stay at 3:1 or more on fundo and superficie; the spec values (#8E9198 and #474A51) failed that on the page, so they were lightened to #7F848C and #6E727B. Headings and big numbers use the `heading-ink` utility (Mona Sans, weight 800, wdth 125); the text-display (44 px) and text-stat (64 px) steps are unchanged. Mona Sans is the only family (self-hosted from `@fontsource-variable/mona-sans/wdth.css`). Course codes use the `code-label` utility (87.5% width, `--suave`), with no monospace font. Radius: 8 px controls (`--radius`), 14 px panels and sheets (`rounded-xl`). Copy in PT-BR, sentence case, no ALL-CAPS labels, no "→". The brand symbol source is `apps/web/brand/icon.svg` (graphite #18191C background, esmeralda filled cells, outline cells at 35% opacity); the favicon is a copy, `BrandMark` inlines it, and `scripts/generate-icons.mjs` renders the PNGs from it.
- Status is always icon + text (`components/state-style.ts`), never color alone. Flowchart nodes show the status word, and their accessible name ends with it.
- Flowchart cards show code, name and credits — never the grade (grades live in Disciplinas and Visão geral). The card size is fixed (`COURSE_NODE_HEIGHT`), so the name is line-clamped to 2 lines and the credits line is pinned to the bottom; keep the layout's `rowHeight` above the card height. The screen opens on the graph at every width (the stored "lista" choice wins), and "Exportar PNG" exports the graph image from either view: with the list on screen the graph mounts for the capture and leaves right after, and the button shows "Exportando…" while it runs.
- PNG export (`features/flowchart/export-*.ts`, `ExportSheet.tsx`): on a touch screen the image opens in a bottom sheet with the share sheet (`navigator.share` with files) instead of a download — an installed iOS PWA has no downloads UI, and the share sheet is where the image reaches Photos or Files. The capture caps `pixelRatio` so no canvas side crosses 4096 px (mobile Safari returns a blank image past it, `exportPixelRatio`), and it runs inside `withTimerFrames`: html-to-image waits for a `requestAnimationFrame` after decoding, which a backgrounded/occluded page does not paint, freezing the export with the button stuck on "Exportando…".
- Motion: `--ease-snap` / `--ease-glide` tokens, ≤250 ms UI transitions. Press feedback (scale 0.97) comes from `Button`; there is no `.press` class. Tooltips are 125 ms (set in `index.css`, read by tw-animate). Also: one-time MarkerBand reveal (highlighter sweep, 700 ms) and a 40 ms column stagger in the flowchart. Reduced motion removes transforms, clip reveals and the stagger, and keeps opacity fades at ≤150 ms.
- Hover styles are gated to `(hover: hover) and (pointer: fine)` by the `hover` variant in `index.css`.
- shadcn 4 (`radix-nova`): generated files in `src/components/ui/` are not hand-edited, except these documented patches:
  - `button.tsx`: motion patch (press scale, explicit transition list, `motion-reduce` override).
  - `slider.tsx`: forwards `aria-label` / `aria-labelledby` to the Thumb, because Radix reads the accessible name from the Thumb.
  - `switch.tsx`: explicit transition list instead of `transition-all`, and the thumb adds `motion-reduce:transition-none`.
  - `sheet.tsx` is unpatched. Its motion is overridden in `index.css` (`[data-slot='sheet-content']` and `[data-slot='sheet-overlay']`, selected by `data-state`), so don't add motion classes to it.
  
  react-doctor ignores the folder via `apps/web/doctor.config.json`.
- Heavy code is lazy: Dashboard (from App), FlowchartScreen, and every Recharts chart. The 3 chart files (`CrChart`, `HoursChart`, `ProjectionChart`) suppress `prefer-dynamic-import` with a `react-doctor-disable-next-line` comment directly above the recharts import, because they are only reached through `React.lazy`; keep the rule on and add the same comment for any new false positive.
- React Flow colors that end up in SVG attributes (minimap nodes, background dots) must be set in CSS, not via props with `var(--x)`.
- Vite `assetsInlineLimit: 0` keeps fonts out of `data:` URIs (CSP `font-src 'self'`).

## Planejamento
- The plan (chosen courses and grades) is stored in IndexedDB under `planning-plan` (`features/planning/plan-storage.ts`). It is tied to the dataset by `savedAt`, so a new upload starts with an empty plan. "Limpar dados" clears it with the dataset (`App.tsx`, `handleClear`).
- Toasts: Sonner sets its offsets as inline custom properties, so `index.css` sets `bottom` with `!important`. Below md the tab bar is cleared. On Planejamento below lg, `PlanningBoard` sets `body[data-summary-bar]` while the "Meu semestre" bar is shown, and the toasts clear that bar too.

## API parsing
- PDF parsing runs in a terminable worker thread: `apps/api/src/parser-worker.ts`, started by `parser-worker-client.ts`. This is what lets the 10 s timeout actually stop pdfjs; a main-thread parse could not be interrupted.
- tsup emits `dist/parser-worker.js` next to `dist/server.js`. The Docker image needs it, and it copies all of `dist/`.

## PWA
- Config in `apps/web/src/pwa/pwa-options.ts` (`vite-plugin-pwa` 2.x, `registerType: 'prompt'`, Workbox `generateSW`). Precache: js, css, html, woff2, svg, png.
- **The SW never caches `/api` or PDFs**: both are NetworkOnly and excluded from the `navigateFallback` (`navigateFallbackDenylist`). Workbox matches a RegExp `runtimeCaching.urlPattern` against the full href, so those rules are functions that test `url.pathname`. `pwa-options.test.ts` pins this by calling the matchers with real URLs.
- The API serves `sw.js`, `workbox-*.js` and `manifest.webmanifest` (the files `vite-plugin-pwa` emits with `registerType: 'prompt'` and the virtual register module) with `Cache-Control: no-cache`; the manifest as `application/manifest+json`. The CSP sets `worker-src` and `manifest-src` to `'self'` explicitly (`apps/api/test/pwa-static.test.ts`).
- Icons (192, 512, 512 maskable, apple-touch 180) are generated from `brand/icon.svg` by `scripts/generate-icons.mjs`. Never edit the PNGs by hand.
- UX: `PwaUpdatePrompt` (toast "Nova versão disponível", stays until dismissed through its close button; `useRegisterSW`), `useInstallApp` (native prompt, or the iOS Safari steps dialog), `useOnline` (disables "Ler meus PDFs" offline). The `virtual:pwa-register/react` module is stubbed in `test-setup.ts`.

## Core fixture
- `packages/core/src/__fixtures__/sample.ts` is FICTIONAL (`@easy-grades/core/fixtures`). Conference against real PDFs exists only in the local test `apps/api/test/real-pdfs.test.ts`, which is skipped unless `report.pdf` and `historico.pdf` sit at the repo root (or in `REAL_PDF_DIR`). Never commit those PDFs.

## Deploy
- `docker build -t easy-grades .` → single image; `PORT` (8080), `STATIC_DIR`, `TRUST_PROXY=true` only behind a reverse proxy.
- Production: Cloud Run service `easy-grades`, project `easy-grades-ufam`, region `us-central1` (Tier 1: the free tier covers it, including North America egress). URL: https://easy-grades-951677258273.us-central1.run.app
- **CD deploys every merge to main** (`.github/workflows/cd.yml`, runs after CI succeeds on a push to main):
  1. `image`: builds once and pushes `ghcr.io/<owner>/<repo>:{sha-<commit>,latest}`.
  2. `deploy` (GitHub environment `production`): pulls that image **by digest**, pushes it to Artifact Registry `us-central1-docker.pkg.dev/easy-grades-ufam/easy-grades/easy-grades:sha-<commit>`, runs `gcloud run deploy --image` and smoke-tests `/api/health`.
  - Only the image changes. Service account, scaling, memory, env vars and public access live on the service; change them by hand with your own gcloud account (`gcloud run services update ...`).
  - Image names are forced lowercase: `github.repository` keeps the owner's case and Docker rejects uppercase references, so the `image` job emits `ghcr.io/danieltrindade/easy-grades`. `gcloud` runs with `CLOUDSDK_AUTH_ACCESS_TOKEN` (the auth action's access token); no credentials file is written.
- **Pipeline security (do not weaken):**
  - No service-account key exists. GitHub authenticates through Workload Identity Federation: pool `github`, provider `easy-grades`. The provider's attribute condition accepts only repository_id 1414027694, owner_id 29515575, `ref == refs/heads/main` and `environment == production`. The deployer impersonation is bound only to subject `repo:DanielTrindade@29515575/easy-grades@1414027694:environment:production` (immutable subject format: repos created after 2026-07-15 carry owner/repo IDs in `sub`).
  - The `production` environment only allows the `main` branch. Its variables are `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WIF_PROVIDER` and `GCP_DEPLOYER_SA`. None of them is secret.
  - Deployer `github-deployer@easy-grades-ufam.iam.gserviceaccount.com` has three grants and none at project level: `run.developer` on the service, `artifactregistry.writer` on the `easy-grades` repo, and `iam.serviceAccountUser` on the runtime account. It cannot change IAM; this was tested by impersonation.
  - Runtime account: `easy-grades-run@...`, with no roles. Never run the service as the default Compute account, which has Editor on the project.
  - Workflow token: `permissions: {}` at the top, then per job. Only `deploy` gets `id-token: write`. The access token lives 15 min, no credentials file is written, checkout uses `persist-credentials: false`, and the Google actions are pinned by commit SHA.
  - `concurrency: cd-production` never cancels a deploy halfway.
- Manual fallback (personal gcloud account): `gcloud run deploy easy-grades --source . --project easy-grades-ufam --region us-central1 --quiet`. `.gcloudignore` keeps `*.pdf` (the real PDFs at the root), node_modules and dist out of the upload. Check it with `gcloud meta list-files-for-upload .` after changing it.
- Zero-cost guards:
  - min-instances 0 and max-instances 2;
  - Artifact Registry cleanup policies (`easy-grades` and `cloud-run-source-deploy`) keep the 2 newest images;
  - the source bucket deletes objects after 3 days;
  - a 5 BRL budget sends alerts;
  - the `_Default` log sink excludes Cloud Run request logs, which would otherwise store client IPs.
