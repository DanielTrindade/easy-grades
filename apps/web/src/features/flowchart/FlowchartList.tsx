import type { Curriculum, FlowNode } from '@easy-grades/core';
import { ListGroupRow } from '@/components/ListGroup';
import { StateBadge } from '@/components/StatusBadge';
import { formatGrade, toTitleCase } from '@/lib/format';

/** Screen-reader and keyboard friendly alternative to the graph. */
export function FlowchartList({ nodes, curriculum }: { nodes: FlowNode[]; curriculum: Curriculum }) {
  const prereqs = new Map(curriculum.courses.map((c) => [c.code, c.prerequisites]));
  const periods = [...new Set(nodes.map((n) => n.idealPeriod))].sort((a, b) => a - b);
  return (
    <div className="grid gap-6">
      {periods.map((period) => (
        <section key={period} aria-labelledby={`periodo-${period}`}>
          <h2 id={`periodo-${period}`} className="text-title3">
            {period}º período
          </h2>
          <ul className="mt-2 rounded-group bg-surface pl-4">
            {nodes
              .filter((n) => n.idealPeriod === period)
              .map((n) => {
                const blocks = prereqs.get(n.code) ?? [];
                return (
                  <ListGroupRow key={n.code} className="flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="code-label text-footnote">{n.code}</span>
                    <span className="font-medium">{toTitleCase(n.name)}</span>
                    <StateBadge state={n.state} />
                    {n.grade !== null && <span className="text-sm">nota {formatGrade(n.grade)}</span>}
                    {blocks.length > 0 && (
                      <span className="w-full text-sm text-muted-foreground">
                        Pré-requisitos: {blocks.map((b) => b.join(' e ')).join(' ou ')}
                      </span>
                    )}
                  </ListGroupRow>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
