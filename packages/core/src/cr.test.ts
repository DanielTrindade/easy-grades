import { describe, expect, it } from 'vitest';
import { sampleTranscript } from './__fixtures__/sample';
import { computeCr, crByTerm, crScenarios, projectCr, truncate3 } from './cr';

describe('truncate3', () => {
  it('truncates instead of rounding', () => {
    expect(truncate3(7.4568)).toBe(7.456);
    expect(truncate3(7.9999)).toBe(7.999);
    expect(truncate3(7.456)).toBe(7.456);
  });
});

describe('computeCr', () => {
  it('reproduces the CR the e-Campus prints for the sample history (7.757)', () => {
    expect(computeCr(sampleTranscript.entries)).toBe(sampleTranscript.officialCr);
    expect(computeCr(sampleTranscript.entries)).toBe(7.757);
  });
  it('weights by hours, includes failures, excludes equivalência', () => {
    expect(
      computeCr([
        { grade: 10, hours: 60, status: 'aprovado' },
        { grade: 4, hours: 30, status: 'reprovado_nota' },
        { grade: 0, hours: 600, status: 'equivalencia' },
        { grade: null, hours: 60, status: 'matriculado' },
      ]),
    ).toBe(8);
  });
  it('counts reprovado_freq without grade as zero', () => {
    expect(
      computeCr([
        { grade: 10, hours: 60, status: 'aprovado' },
        { grade: null, hours: 60, status: 'reprovado_freq' },
      ]),
    ).toBe(5);
  });
  it('[RF-1] ignores unknown statuses', () => {
    expect(
      computeCr([
        { grade: 10, hours: 60, status: 'aprovado' },
        { grade: 0, hours: 60, status: 'desconhecido' },
      ]),
    ).toBe(10);
  });
  it('returns null when nothing counts', () => {
    expect(computeCr([])).toBeNull();
  });
});

describe('crByTerm', () => {
  it('returns chronologically sorted terms whose last cumulative CR is the official one', () => {
    const terms = crByTerm(sampleTranscript);
    expect(terms.map((t) => t.term)).toEqual(['2024.1', '2024.2', '2025.1', '2025.2', '2026.1']);
    expect(terms.at(-1)?.cumulativeCr).toBe(7.757);
  });
});

describe('projectCr / crScenarios', () => {
  it('adds planned grades with the same formula', () => {
    expect(projectCr(sampleTranscript, [])).toBe(7.757);
    expect(projectCr(sampleTranscript, [{ code: 'ICC006', hours: 60, grade: 10 }])!).toBeGreaterThan(7.757);
  });
  it('gives best > current > worst for planned courses', () => {
    const { best, worst } = crScenarios(sampleTranscript, [
      { code: 'ICC006', hours: 60 },
      { code: 'ICC412', hours: 60 },
    ]);
    expect(best!).toBeGreaterThan(7.757);
    expect(worst!).toBeLessThan(7.757);
  });
});
