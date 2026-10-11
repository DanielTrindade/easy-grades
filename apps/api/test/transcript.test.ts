import { TranscriptSchema } from '@easy-grades/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseDocuments } from '../src/parsers/documents';
import { parseTranscript } from '../src/parsers/transcript';
import { extractItems, type TextItem } from '../src/pdf/extract';
import { buildPdf } from './fixtures/build-pdf';
import { curriculumPages } from './fixtures/curriculum-fixture';
import { FAKE_PII, transcriptPages } from './fixtures/transcript-fixture';

describe('parseTranscript', () => {
  let items: TextItem[];
  beforeAll(async () => {
    items = await extractItems(await buildPdf(transcriptPages()));
  });

  it('reads only the whitelisted header values', () => {
    const t = parseTranscript(items);
    expect(TranscriptSchema.parse(t)).toEqual(t);
    expect(t).toMatchObject({ courseCode: 'IE17', curriculumVersion: '2025/2', admissionTerm: '2024.1' });
  });

  it('reads entries with section category, term, numbers and status', () => {
    const t = parseTranscript(items);
    expect(t.entries.map((e) => [e.code, e.category, e.term, e.credits, e.hours, e.grade, e.status])).toEqual([
      ['ICC600', 'extensao', '2026.2', 12, 180, null, 'matriculado'],
      ['ICC020', 'externa', '2024.1', 5, 90, 9.5, 'aprovado'],
      ['ENADE01', 'obrigatoria', '2024.1', null, null, null, 'disp_calend'],
      ['ICC001', 'obrigatoria', '2024.1', 5, 90, 9.5, 'equivalencia'],
      ['ICC002', 'obrigatoria', '2024.1', 5, 90, 8.1, 'transf_real'],
      ['ICC120', 'obrigatoria', '2024.2', 4, 60, 2.3, 'reprovado_nota'],
      ['ICC040', 'obrigatoria', '2024.2', 4, 60, 10, 'aprovado'],
      ['ICC003', 'obrigatoria', '2026.2', 5, 90, null, 'matriculado'],
      ['IHP123', 'optativa', '2025.2', 4, 60, 7, 'disp_nota'],
      ['FAA011', 'optativa', '2025.2', 4, 60, 3, 'desconhecido'],
    ]);
  });

  it('[RF-1] keeps the raw text of unknown statuses', () => {
    expect(parseTranscript(items).entries.find((e) => e.code === 'FAA011')!.rawStatus).toBe('Cancelado');
  });

  it('reads pending courses, official CR and the summary table', () => {
    const t = parseTranscript(items);
    expect(t.pending).toEqual([
      { code: 'ICC150', name: 'TRABALHO DE CONCLUSÃO DE CURSO', idealPeriod: 8 },
      { code: 'ENADE02', name: 'ENADE - CONCLUINTE', idealPeriod: null },
    ]);
    expect(t.officialCr).toBe(7.25);
    expect(t.officialProgressPercent).toBe(14.06);
    expect(t.aaccDoneHours).toBe(30);
    expect(t.extensaoDoneHours).toBe(0);
  });

  it('never leaks personal data from the header, teacher rows or observations', async () => {
    const result = await parseDocuments(await buildPdf(curriculumPages()), await buildPdf(transcriptPages()));
    const json = JSON.stringify(result);
    for (const pii of FAKE_PII) expect(json).not.toContain(pii);
    expect(json).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
    expect(json).not.toContain('FAE011');
  });

  it('rejects a curriculum given as transcript', async () => {
    const curriculumItems = await extractItems(await buildPdf(curriculumPages()));
    expect(() => parseTranscript(curriculumItems)).toThrow(expect.objectContaining({ code: 'NOT_TRANSCRIPT' }));
  });
});

describe('parseDocuments', () => {
  it('rejects a transcript from another curriculum version', async () => {
    await expect(
      parseDocuments(await buildPdf(curriculumPages()), await buildPdf(transcriptPages({ version: '2018/1' }))),
    ).rejects.toMatchObject({ code: 'CURRICULUM_MISMATCH' });
  });

  it('rejects a transcript with a different course code and the same curriculum version', async () => {
    await expect(
      parseDocuments(await buildPdf(curriculumPages()), await buildPdf(transcriptPages({ courseCode: 'IE99' }))),
    ).rejects.toMatchObject({ code: 'CURRICULUM_MISMATCH' });
  });
});
