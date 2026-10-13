import type { TermCr } from '@easy-grades/core';
// Only reached through React.lazy (see OverviewScreen/PlanningScreen), so recharts already loads on demand.
// react-doctor-disable-next-line react-doctor/prefer-dynamic-import
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { crDomain, crTicks, projectionData } from '@/features/overview/chart-utils';

const config = {
  cumulativeCr: { label: 'CR acumulado', color: 'var(--tinta)' },
  projected: { label: 'CR projetado', color: 'var(--chart-4)' },
} satisfies ChartConfig;

export default function ProjectionChart({ history, projected, projectedTerm }: { history: TermCr[]; projected: number | null; projectedTerm: string | null }) {
  const data = projectionData(history, projected, projectedTerm);
  const domain = crDomain([...history.map((h) => h.cumulativeCr), projected]);
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="term" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis domain={domain} ticks={crTicks(domain)} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent className="min-w-44" />} />
        <Line dataKey="cumulativeCr" stroke="var(--color-cumulativeCr)" strokeWidth={3} dot={false} isAnimationActive={false} connectNulls={false} />
        <Line dataKey="projected" stroke="var(--color-projected)" strokeWidth={3} strokeDasharray="6 5" dot={{ r: 4 }} isAnimationActive={false} connectNulls />
      </LineChart>
    </ChartContainer>
  );
}
