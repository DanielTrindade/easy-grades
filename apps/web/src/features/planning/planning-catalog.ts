import {
  completedCodes,
  dependentClosure,
  inProgressCodes,
  missingPrerequisites,
  type Curriculum,
  type Transcript,
} from '@easy-grades/core';

export type CatalogFilter = 'sugeridas' | 'obrigatorias' | 'eletivas' | 'bloqueadas';

export const CATALOG_FILTERS: { value: CatalogFilter; label: string }[] = [
  { value: 'sugeridas', label: 'Sugeridas' },
  { value: 'obrigatorias', label: 'Obrigatórias' },
  { value: 'eletivas', label: 'Eletivas' },
  { value: 'bloqueadas', label: 'Bloqueadas' },
];

export interface CatalogItem {
  code: string;
  name: string;
  category: 'obrigatoria' | 'eletiva';
  credits: number;
  hours: number;
  idealPeriod: number | null;
  /** Mandatory or elective courses this one unlocks, directly or not. */
  unlocks: number;
  /** "Libera N disciplinas", or why it unlocks nothing. */
  reason: string;
  /** Unmet prerequisite blocks (see `missingPrerequisites`). Empty when the course is released. */
  missing: string[][];
  /** Folded code and name, so the search does not fold text on every keystroke. */
  searchText: string;
}

const foldText = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** "ICC431 e ICC412" for one block, and blocks joined by "ou". */
export function formatMissing(missing: readonly (readonly string[])[]): string {
  return missing.map((block) => block.join(' e ')).join(' ou ');
}

/**
 * Pending mandatory and elective courses: not passed, not in progress (those are under "Em curso agora").
 * Released and blocked courses are both listed, so the student can see what is missing.
 */
export function buildCatalog(c: Curriculum, t: Transcript, countInProgress: boolean): CatalogItem[] {
  const done = completedCodes(t);
  const inProgress = inProgressCodes(t);
  const effective = new Set([...done, ...(countInProgress ? inProgress : [])]);
  const categories = new Map(c.courses.map((course) => [course.code, course.category]));

  return c.courses
    .filter(
      (course) =>
        (course.category === 'obrigatoria' || course.category === 'eletiva') &&
        !course.code.startsWith('ENADE') &&
        !done.has(course.code) &&
        !inProgress.has(course.code),
    )
    .map((course) => {
      const unlocks = [...dependentClosure(c, course.code)].filter((dep) => {
        const category = categories.get(dep);
        return category === 'obrigatoria' || category === 'eletiva';
      }).length;
      const reason =
        unlocks === 0 ? 'Não é pré-requisito de outras' : unlocks === 1 ? 'Libera 1 disciplina' : `Libera ${unlocks} disciplinas`;
      return {
        code: course.code,
        name: course.name,
        category: course.category as CatalogItem['category'],
        credits: course.credits,
        hours: course.hours.total,
        idealPeriod: course.idealPeriod,
        unlocks,
        reason,
        missing: missingPrerequisites(c, effective, course.code),
        searchText: foldText(`${course.code} ${course.name}`),
      };
    })
    .sort(
      (a, b) =>
        (a.idealPeriod ?? 99) - (b.idealPeriod ?? 99) || b.unlocks - a.unlocks || a.code.localeCompare(b.code),
    );
}

export interface CatalogQuery {
  filter: CatalogFilter;
  query: string;
  /** Codes the planner suggests for next term. */
  suggested: ReadonlySet<string>;
  /** Codes already chosen: they stay visible under "Sugeridas". */
  selected: ReadonlySet<string>;
}

export function filterCatalog(items: readonly CatalogItem[], { filter, query, suggested, selected }: CatalogQuery): CatalogItem[] {
  const q = foldText(query.trim());
  return items.filter((item) => {
    const blocked = item.missing.length > 0;
    const matchesFilter =
      filter === 'sugeridas'
        ? !blocked && (suggested.has(item.code) || selected.has(item.code))
        : filter === 'bloqueadas'
          ? blocked
          : filter === 'obrigatorias'
            ? item.category === 'obrigatoria'
            : item.category === 'eletiva';
    return matchesFilter && (!q || item.searchText.includes(q));
  });
}
