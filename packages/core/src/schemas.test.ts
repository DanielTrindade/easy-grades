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

describe('official components and ENADE (optional for saved data)', () => {
  const base = {
    courseCode: 'IE17', curriculumVersion: '2025/2', admissionTerm: '2024.1', officialCr: 7.757,
    officialProgressPercent: 64.69, aaccDoneHours: 0, extensaoDoneHours: 0, entries: [entry], pending: [],
  };
  const measure = { required: 2370, done: 1830, percent: 77.22 };
  const component = { hours: measure, credits: { required: 140, done: 120, percent: 85.71 } };

  it('accepts data saved before this release (no officialComponents/enade) with defaults', () => {
    const parsed = TranscriptSchema.parse(base);
    expect(parsed.officialComponents).toBeNull();
    expect(parsed.enade).toEqual([]);
  });
  it('accepts a full official table and ENADE records', () => {
    const officialComponents = {
      obrigatoria: component, optativa: null, eletiva: null, aacc: null, extensao: null,
      total: { hours: { required: 3200, done: 2070, percent: 64.69 }, credits: { required: 150, done: 120, percent: 80 } },
    };
    const enade = [{ kind: 'ingressante', year: 2024, status: 'Dispensado em razão calendário trienal' }];
    const parsed = TranscriptSchema.parse({ ...base, officialComponents, enade });
    expect(parsed.officialComponents).toEqual(officialComponents);
    expect(parsed.enade).toEqual(enade);
  });
  it('rejects percentages above 100 and unknown ENADE kinds', () => {
    const bad = { ...component, hours: { ...measure, percent: 101 } };
    expect(() => TranscriptSchema.parse({ ...base, officialComponents: { obrigatoria: bad } })).toThrow();
    expect(() => TranscriptSchema.parse({ ...base, enade: [{ kind: 'outro', year: 2024, status: 'x' }] })).toThrow();
  });
  it('accepts a missing ENADE year', () => {
    expect(TranscriptSchema.parse({ ...base, enade: [{ kind: 'concluinte', year: null, status: 'Pendente' }] }).enade).toHaveLength(1);
  });
});
