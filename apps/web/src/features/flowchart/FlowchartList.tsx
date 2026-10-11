import type { Curriculum, FlowNode } from '@easy-grades/core';
import { StateBadge } from '@/components/StatusBadge';
import { formatGrade, toTitleCase } from '@/lib/format';

/** Screen-reader and keyboard friendly alternative to the graph. */
export function FlowchartList({ nodes, curriculum }: { nodes: FlowNode[]; curriculum: Curriculum }) {
  const prereqs = new Map(curriculum.courses.map((c) => [c.code, c.prerequisites]));
  const periods = [...new Set(nodes.map((n) => n.idealPeriod))].sort((a, b) => a - b);
  return (
    <div className="grid gap-8">
      {periods.map((period) => (
        <section key={period} aria-labelledby={`periodo-${period}`}>
          <h2 id={`periodo-${period}`} className="text-lg font-semibold">
            {period}º período
          </h2>
          <ul className="mt-3 grid gap-2">
            {nodes
              .filter((n) => n.idealPeriod === period)
              .map((n) => {
                const blocks = prereqs.get(n.code) ?? [];
                return (
                  <li key={n.code} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-2">
                    <span className="text-sm text-muted-foreground">{n.code}</span>
                    <span className="font-medium">{toTitleCase(n.name)}</span>
                    <StateBadge state={n.state} />
                    {n.grade !== null && <span className="text-sm">nota {formatGrade(n.grade)}</span>}
                    {blocks.length > 0 && (
                      <span className="w-full text-sm text-muted-foreground">
                        Pré-requisitos: {blocks.map((b) => b.join(' e ')).join(' ou ')}
                      </span>
                    )}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
