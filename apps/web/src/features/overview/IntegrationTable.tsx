import type { OfficialComponentKey, OfficialComponents } from '@easy-grades/core';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

/** The e-Campus integralização table. Not rendered for transcripts that have no such table. */
export function IntegrationTable({ components }: IntegrationTableProps) {
  if (components === null) return null;
  const total = components.total;
  const gap = total ? Math.abs(total.credits.percent - total.hours.percent) : 0;

  return (
    <section aria-labelledby="integralizacao" className="grid gap-4">
      <h2 id="integralizacao" className="text-xl font-semibold">
        Integralização oficial
      </h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Componente</TableHead>
            <TableHead>Horas</TableHead>
            <TableHead>Créditos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map(({ key, label }) => {
            const measure = components[key];
            return (
              <TableRow key={key} className={key === 'total' ? 'font-medium' : undefined}>
                <TableCell>{label}</TableCell>
                <TableCell>
                  {measure ? (
                    <>
                      <span>
                        {formatHours(measure.hours.done)} de {formatHours(measure.hours.required)}
                      </span>
                      <span className="block text-muted-foreground">{formatPercent(measure.hours.percent)}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  {measure ? (
                    <>
                      <span>
                        {formatCount(measure.credits.done)} de {formatCount(measure.credits.required)}
                      </span>
                      <span className="block text-muted-foreground">{formatPercent(measure.credits.percent)}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {total && gap >= GAP_POINTS && (
        <p className="text-sm text-muted-foreground">
          Por créditos você já cumpriu {formatPercent(total.credits.percent)}; por horas, {formatPercent(total.hours.percent)}.
          A diferença vem de disciplinas com muitas horas por crédito, como TCC e projetos.
        </p>
      )}
    </section>
  );
}
