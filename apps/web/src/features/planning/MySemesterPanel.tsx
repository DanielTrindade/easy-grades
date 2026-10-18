import type { TermCr } from '@easy-grades/core';
import { ChevronDown, Lock, X } from 'lucide-react';
import { lazy, Suspense, useId } from 'react';
import { ListGroupRow } from '@/components/ListGroup';
import { Button } from '@/components/ui/button';
import { formatCr, toTitleCase } from '@/lib/format';
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

/**
 * The content of "Meu semestre". It renders in the side column on large screens and inside the bottom sheet below lg.
 * No inner scroll: the panel grows with the page.
 */
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
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-[2px]">
        <div className="rounded-group bg-canvas p-3.5">
          <p className="text-sm text-ink-muted">Créditos</p>
          <p className="heading-ink mt-1 text-[1.75rem] tabular-nums">{credits}</p>
        </div>
        <div className="rounded-group bg-canvas p-3.5">
          <p className="text-sm text-ink-muted">CR projetado</p>
          <p className="heading-ink mt-1 text-[1.75rem] tabular-nums text-pen-ink">{formatCr(projected)}</p>
        </div>
      </div>

      <CreditMeter credits={credits} min={minCredits} max={maxCredits} />

      <section aria-labelledby={`${id}-escolhidas`} className="grid gap-2">
        <h3 id={`${id}-escolhidas`} className="text-base">
          Escolhidas <span className="font-normal text-ink-muted tabular-nums">({chosen.length})</span>
        </h3>
        {chosen.length === 0 ? (
          <p className="rounded-lg border border-dashed border-hairline p-4 text-sm text-ink-muted">
            Nenhuma disciplina escolhida. Adicione pelo catálogo.
          </p>
        ) : (
          <ul className="rounded-group bg-canvas pl-3">
            {chosen.map((course) => (
              <ListGroupRow key={course.code} className="gap-3 py-3">
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <p className="line-clamp-2 text-sm leading-snug font-semibold">{toTitleCase(course.name)}</p>
                  <p className="text-xs text-ink-muted tabular-nums">
                    <span className="code-label">{course.code}</span>, {course.credits} cr
                  </p>
                  {course.pending && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink">
                      <Lock aria-hidden className="size-3.5 shrink-0 text-ink-muted" />
                      Pré-requisito pendente
                    </p>
                  )}
                </div>
                <GradeInput
                  id={`${id}-nota-${course.code}`}
                  courseName={toTitleCase(course.name)}
                  value={course.grade}
                  onChange={(grade) => onGradeChange('next', course.code, grade)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="-mr-2 size-11 shrink-0 text-ink-muted"
                  aria-label={`Remover ${toTitleCase(course.name)} do semestre`}
                  onClick={() => onRemove(course.code)}
                >
                  <X aria-hidden />
                </Button>
              </ListGroupRow>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-3 border-t border-hairline pt-4">
        {inProgress.length > 0 && (
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold select-none">
              Em curso agora <span className="font-normal text-ink-muted tabular-nums">({inProgress.length})</span>
              <ChevronDown aria-hidden className="size-4 shrink-0 text-ink-muted transition-transform duration-200 ease-snap group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <ul className="mt-1 divide-y divide-hairline border-t border-hairline">
              {inProgress.map((course) => (
                <li key={course.code} className="flex items-center gap-3 py-3">
                  <p className="min-w-0 flex-1 text-sm leading-snug">{toTitleCase(course.name)}</p>
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

        <div className="flex justify-end">
          <Button type="button" variant="accent" className="max-md:h-11" onClick={onUseSuggestion}>
            Usar sugestão
          </Button>
        </div>
      </div>

      <details className="group border-t border-hairline pt-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold select-none">
          Ver projeção
          <ChevronDown aria-hidden className="size-4 shrink-0 text-ink-muted transition-transform duration-200 ease-snap group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <div className="mt-2 grid gap-4">
          <p className="text-sm text-ink-muted">
            Hoje: {formatCr(currentCr)}. Com notas entre 5 e 10 nessas disciplinas, ficaria entre {formatCr(scenarios.worst)} e{' '}
            {formatCr(scenarios.best)}. Disciplinas com pré-requisito pendente ficam de fora.
          </p>
          <Suspense fallback={<div aria-hidden className="h-56 rounded-lg bg-muted/60" />}>
            <ProjectionChart history={history} projected={projected} projectedTerm={projectedTerm} />
          </Suspense>
        </div>
      </details>
    </div>
  );
}
