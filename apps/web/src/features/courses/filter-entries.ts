import { compareTerms, formatTerm, isCompleted, isFailed, isInProgress, type Category, type TranscriptEntry } from '@easy-grades/core';

export type StatusFilter = 'todas' | 'concluidas' | 'em_curso' | 'reprovadas' | 'outras';

export const CATEGORY_LABELS: Record<Category, string> = {
  obrigatoria: 'Obrigatória',
  optativa: 'Optativa',
  eletiva: 'Eletiva',
  extensao: 'Extensão',
  outros: 'Outro currículo',
  externa: 'Aproveitamento externo',
};

export const STATUS_FILTERS: Record<StatusFilter, { label: string; test: (e: TranscriptEntry) => boolean }> = {
  todas: { label: 'Todas', test: () => true },
  concluidas: { label: 'Concluídas', test: (e) => isCompleted(e.status) },
  em_curso: { label: 'Em curso', test: (e) => isInProgress(e.status) },
  reprovadas: { label: 'Reprovadas', test: (e) => isFailed(e.status) },
  outras: { label: 'Outras', test: (e) => e.status === 'trancado' || e.status === 'desconhecido' },
};

const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export type KeyedEntry = TranscriptEntry & { key: string };

/** Stable key from the entry's position in the transcript (codes can repeat, e.g. DO060). */
export function keyEntries(entries: TranscriptEntry[]): KeyedEntry[] {
  return entries.map((entry, position) => ({ ...entry, key: `${entry.term}-${entry.code}-${position}` }));
}

/** How many entries each status chip would show, ignoring the search and category filters. */
export function statusCounts(entries: readonly TranscriptEntry[]): Record<StatusFilter, number> {
  const counts = {} as Record<StatusFilter, number>;
  for (const key of Object.keys(STATUS_FILTERS) as StatusFilter[]) {
    counts[key] = entries.filter(STATUS_FILTERS[key].test).length;
  }
  return counts;
}

export function filterEntries(entries: KeyedEntry[], query: string, status: StatusFilter, category: Category | 'todas'): KeyedEntry[] {
  const q = normalize(query.trim());
  return entries
    .filter((e) => STATUS_FILTERS[status].test(e))
    .filter((e) => category === 'todas' || e.category === category)
    .filter((e) => !q || normalize(`${e.code} ${e.name}`).includes(q))
    .sort((a, b) => compareTerms(b.term, a.term) || a.code.localeCompare(b.code));
}

export type GroupBy = 'period' | 'category';

export interface EntryGroup {
  /** The term for period groups, the category for category groups. */
  id: string;
  label: string;
  entries: KeyedEntry[];
  /** Sum of the entries' hours; entries without hours count as zero. */
  hours: number;
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

/**
 * Period groups run from the most recent term to the oldest. Category groups follow the declared category order.
 * Inside a group, entries are sorted by code (then most recent term, for repeated codes).
 */
export function groupEntries(entries: KeyedEntry[], by: GroupBy): EntryGroup[] {
  const buckets = new Map<string, KeyedEntry[]>();
  for (const entry of entries) {
    const id = by === 'period' ? entry.term : entry.category;
    const bucket = buckets.get(id);
    if (bucket) bucket.push(entry);
    else buckets.set(id, [entry]);
  }

  const ids =
    by === 'period'
      ? [...buckets.keys()].sort((a, b) => compareTerms(b, a))
      : CATEGORIES.filter((category) => buckets.has(category));

  return ids.map((id) => {
    const members = [...(buckets.get(id) ?? [])].sort((a, b) => a.code.localeCompare(b.code) || compareTerms(b.term, a.term));
    return {
      id,
      label: by === 'period' ? formatTerm(id) : CATEGORY_LABELS[id as Category],
      entries: members,
      hours: members.reduce((sum, e) => sum + (e.hours ?? 0), 0),
    };
  });
}
