import { Worker } from 'node:worker_threads';
import { ERROR_MESSAGES, type ErrorCode, type ParseResponse, type Transcript } from '@easy-grades/core';
import { ParseError } from './errors';

type WorkerResult =
  | { type: 'result'; ok: true; result: unknown }
  | { type: 'result' | 'cancelled'; ok: false; code: ErrorCode };
type WorkerMessage =
  | { type: 'parse'; kind: 'documents'; curriculumPdf: Uint8Array; transcriptPdf: Uint8Array }
  | { type: 'parse'; kind: 'curriculum'; curriculumPdf: Uint8Array }
  | { type: 'parse'; kind: 'transcript'; transcriptPdf: Uint8Array }
  | { type: 'abort' };

export interface ParseWorkerOptions {
  timeoutMs: number;
  abortGraceMs?: number;
  createWorker?: () => Worker;
}

const ABORT_GRACE_MS = 50;

function createParserWorker(): Worker {
  const isTypeScriptSource = import.meta.url.endsWith('.ts');
  const workerUrl = new URL(
    isTypeScriptSource ? './parser-worker-bootstrap.mjs' : './parser-worker.js',
    import.meta.url,
  );
  return new Worker(workerUrl, {
    execArgv: [],
  });
}

function transferList(curriculumPdf: Uint8Array, transcriptPdf: Uint8Array): ArrayBuffer[] {
  const buffers = new Set<ArrayBuffer>();
  for (const buffer of [curriculumPdf.buffer, transcriptPdf.buffer]) {
    if (buffer instanceof ArrayBuffer) buffers.add(buffer);
  }
  return [...buffers];
}

function safeErrorCode(code: unknown): ErrorCode {
  return typeof code === 'string' && Object.hasOwn(ERROR_MESSAGES, code) ? (code as ErrorCode) : 'INTERNAL';
}

export function parseInWorker(
  curriculumPdf: Uint8Array,
  transcriptPdf: Uint8Array,
  options: ParseWorkerOptions,
): Promise<ParseResponse> {
  return runInWorker<ParseResponse>(
    { type: 'parse', kind: 'documents', curriculumPdf, transcriptPdf },
    options,
  );
}

/** Parses a transcript on its own, for when the curriculum comes from the e-Campus instead of an upload. */
export function parseTranscriptInWorker(
  transcriptPdf: Uint8Array,
  options: ParseWorkerOptions,
): Promise<Transcript> {
  return runInWorker<Transcript>({ type: 'parse', kind: 'transcript', transcriptPdf }, options);
}

function runInWorker<T>(message: WorkerMessage, options: ParseWorkerOptions): Promise<T> {
  const worker = options.createWorker?.() ?? createParserWorker();
  const abortGraceMs = options.abortGraceMs ?? ABORT_GRACE_MS;

  return new Promise((resolve, reject) => {
    let settled = false;
    let terminating = false;
    let deadlineReached = false;
    const timers: { deadline?: NodeJS.Timeout; abort?: NodeJS.Timeout } = {};

    const clearTimers = (): void => {
      clearTimeout(timers.deadline);
      clearTimeout(timers.abort);
    };

    const terminateAndFinish = (result: { ok: true; value: T } | { ok: false; error: ParseError }): void => {
      if (settled || terminating) return;
      terminating = true;
      clearTimers();
      void worker.terminate().then(
        () => {
          settled = true;
          if (result.ok) resolve(result.value);
          else reject(result.error);
        },
        () => {
          settled = true;
          reject(result.ok ? new ParseError('INTERNAL') : result.error);
        },
      );
    };

    const terminateWithTimeout = (): void => {
      terminateAndFinish({ ok: false, error: new ParseError('PARSE_TIMEOUT') });
    };

    worker.on('message', (message: WorkerResult) => {
      if (settled || terminating) return;
      if (deadlineReached) {
        if (message.type === 'cancelled' || message.type === 'result') terminateWithTimeout();
        return;
      }
      if (message.ok) terminateAndFinish({ ok: true, value: message.result as T });
      else terminateAndFinish({ ok: false, error: new ParseError(safeErrorCode(message.code)) });
    });

    worker.once('error', () => {
      if (deadlineReached) terminateWithTimeout();
      else terminateAndFinish({ ok: false, error: new ParseError('INTERNAL') });
    });

    worker.once('exit', () => {
      if (settled || terminating) return;
      if (deadlineReached) terminateWithTimeout();
      else terminateAndFinish({ ok: false, error: new ParseError('INTERNAL') });
    });

    timers.deadline = setTimeout(() => {
      deadlineReached = true;
      try {
        worker.postMessage({ type: 'abort' } satisfies WorkerMessage);
      } catch {
        terminateWithTimeout();
        return;
      }
      timers.abort = setTimeout(terminateWithTimeout, abortGraceMs);
    }, options.timeoutMs);

    try {
      // The uploaded documents are transferred: their buffers are detached from the request and never used
      // again. A document fetched from the e-Campus is copied instead, so the caller keeps its own bytes.
      const transfer =
        message.type === 'parse' && message.kind === 'documents'
          ? transferList(message.curriculumPdf, message.transcriptPdf)
          : [];
      worker.postMessage(message, transfer);
    } catch {
      terminateAndFinish({ ok: false, error: new ParseError('INTERNAL') });
    }
  });
}
