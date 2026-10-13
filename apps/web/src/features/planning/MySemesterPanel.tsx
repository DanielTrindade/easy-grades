import type { TermCr } from '@easy-grades/core';
import { Lock } from 'lucide-react';
import { lazy, Suspense, useId } from 'react';
import { Button } from '@/components/ui/button';
import { formatCr, pluralize, toTitleCase } from '@/lib/format';
import { CreditMeter } from './CreditMeter';
import { GradeInput } from './GradeInput';

const ProjectionChart = lazy(() => import('./ProjectionChart'));

export interface ChosenCourse {
  code: string;
  name: string;
  credits: number;
  grade: number;
  /** A prerequisite is not approved (or in progress, if counted): the course stays listed but is left out of the projection. */
  pending: boolean;
}

export interface InProgressCourse {
  code: string;
  name: string;
  grade: number;
}

export interface MySemesterPanelProps {
  chosen: readonly ChosenCourse[];
  credits: number;
  minCredits: number;
  maxCredits: number;
  inProgress: readonly InProgressCourse[];
  currentCr: number | null;
  projected: number | null;
  scenarios: { best: number | null; worst: number | null };
  history: TermCr[];
  projectedTerm: string | null;
  onGradeChange: (group: 'current' | 'next', code: string, grade: number) => void;
  onRemove: (code: string) => void;
  onUseSuggestion: () => void;
}

/** The content of "Meu semestre". It renders in the side column on large screens and inside the bottom sheet below lg. */
export function MySemesterPanel({
  chosen,
  credits,
  minCredits,
  maxCredits,
  inProgress,
  currentCr,
  projected,
  scenarios,
  history,
  projectedTerm,
  onGradeChange,
  onRemove,
  onUseSuggestion,
}: MySemesterPanelProps) {
  // Two copies of the panel must never share ids, so every id here is prefixed with this one.
  const id = useId();
  return (
    <div className="grid gap-8">
      <CreditMeter credits={credits} min={minCredits} max={maxCredits} />

      <section aria-labelledby={`${id}-escolhidas`} className="grid gap-3">
        <h3 id={`${id}-escolhidas`} className="text-lg">
          Escolhidas <span className="text-base font-normal text-muted-foreground tabular-nums">({chosen.length})</span>
        </h3>
        {chosen.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Nenhuma disciplina escolhida. Adicione pelo catálogo.
          </p>
        ) : (
          <ul className="grid gap-2">
            {chosen.map((course) => (
              <li key={course.code} className="grid gap-3 rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="grid min-w-0 gap-0.5">
                    <p className="font-medium">{toTitleCase(course.name)}</p>
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {course.code}, {pluralize(course.credits, 'crédito', 'créditos')}
                    </p>
                    {course.pending && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
                        <Lock aria-hidden className="size-4 shrink-0 text-grafite" />
                        Pré-requisito pendente
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="-mr-2 shrink-0 text-correcao hover:text-correcao max-md:h-11"
                    aria-label={`Remover ${toTitleCase(course.name)} do semestre`}
                    onClick={() => onRemove(course.code)}
                  >
                    Remover
                  </Button>
                </div>
                <GradeInput
                  id={`${id}-nota-${course.code}`}
                  courseName={toTitleCase(course.name)}
                  value={course.grade}
                  onChange={(grade) => onGradeChange('next', course.code, grade)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {inProgress.length > 0 && (
        <details className="group rounded-lg border border-border">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 font-medium select-none">
            Em curso agora <span className="text-sm font-normal text-muted-foreground tabular-nums">({inProgress.length})</span>
          </summary>
          <ul className="grid gap-3 border-t border-border p-3">
            {inProgress.map((course) => (
              <li key={course.code} className="grid gap-2">
                <p className="text-sm">{toTitleCase(course.name)}</p>
                <GradeInput
                  id={`${id}-atual-${course.code}`}
                  courseName={toTitleCase(course.name)}
                  value={course.grade}
                  onChange={(grade) => onGradeChange('current', course.code, grade)}
                />
              </li>
            ))}
          </ul>
        </details>
      )}

      <section aria-labelledby={`${id}-projecao`} className="grid gap-4">
        <h3 id={`${id}-projecao`} className="text-lg">
          CR projetado
        </h3>
        <p className="heading-ink text-5xl leading-none tabular-nums">{formatCr(projected)}</p>
        <p className="text-sm text-muted-foreground">
          Hoje: {formatCr(currentCr)}. Com notas entre 5 e 10 nessas disciplinas, ficaria entre {formatCr(scenarios.worst)} e{' '}
          {formatCr(scenarios.best)}. Disciplinas com pré-requisito pendente ficam de fora.
        </p>
        <Suspense fallback={<div aria-hidden className="h-56 rounded-lg bg-muted/60" />}>
          <ProjectionChart history={history} projected={projected} projectedTerm={projectedTerm} />
        </Suspense>
        <Button type="button" variant="outline" className="justify-self-start max-md:h-11" onClick={onUseSuggestion}>
          Usar sugestão
        </Button>
      </section>
    </div>
  );
}
