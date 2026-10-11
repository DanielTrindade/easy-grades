import { describe, expect, it } from 'vitest';
import { sampleCurriculum as c, sampleTranscript as t } from './__fixtures__/sample';
import type { TranscriptEntry } from './schemas';
import { rankCandidates, suggestNextTerm } from './suggestions';

const passed = (code: string, category: TranscriptEntry['category'] = 'obrigatoria'): TranscriptEntry => ({
  code, name: code, category, term: '2027.1', credits: 4, hours: 60, grade: 9, status: 'aprovado', rawStatus: 'Aprovado',
});

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
  it('never suggests ENADE, extension or in-progress courses', () => {
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
