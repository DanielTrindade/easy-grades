import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { suggestNextTerm } from '@easy-grades/core';
import { describe, expect, it } from 'vitest';
import { clampGrade, initialPlanning, plannedGrades, planningReducer } from './planning-state';

const inProgress = sampleTranscript.entries.filter((e) => e.status === 'matriculado');
const initial = initialPlanning(suggestNextTerm(sampleCurriculum, sampleTranscript), inProgress, 7.757);

describe('planning state', () => {
  it('starts with the suggestions and the courses in progress at the current CR', () => {
    expect(Object.keys(initial.next)).toEqual(['ICC150', 'ICC418', 'ICC004']);
    expect(Object.keys(initial.current).sort()).toEqual(['ICC006', 'ICC103', 'ICC330', 'ICC412', 'ICC600']);
    expect(initial.next.ICC150).toBe(7.8);
  });

  it('toggles courses in and out of the next term', () => {
    const removed = planningReducer(initial, { type: 'toggle', code: 'ICC004', grade: 7 });
    expect('ICC004' in removed.next).toBe(false);
    const added = planningReducer(removed, { type: 'toggle', code: 'ICC010', grade: 7 });
    expect(added.next.ICC010).toBe(7);
  });

  it('clamps grades to 0..10 with one decimal and ignores unknown codes', () => {
    expect(clampGrade(11)).toBe(10);
    expect(clampGrade(-1)).toBe(0);
    expect(clampGrade(7.25)).toBe(7.3);
    const same = planningReducer(initial, { type: 'setGrade', group: 'next', code: 'NOPE01', grade: 5 });
    expect(same).toBe(initial);
  });

  it('turns the plan into planned grades with hours', () => {
    const grades = plannedGrades({ current: { ICC006: 9 }, next: { ICC150: 10 } }, new Map([['ICC006', 60], ['ICC150', 150]]));
    expect(grades).toEqual([
      { code: 'ICC006', grade: 9, hours: 60 },
      { code: 'ICC150', grade: 10, hours: 150 },
    ]);
  });
});
