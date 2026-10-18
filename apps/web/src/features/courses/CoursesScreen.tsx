import { crByTerm, type Category, type ParseResponse } from '@easy-grades/core';
import { CircleHelp, List, type LucideIcon } from 'lucide-react';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { ChipGroup } from '@/components/ChipGroup';
import { SegmentedControl } from '@/components/SegmentedControl';
import { STATE_STYLE } from '@/components/state-style';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CourseGroup } from './CourseGroup';
import {
  CATEGORY_LABELS,
  filterEntries,
  groupEntries,
  keyEntries,
  STATUS_FILTERS,
  statusCounts,
  type GroupBy,
  type StatusFilter,
} from './filter-entries';

const STATUS_ICONS: Record<StatusFilter, LucideIcon> = {
  todas: List,
  concluidas: STATE_STYLE.concluida.icon,
  em_curso: STATE_STYLE.em_curso.icon,
  reprovadas: STATE_STYLE.reprovada.icon,
  outras: CircleHelp,
};

const STATUS_ORDER = Object.keys(STATUS_FILTERS) as StatusFilter[];

const GROUP_OPTIONS: { value: GroupBy; content: string }[] = [
  { value: 'period', content: 'Por período' },
  { value: 'category', content: 'Por categoria' },
];

const plural = (count: number) => (count === 1 ? 'registro' : 'registros');

export function CoursesScreen({ data }: { data: ParseResponse }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('todas');
  const [category, setCategory] = useState<Category | 'todas'>('todas');
  const [groupBy, setGroupBy] = useState<GroupBy>('period');
  const searchRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);
  const entries = useMemo(() => keyEntries(data.transcript.entries), [data.transcript.entries]);
  const counts = useMemo(() => statusCounts(data.transcript.entries), [data.transcript.entries]);
  const rows = useMemo(() => filterEntries(entries, deferredQuery, status, category), [entries, deferredQuery, status, category]);
  const groups = useMemo(() => groupEntries(rows, groupBy), [rows, groupBy]);
  // The period CR is the real one from the whole transcript, so a status or search filter never changes it.
  const termCr = useMemo(() => new Map(crByTerm(data.transcript).map((t) => [t.term, t.termCr])), [data.transcript]);
  const categories = [...new Set(entries.map((e) => e.category))];
  const filtersActive = query.trim() !== '' || status !== 'todas' || category !== 'todas';

  function clearFilters() {
    setQuery('');
    setStatus('todas');
    setCategory('todas');
    // "Limpar filtros" unmounts as soon as the filters clear, so focus would otherwise fall back to the body.
    searchRef.current?.focus();
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-large-title">Disciplinas cursadas</h1>

      <div className="grid gap-4">
        <ChipGroup
          label="Filtrar por situação"
          items={STATUS_ORDER.map((key) => {
            const Icon = STATUS_ICONS[key];
            return {
              value: key,
              content: (
                <>
                  <Icon aria-hidden className="size-4" />
                  <span>{STATUS_FILTERS[key].label}</span>
                  <span className="tabular-nums opacity-80">{counts[key]}</span>
                </>
              ),
            };
          })}
          value={status}
          onValueChange={setStatus}
        />

        <div className="grid gap-3 sm:grid-cols-[1fr_14rem] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="busca">Buscar disciplina</Label>
            <Input
              ref={searchRef}
              id="busca"
              type="search"
              placeholder="Código ou nome"
              className="max-md:h-11"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="filtro-categoria">Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category | 'todas')}>
              <SelectTrigger id="filtro-categoria" className="w-full max-md:data-[size=default]:h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtersActive && (
          <Button variant="ghost" className="justify-self-start max-md:h-11" onClick={clearFilters}>
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {filtersActive
            ? `${rows.length} de ${entries.length} ${plural(entries.length)} com os filtros atuais.`
            : `${entries.length} ${plural(entries.length)} no histórico.`}
        </p>
        <SegmentedControl label="Agrupar por" items={GROUP_OPTIONS} value={groupBy} onValueChange={setGroupBy} />
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-muted-foreground">
          {entries.length === 0
            ? 'Nenhuma disciplina no histórico.'
            : 'Nenhuma disciplina com esses filtros. Use Limpar filtros ou escolha outra situação ou categoria.'}
        </p>
      ) : (
        groups.map((group) => (
          <CourseGroup
            key={`${groupBy}-${group.id}`}
            group={group}
            cr={groupBy === 'period' ? (termCr.get(group.id) ?? null) : undefined}
          />
        ))
      )}
    </div>
  );
}
