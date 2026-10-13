import type { PlannedGrade, TranscriptEntry } from '@easy-grades/core';

/** Expected grades per course code. `current` = courses in progress now, `next` = courses picked for next term. */
export interface PlanningState {
  current: Record<string, number>;
  next: Record<string, number>;
  /** "Supor aprovação no que está em curso": released courses may depend on in-progress ones. Never clears the selection. */
  countInProgress: boolean;
}

export type PlanningAction =
  | { type: 'add'; code: string; grade: number }
  | { type: 'remove'; code: string }
  | { type: 'setGrade'; group: 'current' | 'next'; code: string; grade: number }
  | { type: 'setCountInProgress'; value: boolean }
  | { type: 'reset'; state: PlanningState };

export function clampGrade(grade: number): number {
  if (Number.isNaN(grade)) return 0;
  return Math.round(Math.min(10, Math.max(0, grade)) * 10) / 10;
}

export function initialPlanning(
  suggested: readonly { code: string }[],
  inProgress: readonly Pick<TranscriptEntry, 'code'>[],
  defaultGrade: number,
  countInProgress = true,
): PlanningState {
  const grade = clampGrade(defaultGrade);
  return {
    current: Object.fromEntries(inProgress.map((e) => [e.code, grade])),
    next: Object.fromEntries(suggested.map((s) => [s.code, grade])),
    countInProgress,
  };
}

export function planningReducer(state: PlanningState, action: PlanningAction): PlanningState {
  switch (action.type) {
    case 'add': {
      if (action.code in state.next) return state;
      return { ...state, next: { ...state.next, [action.code]: clampGrade(action.grade) } };
    }
    case 'remove': {
      if (!(action.code in state.next)) return state;
      const { [action.code]: _removed, ...rest } = state.next;
      return { ...state, next: rest };
    }
    case 'setGrade': {
      if (!(action.code in state[action.group])) return state;
      return { ...state, [action.group]: { ...state[action.group], [action.code]: clampGrade(action.grade) } };
    }
    case 'setCountInProgress':
      return { ...state, countInProgress: action.value };
    case 'reset':
      return action.state;
  }
}

/** Converts the plan into grades for `projectCr`, using the hours of each course. */
export function plannedGrades(
  state: Pick<PlanningState, 'current' | 'next'>,
  hoursByCode: ReadonlyMap<string, number>,
): PlannedGrade[] {
  return [...Object.entries(state.current), ...Object.entries(state.next)]
    .filter(([code]) => (hoursByCode.get(code) ?? 0) > 0)
    .map(([code, grade]) => ({ code, grade, hours: hoursByCode.get(code)! }));
}
