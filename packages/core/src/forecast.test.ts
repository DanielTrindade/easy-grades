import { describe, expect, it } from 'vitest';
import { sampleCurriculum as c, sampleTranscript as t } from './__fixtures__/sample';
import { forecastGraduation } from './forecast';
import type { TranscriptEntry } from './schemas';

const passed = (code: string, term = '2027.1'): TranscriptEntry => ({
  code, name: code, category: 'obrigatoria', term, credits: 4, hours: 60, grade: 9, status: 'aprovado', rawStatus: 'Aprovado',
});

describe('forecastGraduation', () => {
  it('forecasts the sample student graduating in 2027.1', () => {
    const f = forecastGraduation(c, t);
    expect(f.terms.map((x) => x.term)).toEqual(['2027.1']);
    expect(f.terms[0]!.courses.map((x) => x.code)).toEqual(['ICC150', 'ICC418']);
    expect(f.graduationTerm).toBe('2027.1');
    expect(f.remainingTerms).toBe(1);
    expect(f.maxTerm).toBe('2029.2');
    expect(f.exceedsMax).toBe(false);
    expect(f.pendingHours).toEqual({ optativa: 0, eletiva: 60, aacc: 210, extensao: 320 });
    expect(f.unschedulable).toEqual([]);
  });

  it('schedules a beginner respecting prerequisites and the credit cap', () => {
    const beginner = { ...t, entries: [passed('ICC001', '2024.1')] };
    const f = forecastGraduation(c, beginner);
    const when = new Map<string, number>();
    f.terms.forEach((term, i) => term.courses.forEach((course) => when.set(course.code, i)));
    for (const course of c.courses.filter((x) => when.has(x.code))) {
      for (const pre of course.prerequisites.flat()) {
        if (pre === 'ICC001') continue;
        expect(when.get(pre)!).toBeLessThan(when.get(course.code)!);
      }
    }
    expect(Math.max(...f.terms.map((x) => x.credits))).toBeLessThanOrEqual(30);
    expect(f.terms[0]!.term).toBe('2024.2');
    expect(f.unschedulable).toEqual([]);
  });

  it('[RF-5] returns zero remaining terms when all mandatory courses are done or in progress', () => {
    const done = { ...t, entries: [...t.entries, passed('ICC150', '2026.2'), passed('ICC418', '2026.2')] };
    const f = forecastGraduation(c, done);
    expect(f.terms).toEqual([]);
    expect(f.remainingTerms).toBe(0);
    expect(f.graduationTerm).toBe('2026.2');
  });

  it('stops and reports courses whose prerequisites can never be met', () => {
    const ghost = { ...c, courses: [...c.courses, { ...c.courses[0]!, code: 'ICC998', idealPeriod: 8, prerequisites: [['ZZZ999']] }] };
    const f = forecastGraduation(ghost, t);
    expect(f.unschedulable).toEqual(['ICC998']);
    expect(f.graduationTerm).toBeNull();
  });
});
