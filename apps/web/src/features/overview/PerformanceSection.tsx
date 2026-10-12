import { formatTerm, type PerformanceInsights } from '@easy-grades/core';
import { Minus, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { formatCr, formatHours, formatPercent, toTitleCase } from '@/lib/format';

const TREND: Record<NonNullable<PerformanceInsights['trend']>, { icon: LucideIcon; verb: string; iconColor: string }> = {
  subindo: { icon: TrendingUp, verb: 'subiu', iconColor: 'text-igapo' },
  caindo: { icon: TrendingDown, verb: 'caiu', iconColor: 'text-urucum' },
  estavel: { icon: Minus, verb: 'ficou estável', iconColor: 'text-muted-foreground' },
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

interface PerformanceSectionProps {
  performance: PerformanceInsights;
}

export function PerformanceSection({ performance }: PerformanceSectionProps) {
  const { passRate, failures, unresolvedFailures, retakingNow, trend, previousCumulativeCr, lastTerm, bestTerm, worstTerm } =
    performance;
  const trendInfo = trend ? TREND[trend] : null;

  return (
    <section aria-labelledby="desempenho" className="grid min-w-0 content-start gap-4">
      <h2 id="desempenho" className="text-xl font-semibold">
        Desempenho
      </h2>

      <div>
        <p className="text-sm text-muted-foreground">Taxa de aprovação</p>
        {passRate === null ? (
          <p className="mt-1">sem disciplinas cursadas ainda</p>
        ) : (
          <p className="mt-1 font-heading text-3xl font-semibold">{formatPercent(passRate)}</p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          Em um estudo com 1.124 formados em engenharia, metade reprovou em no máximo 13% das disciplinas.
        </p>
      </div>

      <div className="grid gap-1 text-sm">
        <p>{failures === 0 ? 'Nenhuma reprovação' : plural(failures, 'reprovação', 'reprovações')}</p>
        {unresolvedFailures.length > 0 && (
          <p>
            Ainda por cursar: {unresolvedFailures.map((f) => `${toTitleCase(f.name)} (${f.code})`).join(', ')}
          </p>
        )}
        {retakingNow.length > 0 && <p>Refazendo agora: {retakingNow.join(', ')}</p>}
      </div>

      <div className="grid gap-2 text-sm">
        {trendInfo && (
          <p className="flex items-start gap-2">
            <trendInfo.icon aria-hidden className={`mt-0.5 size-4 shrink-0 ${trendInfo.iconColor}`} />
            <span>
              CR acumulado {trendInfo.verb} desde o período anterior (de {formatCr(previousCumulativeCr)} para{' '}
              {formatCr(lastTerm?.cumulativeCr ?? null)}).
            </span>
          </p>
        )}
        {bestTerm && <p>Melhor período: {formatTerm(bestTerm.term)}, com CR {formatCr(bestTerm.termCr)}</p>}
        {worstTerm && <p>Pior período: {formatTerm(worstTerm.term)}, com CR {formatCr(worstTerm.termCr)}</p>}
      </div>

      {performance.creditedCount > 0 && (
        <p className="text-sm">
          {plural(performance.creditedCount, 'disciplina aproveitada', 'disciplinas aproveitadas')} (
          {formatHours(performance.creditedHours)}) por equivalência, dispensa ou transferência
        </p>
      )}
    </section>
  );
}
