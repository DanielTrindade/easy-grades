import type { FastifyPluginAsync } from 'fastify';
import { ParseError } from '../errors';
import { parseInWorker } from '../parser-worker-client';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FIELDS = ['curriculo', 'historico'] as const;
type Field = (typeof FIELDS)[number];
const isField = (name: string): name is Field => (FIELDS as readonly string[]).includes(name);

export function isPdf(bytes: Uint8Array): boolean {
  return bytes.length > 5 && Buffer.from(bytes.subarray(0, 5)).toString('latin1') === '%PDF-';
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
    return parseInWorker(curriculo, historico, { timeoutMs: opts.parseTimeoutMs });
  });
};
