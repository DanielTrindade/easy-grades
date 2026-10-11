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
    expect(t.officialProgressPercent).toBe(65.63);
    expect(t.aaccDoneHours).toBe(30);
    expect(t.extensaoDoneHours).toBe(0);
  });

  it('reads hours and credits of each component from the summary table', () => {
    expect(parseTranscript(items).officialComponents).toEqual({
      obrigatoria: { hours: { required: 2370, done: 1830, percent: 77.22 }, credits: { required: 140, done: 114, percent: 81.43 } },
      optativa: { hours: { required: 180, done: 180, percent: 100 }, credits: { required: 6, done: 6, percent: 100 } },
      eletiva: { hours: { required: 120, done: 60, percent: 50 }, credits: { required: 4, done: 2, percent: 50 } },
      aacc: { hours: { required: 210, done: 30, percent: 14.29 }, credits: { required: 0, done: 0, percent: 0 } },
      extensao: { hours: { required: 320, done: 0, percent: 0 }, credits: { required: 0, done: 0, percent: 0 } },
      total: { hours: { required: 3200, done: 2100, percent: 65.63 }, credits: { required: 150, done: 122, percent: 81.33 } },
    });
  });

  it('nulls only the component whose row lacks its values', async () => {
    const partial = parseTranscript(await extractItems(await buildPdf(transcriptPages({ table: 'partial' }))));
    expect(partial.officialComponents?.eletiva).toBeNull();
    expect(partial.officialComponents?.obrigatoria).not.toBeNull();
    expect(partial.officialComponents?.total).not.toBeNull();
  });

  it('has no official components and no ENADE when the tables are absent', async () => {
    const bare = parseTranscript(await extractItems(await buildPdf(transcriptPages({ table: 'none', enade: false }))));
    expect(bare.officialComponents).toBeNull();
    expect(bare.officialProgressPercent).toBeNull();
    expect(bare.enade).toEqual([]);
  });

  it('reads the ENADE status with its year', () => {
    expect(parseTranscript(items).enade).toEqual([
      { kind: 'ingressante', year: 2024, status: 'Dispensado em razão calendário trienal' },
    ]);
  });

  it('reads a CONCLUINTE record next to an INGRESSANTE one', async () => {
    const both = parseTranscript(
      await extractItems(
        await buildPdf(
          transcriptPages({
            enade: [
              { kind: 'INGRESSANTE', year: '2024', situation: 'Dispensado em razão calendário trienal' },
              { kind: 'CONCLUINTE', year: '2026', situation: 'Pendente' },
            ],
          }),
        ),
      ),
    );
    expect(TranscriptSchema.parse(both).enade).toEqual([
      { kind: 'ingressante', year: 2024, status: 'Dispensado em razão calendário trienal' },
      { kind: 'concluinte', year: 2026, status: 'Pendente' },
    ]);
  });

  it('keeps an ENADE record whose year is missing, with a null year', async () => {
    const t = parseTranscript(
      await extractItems(await buildPdf(transcriptPages({ enade: [{ kind: 'CONCLUINTE', situation: 'Pendente' }] }))),
    );
    expect(TranscriptSchema.parse(t).enade).toEqual([{ kind: 'concluinte', year: null, status: 'Pendente' }]);
  });

  it.each([['1899'], ['2999'], ['20O4']])('nulls the ENADE year %s without failing the parse', async (year) => {
    const t = parseTranscript(
      await extractItems(
        await buildPdf(transcriptPages({ enade: [{ kind: 'INGRESSANTE', year, situation: 'Pendente' }] })),
      ),
    );
    expect(TranscriptSchema.parse(t).enade).toEqual([{ kind: 'ingressante', year: null, status: 'Pendente' }]);
  });

  it('omits an ENADE record with an empty situation', async () => {
    const t = parseTranscript(
      await extractItems(
        await buildPdf(
          transcriptPages({
            enade: [
              { kind: 'INGRESSANTE', year: '2024' },
              { kind: 'CONCLUINTE', year: '2026', situation: 'Pendente' },
            ],
          }),
        ),
      ),
    );
    expect(TranscriptSchema.parse(t).enade).toEqual([{ kind: 'concluinte', year: 2026, status: 'Pendente' }]);
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
