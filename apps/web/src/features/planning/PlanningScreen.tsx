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
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DetentSheet } from '@/components/DetentSheet';
import { Button } from '@/components/ui/button';
import { formatCr, formatHours, pluralize, toTitleCase } from '@/lib/format';
import { useBodyData } from '@/lib/body-data';
import type { Analysis } from '@/lib/use-analysis';
import { useFitsViewport } from '@/lib/use-fits-viewport';
import { useMediaQuery } from '@/lib/use-media-query';
import { cn } from '@/lib/utils';
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
  // Side column at lg and up; below it the summary bar opens the same panel in a sheet.
  const desktop = useMediaQuery('(min-width: 1024px)');
  // The side panel is sticky only while it fits the window; a taller one scrolls with the page, so its bottom stays reachable.
  const asideRef = useRef<HTMLElement>(null);
  const asideFits = useFitsViewport(asideRef, 48, desktop);
  const summaryBarRef = useRef<HTMLButtonElement>(null);
  // Undo toasts still open when the board unmounts are dismissed, so an undo cannot fail silently.
  const undoToastIds = useRef<(string | number)[]>([]);
  const { countInProgress } = plan;
  const defaultGrade = analysis.cr ?? 7;
  const maxCredits = curriculum.requirements.maxCreditsPerPeriod ?? 30;
  const minCredits = curriculum.requirements.minCreditsPerPeriod;

  useEffect(() => {
    const ids = undoToastIds.current;
    return () => {
      for (const id of ids) toast.dismiss(id);
    };
  }, []);

  useBodyData('bottomAccessory', desktop ? null : '');

  useEffect(() => {
    if (desktop) setSheetOpen(false);
  }, [desktop]);

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

  function undoToast(message: string, onUndo: () => void) {
    undoToastIds.current.push(toast(message, { action: { label: 'Desfazer', onClick: onUndo } }));
  }

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
    undoToast('Removida.', () => dispatch({ type: 'add', code, grade }));
  }

  function applySuggestion() {
    const previous = plan;
    const replacement = initialPlanning(suggestions, [], defaultGrade, countInProgress).next;
    dispatch({ type: 'reset', state: { ...plan, next: replacement } });
    setAnnouncement('Sugestão aplicada');
    undoToast('Sugestão aplicada.', () => dispatch({ type: 'reset', state: previous }));
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
      onUseSuggestion={applySuggestion}
    />
  );

  const summary = `${pluralize(chosen.length, 'disciplina', 'disciplinas')}, ${pluralize(credits, 'crédito', 'créditos')}`;

  return (
    <div className="grid gap-12">
      <div className="grid gap-6 pb-2 md:grid-cols-2 md:items-end">
        <div>
          <p className="max-w-[40ch] text-ink-muted">Monte o próximo semestre e veja o CR mudar enquanto escolhe.</p>
        </div>
        <div className="md:text-right">
          <p className="text-sm text-ink-muted">{projectedTerm ? `${formatTerm(projectedTerm)}, CR projetado` : 'CR projetado'}</p>
          <p className="heading-ink mt-1 text-stat leading-none tabular-nums text-pen-ink">{formatCr(projected)}</p>
          <p className="mt-2 text-sm text-ink-muted tabular-nums">hoje {formatCr(analysis.cr)}</p>
        </div>
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

        {desktop && (
          <aside
            ref={asideRef}
            aria-labelledby="meu-semestre"
            className={cn(
              'grid content-start gap-5 rounded-card bg-surface p-5',
              asideFits && 'lg:sticky lg:top-6',
            )}
          >
            <h2 id="meu-semestre" className="text-xl">
              Meu semestre
            </h2>
            {panel}
          </aside>
        )}
      </div>

      <section aria-labelledby="caminho" className="grid gap-3">
        <h2 id="caminho" className="text-2xl">
          Caminho até a formatura
        </h2>
        {analysis.forecast.terms.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma obrigatória pendente além das que estão em curso.</p>
        ) : (
          <ol className="grid gap-3 border-l-2 border-ink pl-4">
            {analysis.forecast.terms.map((term) => (
              <li key={term.term}>
                <p className="font-medium">
                  {formatTerm(term.term)}{' '}
                  <span className="text-sm font-normal text-muted-foreground">{pluralize(term.credits, 'crédito', 'créditos')}</span>
                </p>
                <p className="text-sm text-muted-foreground">{term.courses.map((c) => toTitleCase(c.name)).join(', ')}</p>
              </li>
            ))}
          </ol>
        )}
        {analysis.forecast.unschedulable.length > 0 && (
          <p className="text-sm text-danger">
            Não conseguimos encaixar {analysis.forecast.unschedulable.join(', ')}: os pré-requisitos não aparecem no currículo.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Fora das obrigatórias ainda faltam {formatHours(analysis.forecast.pendingHours.optativa)} de optativas,{' '}
          {formatHours(analysis.forecast.pendingHours.eletiva)} de eletivas, {formatHours(analysis.forecast.pendingHours.aacc)} de
          atividades complementares e {formatHours(analysis.forecast.pendingHours.extensao)} de extensão.
        </p>
      </section>

      {!desktop && (
        <>
          {/* Below lg the summary is a fixed bar above the tab bar; the full panel opens in a bottom sheet. */}
          <button
            ref={summaryBarRef}
            type="button"
            aria-label={`Meu semestre, ${summary}, CR projetado ${formatCr(projected)}, abrir`}
            aria-haspopup="dialog"
            onClick={() => setSheetOpen(true)}
            className="glass semester-bar fixed right-[max(0.75rem,env(safe-area-inset-right))] left-[max(0.75rem,env(safe-area-inset-left))] bottom-[calc(var(--tab-bar-space)+0.5rem+env(safe-area-inset-bottom))] z-30 flex h-12 items-center justify-between gap-3 rounded-full px-5 text-left text-sm"
          >
            <span className="semester-bar-summary min-w-0 flex-1 tabular-nums">
              <span className="semester-bar-full truncate">{summary}, CR projetado</span>
              <span className="semester-bar-projected shrink-0 font-semibold text-pen-ink">{formatCr(projected)}</span>
              <span className="semester-bar-compact">
                <span className="semester-bar-compact-line">
                  <span className="semester-bar-compact-count shrink-0">{chosen.length} disc.</span>
                  <span className="semester-bar-compact-separator shrink-0" aria-hidden="true">
                    {' · '}
                  </span>
                  <span className="semester-bar-compact-credits shrink-0">{credits} cr</span>
                </span>
                <span className="semester-bar-compact-cr">CR {formatCr(projected)}</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 font-medium text-ink">
              <span className="semester-bar-cta-label">Ver</span>
              <ChevronUp aria-hidden className="size-4" />
            </span>
          </button>

          <DetentSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            title="Meu semestre"
            description={`${summary}, máximo ${maxCredits}`}
            initialDetent="medium"
            returnFocusRef={summaryBarRef}
            headerAction={
              <Button type="button" variant="ghost" className="h-11" onClick={() => setSheetOpen(false)}>
                Fechar
              </Button>
            }
          >
            {panel}
          </DetentSheet>
        </>
      )}

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
