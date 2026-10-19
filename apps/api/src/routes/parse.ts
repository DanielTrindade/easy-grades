import type { FastifyPluginAsync } from 'fastify';
import { ParseError } from '../errors';
import type { CurriculumService } from '../ecampus/curriculum-service';
import { buildParseResponse } from '../parsers/documents';
import { parseTranscriptInWorker, parseInWorker } from '../parser-worker-client';

export interface ParseRouteOptions {
  rateLimitMax: number;
  parseTimeoutMs: number;
  /** Reads the curriculum the student picked from the e-Campus. */
  curriculumService: CurriculumService;
}

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FIELDS = ['curriculo', 'historico'] as const;
type Field = (typeof FIELDS)[number];
const isField = (name: string): name is Field => (FIELDS as readonly string[]).includes(name);

export function isPdf(bytes: Uint8Array): boolean {
  return bytes.length > 5 && Buffer.from(bytes.subarray(0, 5)).toString('latin1') === '%PDF-';
}

function positiveId(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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
    return parseInWorker(curriculo, historico, { timeoutMs: opts.parseTimeoutMs });
  });

  // The student only sends the transcript; the curriculum comes from the matrix the e-Campus publishes.
  app.post<{ Querystring: { curso?: string; versao?: string } }>(
    '/api/parse/historico',
    { config: { rateLimit: { max: opts.rateLimitMax, timeWindow: '1 minute' } } },
    async (request) => {
      const courseId = positiveId(request.query.curso);
      const versionId = positiveId(request.query.versao);
      if (courseId === null || versionId === null) throw new ParseError('NOT_FOUND');
      if (!request.isMultipart()) throw new ParseError('INVALID_UPLOAD');
      const files = new Map<string, Uint8Array>();
      for await (const part of request.parts()) {
        if (part.type !== 'file' || part.fieldname !== 'historico' || files.has('historico')) {
          throw new ParseError('INVALID_UPLOAD');
        }
        const buffer = await part.toBuffer();
        if (!isPdf(buffer)) throw new ParseError('INVALID_PDF');
        files.set('historico', new Uint8Array(buffer));
      }
      const historico = files.get('historico');
      if (!historico) throw new ParseError('MISSING_FILE');

      let curriculum;
      try {
        curriculum = await opts.curriculumService.getCurriculum(courseId, versionId);
      } catch (error) {
        if (error instanceof ParseError) throw error;
        throw new ParseError('INTERNAL');
      }
      const transcript = await parseTranscriptInWorker(historico, { timeoutMs: opts.parseTimeoutMs });
      return buildParseResponse(curriculum, transcript);
    },
  );
};
