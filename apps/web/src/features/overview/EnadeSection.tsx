import type { EnadeRecord } from '@easy-grades/core';
import { Clock, Info, type LucideIcon } from 'lucide-react';

interface EnadeSectionProps {
  records: EnadeRecord[];
}

const KIND_LABEL: Record<EnadeRecord['kind'], string> = { ingressante: 'Ingressante', concluinte: 'Concluinte' };

/** Lists the ENADE records in the transcript; the graduating exam is always shown, even when it is still missing. */
export function EnadeSection({ records }: EnadeSectionProps) {
  const hasGraduating = records.some((record) => record.kind === 'concluinte');
  const lines: { key: string; icon: LucideIcon; text: string }[] = records.map((record) => ({
    key: record.kind,
    icon: Info,
    text: `${KIND_LABEL[record.kind]}${record.year === null ? '' : ` (${record.year})`}: ${record.status}`,
  }));
  if (!hasGraduating) lines.push({ key: 'concluinte-pendente', icon: Clock, text: 'Concluinte: ainda sem registro no histórico' });

  return (
    <section aria-labelledby="enade" className="grid min-w-0 gap-4">
      <h2 id="enade" className="text-xl">
        ENADE
      </h2>
      <ul className="grid gap-2 text-sm">
        {lines.map(({ key, icon: Icon, text }) => (
          <li key={key} className="flex items-start gap-2">
            <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
