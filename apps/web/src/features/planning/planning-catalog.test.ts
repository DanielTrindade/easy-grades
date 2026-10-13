import type { Curriculum, Transcript } from '@easy-grades/core';
import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { describe, expect, it } from 'vitest';
import { buildCatalog, filterCatalog, formatMissing } from './planning-catalog';

const course = (code: string, category: 'obrigatoria' | 'eletiva' | 'optativa', prerequisites: string[][] = [], name = `Disciplina ${code}`) => ({
  code,
  name,
  category,
  idealPeriod: 2,
  credits: 4,
  hours: { theory: 60, practice: 0, extension: 0, total: 60 },
  prerequisites,
});

const curriculum: Curriculum = {
  ...sampleCurriculum,
  courses: [
    course('ABC001', 'obrigatoria', [], 'Cálculo I'),
    course('ABC002', 'obrigatoria', [['ABC001']], 'Cálculo II'),
    course('ABC003', 'eletiva', [['ABC001', 'ABC004'], ['ABC005']], 'Tópicos'),
    course('ABC004', 'obrigatoria'),
    course('ABC005', 'obrigatoria'),
    course('ABC006', 'optativa'),
  ],
};
const transcript: Transcript = { ...sampleTranscript, entries: [] };

describe('buildCatalog', () => {
  it('lists pending obrigatórias and eletivas, with the reason and what is missing', () => {
    const items = buildCatalog(curriculum, transcript, true);
    expect(items.map((i) => i.code).sort()).toEqual(['ABC001', 'ABC002', 'ABC003', 'ABC004', 'ABC005']);
    const calculo2 = items.find((i) => i.code === 'ABC002')!;
    expect(calculo2.missing).toEqual([['ABC001']]);
    expect(items.find((i) => i.code === 'ABC001')!.reason).toBe('Libera 2 disciplinas');
    expect(calculo2.reason).toBe('Não é pré-requisito de outras');
    expect(items.find((i) => i.code === 'ABC003')!.missing).toEqual([['ABC001', 'ABC004'], ['ABC005']]);
  });

  it('frees a course once its prerequisite is done and counts the courses it unlocks', () => {
    const done: Transcript = {
      ...transcript,
      entries: [{ ...sampleTranscript.entries[0]!, code: 'ABC001', status: 'aprovado', category: 'obrigatoria' }],
    };
    const items = buildCatalog(curriculum, done, true);
    expect(items.find((i) => i.code === 'ABC002')!.missing).toEqual([]);
    expect(items.find((i) => i.code === 'ABC002')!.unlocks).toBe(0);
    expect(items.find((i) => i.code === 'ABC001')).toBeUndefined();
    expect(items.find((i) => i.code === 'ABC002')!.reason).toBe('Não é pré-requisito de outras');
  });
});

describe('formatMissing', () => {
  it('joins the codes of a block with "e" and the blocks with "ou"', () => {
    expect(formatMissing([['ICC431', 'ICC412']])).toBe('ICC431 e ICC412');
    expect(formatMissing([['ICC431'], ['ICC500']])).toBe('ICC431 ou ICC500');
    expect(formatMissing([['A', 'B'], ['C']])).toBe('A e B ou C');
  });
});

describe('filterCatalog', () => {
  const items = buildCatalog(curriculum, transcript, true);
  const base = { query: '', suggested: new Set<string>(['ABC004']), selected: new Set<string>() };

  it('shows suggested, unblocked courses by default', () => {
    expect(filterCatalog(items, { ...base, filter: 'sugeridas' }).map((i) => i.code)).toEqual(['ABC004']);
  });

  it('separates obrigatórias, eletivas and bloqueadas', () => {
    expect(filterCatalog(items, { ...base, filter: 'eletivas' }).map((i) => i.code)).toEqual(['ABC003']);
    expect(filterCatalog(items, { ...base, filter: 'bloqueadas' }).map((i) => i.code).sort()).toEqual(['ABC002', 'ABC003']);
    expect(filterCatalog(items, { ...base, filter: 'obrigatorias' }).map((i) => i.code).sort()).toEqual(['ABC001', 'ABC002', 'ABC004', 'ABC005']);
  });

  it('searches by code or name, ignoring accents and case', () => {
    expect(filterCatalog(items, { ...base, filter: 'obrigatorias', query: 'calculo ii' }).map((i) => i.code)).toEqual(['ABC002']);
    expect(filterCatalog(items, { ...base, filter: 'obrigatorias', query: 'abc005' }).map((i) => i.code)).toEqual(['ABC005']);
    expect(filterCatalog(items, { ...base, filter: 'eletivas', query: 'Tópicos' }).map((i) => i.code)).toEqual(['ABC003']);
  });

  it('keeps a selected course visible under Sugeridas even when it was not suggested', () => {
    const picked = { ...base, filter: 'sugeridas' as const, selected: new Set(['ABC005']) };
    expect(filterCatalog(items, picked).map((i) => i.code).sort()).toEqual(['ABC004', 'ABC005']);
  });
});
