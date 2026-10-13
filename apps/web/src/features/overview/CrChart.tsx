import { formatTerm, type TermCr } from '@easy-grades/core';
// Only reached through React.lazy (see OverviewScreen/PlanningScreen), so recharts already loads on demand.
// react-doctor-disable-next-line react-doctor/prefer-dynamic-import
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { crDomain, crTicks } from './chart-utils';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const config = {
  termCr: { label: 'CR do período', color: 'var(--suave)' },
  cumulativeCr: { label: 'CR acumulado', color: 'var(--esmeralda)' },
} satisfies ChartConfig;

export default function CrChart({ history }: { history: TermCr[] }) {
  const data = history.map((h) => ({ term: formatTerm(h.term), termCr: h.termCr, cumulativeCr: h.cumulativeCr }));
  const domain = crDomain(history.flatMap((h) => [h.termCr, h.cumulativeCr]));

  return (
    <figure>
      <figcaption>
        <h2 className="text-xl">Coeficiente por período</h2>
      </figcaption>
      <ChartContainer config={config} className="mt-4 aspect-auto h-64 w-full">
        <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="term" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis domain={domain} ticks={crTicks(domain)} tickLine={false} axisLine={false} width={32} />
          <ChartTooltip content={<ChartTooltipContent className="min-w-44" />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Line dataKey="termCr" type="monotone" stroke="var(--color-termCr)" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} isAnimationActive={false} />
          <Line dataKey="cumulativeCr" type="monotone" stroke="var(--color-cumulativeCr)" strokeWidth={3} dot={false} isAnimationActive={false} />
        </LineChart>
      </ChartContainer>
    </figure>
  );
}
