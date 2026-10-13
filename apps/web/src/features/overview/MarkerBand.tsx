import type { Progress } from '@easy-grades/core';
import { formatHours, formatPercent } from '@/lib/format';

interface MarkerBandProps {
  progress: Progress;
  /** Extra percentage points from activities the student registered and the coordination has not posted yet. */
  pendingPercent?: number;
  /** Play the one-time reveal (first time this dataset is shown). */
  reveal: boolean;
  onRevealed: () => void;
}

/**
 * Signature element: a highlighter stroke over squared notebook paper. Completed hours are solid highlighter up to
 * the percentage, with a hard edge; the rest is paper with a grid. Activities the student registered are a hatched
 * highlighter right after the done part.
 */
export function MarkerBand({ progress, pendingPercent = 0, reveal, onRevealed }: MarkerBandProps) {
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
        {/* Only the fills animate: the border and the grid paper stay visible while the highlighter sweeps in. */}
        <div className="marker-fills absolute inset-0">
          <span aria-hidden data-segment="done" className="absolute inset-y-0 left-0 bg-marca" style={{ width: `${percent}%` }} />
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
        </div>
      </div>
      {progress.divergent && progress.officialPercent !== null && (
        <p className="mt-3 text-sm text-muted-foreground">
          O e-Campus informa {formatPercent(progress.officialPercent)}; pelas disciplinas do histórico calculamos{' '}
          {formatPercent(progress.percent)}. Mostramos o valor do e-Campus.
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
