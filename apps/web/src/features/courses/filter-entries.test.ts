import type { TranscriptEntry } from '@easy-grades/core';
import { describe, expect, it } from 'vitest';
import { filterEntries, groupEntries, keyEntries, statusCounts } from './filter-entries';

function entry(overrides: Partial<TranscriptEntry>): TranscriptEntry {
  return {
    code: 'DO001',
    name: 'DISCIPLINA',
    category: 'obrigatoria',
    term: '2024.1',
    credits: 4,
    hours: 60,
    grade: 8,
    status: 'aprovado',
    rawStatus: 'Aprovado',
    ...overrides,
  };
}

const sample = keyEntries([
  entry({ code: 'DO010', name: 'CÁLCULO I', term: '2023.2', hours: 60, status: 'aprovado' }),
  entry({ code: 'DO002', name: 'ÁLGEBRA LINEAR', term: '2024.1', hours: 60, status: 'reprovado_nota', grade: 3 }),
  entry({ code: 'DO001', name: 'INTRODUÇÃO', term: '2024.1', hours: 30, status: 'aprovado', category: 'eletiva' }),
  entry({ code: 'DO003', name: 'ESTRUTURAS', term: '2024.2', hours: null, status: 'matriculado', grade: null }),
  entry({ code: 'DO004', name: 'TRANCADA', term: '2024.2', hours: 60, status: 'trancado', grade: null }),
  entry({ code: 'DO005', name: 'EQUIV', term: '2023.1', hours: 60, status: 'equivalencia', category: 'externa' }),
  entry({ code: 'DO006', name: 'CRIPTOGRAFIA', term: '2024.1', hours: 60, status: 'reprovado_freq', grade: null }),
]);

describe('statusCounts', () => {
  it('counts each status chip, with todas as the total', () => {
    expect(statusCounts(sample)).toEqual({
      todas: 7,
      concluidas: 3,
      em_curso: 1,
      reprovadas: 2,
      outras: 1,
    });
  });

  it('returns zeros for an empty transcript', () => {
    expect(statusCounts([])).toEqual({ todas: 0, concluidas: 0, em_curso: 0, reprovadas: 0, outras: 0 });
  });
});

describe('filterEntries', () => {
  it('matches the search against code and name, ignoring accents and case', () => {
    expect(filterEntries(sample, 'algebra', 'todas', 'todas').map((e) => e.code)).toEqual(['DO002']);
    expect(filterEntries(sample, 'DO01', 'todas', 'todas').map((e) => e.code)).toEqual(['DO010']);
    expect(filterEntries(sample, 'introducao', 'todas', 'todas').map((e) => e.code)).toEqual(['DO001']);
  });
});

describe('groupEntries', () => {
  it('groups by period, most recent first, with entries sorted by code inside each group', () => {
    const groups = groupEntries(sample, 'period');
    expect(groups.map((g) => g.id)).toEqual(['2024.2', '2024.1', '2023.2', '2023.1']);
    expect(groups[1]?.entries.map((e) => e.code)).toEqual(['DO001', 'DO002', 'DO006']);
  });

  it('sums the hours of each group and treats missing hours as zero', () => {
    const groups = groupEntries(sample, 'period');
    expect(groups.map((g) => [g.id, g.hours])).toEqual([
      ['2024.2', 60],
      ['2024.1', 150],
      ['2023.2', 60],
      ['2023.1', 60],
    ]);
  });

  it('labels period groups with the formatted term', () => {
    expect(groupEntries(sample, 'period')[0]?.label).toBe('2024/2');
  });

  it('groups by category in the declared category order, with labels', () => {
    const groups = groupEntries(sample, 'category');
    expect(groups.map((g) => g.id)).toEqual(['obrigatoria', 'eletiva', 'externa']);
    expect(groups.map((g) => g.label)).toEqual(['Obrigatória', 'Eletiva', 'Aproveitamento externo']);
    expect(groups[0]?.entries.map((e) => e.code)).toEqual(['DO002', 'DO003', 'DO004', 'DO006', 'DO010']);
  });

  it('returns no groups when there are no entries', () => {
    expect(groupEntries([], 'period')).toEqual([]);
  });
});
