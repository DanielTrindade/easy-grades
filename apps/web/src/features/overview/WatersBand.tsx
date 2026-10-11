import type { Progress } from '@easy-grades/core';
import { formatHours, formatPercent } from '@/lib/format';

interface WatersBandProps {
  progress: Progress;
  /** Play the one-time reveal (first time this dataset is shown). */
  reveal: boolean;
  onRevealed: () => void;
}

/**
 * Signature element: completed hours as dark Rio Negro water blending into the clay Solimões of what remains,
 * like the Encontro das Águas in front of Manaus.
 */
export function WatersBand({ progress, reveal, onRevealed }: WatersBandProps) {
  const percent = progress.officialPercent ?? progress.percent;
  const seam = `linear-gradient(90deg, var(--water-done) 0%, var(--water-done) calc(${percent}% - 12px), var(--water-left) calc(${percent}% + 12px), var(--water-left) 100%)`;

  return (
    <section aria-labelledby="progresso">
      <h1 id="progresso" className="text-[clamp(2.75rem,8vw,4rem)] font-semibold">
        {formatPercent(percent)}
      </h1>
      <p className="mt-2 max-w-[60ch] text-muted-foreground">
        do curso concluído: {formatHours(progress.doneHours)} de {formatHours(progress.requiredHours)}.
      </p>
      <div
        role="img"
        aria-label={`${formatPercent(percent)} do curso concluído`}
        className="waters-band mt-6 h-14 rounded-md"
        style={{ background: seam }}
        data-reveal={reveal || undefined}
        onAnimationEnd={reveal ? onRevealed : undefined}
      />
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
