import type { Transcript } from '@easy-grades/core';
// Only reached through React.lazy (see OverviewScreen/PlanningScreen), so recharts already loads on demand.
// react-doctor-disable-next-line react-doctor/prefer-dynamic-import
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts';
import { hoursAverage, hoursByTerm } from './chart-utils';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const config = {
  done: { label: 'Horas concluídas', color: 'var(--pen)' },
  failed: { label: 'Horas reprovadas', color: 'var(--danger)' },
  inProgress: { label: 'Em curso', color: 'var(--band-pending)' },
} satisfies ChartConfig;

export default function HoursChart({ transcript }: { transcript: Transcript }) {
  const data = hoursByTerm(transcript);
  const average = hoursAverage(data);

  return (
    <figure>
      <figcaption>
        <h2 className="text-xl">Horas por período</h2>
      </figcaption>
      <ChartContainer config={config} className="mt-4 aspect-auto h-64 w-full">
        <BarChart data={data} margin={{ left: 0, right: 12, top: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="term" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={40} />
          <ChartTooltip content={<ChartTooltipContent className="min-w-44" />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="done" stackId="h" fill="var(--color-done)" radius={[0, 0, 4, 4]} isAnimationActive={false} />
          <Bar dataKey="failed" stackId="h" fill="var(--color-failed)" isAnimationActive={false} />
          <Bar dataKey="inProgress" stackId="h" fill="var(--color-inProgress)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          {average !== null && (
            <ReferenceLine
              y={average}
              stroke="var(--ink-muted)"
              strokeDasharray="4 4"
              label={{ value: 'sua média', position: 'insideTopRight', fill: 'var(--ink-muted)', fontSize: 12 }}
            />
          )}
        </BarChart>
      </ChartContainer>
    </figure>
  );
}
