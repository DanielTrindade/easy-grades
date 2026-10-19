import {
  CURRICULUM_VERSION_RE,
  mapStatus,
  OFFICIAL_COMPONENT_KEYS,
  termFromAdmission,
  termFromLabel,
  type Category,
  type EnadeRecord,
  type OfficialComponent,
  type OfficialComponentKey,
  type OfficialComponents,
  type PendingCourse,
  type Transcript,
  type TranscriptEntry,
} from '@easy-grades/core';
import { ParseError } from '../errors.js';
import { groupRows, rowText, valueNear, valueRightOf, type Row, type TextItem } from '../pdf/extract.js';

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

/** Labels of the summary table at the end of the body, in x < 30 (the section title "ATIVIDADE CURRICULAR DE EXTENSÃO" sits at x ≈ 197). */
const SUMMARY_LABELS: Record<OfficialComponentKey, string> = {
  obrigatoria: 'DISCIPLINAS OBRIGATÓRIAS',
  optativa: 'DISCIPLINAS OPTATIVAS',
  eletiva: 'DISCIPLINAS ELETIVAS',
  aacc: 'ATIVIDADES-ACADÊMICO-CIENTÍFICO-',
  extensao: 'ATIVIDADE CURRICULAR DE EXTENSÃO',
  total: 'TOTAL',
};
type XRange = readonly [number, number];
interface Columns {
  required: XRange;
  done: XRange;
  percent: XRange;
}
const HOURS_COLUMNS: Columns = { required: [222, 262], done: [282, 330], percent: [340, 380] };
const CREDITS_COLUMNS: Columns = { required: [400, 445], done: [460, 505], percent: [515, 560] };
const ENADE_KINDS: Record<string, EnadeRecord['kind']> = { INGRESSANTE: 'ingressante', CONCLUINTE: 'concluinte' };

const countValue = (text: string | null): number | null => (text !== null && /^\d+$/.test(text) ? Number(text) : null);
/** A printed percentage, capped at 100: a component over its requirement (e.g. optativas) still shows as complete. */
const percentValue = (text: string | null): number | null => {
  const match = /^(\d{1,3}(?:[.,]\d+)?)\s*%?$/.exec(text ?? '');
  return match ? Math.min(Number(match[1]!.replace(',', '.')), 100) : null;
};

function readMeasure(
  items: readonly TextItem[],
  anchor: TextItem,
  dyMin: number,
  columns: Columns,
): OfficialComponent['hours'] | null {
  const cell = (range: XRange, parse: (text: string | null) => number | null) =>
    parse(valueNear(items, anchor, range[0], range[1], dyMin));
  const required = cell(columns.required, countValue);
  const done = cell(columns.done, countValue);
  const percent = cell(columns.percent, percentValue);
  return required === null || done === null || percent === null ? null : { required, done, percent };
}

function readComponent(items: readonly TextItem[], key: OfficialComponentKey): OfficialComponent | null {
  const anchor = items.find((i) => i.x < 30 && i.text === SUMMARY_LABELS[key]);
  if (!anchor) return null;
  // AACC values sit ~4.7 pt below their (wrapped) label; every other row is aligned with it.
  const dyMin = key === 'aacc' ? -8 : -1.5;
  const hours = readMeasure(items, anchor, dyMin, HOURS_COLUMNS);
  const credits = readMeasure(items, anchor, dyMin, CREDITS_COLUMNS);
  return hours && credits ? { hours, credits } : null;
}

/** Null when no row of the summary table is present; a row with missing values is null on its own. */
function readOfficialComponents(items: readonly TextItem[]): OfficialComponents | null {
  const components = Object.fromEntries(OFFICIAL_COMPONENT_KEYS.map((key) => [key, readComponent(items, key)])) as OfficialComponents;
  return Object.values(components).some((c) => c !== null) ? components : null;
}

/** A four-digit year from 1990 to 2100. Anything else (missing, garbled, implausible) is null. */
function enadeYear(text: string | undefined): number | null {
  if (!text || !/^\d{4}$/.test(text)) return null;
  const year = Number(text);
  return year >= 1990 && year <= 2100 ? year : null;
}

/**
 * ENADE rows follow the header "ENADE | ANO | SITUAÇÃO": label in x < 30, year in x 270–320, situation in x ≥ 360.
 * A row without a situation is dropped; a row without a usable year keeps its record with year null.
 */
function readEnade(items: readonly TextItem[]): EnadeRecord[] {
  const records: EnadeRecord[] = [];
  let inSection = false;
  for (const row of groupRows(items, 1.5)) {
    if (rowText(row).startsWith('OBSERVAÇÕES')) break;
    const texts = new Set(row.items.map((i) => i.text));
    if (!inSection) {
      inSection = texts.has('ENADE') && texts.has('ANO') && texts.has('SITUAÇÃO');
      continue;
    }
    const label = row.items[0];
    const kind = label && label.x < 30 ? ENADE_KINDS[label.text] : undefined;
    if (!label || !kind) continue;
    const aligned = row.items.filter((i) => Math.abs(i.y - label.y) <= 1.5);
    const year = aligned.find((i) => i.x >= 270 && i.x <= 320)?.text;
    const situation = aligned
      .filter((i) => i.x >= 360)
      .map((i) => i.text)
      .join(' ')
      .trim()
      .slice(0, 120);
    if (!situation) continue;
    records.push({ kind, year: enadeYear(year), status: situation });
  }
  return records;
}

export function parseTranscript(items: readonly TextItem[]): Transcript {
  if (!items.some((i) => i.text === 'Histórico Escolar Analítico')) throw new ParseError('NOT_TRANSCRIPT');

  // Whitelisted header values. Nothing else from the header is ever read.
  const courseCode = /^([A-Z0-9]{2,8})\s*-/.exec(valueRightOf(items, 'Curso:') ?? '')?.[1];
  const curriculumVersion = valueRightOf(items, 'Versão (Currículo) :');
  const admissionTerm = termFromAdmission(valueRightOf(items, 'Ano/Período Ingresso:') ?? '');
  if (!courseCode || !curriculumVersion || !CURRICULUM_VERSION_RE.test(curriculumVersion)) throw new ParseError('NOT_TRANSCRIPT');

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
    officialComponents: readOfficialComponents(body),
    enade: readEnade(body),
    entries,
    pending,
  };
}
