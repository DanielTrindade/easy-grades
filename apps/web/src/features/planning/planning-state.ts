import type { PlannedGrade, Suggestion, TranscriptEntry } from '@easy-grades/core';

/** Expected grade per course code. `current` = courses in progress now, `next` = courses picked for next term. */
export interface PlanningState {
  current: Record<string, number>;
  next: Record<string, number>;
}

export type PlanningAction =
  | { type: 'toggle'; code: string; grade: number }
  | { type: 'setGrade'; group: keyof PlanningState; code: string; grade: number }
  | { type: 'reset'; state: PlanningState };

export function clampGrade(grade: number): number {
  if (Number.isNaN(grade)) return 0;
  return Math.round(Math.min(10, Math.max(0, grade)) * 10) / 10;
}

export function initialPlanning(suggested: Suggestion[], inProgress: TranscriptEntry[], defaultGrade: number): PlanningState {
  const grade = clampGrade(defaultGrade);
  return {
    current: Object.fromEntries(inProgress.map((e) => [e.code, grade])),
    next: Object.fromEntries(suggested.map((s) => [s.code, grade])),
  };
}

export function planningReducer(state: PlanningState, action: PlanningAction): PlanningState {
  switch (action.type) {
    case 'toggle': {
      if (action.code in state.next) {
        const { [action.code]: _removed, ...rest } = state.next;
        return { ...state, next: rest };
      }
      return { ...state, next: { ...state.next, [action.code]: clampGrade(action.grade) } };
    }
    case 'setGrade': {
      if (!(action.code in state[action.group])) return state;
      return { ...state, [action.group]: { ...state[action.group], [action.code]: clampGrade(action.grade) } };
    }
    case 'reset':
      return action.state;
  }
}

/** Converts the plan into grades for `projectCr`, using the hours of each course. */
export function plannedGrades(state: PlanningState, hoursByCode: ReadonlyMap<string, number>): PlannedGrade[] {
  return [...Object.entries(state.current), ...Object.entries(state.next)]
    .filter(([code]) => (hoursByCode.get(code) ?? 0) > 0)
    .map(([code, grade]) => ({ code, grade, hours: hoursByCode.get(code)! }));
}
