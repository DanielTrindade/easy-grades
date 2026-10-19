import { parentPort } from 'node:worker_threads';
import type { ErrorCode } from '@easy-grades/core';
import { ParseError } from './errors.js';
import { parseCurriculumDocument, parseDocuments, parseTranscriptDocument } from './parsers/documents.js';

type WorkerMessage =
  | { type: 'parse'; kind: 'documents'; curriculumPdf: Uint8Array; transcriptPdf: Uint8Array }
  | { type: 'parse'; kind: 'curriculum'; curriculumPdf: Uint8Array }
  | { type: 'parse'; kind: 'transcript'; transcriptPdf: Uint8Array }
  | { type: 'abort' };

const port = parentPort;
if (!port) throw new Error('Parser worker requires a parent port');

const controller = new AbortController();
let started = false;

port.on('message', (message: WorkerMessage) => {
  if (message.type === 'abort') {
    controller.abort(new ParseError('PARSE_TIMEOUT'));
    return;
  }
  if (started) return;
  started = true;

  const work =
    message.kind === 'documents'
      ? parseDocuments(message.curriculumPdf, message.transcriptPdf, controller.signal)
      : message.kind === 'curriculum'
        ? parseCurriculumDocument(message.curriculumPdf, controller.signal)
        : parseTranscriptDocument(message.transcriptPdf, controller.signal);

  void work
    .then((result) => {
      port.postMessage({ type: 'result', ok: true, result });
    })
    .catch((error: unknown) => {
      const code: ErrorCode = error instanceof ParseError ? error.code : 'INTERNAL';
      port.postMessage({ type: controller.signal.aborted ? 'cancelled' : 'result', ok: false, code });
    })
    .finally(() => port.close());
});
