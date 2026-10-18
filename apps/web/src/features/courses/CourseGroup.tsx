import { useId } from 'react';
import { ListGroupRow } from '@/components/ListGroup';
import { EntryStatusBadge } from '@/components/StatusBadge';
import { formatCr, formatGrade, formatHours, toTitleCase } from '@/lib/format';
import { CATEGORY_LABELS, type EntryGroup } from './filter-entries';

interface CourseGroupProps {
  group: EntryGroup;
  cr?: number | null;
}

/** The header sticks under the fixed header while the group scrolls. */
export function CourseGroup({ group, cr }: CourseGroupProps) {
  const labelId = useId();

  return (
    <section aria-labelledby={labelId} className="grid gap-2">
      <h2 className="sticky top-[calc(env(safe-area-inset-top)+2.75rem)] z-20 -mx-4 flex h-11 items-baseline gap-3 bg-background/95 px-4 pt-2 font-sans tracking-normal font-stretch-normal md:top-[3.25rem]">
        <span id={labelId} className="heading-ink text-title3">
          {group.label}
        </span>
        <span className="text-footnote font-normal text-ink-muted">
          {cr !== undefined && (
            <>
              <abbr title="Coeficiente de rendimento">CR</abbr> {formatCr(cr)} ·{' '}
            </>
          )}
          {formatHours(group.hours)}
        </span>
      </h2>

      <div className="hidden rounded-card bg-surface px-4 md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Disciplinas de {group.label}</caption>
          <thead className="sticky top-[calc(3.25rem+2.75rem)] z-10 text-left text-footnote text-ink-muted">
            <tr>
              <th scope="col" className="bg-surface py-2.5 pr-4 font-medium">
                Disciplina
              </th>
              <th scope="col" className="bg-surface py-2.5 pr-4 font-medium">
                Categoria
              </th>
              <th scope="col" className="bg-surface py-2.5 pr-4 text-right font-medium">
                CH
              </th>
              <th scope="col" className="bg-surface py-2.5 pr-4 text-right font-medium">
                Nota
              </th>
              <th scope="col" className="bg-surface py-2.5 font-medium">
                Situação
              </th>
            </tr>
          </thead>
          <tbody>
            {group.entries.map((e) => (
              <tr key={e.key} className="border-t border-hairline">
                <td className="py-3 pr-4">
                  <span className="code-label block text-caption">{e.code}</span>
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
      </div>

      <ul className="rounded-group bg-surface pl-4 md:hidden">
        {group.entries.map((e) => (
          <ListGroupRow key={e.key} className="items-start">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-medium">{toTitleCase(e.name)}</p>
              <p className="mt-0.5 flex flex-wrap gap-x-2 text-footnote text-ink-muted">
                <span className="code-label">{e.code}</span>
                <span>{CATEGORY_LABELS[e.category]}</span>
                <span>{e.hours === null ? 'CH —' : formatHours(e.hours)}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="heading-ink text-title3 tabular-nums">{formatGrade(e.grade)}</span>
              <EntryStatusBadge status={e.status} rawStatus={e.rawStatus} />
            </div>
          </ListGroupRow>
        ))}
      </ul>
    </section>
  );
}
