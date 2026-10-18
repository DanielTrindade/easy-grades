import { formatTerm, termIndex, type TimelineInsights } from '@easy-grades/core';
import { TriangleAlert } from 'lucide-react';
import { formatPercent, pluralize } from '@/lib/format';

function position(term: string | null, timeline: TimelineInsights): number | null {
  if (term === null || timeline.admissionTerm === null || timeline.maxTerm === null) return null;
  const scale = termIndex(timeline.maxTerm) - termIndex(timeline.admissionTerm);
  if (scale <= 0) return 0;
  const raw = ((termIndex(term) - termIndex(timeline.admissionTerm)) / scale) * 100;
  return Math.min(100, Math.max(0, raw));
}

function slackTail(timeline: TimelineInsights): string {
  if (timeline.paceSlack === null || timeline.maxTerm === null) return '';
  if (timeline.paceSlack >= 0) {
    return `, com ${pluralize(timeline.paceSlack, 'período', 'períodos')} de folga até ${formatTerm(timeline.maxTerm)}`;
  }
  return `, ${pluralize(Math.abs(timeline.paceSlack), 'período', 'períodos')} além do prazo máximo de ${formatTerm(timeline.maxTerm)}`;
}

function timelineSentence(timeline: TimelineInsights): string {
  const parts: string[] = [];
  if (timeline.currentPeriod !== null && timeline.usedPercent !== null) {
    parts.push(
      `Você está no ${timeline.currentPeriod}º período de ${timeline.minPeriods} ideais — ${formatPercent(timeline.usedPercent)} do prazo máximo de ${timeline.maxPeriods}.`,
    );
  }
  if (timeline.forecastTerm !== null) {
    parts.push(`As obrigatórias terminam em ${formatTerm(timeline.forecastTerm)}.`);
  }
  if (timeline.paceTerm !== null) {
    parts.push(
      `No seu ritmo médio, contando as horas fora das disciplinas, o curso fecha em ${formatTerm(timeline.paceTerm)}${slackTail(timeline)}.`,
    );
  }
  return parts.join(' ');
}

interface TimelineBandProps {
  timeline: TimelineInsights;
}

export function TimelineBand({ timeline }: TimelineBandProps) {
  const current = position(timeline.currentTerm, timeline);
  const forecast = position(timeline.forecastTerm, timeline);
  const late = timeline.paceSlack !== null && timeline.paceSlack < 0;
  const markers = [
    { label: 'Ingresso', term: timeline.admissionTerm },
    { label: 'Hoje', term: timeline.currentTerm },
    { label: 'Previsão', term: timeline.forecastTerm },
    { label: 'Limite', term: timeline.maxTerm },
  ];
  const sentence = timelineSentence(timeline);

  return (
    <section aria-labelledby="linha-do-tempo" className="min-w-0">
      <h2 id="linha-do-tempo" className="text-xl">
        Linha do tempo do curso
      </h2>
      <div aria-hidden className="relative mt-4 h-2">
        <span className="absolute inset-0 rounded-full bg-muted" />
        {current !== null && (
          <span
            data-segment="done"
            className="absolute inset-y-0 left-0 rounded-l-full bg-pen"
            style={{ width: `${current.toFixed(2)}%` }}
          />
        )}
        {current !== null && forecast !== null && forecast > current && (
          <span
            data-segment="forecast"
            className="absolute inset-y-0 bg-pen/30"
            style={{ left: `${current.toFixed(2)}%`, width: `${(forecast - current).toFixed(2)}%` }}
          />
        )}
        {current !== null && (
          <span
            data-marker="today"
            className="absolute -top-1 size-4 -translate-x-1/2 rounded-full border-2 border-canvas bg-pen"
            style={{ left: `${current.toFixed(2)}%` }}
          />
        )}
        {forecast !== null && (
          <span
            data-marker="forecast"
            className="absolute -top-1 size-4 -translate-x-1/2 rounded-full border-2 border-pen bg-canvas"
            style={{ left: `${forecast.toFixed(2)}%` }}
          />
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        {markers.map((marker) => (
          <div key={marker.label}>
            <dt className="text-muted-foreground">{marker.label}</dt>
            <dd className="font-medium">{marker.term ? formatTerm(marker.term) : '—'}</dd>
          </div>
        ))}
      </dl>
      {sentence.length > 0 && (
        <p
          className={
            late
              ? 'mt-3 flex max-w-[60ch] items-start gap-2 text-sm text-danger'
              : 'mt-3 max-w-[60ch] text-sm text-muted-foreground'
          }
        >
          {late && <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />}
          <span>{sentence}</span>
        </p>
      )}
    </section>
  );
}
