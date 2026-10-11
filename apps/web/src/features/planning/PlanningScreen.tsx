import {
  crScenarios,
  formatTerm,
  nextTerm,
  projectCr,
  rankCandidates,
  suggestNextTerm,
  type ParseResponse,
  type Suggestion,
} from '@easy-grades/core';
import { lazy, Suspense, useMemo, useReducer, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { formatCr, formatGrade, formatHours, toTitleCase } from '@/lib/format';
import type { Analysis } from '@/lib/use-analysis';
import { initialPlanning, plannedGrades, planningReducer } from './planning-state';

const ProjectionChart = lazy(() => import('./ProjectionChart'));

function GradeSlider({
  id,
  label,
  accessibleName,
  value,
  onChange,
}: {
  id: string;
  label: string;
  accessibleName?: string;
  value: number;
  onChange: (grade: number) => void;
}) {
  const labelId = `${id}-rotulo`;
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label id={labelId} htmlFor={id} className="font-normal">
          {label}
        </Label>
        <span className="text-sm font-medium">{formatGrade(value)}</span>
      </div>
      <Slider
        id={id}
        min={0}
        max={10}
        step={0.1}
        value={[value]}
        onValueChange={([v]) => onChange(v ?? value)}
        aria-label={accessibleName}
        aria-labelledby={accessibleName ? undefined : labelId}
      />
    </div>
  );
}

export function PlanningScreen({ data, analysis }: { data: ParseResponse; analysis: Analysis }) {
  const { curriculum, transcript } = data;
  const inProgress = useMemo(() => transcript.entries.filter((e) => e.status === 'matriculado'), [transcript]);
  const defaultGrade = analysis.cr ?? 7;
  const [countInProgress, setCountInProgress] = useState(true);
  const [showAllElectives, setShowAllElectives] = useState(false);
  const [plan, dispatch] = useReducer(planningReducer, undefined, () =>
    initialPlanning(suggestNextTerm(curriculum, transcript), inProgress, defaultGrade),
  );

  const candidates = useMemo(() => rankCandidates(curriculum, transcript, { countInProgress }), [curriculum, transcript, countInProgress]);
  const byCode = useMemo(() => new Map<string, Suggestion>(candidates.map((c) => [c.code, c])), [candidates]);
  const hoursByCode = useMemo(() => {
    const map = new Map<string, number>(candidates.map((c) => [c.code, c.hours]));
    for (const e of inProgress) map.set(e.code, e.hours ?? 0);
    return map;
  }, [candidates, inProgress]);

  const visible = candidates.filter((c) => showAllElectives || c.category === 'obrigatoria' || c.code in plan.next);
  const hiddenElectives = candidates.length - visible.length;
  const nextCodes = Object.keys(plan.next).filter((code) => byCode.has(code));
  const credits = nextCodes.reduce((sum, code) => sum + (byCode.get(code)?.credits ?? 0), 0);
  const maxCredits = curriculum.requirements.maxCreditsPerPeriod ?? 30;
  const minCredits = curriculum.requirements.minCreditsPerPeriod;
  const planned = plannedGrades({ current: plan.current, next: Object.fromEntries(nextCodes.map((c) => [c, plan.next[c]!])) }, hoursByCode);
  const projected = projectCr(transcript, planned);
  const scenarios = crScenarios(transcript, planned);
  const projectedTerm = analysis.currentTerm ? nextTerm(analysis.currentTerm) : null;

  function changeCountInProgress(value: boolean) {
    setCountInProgress(value);
    dispatch({
      type: 'reset',
      state: initialPlanning(suggestNextTerm(curriculum, transcript, { countInProgress: value }), inProgress, defaultGrade),
    });
  }

  const creditNote =
    credits > maxCredits
      ? `Passa do máximo de ${maxCredits} créditos por período.`
      : credits > 0 && credits < minCredits
        ? `Abaixo do mínimo de ${minCredits} créditos por período.`
        : `Entre ${minCredits} e ${maxCredits} créditos por período.`;

  return (
    <div className="grid gap-12">
      <div>
        <h1 className="text-3xl font-semibold sm:text-display">Planejamento</h1>
        <p className="mt-2 max-w-[60ch] text-muted-foreground">
          Escolha as disciplinas do próximo semestre e as notas que você espera. O CR projetado muda na hora.
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
        <section aria-labelledby="sugestoes" className="grid content-start gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="sugestoes" className="text-2xl font-semibold">
              Próximo semestre{projectedTerm && `, ${formatTerm(projectedTerm)}`}
            </h2>
            <div className="flex items-center gap-2">
              <Switch id="contar-em-curso" checked={countInProgress} onCheckedChange={changeCountInProgress} />
              <Label htmlFor="contar-em-curso" className="font-normal">
                Supor aprovação no que está em curso
              </Label>
            </div>
          </div>
          <p className={credits > maxCredits ? 'text-sm text-urucum' : 'text-sm text-muted-foreground'} aria-live="polite">
            <strong className="font-semibold text-foreground">{credits} créditos</strong> escolhidos. {creditNote}
          </p>

          {candidates.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-muted-foreground">
              Não há disciplinas obrigatórias ou eletivas liberadas para o próximo semestre.
            </p>
          ) : (
            <ul className="grid gap-2">
              {visible.map((c) => {
                const checked = c.code in plan.next;
                const id = `escolha-${c.code}`;
                return (
                  <li key={c.code} className="rounded-lg border border-border bg-card p-3 has-[[data-state=checked]]:border-igapo">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={id}
                        checked={checked}
                        onCheckedChange={() => dispatch({ type: 'toggle', code: c.code, grade: defaultGrade })}
                        className="mt-1"
                      />
                      <Label htmlFor={id} className="grid flex-1 cursor-pointer gap-0.5 font-normal">
                        <span className="font-medium">
                          {toTitleCase(c.name)} <span className="text-sm font-normal text-muted-foreground">{c.code}</span>
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {c.reason}. {c.credits} créditos, {formatHours(c.hours)}.
                        </span>
                      </Label>
                    </div>
                    {checked && (
                      <div className="mt-3 pl-7">
                        <GradeSlider
                          id={`nota-${c.code}`}
                          label="Nota esperada"
                          accessibleName={`Nota esperada em ${toTitleCase(c.name)}`}
                          value={plan.next[c.code]!}
                          onChange={(grade) => dispatch({ type: 'setGrade', group: 'next', code: c.code, grade })}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {hiddenElectives > 0 && (
            <Button variant="outline" className="justify-self-start" onClick={() => setShowAllElectives(true)}>
              Ver mais {hiddenElectives} eletivas liberadas
            </Button>
          )}
          {showAllElectives && (
            <Button variant="ghost" className="justify-self-start" onClick={() => setShowAllElectives(false)}>
              Mostrar só as escolhidas e obrigatórias
            </Button>
          )}
        </section>

        <aside aria-labelledby="projecao" className="grid content-start gap-8">
          <section className="grid gap-4">
            <h2 id="projecao" className="text-2xl font-semibold">
              CR projetado
            </h2>
            <p className="font-heading text-stat font-semibold leading-none">{formatCr(projected)}</p>
            <p className="text-sm text-muted-foreground">
              Hoje: {formatCr(analysis.cr)}. Com notas entre 5 e 10 nessas disciplinas, ficaria entre {formatCr(scenarios.worst)} e{' '}
              {formatCr(scenarios.best)}.
            </p>
            <Suspense fallback={<div aria-hidden className="h-56 rounded-lg bg-muted/60" />}>
              <ProjectionChart history={analysis.crHistory} projected={projected} projectedTerm={projectedTerm} />
            </Suspense>
          </section>

          {inProgress.length > 0 && (
            <section aria-labelledby="em-curso" className="grid gap-4">
              <h3 id="em-curso" className="text-lg font-semibold">
                Em curso agora
              </h3>
              {inProgress.map((e) =>
                (e.hours ?? 0) > 0 ? (
                  <GradeSlider
                    key={e.code}
                    id={`atual-${e.code}`}
                    label={toTitleCase(e.name)}
                    value={plan.current[e.code] ?? defaultGrade}
                    onChange={(grade) => dispatch({ type: 'setGrade', group: 'current', code: e.code, grade })}
                  />
                ) : null,
              )}
            </section>
          )}

          <section aria-labelledby="caminho" className="grid gap-3">
            <h3 id="caminho" className="text-lg font-semibold">
              Caminho até a formatura
            </h3>
            {analysis.forecast.terms.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma obrigatória pendente além das que estão em curso.</p>
            ) : (
              <ol className="grid gap-3 border-l-2 border-solimoes pl-4">
                {analysis.forecast.terms.map((term) => (
                  <li key={term.term}>
                    <p className="font-medium">
                      {formatTerm(term.term)} <span className="text-sm font-normal text-muted-foreground">{term.credits} créditos</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{term.courses.map((c) => toTitleCase(c.name)).join(', ')}</p>
                  </li>
                ))}
              </ol>
            )}
            {analysis.forecast.unschedulable.length > 0 && (
              <p className="text-sm text-urucum">
                Não conseguimos encaixar {analysis.forecast.unschedulable.join(', ')}: os pré-requisitos não aparecem no currículo.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Fora das obrigatórias ainda faltam {formatHours(analysis.forecast.pendingHours.optativa)} de optativas,{' '}
              {formatHours(analysis.forecast.pendingHours.eletiva)} de eletivas, {formatHours(analysis.forecast.pendingHours.aacc)} de
              atividades complementares e {formatHours(analysis.forecast.pendingHours.extensao)} de extensão.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
