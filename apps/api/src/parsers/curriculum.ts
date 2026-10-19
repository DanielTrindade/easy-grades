import { CURRICULUM_VERSION_RE, type Category, type Curriculum, type CurriculumCourse } from '@easy-grades/core';
import { ParseError } from '../errors.js';
import { groupRows, rowText, valueNear, valueRightOf, type Row, type TextItem } from '../pdf/extract.js';

const CODE_RE = /^[A-Z]{2,7}\d{2,3}$/;

// Column x ranges measured on e-Campus "Currículo de Curso" PDFs (points).
const PERIOD_MAX_X = 60;
const CODE_MIN_X = 60;
const CODE_MAX_X = 115;
const NAME_MAX_X = 360;
const PREREQ_MIN_X = 505;

/**
 * Section headers, matched by keyword: matrices vary the wording ("OBRIGATÓRIAS", "OBRIGATÓRIAS INCLUÍNDO
 * EXTENSÃO", "ATIVIDADES DE EXTENSÃO"), so an exact match drops whole sections. The first pattern that hits
 * wins, which keeps "OBRIGATÓRIAS INCLUÍNDO EXTENSÃO" in the mandatory section.
 */
const SECTION_PATTERNS: readonly { pattern: RegExp; category: Category }[] = [
  { pattern: /OBRIGATORI/, category: 'obrigatoria' },
  { pattern: /OPTATIV/, category: 'optativa' },
  { pattern: /ELETIV/, category: 'eletiva' },
  { pattern: /EXTENSAO/, category: 'extensao' },
  { pattern: /TRONCO/, category: 'obrigatoria' },
];

/** Lines that carry a section keyword but are totals, column headers or the report header. */
const NOT_A_SECTION =
  /CARGA|CR[ÉE]D|TOTAL|M[ÍI]NIMO|M[ÁA]XIMO|LIMITE|PERIODO|NOME DA DISCIPLINA|PR[ÉE]-REQUISITO|CURRICULO|CURSO:|VERS|GRAU|TURNO|SITUACAO|UNIVERSIDADE|FONTE/i;

/** Uppercase, accent-free and separated by single spaces, so labels compare the same across matrices. */
function normalizeLabel(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

/** The category a row opens, or null when the row is not a section header. */
function detectCategory(row: Row): Category | null {
  if (row.items.some((i) => i.x >= CODE_MIN_X && i.x < CODE_MAX_X && CODE_RE.test(i.text))) return null;
  const text = normalizeLabel(rowText(row));
  if (text.length === 0 || text.length > 60) return null;
  if (NOT_A_SECTION.test(text)) return null;
  for (const { pattern, category } of SECTION_PATTERNS) if (pattern.test(text)) return category;
  return null;
}

const COLUMN_HEADERS = { 'CRÉD.': 'credits', 'TEOR.': 'theory', 'PRAT.': 'practice', 'EXTE.': 'extension', TOTAL: 'total' } as const;
type NumericColumn = (typeof COLUMN_HEADERS)[keyof typeof COLUMN_HEADERS];

/** Block label printed next to a prerequisite: `BLOCO 1` groups it, `SEM BLOCO` means the group carries no number. */
const BLOCK_RE = /^BLOCO\s+(\d+)$/;
const NO_BLOCK_RE = /^SEM\s+BLOCO$/;
/** Group key for prerequisites printed without a block number; never collides with a numbered block. */
const NO_BLOCK = '';

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
type LocatedCourse = CurriculumCourse & Located & { blocks: Map<string, string[]> };

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

function prereqPairs(items: readonly TextItem[]): { code: string; block: string }[] {
  const pairs: { code: string; block: string }[] = [];
  const right = items.filter((i) => i.x >= PREREQ_MIN_X);
  for (let k = 0; k < right.length; k++) {
    const code = right[k]!.text;
    if (!CODE_RE.test(code)) continue;
    const label = right[k + 1]?.text ?? '';
    const numbered = BLOCK_RE.exec(label);
    if (numbered) {
      pairs.push({ code, block: numbered[1]! });
      k++;
      continue;
    }
    // Matrices that do not group prerequisites into blocks print `SEM BLOCO`; those are still required.
    if (NO_BLOCK_RE.test(label)) {
      pairs.push({ code, block: NO_BLOCK });
      k++;
    }
  }
  return pairs;
}

function addToBlock(course: LocatedCourse, block: string, code: string): void {
  const list = course.blocks.get(block) ?? [];
  if (!list.includes(code)) list.push(code);
  course.blocks.set(block, list);
}

/** Numbered blocks come first, in ascending order; the unnumbered group comes last. */
function compareBlocks(a: [string, string[]], b: [string, string[]]): number {
  if (a[0] === b[0]) return 0;
  if (a[0] === NO_BLOCK) return 1;
  if (b[0] === NO_BLOCK) return -1;
  return Number(a[0]) - Number(b[0]);
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
  // Matrices suffix some labels ("CARGA HORÁRIA DE OBRIGATÓRIAS INCLUÍNDO"), so match by prefix.
  const wanted = normalizeLabel(label);
  const anchor = items.find((i) => {
    const text = normalizeLabel(i.text);
    return text === wanted || text.startsWith(`${wanted} `);
  });
  if (!anchor) return null;
  const match = /(\d+)/.exec(valueNear(items, anchor, xMin, xMax) ?? '');
  return match ? Number(match[1]) : null;
}

function readRequirements(items: readonly TextItem[]): Curriculum['requirements'] {
  const left = (label: string) => footerNumber(items, label, 250, 322);
  const right = (label: string) => footerNumber(items, label, 520, 590);
  const totalHours = left('CARGA HORÁRIA TOTAL');
  if (totalHours === null) throw new ParseError('NOT_CURRICULUM');
  // Matrices with a "TRONCO COMUM" section list it apart from the mandatory courses; both are required, so the
  // trunk's hours join the mandatory bucket and the total stays the sum of what the course demands.
  const troncoHours = left('CARGA HORÁRIA DE TRONCO COMUM') ?? 0;
  const troncoCredits = right('CRÉDITOS DE TRONCO COMUM') ?? 0;
  return {
    totalHours,
    totalCredits: right('TOTAL DE CRÉDITOS') ?? 0,
    byCategory: {
      obrigatoria: {
        hours: (left('CARGA HORÁRIA DE OBRIGATÓRIAS') ?? 0) + troncoHours,
        credits: (right('CRÉDITOS DE OBRIGATÓRIAS') ?? 0) + troncoCredits,
      },
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
  if (!courseMatch || !version || !CURRICULUM_VERSION_RE.test(version)) throw new ParseError('NOT_CURRICULUM');
  const columns = readColumns(items);

  const courses: LocatedCourse[] = [];
  const loosePrereqs: (Located & { code: string; block: string })[] = [];
  let category: Category | null = null;

  for (const row of groupRows(items)) {
    const section = detectCategory(row);
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
      prerequisites: [...blocks.entries()].sort(compareBlocks).map(([, codes]) => codes),
    })),
    requirements: readRequirements(items),
  };
}
