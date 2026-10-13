import { describe, expect, it } from 'vitest';
import { sampleCurriculum as c, sampleTranscript as t } from './__fixtures__/sample';
import { courseStates, dependentClosure, isSatisfied, missingPrerequisites, prerequisiteClosure, unlockCount } from './prerequisites';
import type { Curriculum } from './schemas';

describe('isSatisfied', () => {
  it('handles AND within a block and OR across blocks', () => {
    expect(isSatisfied([], new Set())).toBe(true);
    expect(isSatisfied([['A', 'B']], new Set(['A']))).toBe(false);
    expect(isSatisfied([['A', 'B']], new Set(['A', 'B']))).toBe(true);
    expect(isSatisfied([['A', 'B'], ['C']], new Set(['C']))).toBe(true);
  });
});

describe('courseStates', () => {
  it('derives states from the sample transcript', () => {
    const s = courseStates(c, t);
    expect(s.get('ICC001')).toBe('concluida');
    expect(s.get('ICC006')).toBe('em_curso');
    expect(s.get('ICC150')).toBe('disponivel');
    expect(s.get('ICC418')).toBe('bloqueada');
    expect(s.get('ICC010')).toBe('disponivel');
  });
  it('treats in-progress courses as done when asked', () => {
    expect(courseStates(c, t, { countInProgress: true }).get('ICC418')).toBe('disponivel');
  });
  it('marks failed-and-not-passed courses as reprovada', () => {
    const failed = { ...t.entries[0]!, code: 'IHP123', category: 'optativa' as const, status: 'reprovado_nota' as const, grade: 3 };
    expect(courseStates(c, { ...t, entries: [...t.entries, failed] }).get('IHP123')).toBe('reprovada');
  });
  it('[RF-4] ignores transcript codes that are not in the curriculum', () => {
    const s = courseStates(c, t);
    expect(s.has('EXT101')).toBe(false);
    expect(s.size).toBe(c.courses.length);
  });
});

describe('closures', () => {
  it('walks prerequisites backwards', () => {
    expect([...prerequisiteClosure(c, 'ICC418')].sort()).toEqual(['ICC001', 'ICC412', 'ICC430']);
    expect([...prerequisiteClosure(c, 'ICC150')].sort()).toEqual(['ICC001', 'ICC107', 'ICC430', 'ICC431']);
  });
  it('walks dependents forwards and counts unlocks', () => {
    expect([...dependentClosure(c, 'ICC430')].sort()).toEqual(['ICC150', 'ICC404', 'ICC406', 'ICC408', 'ICC412', 'ICC417', 'ICC418', 'ICC431']);
    expect(unlockCount(c, 'ICC430')).toBe(8);
    expect(unlockCount(c, 'ICC418')).toBe(0);
  });
  it('[RF-4] tolerates prerequisite codes missing from the curriculum', () => {
    const withGhost = { ...c, courses: [...c.courses, { ...c.courses[0]!, code: 'ICC999', prerequisites: [['ZZZ999']] }] };
    expect([...prerequisiteClosure(withGhost, 'ICC999')]).toEqual(['ZZZ999']);
  });
});

describe('missingPrerequisites', () => {
  const withPrereqs = (prerequisites: string[][]): Curriculum => ({
    ...c,
    courses: [
      ...c.courses.filter((course) => course.code !== 'ICC418'),
      { ...c.courses.find((course) => course.code === 'ICC418')!, prerequisites },
    ],
  });

  it('returns nothing when the course has no prerequisites', () => {
    expect(missingPrerequisites(withPrereqs([]), new Set(), 'ICC418')).toEqual([]);
  });

  it('lists every missing code of a single AND block', () => {
    const curriculum = withPrereqs([['ICC431', 'ICC412']]);
    expect(missingPrerequisites(curriculum, new Set(['ICC412']), 'ICC418')).toEqual([['ICC431']]);
    expect(missingPrerequisites(curriculum, new Set(), 'ICC418')).toEqual([['ICC431', 'ICC412']]);
  });

  it('returns one unmet entry per OR block when no block is satisfied', () => {
    const curriculum = withPrereqs([['ICC431', 'ICC412'], ['ICC500']]);
    expect(missingPrerequisites(curriculum, new Set(['ICC412']), 'ICC418')).toEqual([['ICC431'], ['ICC500']]);
  });

  it('returns nothing as soon as one OR block is fully satisfied', () => {
    const curriculum = withPrereqs([['ICC431', 'ICC412'], ['ICC500']]);
    expect(missingPrerequisites(curriculum, new Set(['ICC500']), 'ICC418')).toEqual([]);
    expect(missingPrerequisites(curriculum, new Set(['ICC431', 'ICC412']), 'ICC418')).toEqual([]);
  });

  it('returns nothing for an unknown course', () => {
    expect(missingPrerequisites(c, new Set(), 'NOPE01')).toEqual([]);
  });
});
