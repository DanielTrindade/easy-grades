import { CurriculumSchema } from '@easy-grades/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseCurriculum } from '../src/parsers/curriculum';
import { extractItems, type TextItem } from '../src/pdf/extract';
import { buildPdf } from './fixtures/build-pdf';
import { curriculumPages, semBlocoCurriculumPages } from './fixtures/curriculum-fixture';
import { transcriptPages } from './fixtures/transcript-fixture';

describe('parseCurriculum', () => {
  let items: TextItem[];
  beforeAll(async () => {
    items = await extractItems(await buildPdf(curriculumPages()));
  });
  const course = (code: string) => parseCurriculum(items).courses.find((c) => c.code === code);

  it('reads course identity and validates against the schema', () => {
    const c = parseCurriculum(items);
    expect(CurriculumSchema.parse(c)).toEqual(c);
    expect(c).toMatchObject({ courseCode: 'IE17', courseName: 'Engenharia de Software', version: '2025/2' });
  });

  it('reads every course row with category, period, credits and hours', () => {
    const c = parseCurriculum(items);
    expect(c.courses.map((x) => x.code)).toEqual([
      'ICC001', 'ICC120', 'ICC002', 'ICC040', 'ICC044', 'ICC150', 'ICC418', 'ENADE01', 'ICC004', 'ICC010', 'IHP123', 'ICC606',
    ]);
    expect(course('ICC001')).toMatchObject({
      category: 'obrigatoria', idealPeriod: 1, credits: 5, hours: { theory: 60, practice: 30, extension: 0, total: 90 }, prerequisites: [],
    });
    expect(course('ICC150')!.hours).toEqual({ theory: 0, practice: 150, extension: 0, total: 150 });
    expect(course('ICC004')).toMatchObject({ category: 'eletiva', idealPeriod: null });
    expect(course('IHP123')).toMatchObject({ category: 'optativa' });
    expect(course('ICC606')).toMatchObject({ category: 'extensao', idealPeriod: 5, hours: { extension: 90, total: 90 } });
    expect(course('ENADE01')).toMatchObject({ credits: 0, idealPeriod: null });
  });

  it('attaches prerequisites: first beside the row, extra ones stacked below it', () => {
    expect(course('ICC002')!.prerequisites).toEqual([['ICC001']]);
    expect(course('ICC150')!.prerequisites).toEqual([['ICC107', 'ICC431']]);
    expect(course('ICC418')!.prerequisites).toEqual([['ICC412']]);
    expect(course('ICC010')!.prerequisites).toEqual([['ICC007']]);
  });

  it('keeps different BLOCOs as alternatives', () => {
    expect(course('ICC044')!.prerequisites).toEqual([['ICC040'], ['ICC120']]);
  });

  it('reads the requirements footer', () => {
    expect(parseCurriculum(items).requirements).toEqual({
      totalHours: 3200,
      totalCredits: 150,
      byCategory: {
        obrigatoria: { hours: 2370, credits: 140 },
        optativa: { hours: 180, credits: 6 },
        eletiva: { hours: 120, credits: 4 },
        aacc: { hours: 210, credits: 0 },
        extensao: { hours: 320, credits: 0 },
      },
      minPeriods: 8,
      maxPeriods: 12,
      minCreditsPerPeriod: 12,
      maxCreditsPerPeriod: 30,
    });
  });

  it('rejects a transcript given as curriculum', async () => {
    const transcriptItems = await extractItems(await buildPdf(transcriptPages()));
    expect(() => parseCurriculum(transcriptItems)).toThrow(expect.objectContaining({ code: 'NOT_CURRICULUM' }));
  });
});

describe('parseCurriculum — matrices without blocks', () => {
  let items: TextItem[];
  beforeAll(async () => {
    items = await extractItems(await buildPdf(semBlocoCurriculumPages()));
  });
  const course = (code: string) => parseCurriculum(items).courses.find((c) => c.code === code);

  it('keeps prerequisites printed as "SEM BLOCO"', () => {
    expect(course('FAA502')!.prerequisites).toEqual([['FAA501']]);
  });

  it('groups several "SEM BLOCO" prerequisites of the same course together', () => {
    expect(course('FAA503')!.prerequisites).toEqual([['FAA502', 'FAA501']]);
  });

  it('still reads numbered blocks', () => {
    expect(course('FAA504')!.prerequisites).toEqual([['FAA503']]);
  });

  it('reads a legacy version without a period', () => {
    const c = parseCurriculum(items);
    expect(c.version).toBe('1981');
    expect(CurriculumSchema.parse(c)).toEqual(c);
  });

  it('reads a legacy version with a letter suffix', async () => {
    const legacy = await extractItems(await buildPdf(semBlocoCurriculumPages({ version: '1978/S' })));
    expect(parseCurriculum(legacy).version).toBe('1978/S');
  });
});
