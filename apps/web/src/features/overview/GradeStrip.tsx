import type { GradeBandKey, GradeInsights } from '@easy-grades/core';
import { formatGrade, pluralize } from '@/lib/format';

const BAND_LABELS: Record<GradeBandKey, string> = {
  abaixo6: 'Abaixo de 6',
  '6a7': '6 a 7',
  '7a8': '7 a 8',
  '8a9': '8 a 9',
  '9a10': '9 a 10',
};

export function GradeStrip({ grades }: { grades: GradeInsights }) {
  const max = Math.max(...grades.bands.map((band) => band.count));
  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">Notas das disciplinas cursadas</p>
      <p>
        Mediana {formatGrade(grades.median)} · {pluralize(grades.ninePlus, 'nota 9 ou mais', 'notas 9 ou mais')}
      </p>
      <ul className="grid gap-1 text-sm">
        {grades.bands.map((band) => (
          <li key={band.key} className="grid grid-cols-[4.5rem_1fr_2rem] items-center gap-2">
            <span className="text-muted-foreground">{BAND_LABELS[band.key]}</span>
            <span
              aria-hidden
              className="h-2 rounded-full bg-esmeralda"
              style={{ width: `${max === 0 ? 0 : (band.count / max) * 100}%` }}
            />
            <span className="text-right tabular-nums">{band.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
