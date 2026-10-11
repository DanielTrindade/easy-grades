import { describe, expect, it } from 'vitest';
import { sampleCurriculum, sampleTranscript } from './__fixtures__/sample';
import { computeProgress } from './progress';

describe('computeProgress', () => {
  const p = computeProgress(sampleCurriculum, sampleTranscript);
  const byKey = Object.fromEntries(p.categories.map((c) => [c.key, c]));

  it('matches the official 64.69% (2070/3200h)', () => {
    expect(p.doneHours).toBe(2070);
    expect(p.requiredHours).toBe(3200);
    expect(p.percent).toBe(64.69);
    expect(p.divergent).toBe(false);
  });

  it('uses transcript CH and caps per category', () => {
    expect(byKey.obrigatoria).toMatchObject({ rawHours: 1830, doneHours: 1830, requiredHours: 2370 });
    expect(byKey.optativa).toMatchObject({ rawHours: 420, doneHours: 180, percent: 100 });
    expect(byKey.eletiva).toMatchObject({ rawHours: 60, doneHours: 60, percent: 50 });
    expect(byKey.extensao).toMatchObject({ doneHours: 0 });
    expect(byKey.aacc).toMatchObject({ doneHours: 0, requiredHours: 210 });
  });

  it('flags divergence above 0.5 p.p. from the official percentage', () => {
    const q = computeProgress(sampleCurriculum, { ...sampleTranscript, officialProgressPercent: 70 });
    expect(q.divergent).toBe(true);
  });

  it('[RF-1] ignores entries with unknown status', () => {
    const extra = {
      ...sampleTranscript.entries[0]!,
      code: 'XXX999', category: 'obrigatoria' as const, status: 'desconhecido' as const, hours: 600,
    };
    const q = computeProgress(sampleCurriculum, { ...sampleTranscript, entries: [...sampleTranscript.entries, extra] });
    expect(q.doneHours).toBe(2070);
  });
});
