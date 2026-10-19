/**
 * Walks the course matrices the e-Campus publishes and checks that each one still parses into something the
 * app can use. Run it with `pnpm --filter @easy-grades/api curricula:check`.
 *
 * Options:
 *   --all             every course and every published version (slow, hits the e-Campus hard)
 *   --sample N        N courses, current version only (default: 20)
 *   --course CODE     one course, every published version
 */
import { ecampusClient, type EcampusCourse } from '../src/ecampus/client.js';
import { parseCurriculumDocument } from '../src/parsers/documents.js';
import { extractItems, groupRows, type TextItem } from '../src/pdf/extract.js';

const args = process.argv.slice(2);
const has = (flag: string): boolean => args.includes(flag);
const value = (flag: string): string | undefined => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const ALL = has('--all');
const SAMPLE = Number(value('--sample') ?? 20);
const ONLY_COURSE = value('--course');
/** The e-Campus is a public service; give it a moment between requests. */
const PAUSE_MS = 250;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface Finding {
  course: string;
  version: string;
  problem: string;
  detail: string;
  /** A quirk of the published matrix rather than something the parser got wrong. */
  warning?: boolean;
}

const findings: Finding[] = [];
let checked = 0;

function check(course: string, version: string, problems: Omit<Finding, 'course' | 'version'>[]): void {
  for (const { problem, detail, warning } of problems) {
    findings.push({ course, version, problem, detail, warning });
  }
}

/**
 * The hours each section adds up to, as the matrix totals them on its own row ("TOTAL 140 1410 960 2370").
 * This is the only figure that comes from the same courses the parser reads, so it is the one to compare with.
 */
function sectionTotals(items: readonly TextItem[]): number[] {
  const totals: number[] = [];
  for (const row of groupRows(items)) {
    const cells = row.items.map((i) => i.text);
    if (cells[0] !== 'TOTAL') continue;
    const numbers = cells.slice(1).map(Number).filter((n) => Number.isFinite(n));
    if (numbers.length >= 4) totals.push(numbers.at(-1)!);
  }
  return totals;
}

async function inspect(
  course: EcampusCourse,
  versionId: number,
  versionLabel: string,
  isCurrent: boolean,
): Promise<void> {
  checked++;
  // Matrices from before the nineties use another layout (numeric course codes, no blocks). The app does not
  // support them, and a student is never on one, so they are a known limitation rather than a regression.
  const year = Number.parseInt(versionLabel, 10);
  const ancient = Number.isFinite(year) && year < 1990;
  let pdf: Uint8Array;
  try {
    pdf = await ecampusClient.fetchCurriculumPdf(course.id, versionId);
  } catch (error) {
    check(course.code, versionLabel, [
      { problem: 'download falhou', detail: (error as Error).message, warning: !isCurrent || ancient },
    ]);
    return;
  }
  await sleep(PAUSE_MS);

  let items: TextItem[];
  let curriculum;
  try {
    items = await extractItems(pdf);
    curriculum = await parseCurriculumDocument(pdf);
  } catch (error) {
    // Some old versions come out of the e-Campus with an empty report: nothing to read and nothing to fix.
    if (items && items.length < 20) {
      check(course.code, versionLabel, [
        { problem: 'matriz vazia no e-Campus', detail: `${items.length} textos no relatório`, warning: true },
      ]);
    } else {
      // Only the current version has to parse: the app offers the versions the e-Campus lists, and a student
      // is on the current one. An older matrix in another layout is a known limitation, not a regression.
      check(course.code, versionLabel, [
        {
          problem: isCurrent && !ancient ? 'parse falhou' : 'versão antiga não parseia',
          detail: (error as Error).message,
          warning: !isCurrent || ancient,
        },
      ]);
    }
    return;
  }

  const problems: Omit<Finding, 'course' | 'version'>[] = [];

  if (curriculum.courses.length === 0) {
    problems.push({ problem: 'nenhuma disciplina lida', detail: course.code });
  }
  if (curriculum.requirements.totalHours <= 0) {
    problems.push({ problem: 'carga horária total zerada', detail: course.code });
  }

  // Every section the parser read has to add up to the total the matrix prints for it. Not every matrix
  // totals every section, so a mismatch is worth reporting but not a failure on its own.
  const totals = sectionTotals(items);
  const categories = [...new Set(curriculum.courses.map((c) => c.category))];
  for (const category of categories) {
    const sum = curriculum.courses
      .filter((c) => c.category === category)
      .reduce((total, c) => total + c.hours.total, 0);
    if (sum > 0 && !totals.includes(sum)) {
      problems.push({
        problem: 'seção não bate com o total da matriz',
        detail: `${category}: soma=${sum} totais da matriz=[${totals.join(', ')}]`,
        warning: true,
      });
    }
  }

  // A prerequisite may point at a discipline of another curriculum; that is data, not a reading error.
  const known = new Set(curriculum.courses.map((c) => c.code));
  const unknown = new Set<string>();
  for (const courseItem of curriculum.courses) {
    for (const group of courseItem.prerequisites) {
      for (const code of group) if (!known.has(code)) unknown.add(`${courseItem.code}->${code}`);
    }
  }
  if (unknown.size > 0) {
    problems.push({
      problem: 'pré-requisito fora do currículo',
      detail: [...unknown].slice(0, 5).join(', ') + (unknown.size > 5 ? ` (+${unknown.size - 5})` : ''),
      warning: true,
    });
  }

  // The footer of the matrix and its own section totals do not always agree; that is the published data.
  const mandatoryHours = curriculum.courses
    .filter((c) => c.category === 'obrigatoria')
    .reduce((sum, c) => sum + c.hours.total, 0);
  const declared = curriculum.requirements.byCategory.obrigatoria.hours;
  if (declared > 0 && mandatoryHours !== declared) {
    problems.push({
      problem: 'obrigatórias do rodapé não batem com as disciplinas',
      detail: `soma=${mandatoryHours} rodapé=${declared}`,
      warning: true,
    });
  }

  check(course.code, versionLabel, problems);
}

async function main(): Promise<void> {
  const courses = await ecampusClient.listCourses();
  console.log(`${courses.length} cursos publicados pelo e-Campus\n`);

  const selected = ONLY_COURSE
    ? courses.filter((c) => c.code === ONLY_COURSE)
    : ALL
      ? courses
      : courses.filter((_, index) => index % Math.max(1, Math.floor(courses.length / SAMPLE)) === 0).slice(0, SAMPLE);

  if (ONLY_COURSE && selected.length === 0) {
    console.error(`nenhum curso com o código ${ONLY_COURSE}`);
    process.exitCode = 1;
    return;
  }

  for (const course of selected) {
    const versions = await ecampusClient.listVersions(course.id);
    await sleep(PAUSE_MS);
    const targets = ALL ? versions : versions.slice(0, 1);
    for (const [index, version] of targets.entries()) {
      await inspect(course, version.id, version.version, index === 0);
    }
  }

  const broken = new Map<string, number>();
  for (const finding of findings) {
    if (finding.warning) continue;
    broken.set(finding.problem, (broken.get(finding.problem) ?? 0) + 1);
  }
  const warningList = findings.filter((f) => f.warning);
  const warnings = warningList.length;

  console.log(`\n${checked} matrizes verificadas, ${findings.length - warnings} com problema, ${warnings} aviso(s)`);
  for (const [problem, count] of [...broken].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}x ${problem}`);
  }
  for (const finding of findings.filter((f) => !f.warning).slice(0, 60)) {
    console.log(`  [${finding.course} ${finding.version}] FALHA: ${finding.problem}: ${finding.detail}`);
  }
  console.log(`  ${warnings} aviso(s)`);
  for (const finding of warningList.slice(0, 15)) {
    console.log(`  [${finding.course} ${finding.version}] aviso: ${finding.problem}: ${finding.detail}`);
  }
  if (warnings > 15) console.log(`  ... e mais ${warnings - 15} aviso(s)`);

  process.exitCode = broken.size > 0 ? 1 : 0;
}

await main();
