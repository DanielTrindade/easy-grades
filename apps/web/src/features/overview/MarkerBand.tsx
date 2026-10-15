import { formatTerm, type InProgressInsights, type MilestoneInsights, type Progress } from '@easy-grades/core';
import { formatHours, formatPercent, pluralize } from '@/lib/format';

interface MarkerBandProps {
  progress: Progress;
  /** Extra percentage points from activities the student registered and the coordination has not posted yet. */
  pendingPercent?: number;
  /** Next 25/50/75/90/100 milestone, with the hours left and the estimated term. */
  milestone?: MilestoneInsights | null;
  /** Enrolled courses; projected as completed when everything is approved. */
  inProgress?: InProgressInsights | null;
  /** Play the one-time reveal (first time this dataset is shown). */
  reveal: boolean;
  onRevealed: () => void;
}

/**
 * Signature element: a progress band over a grid track. Completed hours are a solid esmeralda fill up to the
 * percentage, with a hard edge; the rest is the empty track. Activities the student registered are a hatched fill
 * right after the done part.
 */
export function MarkerBand({ progress, pendingPercent = 0, milestone = null, inProgress = null, reveal, onRevealed }: MarkerBandProps) {
  const percent = progress.officialPercent ?? progress.percent;
  const hasPending = pendingPercent > 0;
  const room = Number((100 - percent).toFixed(2));
  const pendingWidth = Math.min(pendingPercent, room);
  const totalWithPending = Math.min(100, Number((percent + pendingPercent).toFixed(2)));
  const label = hasPending
    ? `${formatPercent(percent)} concluído oficialmente, mais ${formatPercent(pendingPercent)} em atividades registradas por você`
    : `${formatPercent(percent)} do curso concluído`;

  return (
    <section aria-labelledby="progresso" className="min-w-0">
      <h1 id="progresso" className="text-[clamp(2.75rem,8vw,4rem)]">
        {formatPercent(percent)}
      </h1>
      <p className="mt-2 max-w-[60ch] text-muted-foreground">
        do curso concluído: {formatHours(progress.doneHours)} de {formatHours(progress.requiredHours)}.
      </p>
      {hasPending && (
        <p className="mt-1 max-w-[60ch] text-muted-foreground">
          {`Com as atividades que você registrou: ${formatPercent(totalWithPending)}.`}
        </p>
      )}
      <div
        role="img"
        aria-label={label}
        className="marker-band relative mt-6 h-14 overflow-hidden"
        data-reveal={reveal || undefined}
        onAnimationEnd={reveal ? onRevealed : undefined}
      >
        {/* Only the fills animate: the border and the grid track stay visible while the fill sweeps in. */}
        <div className="marker-fills absolute inset-0">
          <span aria-hidden data-segment="done" className="absolute inset-y-0 left-0 bg-esmeralda" style={{ width: `${percent}%` }} />
          {hasPending && (
            <span
              aria-hidden
              data-segment="pending"
              className="absolute inset-y-0"
              style={{
                left: `${percent}%`,
                width: `${pendingWidth}%`,
                backgroundImage: 'repeating-linear-gradient(-45deg, var(--band-pending) 0 6px, transparent 6px 12px)',
              }}
            />
          )}
          {milestone && (
            <span
              data-milestone={milestone.target}
              aria-hidden
              className="absolute inset-y-0 border-l border-dashed border-suave"
              style={{ left: `${milestone.target}%` }}
            />
          )}
        </div>
      </div>
      {progress.divergent && progress.officialPercent !== null && (
        <p className="mt-3 text-sm text-muted-foreground">
          O e-Campus informa {formatPercent(progress.officialPercent)}; pelas disciplinas do histórico calculamos{' '}
          {formatPercent(progress.percent)}. Mostramos o valor do e-Campus.
        </p>
      )}
      {inProgress && (
        <p className="mt-1 max-w-[60ch] text-muted-foreground">
          Em curso: {pluralize(inProgress.courses, 'disciplina', 'disciplinas')}, {formatHours(inProgress.hours)}.
          {inProgress.percentIfApproved !== null && ` Se aprovar tudo: ${formatPercent(inProgress.percentIfApproved)} do curso.`}
        </p>
      )}
      {milestone && (
        <p className="mt-1 max-w-[60ch] text-muted-foreground">
          Próxima meta: {milestone.target}%. Faltam {formatHours(milestone.hoursLeft)}
          {milestone.term ? ` — no seu ritmo, até ${formatTerm(milestone.term)}` : ''}.
        </p>
      )}
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
        {progress.categories.map((category) => (
          <div key={category.key}>
            <dt className="text-sm text-muted-foreground">{category.label}</dt>
            <dd className="mt-0.5 font-medium">
              {formatHours(category.doneHours)} <span className="font-normal text-muted-foreground">de {formatHours(category.requiredHours)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
