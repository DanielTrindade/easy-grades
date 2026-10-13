import {
  completedCodes,
  crScenarios,
  formatTerm,
  inProgressCodes,
  missingPrerequisites,
  nextTerm,
  projectCr,
  suggestNextTerm,
  type ParseResponse,
} from '@easy-grades/core';
import { ChevronUp } from 'lucide-react';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatCr, formatHours, toTitleCase } from '@/lib/format';
import type { Analysis } from '@/lib/use-analysis';
import { CourseCatalog } from './CourseCatalog';
import { MySemesterPanel, type ChosenCourse, type InProgressCourse } from './MySemesterPanel';
import { buildCatalog, type CatalogItem } from './planning-catalog';
import { loadPlan, savePlan } from './plan-storage';
import { initialPlanning, plannedGrades, planningReducer, type PlanningState } from './planning-state';

interface PlanningBoardProps {
  data: ParseResponse;
  analysis: Analysis;
  savedAt: string;
  initial: PlanningState;
}

function PlanningBoard({ data, analysis, savedAt, initial }: PlanningBoardProps) {
  const { curriculum, transcript } = data;
  const [plan, dispatch] = useReducer(planningReducer, initial);
  const [announcement, setAnnouncement] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const { countInProgress } = plan;
  const defaultGrade = analysis.cr ?? 7;
  const maxCredits = curriculum.requirements.maxCreditsPerPeriod ?? 30;
  const minCredits = curriculum.requirements.minCreditsPerPeriod;

  useEffect(() => {
    void savePlan(savedAt, plan);
  }, [plan, savedAt]);

  const inProgressEntries = useMemo(() => transcript.entries.filter((e) => e.status === 'matriculado'), [transcript]);
  const coursesByCode = useMemo(() => new Map(curriculum.courses.map((c) => [c.code, c])), [curriculum]);
  const catalog = useMemo(() => buildCatalog(curriculum, transcript, countInProgress), [curriculum, transcript, countInProgress]);
  const suggestions = useMemo(() => suggestNextTerm(curriculum, transcript, { countInProgress }), [curriculum, transcript, countInProgress]);
  const suggested = useMemo(() => new Set(suggestions.map((s) => s.code)), [suggestions]);
  const released = useMemo(() => {
    const done = new Set([...completedCodes(transcript), ...(countInProgress ? inProgressCodes(transcript) : [])]);
    return (code: string) => missingPrerequisites(curriculum, done, code).length === 0;
  }, [curriculum, transcript, countInProgress]);

  const selected = useMemo(() => new Set(Object.keys(plan.next)), [plan.next]);
  const chosen: ChosenCourse[] = Object.entries(plan.next).flatMap(([code, grade]) => {
    const course = coursesByCode.get(code);
    if (!course) return [];
    return [{ code, name: course.name, credits: course.credits, grade, pending: !released(code) }];
  });
  const credits = chosen.reduce((sum, c) => sum + c.credits, 0);

  const hoursByCode = useMemo(() => {
    const map = new Map<string, number>(curriculum.courses.map((c) => [c.code, c.hours.total]));
    for (const e of inProgressEntries) map.set(e.code, e.hours ?? 0);
    return map;
  }, [curriculum, inProgressEntries]);
  // Only released courses move the projection: a course whose prerequisite is not approved yet cannot count.
  const releasedNext = Object.fromEntries(Object.entries(plan.next).filter(([code]) => released(code)));
  const planned = plannedGrades({ current: plan.current, next: releasedNext }, hoursByCode);
  const projected = projectCr(transcript, planned);
  const scenarios = crScenarios(transcript, planned);
  const projectedTerm = analysis.currentTerm ? nextTerm(analysis.currentTerm) : null;

  const inProgress: InProgressCourse[] = inProgressEntries
    .filter((e) => (e.hours ?? 0) > 0)
    .map((e) => ({ code: e.code, name: e.name, grade: plan.current[e.code] ?? defaultGrade }));

  function toggleCourse(item: CatalogItem) {
    if (selected.has(item.code)) {
      dispatch({ type: 'remove', code: item.code });
      setAnnouncement('Removida do semestre');
    } else {
      dispatch({ type: 'add', code: item.code, grade: defaultGrade });
      setAnnouncement('Adicionada ao semestre');
    }
  }

  function removeCourse(code: string) {
    const grade = plan.next[code] ?? defaultGrade;
    dispatch({ type: 'remove', code });
    setAnnouncement('Removida do semestre');
    toast('Removida.', { action: { label: 'Desfazer', onClick: () => dispatch({ type: 'add', code, grade }) } });
  }

  function useSuggestion() {
    const previous = plan;
    const replacement = initialPlanning(suggestions, [], defaultGrade, countInProgress).next;
    dispatch({ type: 'reset', state: { ...plan, next: replacement } });
    setAnnouncement('Sugestão aplicada');
    toast('Sugestão aplicada.', { action: { label: 'Desfazer', onClick: () => dispatch({ type: 'reset', state: previous }) } });
  }

  const panel = (
    <MySemesterPanel
      chosen={chosen}
      credits={credits}
      minCredits={minCredits}
      maxCredits={maxCredits}
      inProgress={inProgress}
      currentCr={analysis.cr}
      projected={projected}
      scenarios={scenarios}
      history={analysis.crHistory}
      projectedTerm={projectedTerm}
      onGradeChange={(group, code, grade) => dispatch({ type: 'setGrade', group, code, grade })}
      onRemove={removeCourse}
      onUseSuggestion={useSuggestion}
    />
  );

  return (
    <div className="grid gap-12 max-lg:pb-16">
      <div>
        <h1 className="text-3xl sm:text-display">Planejamento</h1>
        <p className="mt-2 max-w-[60ch] text-muted-foreground">
          Escolha as disciplinas do próximo semestre e as notas que você espera. O CR projetado muda na hora.
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <CourseCatalog
          items={catalog}
          suggested={suggested}
          selected={selected}
          countInProgress={countInProgress}
          onCountInProgressChange={(value) => dispatch({ type: 'setCountInProgress', value })}
          onToggle={toggleCourse}
        />

        <aside
          aria-labelledby="meu-semestre"
          className="hidden lg:sticky lg:top-6 lg:grid lg:max-h-[calc(100dvh-3rem)] lg:content-start lg:gap-6 lg:overflow-y-auto lg:pb-2"
        >
          <h2 id="meu-semestre" className="text-2xl">
            Meu semestre
          </h2>
          {panel}
        </aside>
      </div>

      <section aria-labelledby="caminho" className="grid gap-3">
        <h2 id="caminho" className="text-2xl">
          Caminho até a formatura
        </h2>
        {analysis.forecast.terms.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma obrigatória pendente além das que estão em curso.</p>
        ) : (
          <ol className="grid gap-3 border-l-2 border-tinta pl-4">
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
          <p className="text-sm text-correcao">
            Não conseguimos encaixar {analysis.forecast.unschedulable.join(', ')}: os pré-requisitos não aparecem no currículo.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Fora das obrigatórias ainda faltam {formatHours(analysis.forecast.pendingHours.optativa)} de optativas,{' '}
          {formatHours(analysis.forecast.pendingHours.eletiva)} de eletivas, {formatHours(analysis.forecast.pendingHours.aacc)} de
          atividades complementares e {formatHours(analysis.forecast.pendingHours.extensao)} de extensão.
        </p>
      </section>

      {/* Below lg the summary is a fixed bar above the tab bar; the full panel opens in a bottom sheet. */}
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setSheetOpen(true)}
        className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex min-h-14 items-center justify-between gap-3 border-t border-border bg-background px-4 text-left text-sm lg:hidden"
      >
        <span className="tabular-nums">
          {chosen.length} disciplinas · {credits} créditos · CR projetado {formatCr(projected)}
        </span>
        <span className="flex shrink-0 items-center gap-1 font-medium text-tinta">
          Ver
          <ChevronUp aria-hidden className="size-4" />
        </span>
      </button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="max-h-[85dvh] gap-6 overflow-y-auto rounded-t-[12px] p-5 shadow-none">
          <div aria-hidden className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-pauta" />
          <SheetHeader className="p-0">
            <SheetTitle className="heading-ink text-2xl">Meu semestre</SheetTitle>
            <SheetDescription>
              {chosen.length} disciplinas · {credits} créditos · máximo {maxCredits}
            </SheetDescription>
          </SheetHeader>
          {panel}
          <SheetClose asChild>
            <Button variant="outline" className="max-md:h-11">
              Fechar
            </Button>
          </SheetClose>
        </SheetContent>
      </Sheet>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

/** Restores the plan saved for this dataset, or starts one, before the board mounts. */
export function PlanningScreen({ data, analysis, savedAt }: { data: ParseResponse; analysis: Analysis; savedAt: string }) {
  const [initial, setInitial] = useState<PlanningState | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { curriculum, transcript } = data;
    const fallback = initialPlanning(
      suggestNextTerm(curriculum, transcript),
      transcript.entries.filter((e) => e.status === 'matriculado'),
      analysis.cr ?? 7,
    );
    void loadPlan(savedAt).then((stored) => {
      if (!cancelled) setInitial(stored ?? fallback);
    });
    return () => {
      cancelled = true;
    };
  }, [savedAt, data, analysis]);

  if (!initial) {
    return (
      <div aria-busy="true" className="min-h-64">
        <span className="sr-only">Carregando planejamento…</span>
      </div>
    );
  }
  return <PlanningBoard key={savedAt} data={data} analysis={analysis} savedAt={savedAt} initial={initial} />;
}
