import { formatTerm, type Category, type ParseResponse } from '@easy-grades/core';
import { useDeferredValue, useMemo, useState } from 'react';
import { EntryStatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatGrade, toTitleCase } from '@/lib/format';
import { CATEGORY_LABELS, filterEntries, keyEntries, STATUS_FILTERS, type StatusFilter } from './filter-entries';

export function CoursesScreen({ data }: { data: ParseResponse }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('todas');
  const [category, setCategory] = useState<Category | 'todas'>('todas');
  const deferredQuery = useDeferredValue(query);
  const entries = useMemo(() => keyEntries(data.transcript.entries), [data.transcript.entries]);
  const rows = useMemo(() => filterEntries(entries, deferredQuery, status, category), [entries, deferredQuery, status, category]);
  const categories = [...new Set(entries.map((e) => e.category))];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-semibold sm:text-display">Disciplinas cursadas</h1>
        <p className="mt-2 text-muted-foreground">
          {entries.length} {entries.length === 1 ? 'registro' : 'registros'} no histórico.{' '}
          {rows.length !== entries.length && `${rows.length} com os filtros atuais.`}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="grid gap-1.5">
          <Label htmlFor="busca">Buscar</Label>
          <Input id="busca" type="search" placeholder="Código ou nome" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filtro-situacao">Situação</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger id="filtro-situacao" className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_FILTERS) as StatusFilter[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {STATUS_FILTERS[key].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filtro-categoria">Categoria</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as Category | 'todas')}>
            <SelectTrigger id="filtro-categoria" className="w-full sm:w-56">
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

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-muted-foreground">
          Nenhuma disciplina com esses filtros. Limpe a busca ou escolha outra situação.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Disciplina</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="hidden md:table-cell">Categoria</TableHead>
              <TableHead className="text-right">CH</TableHead>
              <TableHead className="text-right">Nota</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.key}>
                <TableCell className="whitespace-normal">
                  <span className="block text-xs text-muted-foreground">{e.code}</span>
                  {toTitleCase(e.name)}
                </TableCell>
                <TableCell>{formatTerm(e.term)}</TableCell>
                <TableCell className="hidden md:table-cell">{CATEGORY_LABELS[e.category]}</TableCell>
                <TableCell className="text-right">{e.hours ?? '—'}</TableCell>
                <TableCell className="text-right">{formatGrade(e.grade)}</TableCell>
                <TableCell>
                  <EntryStatusBadge status={e.status} rawStatus={e.rawStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
