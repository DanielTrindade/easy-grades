import { describe, expect, it } from 'vitest';
import { TranscriptEntrySchema, TranscriptSchema } from './schemas';

const entry = {
  code: 'ICC001', name: 'INTRODUÇÃO À COMPUTAÇÃO', category: 'obrigatoria', term: '2025.1',
  credits: 5, hours: 90, grade: 9.5, status: 'equivalencia', rawStatus: 'Equivalenc',
};

describe('schemas', () => {
  it('accepts a valid entry and ENADE-style codes', () => {
    expect(TranscriptEntrySchema.parse(entry)).toEqual(entry);
    expect(
      TranscriptEntrySchema.parse({ ...entry, code: 'ENADE01', credits: null, hours: null, grade: null }).code,
    ).toBe('ENADE01');
  });
  it('rejects grades outside 0..10 and bad terms', () => {
    expect(() => TranscriptEntrySchema.parse({ ...entry, grade: 11 })).toThrow();
    expect(() => TranscriptEntrySchema.parse({ ...entry, term: '2025-1' })).toThrow();
  });
  it('strips unknown keys (PII can never pass through the schema)', () => {
    const parsed = TranscriptSchema.parse({
      courseCode: 'IE17', curriculumVersion: '2025/2', admissionTerm: '2024.1', officialCr: 7.757,
      officialProgressPercent: 64.69, aaccDoneHours: 0, extensaoDoneHours: 0, entries: [entry], pending: [],
      cpf: '123.456.789-00', studentName: 'FULANO',
    });
    expect(JSON.stringify(parsed)).not.toContain('123.456.789-00');
    expect(JSON.stringify(parsed)).not.toContain('FULANO');
  });
});
