import type { Transcript, TranscriptEntry } from '@easy-grades/core';
import { describe, expect, it } from 'vitest';
import { hoursAverage, hoursByTerm } from './chart-utils';

const entry = (over: Partial<TranscriptEntry>): TranscriptEntry => ({
  code: 'ICC001', name: 'DISCIPLINA', category: 'obrigatoria', term: '2024.1', credits: 4, hours: 60,
  grade: 8, status: 'aprovado', rawStatus: 'Aprovado', ...over,
});

const transcript: Transcript = {
  courseCode: 'IE17',
  curriculumVersion: '2025/2',
  admissionTerm: '2024.1',
  officialCr: null,
  officialProgressPercent: null,
  aaccDoneHours: null,
  extensaoDoneHours: null,
  officialComponents: null,
  enade: [],
  pending: [],
  entries: [
    entry({ term: '2024.1', hours: 60, status: 'aprovado', grade: 8 }),
    entry({ term: '2024.1', hours: 30, status: 'reprovado_nota', grade: 2 }),
    entry({ term: '2024.2', hours: 90, status: 'matriculado', grade: null }),
  ],
};

describe('hoursByTerm', () => {
  it('splits done, failed and in-progress hours per term', () => {
    expect(hoursByTerm(transcript)).toEqual([
      { term: '2024/1', done: 60, failed: 30, inProgress: 0 },
      { term: '2024/2', done: 0, failed: 0, inProgress: 90 },
    ]);
  });
});

describe('hoursAverage', () => {
  it('averages the finished terms and ignores the term still in progress', () => {
    expect(
      hoursAverage([
        { term: '2024/1', done: 300, failed: 0, inProgress: 0 },
        { term: '2024/2', done: 200, failed: 60, inProgress: 0 },
        { term: '2026/2', done: 0, failed: 0, inProgress: 420 },
      ]),
    ).toBe(280);
  });

  it('has no average without finished terms', () => {
    expect(hoursAverage([{ term: '2026/2', done: 0, failed: 0, inProgress: 420 }])).toBeNull();
  });
});
