import type { PaceInsights } from '@easy-grades/core';
import { CircleCheck, Clock, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react';
import { formatHours } from '@/lib/format';

const PACE_STATUS: Record<PaceInsights['status'], { icon: LucideIcon; label: string; iconColor: string }> = {
  concluido: { icon: CircleCheck, label: 'Carga horária concluída', iconColor: 'text-igapo' },
  inicio: { icon: Clock, label: 'Ainda sem período concluído para medir o ritmo', iconColor: 'text-muted-foreground' },
  no_ritmo: { icon: CircleCheck, label: 'No ritmo para o prazo ideal', iconColor: 'text-igapo' },
  atrasado: { icon: TriangleAlert, label: 'Abaixo do ritmo do prazo ideal', iconColor: 'text-solimoes' },
  risco_prazo_maximo: { icon: OctagonAlert, label: 'Risco de ultrapassar o prazo máximo', iconColor: 'text-urucum' },
};

interface PaceSectionProps {
  pace: PaceInsights;
  minPeriods: number;
  maxPeriods: number;
}

export function PaceSection({ pace, minPeriods, maxPeriods }: PaceSectionProps) {
  const status = PACE_STATUS[pace.status];
  const StatusIcon = status.icon;
  const paceText = (hours: number | null) => (hours === null ? 'prazo encerrado' : `${formatHours(hours)} por período`);

  return (
    <section aria-labelledby="ritmo" className="grid content-start gap-4">
      <h2 id="ritmo" className="text-xl font-semibold">
        Ritmo e prazo
      </h2>
      <p className="flex items-center gap-2 font-medium">
        <StatusIcon aria-hidden className={`size-5 shrink-0 ${status.iconColor}`} />
        {status.label}
      </p>
      <ul className="grid gap-2 text-sm">
        {pace.completedTerms === 0 ? (
          <li>
            Nenhum período concluído ainda (ideal {minPeriods}, máximo {maxPeriods})
          </li>
        ) : (
          <>
            <li>
              {pace.completedTerms}º período cursado de {minPeriods} ideais (máximo {maxPeriods})
            </li>
            <li>Média de {formatHours(pace.avgHoursPerTerm)} por período</li>
          </>
        )}
        <li>Para formar no prazo ideal: {paceText(pace.requiredPaceIdeal)}</li>
        <li>No prazo máximo: {paceText(pace.requiredPaceMax)}</li>
      </ul>
    </section>
  );
}
