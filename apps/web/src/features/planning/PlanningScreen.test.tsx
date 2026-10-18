import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import type { CurriculumCourse } from '@easy-grades/core';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '@/components/ui/sonner';
import { analyze } from '@/lib/use-analysis';
import { clearPlan } from './plan-storage';
import { PlanningScreen } from './PlanningScreen';

const data = { curriculum: sampleCurriculum, transcript: sampleTranscript };
const savedAt = '2026-10-12T10:00:00.000Z';

/** A released extension course, like the real curriculum's Práticas Extensionistas. */
const extensionCourse: CurriculumCourse = {
  code: 'ICC610',
  name: 'PRÁTICAS EXTENSIONISTAS EM COMPUTAÇÃO XI',
  category: 'extensao',
  idealPeriod: 7,
  credits: 6,
  hours: { theory: 0, practice: 0, extension: 90, total: 90 },
  prerequisites: [],
};

/** lg (1024px) and up gets the side column; below it the summary bar opens the panel in a sheet. */
function setDesktop(desktop: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: desktop && query === '(min-width: 1024px)',
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

function renderScreen() {
  render(
    <>
      <PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />
      <Toaster />
    </>,
  );
  // The first render loads the lazy chart, which is slow when the whole workspace runs in parallel: the default 1 s is not enough.
  return screen.findByRole('heading', { name: 'Meu semestre', level: 2 }, { timeout: 10000 });
}

function handleOf(dialog: HTMLElement) {
  return dialog.querySelector('[data-sheet-handle]') as HTMLElement;
}

/** jsdom moves no finger between events, so the drag carries its own clock. */
function drag(target: Element, from: number, to: number, durationMs: number) {
  const now = vi.spyOn(performance, 'now');
  const base = { pointerId: 1, isPrimary: true, button: 0 };
  now.mockReturnValue(1000);
  fireEvent.pointerDown(target, { ...base, clientY: from });
  now.mockReturnValue(1000 + durationMs / 2);
  fireEvent.pointerMove(target, { ...base, clientY: (from + to) / 2 });
  now.mockReturnValue(1000 + durationMs);
  fireEvent.pointerMove(target, { ...base, clientY: to });
  fireEvent.pointerUp(target, { ...base, clientY: to });
  now.mockRestore();
}

function startDrag(target: Element, from: number, to: number) {
  const base = { pointerId: 1, isPrimary: true, button: 0 };
  fireEvent.pointerDown(target, { ...base, clientY: from });
  fireEvent.pointerMove(target, { ...base, clientY: to });
}

async function openMobileSheet() {
  const user = userEvent.setup({ delay: null });
  const summary = await screen.findByRole('button', { name: /CR projetado/ });
  await user.click(summary);
  const dialog = await screen.findByRole('dialog', { name: 'Meu semestre' });
  return { user, summary, dialog };
}

/** The catalog ("Próximo semestre"): its toggle buttons add and remove courses. */
function catalog() {
  return screen.getByRole('region', { name: 'Próximo semestre' });
}

/** Names of the grade inputs under "Escolhidas", in order. */
function chosenNames() {
  const chosen = screen.getByRole('region', { name: /^Escolhidas/ });
  return within(chosen)
    .getAllByRole('textbox', { name: /Nota esperada em / })
    .map((input) => input.getAttribute('aria-label'));
}

describe('PlanningScreen', () => {
  beforeEach(() => {
    clearPlan();
    setDesktop(true);
  });
  afterEach(() => {
    // Sonner keeps toasts in module state, so one test's undo toast would leak into the next.
    toast.dismiss();
    vi.restoreAllMocks();
  });

  it('gives every grade input a non-empty accessible name', async () => {
    await renderScreen();
    const inputs = screen.getAllByRole('textbox', { name: /Nota esperada em / });
    expect(inputs.length).toBeGreaterThan(0);
    for (const input of inputs) {
      expect(input).toHaveAccessibleName(/\S/);
    }
  });

  // Extension courses are courses students must take to reach the required hours, so they are planned like the others.
  it('suggests a released extension course and lists it under Extensão', async () => {
    const user = userEvent.setup({ delay: null });
    const withExtension = { curriculum: { ...sampleCurriculum, courses: [...sampleCurriculum.courses, extensionCourse] }, transcript: sampleTranscript };
    render(
      <>
        <PlanningScreen data={withExtension} analysis={analyze(withExtension)} savedAt={savedAt} />
        <Toaster />
      </>,
    );
    await screen.findByRole('heading', { name: 'Meu semestre', level: 2 }, { timeout: 10000 });

    // The planner suggests it, so it is already in the semester.
    expect(chosenNames()).toContain('Nota esperada em Práticas Extensionistas em Computação XI');

    await user.click(screen.getByRole('radio', { name: /^Extensão, 1$/ }));
    expect(within(catalog()).getByText('Práticas Extensionistas em Computação XI')).toBeInTheDocument();
    expect(within(catalog()).getByText(/Extensão, período ideal 7/)).toBeInTheDocument();
  });

  it('names the grade input of a chosen course with its discipline', async () => {
    await renderScreen();
    expect(
      screen.getByRole('textbox', { name: 'Nota esperada em Trabalho de Conclusão de Curso' }),
    ).toBeInTheDocument();
  });

  it('shows blocked courses with what is missing, and does not let them be added', async () => {
    const user = userEvent.setup({ delay: null });
    await renderScreen();
    await user.click(screen.getByRole('switch', { name: /Supor aprovação/ }));
    await user.click(screen.getByRole('radio', { name: /^Bloqueadas,/ }));
    const row = screen.getByText(/Falta: /).closest('li')!;
    // The default plan had it chosen; once it is removed, the blocked course cannot be added again.
    await user.click(within(row).getByRole('button', { name: /^Remover .* do semestre$/ }));
    expect(within(row).getByRole('button', { name: /^Adicionar / })).toBeDisabled();
  });

  it('adds a course from the catalog and removes it again with the same button', async () => {
    const user = userEvent.setup({ delay: null });
    await renderScreen();
    await user.click(screen.getByRole('radio', { name: /^Eletivas,/ }));
    const row = screen.getAllByRole('listitem').find((li) => within(li).queryByRole('button', { name: /Adicionar/ }))!;
    await user.click(within(row).getByRole('button', { name: /^Adicionar / }));
    expect(within(row).getByRole('button', { name: /^Remover .* do semestre$/ })).toBeInTheDocument();
    await user.click(within(row).getByRole('button', { name: /^Remover .* do semestre$/ }));
    expect(within(row).getByRole('button', { name: /^Adicionar / })).toBeInTheDocument();
  });

  it('names the catalog buttons after the course, and keeps the visible text', async () => {
    const user = userEvent.setup({ delay: null });
    await renderScreen();
    await user.click(screen.getByRole('radio', { name: /^Eletivas,/ }));
    const add = within(catalog()).getByRole('button', { name: 'Adicionar Programação para Web II ao semestre' });
    expect(add).toHaveTextContent('Adicionar');
    await user.click(add);
    expect(
      within(catalog()).getByRole('button', { name: 'Remover Programação para Web II do semestre' }),
    ).toHaveTextContent('No semestre');
  });

  it('announces adding and removing a course to screen readers', async () => {
    const user = userEvent.setup({ delay: null });
    await renderScreen();
    await user.click(screen.getByRole('radio', { name: /^Eletivas,/ }));
    await user.click(within(catalog()).getByRole('button', { name: 'Adicionar Programação para Web II ao semestre' }));
    expect(screen.getByText('Adicionada ao semestre')).toHaveAttribute('aria-live', 'polite');
    await user.click(within(catalog()).getByRole('button', { name: 'Remover Programação para Web II do semestre' }));
    expect(screen.getByText('Removida do semestre')).toHaveAttribute('aria-live', 'polite');
  });

  it('keeps a chosen course listed as "Pré-requisito pendente" when in-progress courses stop counting', async () => {
    const user = userEvent.setup({ delay: null });
    await renderScreen();
    await user.click(screen.getByRole('radio', { name: /^Obrigatórias,/ }));
    const addButton = within(catalog()).getByRole('button', { name: /^(Adicionar|Remover) Projetos Práticos/ });
    if (addButton.textContent?.includes('Adicionar')) await user.click(addButton);
    const field = 'Nota esperada em Projetos Práticos em Engenharia de Software';
    expect(screen.getByRole('textbox', { name: field })).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: /Supor aprovação/ }));

    const item = screen.getByRole('textbox', { name: field }).closest('li')!;
    expect(within(item).getByText('Pré-requisito pendente')).toBeInTheDocument();
  });

  it('restores the previous selection when "Desfazer" follows "Usar sugestão"', async () => {
    const user = userEvent.setup({ delay: null });
    await renderScreen();
    await user.click(screen.getByRole('radio', { name: /^Eletivas,/ }));
    await user.click(screen.getByRole('button', { name: 'Adicionar Programação para Web II ao semestre' }));
    const before = chosenNames();

    await user.click(screen.getByRole('button', { name: 'Usar sugestão' }));
    expect(chosenNames()).not.toEqual(before);

    await user.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(chosenNames()).toEqual(before);
  });

  it('removes a chosen course with a toast that can undo it', async () => {
    const user = userEvent.setup({ delay: null });
    await renderScreen();
    const chosen = screen.getByRole('heading', { name: /Escolhidas/ });
    const before = chosen.textContent;
    const item = screen.getByRole('textbox', { name: 'Nota esperada em Trabalho de Conclusão de Curso' }).closest('li')!;
    await user.click(within(item).getByRole('button', { name: 'Remover Trabalho de Conclusão de Curso do semestre' }));
    expect(await screen.findByText('Removida.')).toBeInTheDocument();
    expect(chosen.textContent).not.toBe(before);
    await user.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(chosen.textContent).toBe(before);
  });

  it('dismisses an undo toast when the board unmounts, so it cannot fail silently', async () => {
    const user = userEvent.setup({ delay: null });
    // The Toaster stays in the same slot, so it keeps its toasts while the board goes away.
    const { rerender } = render(
      <>
        <Toaster />
        <PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />
      </>,
    );
    const item = (await screen.findByRole('textbox', { name: 'Nota esperada em Trabalho de Conclusão de Curso' })).closest('li')!;
    await user.click(within(item).getByRole('button', { name: 'Remover Trabalho de Conclusão de Curso do semestre' }));
    expect(await screen.findByText('Removida.')).toBeInTheDocument();

    rerender(
      <>
        <Toaster />
        {null}
      </>,
    );
    await waitFor(() => expect(screen.queryByText('Removida.')).not.toBeInTheDocument());
  });

  it('names each catalog filter with its count, so a screen reader hears how many courses it holds', async () => {
    render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    expect(await screen.findByRole('radio', { name: /^Eletivas, \d+$/ })).toBeInTheDocument();
  });

  it('keeps the pen blue text on "No semestre" when it is hovered', async () => {
    const user = userEvent.setup({ delay: null });
    render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    await user.click(await screen.findByRole('radio', { name: /^Eletivas,/ }));
    const added = screen.getAllByText('No semestre');
    expect(added.length).toBeGreaterThan(0);
    for (const label of added) expect(label.closest('button')).toHaveClass('hover:text-pen-ink');
  });

  it('keeps the panel in a bottom sheet below lg, with one copy of it', async () => {
    setDesktop(false);
    const user = userEvent.setup({ delay: null });
    render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    const summary = await screen.findByRole('button', { name: /CR projetado/ });
    expect(summary).toHaveTextContent(/disciplinas?, \d+ créditos?, CR projetado/);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();

    await user.click(summary);
    const dialog = await screen.findByRole('dialog', { name: 'Meu semestre' });
    expect(within(dialog).getByRole('textbox', { name: 'Nota esperada em Trabalho de Conclusão de Curso' })).toBeInTheDocument();
  });

  it('opens Meu semestre at medium and toggles medium/large from the grabber', async () => {
    setDesktop(false);
    render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    const { user, dialog } = await openMobileSheet();

    expect(dialog).toHaveAttribute('data-detent', 'medium');
    const grabber = within(dialog).getByRole('button', { name: 'Expandir' });

    await user.click(grabber);
    expect(dialog).toHaveAttribute('data-detent', 'large');
    await user.click(within(dialog).getByRole('button', { name: 'Reduzir' }));
    expect(dialog).toHaveAttribute('data-detent', 'medium');
  });

  it('closes from the header button, with a 44 px target, and returns focus to the capsule', async () => {
    setDesktop(false);
    render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    const { user, summary, dialog } = await openMobileSheet();

    const close = within(dialog).getByRole('button', { name: 'Fechar' });
    expect(close.closest('[data-sheet-handle]')).not.toBeNull();
    expect(close).toHaveClass('h-11');

    await user.click(close);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Meu semestre' })).not.toBeInTheDocument());
    await waitFor(() => expect(summary).toHaveFocus());
  });

  it('closes with Escape and returns focus to the capsule', async () => {
    setDesktop(false);
    render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    const { user, summary } = await openMobileSheet();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Meu semestre' })).not.toBeInTheDocument());
    await waitFor(() => expect(summary).toHaveFocus());
  });

  it('closes on a downward drag and returns focus to the capsule', async () => {
    setDesktop(false);
    render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    const { summary, dialog } = await openMobileSheet();

    drag(handleOf(dialog), 400, 520, 60);

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Meu semestre' })).not.toBeInTheDocument());
    await waitFor(() => expect(summary).toHaveFocus());
  });

  it('reopens at medium after expanding before closing', async () => {
    setDesktop(false);
    render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    const { user, summary, dialog } = await openMobileSheet();

    await user.click(within(dialog).getByRole('button', { name: 'Expandir' }));
    expect(dialog).toHaveAttribute('data-detent', 'large');
    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Meu semestre' })).not.toBeInTheDocument());

    await user.click(summary);
    const reopened = await screen.findByRole('dialog', { name: 'Meu semestre' });
    expect(reopened).toHaveAttribute('data-detent', 'medium');
  });

  it('unmounts the sheet and releases the drag when the layout switches to desktop', async () => {
    let desktop = false;
    const listeners = new Set<() => void>();
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          get matches() {
            return desktop && query === '(min-width: 1024px)';
          },
          media: query,
          addEventListener: (_: string, listener: () => void) => {
            listeners.add(listener);
          },
          removeEventListener: (_: string, listener: () => void) => {
            listeners.delete(listener);
          },
        }) as unknown as MediaQueryList,
    );

    render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    const { dialog } = await openMobileSheet();

    startDrag(handleOf(dialog), 400, 300);
    expect(document.body.style.getPropertyValue('--sheet-drag')).not.toBe('');

    desktop = true;
    act(() => {
      for (const listener of listeners) listener();
    });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Meu semestre' })).not.toBeInTheDocument());
    expect(document.body.style.getPropertyValue('--sheet-drag')).toBe('');

    desktop = false;
    act(() => {
      for (const listener of listeners) listener();
    });
    await screen.findByRole('button', { name: /CR projetado/ });
    expect(screen.queryByRole('dialog', { name: 'Meu semestre' })).not.toBeInTheDocument();
  });

  it('keeps the projected CR separate from the truncatable semester summary', async () => {
    setDesktop(false);
    render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    const summary = await screen.findByRole('button', { name: /Meu semestre,/ });

    expect(summary).toHaveAccessibleName(/^Meu semestre, \d+ disciplinas?, \d+ créditos?, CR projetado \d+,\d+, abrir$/);
    expect(summary).toHaveClass('h-12', 'right-[max(0.75rem,env(safe-area-inset-right))]', 'left-[max(0.75rem,env(safe-area-inset-left))]');
    expect(summary.querySelector('.semester-bar-full')).toHaveClass('truncate');
    expect(summary.querySelector('.semester-bar-projected')).toHaveClass('shrink-0');
    expect(summary.querySelector('.semester-bar-summary')).toHaveClass('min-w-0');
    expect(summary.querySelector('.semester-bar-compact-count')).toHaveClass('shrink-0');
    expect(summary.querySelector('.semester-bar-compact-count')).toHaveTextContent(/\d+ disc\./);
    expect(summary.querySelector('.semester-bar-compact-line')).toHaveTextContent(/disc\. · \d+ cr/);
    expect(summary.querySelector('.semester-bar-compact-credits')).toHaveClass('shrink-0');
    expect(summary.querySelector('.semester-bar-compact-credits')).toHaveTextContent(/\d+ cr/);
    expect(summary.querySelector('.semester-bar-compact-cr')).toHaveTextContent(/^CR \d+,\d+$/);
    expect(summary.querySelector('.semester-bar-cta-label')?.parentElement).toHaveClass('shrink-0');
  });

  it('flags the body while the summary bar is shown, so the bottom chrome clears it', async () => {
    setDesktop(false);
    const { unmount } = render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    await screen.findByRole('button', { name: /CR projetado/ });
    expect(document.body).toHaveAttribute('data-bottom-accessory');

    unmount();
    expect(document.body).not.toHaveAttribute('data-bottom-accessory');
  });

  it('lists the catalog as an iOS grouped list with a capsule search', async () => {
    setDesktop(true);
    render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    const search = await screen.findByRole('searchbox');
    expect(search).toHaveClass('rounded-full', 'pl-10');
    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByRole('radio', { name: /^Eletivas,/ }));
    const row = screen.getAllByRole('listitem').find((li) => within(li).queryByRole('button', { name: /Adicionar/ }))!;
    expect(row.parentElement).toHaveClass('rounded-group', 'bg-surface');
  });

  it('shows the semester panel as an opaque card from lg up', async () => {
    setDesktop(true);
    render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    const heading = await screen.findByRole('heading', { name: 'Meu semestre', level: 2 });
    expect(heading.closest('aside')).toHaveClass('rounded-card', 'bg-surface');
  });

  it('does not flag the body at lg and up, where the summary bar is not shown', async () => {
    setDesktop(true);
    render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    await screen.findByRole('heading', { name: 'Meu semestre', level: 2 });
    expect(document.body).not.toHaveAttribute('data-bottom-accessory');
  });
});
