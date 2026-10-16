import type { PendingInsights } from '@easy-grades/core';
import { formatHours, pluralize, toTitleCase } from '@/lib/format';

const HOURS_LABELS: { key: keyof PendingInsights['hours']; label: string }[] = [
  { key: 'optativa', label: 'optativas' },
  { key: 'eletiva', label: 'eletivas' },
  { key: 'aacc', label: 'atividades complementares' },
  { key: 'extensao', label: 'extensão' },
];

function hoursSentence(hours: PendingInsights['hours']): string | null {
  const parts = HOURS_LABELS.filter(({ key }) => hours[key] > 0).map(({ key, label }) => `${formatHours(hours[key])} de ${label}`);
  if (parts.length === 0) return null;
  if (parts.length === 1) return `Fora delas, falta ${parts[0]}.`;
  return `Fora delas, faltam ${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}.`;
}

export function PendingSection({ pending }: { pending: PendingInsights }) {
  const outside = hoursSentence(pending.hours);

  return (
    <section aria-labelledby="pendente" className="grid min-w-0 gap-4">
      <h2 id="pendente" className="text-xl">
        O que falta para a formatura
      </h2>
      <div>
        <p className="heading-ink text-3xl leading-none">
          {pending.mandatoryRemaining === 0
            ? 'Nenhuma obrigatória'
            : pluralize(pending.mandatoryRemaining, 'obrigatória', 'obrigatórias')}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {pending.mandatoryRemaining === 0
            ? 'Todas as disciplinas obrigatórias do currículo já foram cumpridas.'
            : `${formatHours(pending.mandatoryHoursLeft)} para cumprir${pending.mandatoryInProgress > 0 ? `, ${pending.mandatoryInProgress} delas em curso` : ''}.`}
        </p>
      </div>
      {pending.mandatoryRemaining > 0 && (
        <p className="text-sm">
          {pending.blocked === 0
            ? pending.mandatoryRemaining === 1
              ? 'A única obrigatória já cumpre os pré-requisitos.'
              : `Todas as ${pending.mandatoryRemaining} já cumprem os pré-requisitos.`
            : `${pending.available === 1 ? '1 já cumpre' : `${pending.available} já cumprem`} os pré-requisitos; ${pending.blocked} ainda ${pending.blocked === 1 ? 'bloqueada' : 'bloqueadas'}.`}
        </p>
      )}
      {outside !== null && <p className="text-sm text-muted-foreground">{outside}</p>}
      {pending.bottlenecks.length > 0 && (
        <div className="grid gap-1 text-sm">
          <p className="text-muted-foreground">As que mais seguram o avanço:</p>
          <ul className="grid gap-1">
            {pending.bottlenecks.map((course) => (
              <li key={course.code}>
                {toTitleCase(course.name)} <span className="code-label">{course.code}</span> — trava{' '}
                {pluralize(course.unlocks, 'disciplina', 'disciplinas')}.
              </li>
            ))}
          </ul>
        </div>
      )}
      <p>
        <a href="#/planejamento" className="text-sm font-medium text-esmeralda-texto underline-offset-4 hover:underline">
          Montar o próximo semestre
        </a>
      </p>
    </section>
  );
}
