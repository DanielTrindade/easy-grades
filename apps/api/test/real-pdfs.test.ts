import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeCr, computeProgress, OFFICIAL_COMPONENT_KEYS } from '@easy-grades/core';
import { describe, expect, it } from 'vitest';
import { parseDocuments } from '../src/parsers/documents';

// Local-only check against real e-Campus PDFs placed at the repo root (never committed).
const ROOT = process.env.REAL_PDF_DIR ?? resolve(__dirname, '../../..');
const curriculoPath = resolve(ROOT, 'report.pdf');
const historicoPath = resolve(ROOT, 'historico.pdf');
const hasPdfs = existsSync(curriculoPath) && existsSync(historicoPath);

describe.skipIf(!hasPdfs)('real e-Campus PDFs', () => {
  it('parses both documents and reproduces the official numbers', async () => {
    const result = await parseDocuments(
      new Uint8Array(readFileSync(curriculoPath)),
      new Uint8Array(readFileSync(historicoPath)),
    );
    const { curriculum, transcript } = result;

    expect(curriculum.courseCode).toBe(transcript.courseCode);
    expect(curriculum.requirements.totalHours).toBeGreaterThan(0);
    expect(curriculum.courses.length).toBeGreaterThan(50);
    expect(curriculum.courses.every((c) => c.name.length > 0)).toBe(true);
    expect(transcript.entries.length).toBeGreaterThan(10);
    expect(transcript.officialCr).not.toBeNull();
    expect(computeCr(transcript.entries)).toBe(transcript.officialCr);
    expect(computeProgress(curriculum, transcript).percent).toBe(transcript.officialProgressPercent);

    // The official integralização table: every row read, and consistent with the transcript's own totals.
    const official = transcript.officialComponents;
    expect(official).not.toBeNull();
    for (const key of OFFICIAL_COMPONENT_KEYS) {
      expect(official![key]).not.toBeNull();
    }
    expect(official!.total!.hours.percent).toBe(transcript.officialProgressPercent);
    expect(official!.aacc!.hours.done).toBe(transcript.aaccDoneHours);
    expect(official!.extensao!.hours.done).toBe(transcript.extensaoDoneHours);
    expect(transcript.enade.length).toBeGreaterThanOrEqual(1);

    const json = JSON.stringify(result);
    expect(json).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/); // CPF
    expect(json).not.toMatch(/\d{2}\/\d{2}\/\d{4}/); // dates (birth date, emission date)
    for (const forbidden of ['Filiação', 'Docente', 'Doutorado', 'Mestrado', 'SISU', 'SSP-']) {
      expect(json).not.toContain(forbidden);
    }
  });
});
