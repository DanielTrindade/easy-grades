import type { Curriculum, Transcript } from './schemas';
import { isCompleted, isFailed, isInProgress } from './status';

export type CourseState = 'concluida' | 'em_curso' | 'reprovada' | 'disponivel' | 'bloqueada';

export const COURSE_STATE_LABELS: Record<CourseState, string> = {
  concluida: 'Concluída',
  em_curso: 'Em curso',
  reprovada: 'Reprovada',
  disponivel: 'Disponível',
  bloqueada: 'Bloqueada',
};

export const completedCodes = (t: Transcript): Set<string> =>
  new Set(t.entries.filter((e) => isCompleted(e.status)).map((e) => e.code));
export const inProgressCodes = (t: Transcript): Set<string> =>
  new Set(t.entries.filter((e) => isInProgress(e.status)).map((e) => e.code));
export const failedCodes = (t: Transcript): Set<string> =>
  new Set(t.entries.filter((e) => isFailed(e.status)).map((e) => e.code));

export function isSatisfied(prereqs: readonly (readonly string[])[], done: ReadonlySet<string>): boolean {
  return prereqs.length === 0 || prereqs.some((block) => block.every((code) => done.has(code)));
}

export function courseStates(
  c: Curriculum,
  t: Transcript,
  opts: { countInProgress?: boolean } = {},
): Map<string, CourseState> {
  const done = completedCodes(t);
  const inProgress = inProgressCodes(t);
  const failed = failedCodes(t);
  const effective = opts.countInProgress ? new Set([...done, ...inProgress]) : done;
  const states = new Map<string, CourseState>();
  for (const course of c.courses) {
    let state: CourseState;
    if (done.has(course.code)) state = 'concluida';
    else if (inProgress.has(course.code)) state = 'em_curso';
    else if (failed.has(course.code)) state = 'reprovada';
    else state = isSatisfied(course.prerequisites, effective) ? 'disponivel' : 'bloqueada';
    states.set(course.code, state);
  }
  return states;
}

export function dependentsMap(c: Curriculum): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const course of c.courses) {
    for (const code of new Set(course.prerequisites.flat())) {
      const list = map.get(code) ?? [];
      list.push(course.code);
      map.set(code, list);
    }
  }
  return map;
}

function walk(start: string, next: (code: string) => readonly string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...next(start)];
  while (stack.length > 0) {
    const code = stack.pop()!;
    if (seen.has(code) || code === start) continue;
    seen.add(code);
    stack.push(...next(code));
  }
  return seen;
}

export function prerequisiteClosure(c: Curriculum, code: string): Set<string> {
  const byCode = new Map(c.courses.map((course) => [course.code, course]));
  return walk(code, (x) => byCode.get(x)?.prerequisites.flat() ?? []);
}

export function dependentClosure(c: Curriculum, code: string): Set<string> {
  const dependents = dependentsMap(c);
  return walk(code, (x) => dependents.get(x) ?? []);
}

export function unlockCount(c: Curriculum, code: string): number {
  return dependentClosure(c, code).size;
}
