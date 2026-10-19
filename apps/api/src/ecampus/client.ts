import { z } from 'zod';

const ECAMPUS_BASE = 'https://ecampus.ufam.edu.br/ecampus';
/** "Ensino Superior - Graduação Regular" — the level the matrices the app supports live under. */
export const GRADUACAO_REGULAR = '3';
const REQUEST_TIMEOUT_MS = 20_000;
const PDF_TIMEOUT_MS = 30_000;

const CourseRowSchema = z.object({
  IDCURSO: z.number(),
  CODCURSO: z.string(),
  NOMECURSO: z.string(),
});
const VersionRowSchema = z.object({
  ID: z.number(),
  NUMVERSAO: z.string(),
  SITUACAOVERSAO: z.string(),
});

export interface EcampusCourse {
  id: number;
  code: string;
  name: string;
}

export interface EcampusVersion {
  id: number;
  version: string;
  situation: string;
}

/** The e-Campus is a public service; a couple of requests at a time keeps it from feeling hammered. */
class Semaphore {
  private active = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(private readonly limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.active++;
    try {
      return await task();
    } finally {
      this.active--;
      this.waiting.shift()?.();
    }
  }
}

const gate = new Semaphore(3);

async function post(path: string, body: string, timeoutMs: number): Promise<Response> {
  const response = await fetch(`${ECAMPUS_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json, application/pdf' },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new EcampusError(`e-Campus respondeu ${response.status}`);
  return response;
}

/** The e-Campus was unreachable or answered something unexpected. */
export class EcampusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EcampusError';
  }
}

export const ecampusClient = {
  /** Every undergraduate course the e-Campus publishes. */
  async listCourses(): Promise<EcampusCourse[]> {
    const response = await gate.run(() => post('gradesCurriculares/loadCursos', `nivel_curso=${GRADUACAO_REGULAR}`, REQUEST_TIMEOUT_MS));
    const rows = z.array(CourseRowSchema).parse(await response.json());
    return rows.map((row) => ({ id: row.IDCURSO, code: row.CODCURSO, name: row.NOMECURSO }));
  },

  /** The versions published for one course, newest first as the e-Campus lists them. */
  async listVersions(courseId: number): Promise<EcampusVersion[]> {
    const response = await gate.run(() => post('gradesCurriculares/loadVersoes', `curso=${courseId}`, REQUEST_TIMEOUT_MS));
    const rows = z.array(VersionRowSchema).parse(await response.json());
    return rows.map((row) => ({ id: row.ID, version: row.NUMVERSAO, situation: row.SITUACAOVERSAO }));
  },

  /** The "Currículo de Curso" report as the PDF the e-Campus emits. */
  async fetchCurriculumPdf(courseId: number, versionId: number): Promise<Uint8Array> {
    const body = `nivel_curso=${GRADUACAO_REGULAR}&curso=${courseId}&versao=${versionId}`;
    const response = await gate.run(() => post('gradesCurriculares/report', body, PDF_TIMEOUT_MS));
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/pdf')) {
      throw new EcampusError(`o e-Campus devolveu ${contentType || 'conteúdo desconhecido'} em vez do PDF`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 5 || Buffer.from(bytes.subarray(0, 5)).toString('latin1') !== '%PDF-') {
      throw new EcampusError('o e-Campus não devolveu um PDF válido');
    }
    return bytes;
  },
};
