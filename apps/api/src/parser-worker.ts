import { parentPort } from 'node:worker_threads';
import type { ErrorCode } from '@easy-grades/core';
import { ParseError } from './errors.js';
import { parseDocuments } from './parsers/documents.js';

type WorkerMessage =
  | { type: 'parse'; curriculumPdf: Uint8Array; transcriptPdf: Uint8Array }
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

  void parseDocuments(message.curriculumPdf, message.transcriptPdf, controller.signal)
    .then((result) => {
      port.postMessage({ type: 'result', ok: true, result });
    })
    .catch((error: unknown) => {
      const code: ErrorCode = error instanceof ParseError ? error.code : 'INTERNAL';
      port.postMessage({ type: controller.signal.aborted ? 'cancelled' : 'result', ok: false, code });
    })
    .finally(() => port.close());
});
