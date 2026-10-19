import { CurriculumSchema, ParseResponseSchema, type Curriculum, type ParseResponse } from '@easy-grades/core';
import { ParseError } from '../errors.js';
import { extractItems } from '../pdf/extract.js';
import { parseCurriculum } from './curriculum.js';
import { parseTranscript } from './transcript.js';

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const reason: unknown = signal.reason;
  throw reason instanceof Error ? reason : new Error('Document parsing was aborted');
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

export async function parseDocuments(
  curriculumPdf: Uint8Array,
  transcriptPdf: Uint8Array,
  signal?: AbortSignal,
): Promise<ParseResponse> {
  throwIfAborted(signal);
  const curriculumItems = await extractItems(curriculumPdf, signal);
  throwIfAborted(signal);
  const curriculum = parseCurriculum(curriculumItems);
  await yieldToEventLoop();
  throwIfAborted(signal);
  const transcriptItems = await extractItems(transcriptPdf, signal);
  throwIfAborted(signal);
  const transcript = parseTranscript(transcriptItems);
  await yieldToEventLoop();
  throwIfAborted(signal);
  if (curriculum.courseCode !== transcript.courseCode || curriculum.version !== transcript.curriculumVersion) {
    throw new ParseError('CURRICULUM_MISMATCH');
  }
  // Re-validating strips any key not in the whitelisted schema.
  return ParseResponseSchema.parse({ curriculum, transcript });
}

/** Parses a curriculum on its own — the e-Campus publishes the matrix without any student data in it. */
export async function parseCurriculumDocument(
  curriculumPdf: Uint8Array,
  signal?: AbortSignal,
): Promise<Curriculum> {
  throwIfAborted(signal);
  const items = await extractItems(curriculumPdf, signal);
  throwIfAborted(signal);
  return CurriculumSchema.parse(parseCurriculum(items));
}
