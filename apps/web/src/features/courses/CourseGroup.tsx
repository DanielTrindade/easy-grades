import { useId } from 'react';
import { EntryStatusBadge } from '@/components/StatusBadge';
import { formatCr, formatGrade, formatHours, toTitleCase } from '@/lib/format';
import { CATEGORY_LABELS, type EntryGroup } from './filter-entries';

interface CourseGroupProps {
  group: EntryGroup;
  /** Period CR. Omit it for category groups, where a CR would mix periods. */
  cr?: number | null;
}

/**
 * One group of disciplines. The header sticks under the page top while the group scrolls. From md up the entries are a
 * table, below md they are cards. The table is a plain element, not the shadcn wrapper: its overflow would stop the sticky header.
 */
export function CourseGroup({ group, cr }: CourseGroupProps) {
  const labelId = useId();
  return (
    <section aria-labelledby={labelId} className="grid gap-3">
      <h2
        className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 flex h-12 items-center gap-3 border-b border-border bg-background px-4"
      >
        <span id={labelId} className="heading-ink text-xl">
          {group.label}
        </span>
        {cr !== undefined && (
          <span className="text-sm text-muted-foreground">
            <abbr title="Coeficiente de rendimento">CR</abbr> {formatCr(cr)}
          </span>
        )}
        <span className="ml-auto text-sm text-muted-foreground">{formatHours(group.hours)}</span>
      </h2>

      <table className="hidden w-full text-sm md:table">
        <caption className="sr-only">Disciplinas de {group.label}</caption>
        <thead className="sticky top-[calc(3rem+env(safe-area-inset-top))] z-10 text-left text-muted-foreground">
          <tr>
            <th scope="col" className="bg-background py-2 pr-4 font-medium">
              Disciplina
            </th>
            <th scope="col" className="bg-background py-2 pr-4 font-medium">
              Categoria
            </th>
            <th scope="col" className="bg-background py-2 pr-4 text-right font-medium">
              CH
            </th>
            <th scope="col" className="bg-background py-2 pr-4 text-right font-medium">
              Nota
            </th>
            <th scope="col" className="bg-background py-2 font-medium">
              Situação
            </th>
          </tr>
        </thead>
        <tbody>
          {group.entries.map((e) => (
            <tr key={e.key} className="border-b border-border last:border-0">
              <td className="py-3 pr-4">
                <span className="block text-xs text-muted-foreground">{e.code}</span>
                {toTitleCase(e.name)}
              </td>
              <td className="py-3 pr-4">{CATEGORY_LABELS[e.category]}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{e.hours ?? '—'}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{formatGrade(e.grade)}</td>
              <td className="py-3">
                <EntryStatusBadge status={e.status} rawStatus={e.rawStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="grid gap-2 md:hidden">
        {group.entries.map((e) => (
          <li key={e.key} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-medium">{toTitleCase(e.name)}</p>
              <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                <span>{e.code}</span>
                <span>{CATEGORY_LABELS[e.category]}</span>
                <span>{e.hours === null ? 'CH —' : formatHours(e.hours)}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="heading-ink text-2xl tabular-nums">{formatGrade(e.grade)}</span>
              <EntryStatusBadge status={e.status} rawStatus={e.rawStatus} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
