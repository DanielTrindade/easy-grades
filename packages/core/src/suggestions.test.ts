import { describe, expect, it } from 'vitest';
import { sampleCurriculum as c, sampleTranscript as t } from './__fixtures__/sample';
import type { Curriculum, CurriculumCourse, TranscriptEntry } from './schemas';
import { pickWithinCredits, rankCandidates, suggestNextTerm } from './suggestions';

const passed = (code: string, category: TranscriptEntry['category'] = 'obrigatoria'): TranscriptEntry => ({
  code, name: code, category, term: '2027.1', credits: 4, hours: 60, grade: 9, status: 'aprovado', rawStatus: 'Aprovado',
});

const extensionHours = (code: string): TranscriptEntry => ({
  code, name: code, category: 'extensao', term: '2027.1', credits: 12, hours: 180, grade: 9, status: 'aprovado', rawStatus: 'Aprovado',
});

const extensionCourse = (code: string): CurriculumCourse => ({
  code, name: `PRÁTICAS EXTENSIONISTAS ${code}`, category: 'extensao', idealPeriod: 7, credits: 6,
  hours: { theory: 0, practice: 0, extension: 90, total: 90 }, prerequisites: [],
});
/** The sample plus two released extension courses, like the real curriculum's gallery of Práticas Extensionistas. */
const withExtension: Curriculum = { ...c, courses: [...c.courses, extensionCourse('ICC610'), extensionCourse('ICC611')] };

describe('suggestNextTerm', () => {
  it('suggests the remaining mandatory courses first, then just enough electives', () => {
    expect(suggestNextTerm(c, t).map((s) => s.code)).toEqual(['ICC150', 'ICC418', 'ICC004']);
  });
  it('does not count in-progress courses as done when disabled', () => {
    expect(suggestNextTerm(c, t, { countInProgress: false }).map((s) => s.code)).toEqual(['ICC150', 'ICC004']);
  });
  it('respects the credit limit', () => {
    expect(suggestNextTerm(c, t, { maxCredits: 5 }).map((s) => s.code)).toEqual(['ICC150']);
  });
  it('explains each suggestion in plain Portuguese', () => {
    const [first] = suggestNextTerm(c, t);
    expect(first!.reason).toBe('Obrigatória, período ideal 8, não é pré-requisito de outras');
  });
  it('never suggests ENADE or in-progress courses', () => {
    const codes = rankCandidates(c, t).map((s) => s.code);
    expect(codes).not.toContain('ENADE02');
    expect(codes).not.toContain('ICC600');
    expect(codes).not.toContain('ICC006');
  });
  it('[RF-5] returns an empty list when everything is done', () => {
    const done = { ...t, entries: [...t.entries, passed('ICC150'), passed('ICC418'), passed('ICC004', 'eletiva')] };
    expect(suggestNextTerm(c, done)).toEqual([]);
  });
});

describe('extension courses', () => {
  it('suggests released extension courses while the extension hours are pending', () => {
    const suggestion = rankCandidates(withExtension, t).find((s) => s.code === 'ICC610');
    expect(suggestion).toBeDefined();
    expect(suggestion!.category).toBe('extensao');
    expect(suggestion!.reason).toBe('Extensão, período ideal 7, não é pré-requisito de outras');
  });

  it('stops suggesting extension courses once the required hours are covered', () => {
    // 360 h of extension already approved, past the 320 h the curriculum requires.
    const done = { ...t, entries: [...t.entries, extensionHours('ICC600'), extensionHours('ICC601')] };
    const codes = rankCandidates(withExtension, done).map((s) => s.code);
    expect(codes).not.toContain('ICC610');
    expect(codes).not.toContain('ICC611');
  });

  it('takes no more extension courses than the pending hours', () => {
    const ranked = rankCandidates(withExtension, t);
    // 90 h left: only one of the two 90 h extension courses fits.
    expect(pickWithinCredits(ranked, 30, 60, 90).map((s) => s.code)).toEqual(['ICC150', 'ICC418', 'ICC610', 'ICC004']);
    expect(pickWithinCredits(ranked, 30, 60, 0).map((s) => s.code)).toEqual(['ICC150', 'ICC418', 'ICC004']);
  });
});
