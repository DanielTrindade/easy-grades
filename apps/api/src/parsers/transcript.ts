import {
  mapStatus,
  termFromAdmission,
  termFromLabel,
  type Category,
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
