import type { OfficialComponentKey, OfficialComponents } from '@easy-grades/core';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCount, formatHours, formatPercent } from '@/lib/format';

const ROWS: { key: OfficialComponentKey; label: string }[] = [
  { key: 'obrigatoria', label: 'Obrigatórias' },
  { key: 'optativa', label: 'Optativas' },
  { key: 'eletiva', label: 'Eletivas' },
  { key: 'aacc', label: 'Atividades complementares' },
  { key: 'extensao', label: 'Extensão' },
  { key: 'total', label: 'Total' },
];

/** Gap, in percentage points, between credits and hours that is worth explaining to the student. */
const GAP_POINTS = 5;

interface IntegrationTableProps {
  components: OfficialComponents | null;
}

interface Measure {
  done: number;
  required: number;
  percent: number;
}

/** "X de Y" with the percentage under it; a dash when nothing is required, so "0 de 0 / 100%" never shows. */
function MeasureCell({ measure, format }: { measure: Measure | null; format: (value: number) => string }) {
  if (!measure || measure.required === 0) return '—';
  return (
    <>
      <span className="whitespace-nowrap">
        {format(measure.done)} de {format(measure.required)}
      </span>
      <span className="block whitespace-nowrap text-muted-foreground">{formatPercent(measure.percent)}</span>
    </>
  );
}

/** The e-Campus integralização table. Not rendered for transcripts that have no such table. */
export function IntegrationTable({ components }: IntegrationTableProps) {
  if (components === null) return null;
  const total = components.total;
  // Only the case the note explains: credits ahead of hours (TCC and projects weigh more in hours).
  const gap = total ? total.credits.percent - total.hours.percent : 0;

  return (
    <section aria-labelledby="integralizacao" className="grid min-w-0 scroll-mt-20 gap-4 rounded-card bg-surface p-5 md:scroll-mt-24">
      <h2 id="integralizacao" className="text-title3">
        Integralização oficial
      </h2>
      {/* The region scrolls the table on narrow screens, so the page itself never does. */}
      <div role="region" aria-labelledby="integralizacao" tabIndex={0} className="overflow-x-auto">
        <table aria-labelledby="integralizacao" className="w-full caption-bottom text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-normal">Componente</TableHead>
              <TableHead className="whitespace-normal">Horas</TableHead>
              <TableHead className="whitespace-normal">Créditos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map(({ key, label }) => {
              const measure = components[key];
              return (
                <TableRow key={key} className={key === 'total' ? 'font-medium' : undefined}>
                  <th
                    scope="row"
                    className={`p-2 text-left align-middle whitespace-normal ${key === 'total' ? 'font-medium' : 'font-normal'}`}
                  >
                    {label}
                  </th>
                  <TableCell className="whitespace-normal">
                    <MeasureCell measure={measure?.hours ?? null} format={formatHours} />
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <MeasureCell measure={measure?.credits ?? null} format={formatCount} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </table>
      </div>
      {total && gap >= GAP_POINTS && (
        <p className="text-sm text-muted-foreground">
          Por créditos você já cumpriu {formatPercent(total.credits.percent)}; por horas, {formatPercent(total.hours.percent)}.
          A diferença vem de disciplinas com muitas horas por crédito, como TCC e projetos.
        </p>
      )}
    </section>
  );
}
