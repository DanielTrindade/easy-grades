import { OctagonAlert, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { creditStatus } from './credit-status';

interface CreditMeterProps {
  credits: number;
  min: number;
  max: number;
}

/**
 * Credits chosen against the period limits of the curriculum. The fill grows with scaleX; the limits are tick marks.
 * Below the minimum is a warning, above the maximum an error. Both carry an icon and text, never colour alone.
 */
export function CreditMeter({ credits, min, max }: CreditMeterProps) {
  const status = creditStatus(credits, min, max);
  const scale = Math.max(max, min, credits, 1);
  const tick = (value: number) => `${(value / scale) * 100}%`;

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">Créditos no semestre</span>
        <span className="font-medium tabular-nums">{credits}</span>
      </div>
      <div className="relative h-3">
        <div className="absolute inset-0 overflow-hidden rounded-full border border-tinta bg-background">
          <div
            aria-hidden
            className="absolute inset-0 origin-left bg-marca transition-transform duration-200 ease-snap motion-reduce:transition-none"
            style={{ transform: `scaleX(${credits / scale})` }}
          />
        </div>
        {/* The ticks sit outside the track, so its overflow-hidden does not clip them. */}
        <span aria-hidden className="absolute -top-1 -bottom-1 w-px bg-grafite" style={{ left: tick(min) }} />
        <span aria-hidden className="absolute -top-1 -bottom-1 w-px bg-grafite" style={{ left: tick(max) }} />
      </div>
      <p
        className={cn(
          'flex items-start gap-1.5 text-sm',
          status === 'above' ? 'text-correcao' : status === 'below' ? 'text-tinta' : 'text-muted-foreground',
        )}
        aria-live="polite"
      >
        {status === 'above' && <OctagonAlert aria-hidden className="mt-0.5 size-4 shrink-0" />}
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
