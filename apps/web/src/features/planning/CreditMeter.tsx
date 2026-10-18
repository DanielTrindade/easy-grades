import { OctagonAlert, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { creditStatus } from './credit-status';

interface CreditMeterProps {
  credits: number;
  min: number;
  max: number;
}

/** Above this many credits per period, one cell stands for two credits, so the grid stays readable on a phone. */
const CREDITS_PER_CELL_ABOVE = 40;

/**
 * Credits chosen against the period limits of the curriculum, as a grid of cells: one per credit, the same 3×3
 * rhythm as the symbol. Filled cells are pen blue, the cell that holds the minimum has a marker, and credits past
 * the maximum add error cells. The status line carries an icon and text, never color alone.
 */
export function CreditMeter({ credits, min, max }: CreditMeterProps) {
  const status = creditStatus(credits, min, max);
  const unit = max > CREDITS_PER_CELL_ABOVE ? 2 : 1;
  const limitCells = Math.ceil(max / unit);
  const filledCells = Math.ceil(credits / unit);
  const overflowCells = Math.max(0, filledCells - limitCells);
  const cells = limitCells + overflowCells;
  // The cell that holds the last credit of the minimum.
  const minCell = min > 0 ? Math.ceil(min / unit) - 1 : -1;
  const above = status === 'above';

  return (
    <div className="grid gap-2">
      {/* The native meter clamps the value to the maximum, so aria-valuetext carries the real count; the cells are a picture. */}
      <meter
        className="sr-only"
        min={0}
        max={max}
        value={credits}
        aria-label="Créditos no semestre"
        aria-valuetext={above ? `${credits} créditos, acima do máximo de ${max}` : `${credits} créditos`}
      >
        {`${credits} créditos`}
      </meter>
      <div aria-hidden className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${cells}, minmax(0, 1fr))` }}>
        {Array.from({ length: cells }, (_, index) => {
          const filled = index < filledCells;
          const overflow = index >= limitCells;
          return (
            <span
              key={index}
              aria-hidden
              data-cell={overflow ? 'over' : filled ? 'filled' : 'empty'}
              data-min={index === minCell || undefined}
              className="relative h-3.5 overflow-hidden rounded-[2px] bg-hairline"
            >
              {/* Fills fade in with opacity only, so a change of credits never moves the layout. */}
              <span
                className={cn('absolute inset-0 transition-opacity duration-150 ease-snap', overflow ? 'bg-danger' : 'bg-pen')}
                style={{ opacity: filled ? 1 : 0 }}
              />
              {index === minCell && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-ink" />}
            </span>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 text-sm tabular-nums text-ink-muted">
        <span>mínimo {min}</span>
        <span className={cn('inline-flex items-center gap-1', above && 'font-medium text-danger')}>
          {above && <OctagonAlert aria-hidden className="size-3.5 shrink-0" />}
          máximo {max}
        </span>
      </div>
      <p className={cn('flex items-start gap-1.5 text-sm', above ? 'text-danger' : 'text-ink-muted')} aria-live="polite">
        {above && <OctagonAlert aria-hidden className="mt-0.5 size-4 shrink-0" />}
        {status === 'below' && <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />}
        <span>
          {status === 'above' && `Passa do máximo de ${max} créditos por período.`}
          {status === 'below' && `Abaixo do mínimo de ${min} créditos por período.`}
          {status === 'within' && `Entre ${min} e ${max} créditos por período.`}
        </span>
      </p>
    </div>
  );
}
