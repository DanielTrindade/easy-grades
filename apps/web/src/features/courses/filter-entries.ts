import { compareTerms, isCompleted, isFailed, isInProgress, type Category, type TranscriptEntry } from '@easy-grades/core';

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
  outras: { label: 'Outras situações', test: (e) => e.status === 'trancado' || e.status === 'desconhecido' },
};

const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export type KeyedEntry = TranscriptEntry & { key: string };

/** Stable key from the entry's position in the transcript (codes can repeat, e.g. DO060). */
export function keyEntries(entries: TranscriptEntry[]): KeyedEntry[] {
  return entries.map((entry, position) => ({ ...entry, key: `${entry.term}-${entry.code}-${position}` }));
}

export function filterEntries(entries: KeyedEntry[], query: string, status: StatusFilter, category: Category | 'todas'): KeyedEntry[] {
  const q = normalize(query.trim());
  return entries
    .filter((e) => STATUS_FILTERS[status].test(e))
    .filter((e) => category === 'todas' || e.category === category)
    .filter((e) => !q || normalize(`${e.code} ${e.name}`).includes(q))
    .sort((a, b) => compareTerms(b.term, a.term) || a.code.localeCompare(b.code));
}
