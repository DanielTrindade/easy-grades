import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '@/components/ui/sonner';
import { analyze } from '@/lib/use-analysis';
import { clearPlan } from './plan-storage';
import { PlanningScreen } from './PlanningScreen';

const data = { curriculum: sampleCurriculum, transcript: sampleTranscript };
const savedAt = '2026-10-12T10:00:00.000Z';

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

/** Names of the grade inputs under "Escolhidas", in order. */
function chosenNames() {
  const chosen = screen.getByRole('region', { name: /^Escolhidas/ });
  return within(chosen)
    .getAllByRole('textbox', { name: /Nota esperada em / })
    .map((input) => input.getAttribute('aria-label'));
}

// Each test renders the whole screen and clicks through it: the default 5 s is too short when the suite runs in parallel.
describe('PlanningScreen', { timeout: 15000 }, () => {
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

  it('names the grade input of a chosen course with its discipline', async () => {
    await renderScreen();
    expect(
      screen.getByRole('textbox', { name: 'Nota esperada em Trabalho de Conclusão de Curso' }),
    ).toBeInTheDocument();
  });

  it('shows blocked courses with what is missing, and does not let them be added', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.click(screen.getByRole('switch', { name: /Supor aprovação/ }));
    await user.click(screen.getByRole('radio', { name: 'Bloqueadas' }));
    const row = screen.getByText(/Falta: /).closest('li')!;
    // The default plan had it chosen; once it is removed, the blocked course cannot be added again.
    await user.click(within(row).getByRole('button', { name: /^Remover .* do semestre$/ }));
    expect(within(row).getByRole('button', { name: /^Adicionar / })).toBeDisabled();
  });

  it('adds a course from the catalog and removes it again with the same button', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.click(screen.getByRole('radio', { name: 'Eletivas' }));
    const row = screen.getAllByRole('listitem').find((li) => within(li).queryByRole('button', { name: /Adicionar/ }))!;
    await user.click(within(row).getByRole('button', { name: /^Adicionar / }));
    expect(within(row).getByRole('button', { name: /^Remover .* do semestre$/ })).toBeInTheDocument();
    await user.click(within(row).getByRole('button', { name: /^Remover .* do semestre$/ }));
    expect(within(row).getByRole('button', { name: /^Adicionar / })).toBeInTheDocument();
  });

  it('names the catalog buttons after the course, and keeps the visible text', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.click(screen.getByRole('radio', { name: 'Eletivas' }));
    const add = screen.getByRole('button', { name: 'Adicionar Programação para Web II ao semestre' });
    expect(add).toHaveTextContent('Adicionar');
    await user.click(add);
    expect(
      screen.getByRole('button', { name: 'Remover Programação para Web II do semestre' }),
    ).toHaveTextContent('Adicionada');
  });

  it('announces adding and removing a course to screen readers', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.click(screen.getByRole('radio', { name: 'Eletivas' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar Programação para Web II ao semestre' }));
    expect(screen.getByText('Adicionada ao semestre')).toHaveAttribute('aria-live', 'polite');
    await user.click(screen.getByRole('button', { name: 'Remover Programação para Web II do semestre' }));
    expect(screen.getByText('Removida do semestre')).toHaveAttribute('aria-live', 'polite');
  });

  it('keeps a chosen course listed as "Pré-requisito pendente" when in-progress courses stop counting', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.click(screen.getByRole('radio', { name: 'Obrigatórias' }));
    const addButton = screen.getByRole('button', { name: /^(Adicionar|Remover) Projetos Práticos/ });
    if (addButton.textContent?.includes('Adicionar')) await user.click(addButton);
    const field = 'Nota esperada em Projetos Práticos em Engenharia de Software';
    expect(screen.getByRole('textbox', { name: field })).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: /Supor aprovação/ }));

    const item = screen.getByRole('textbox', { name: field }).closest('li')!;
    expect(within(item).getByText('Pré-requisito pendente')).toBeInTheDocument();
  });

  it('restores the previous selection when "Desfazer" follows "Usar sugestão"', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.click(screen.getByRole('radio', { name: 'Eletivas' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar Programação para Web II ao semestre' }));
    const before = chosenNames();

    await user.click(screen.getByRole('button', { name: 'Usar sugestão' }));
    expect(chosenNames()).not.toEqual(before);

    await user.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(chosenNames()).toEqual(before);
  });

  it('removes a chosen course with a toast that can undo it', async () => {
    const user = userEvent.setup();
    await renderScreen();
    const chosen = screen.getByRole('heading', { name: /Escolhidas/ });
    const before = chosen.textContent;
    const item = screen.getByRole('textbox', { name: 'Nota esperada em Trabalho de Conclusão de Curso' }).closest('li')!;
    await user.click(within(item).getByRole('button', { name: 'Remover' }));
    expect(await screen.findByText('Removida.')).toBeInTheDocument();
    expect(chosen.textContent).not.toBe(before);
    await user.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(chosen.textContent).toBe(before);
  });

  it('dismisses an undo toast when the board unmounts, so it cannot fail silently', async () => {
    const user = userEvent.setup();
    // The Toaster stays in the same slot, so it keeps its toasts while the board goes away.
    const { rerender } = render(
      <>
        <Toaster />
        <PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />
      </>,
    );
    const item = (await screen.findByRole('textbox', { name: 'Nota esperada em Trabalho de Conclusão de Curso' })).closest('li')!;
    await user.click(within(item).getByRole('button', { name: 'Remover' }));
    expect(await screen.findByText('Removida.')).toBeInTheDocument();

    rerender(
      <>
        <Toaster />
        {null}
      </>,
    );
    await waitFor(() => expect(screen.queryByText('Removida.')).not.toBeInTheDocument());
  });

  it('keeps the panel in a bottom sheet below lg, with one copy of it', async () => {
    setDesktop(false);
    const user = userEvent.setup();
    render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    const summary = await screen.findByRole('button', { name: /CR projetado/ });
    expect(summary).toHaveTextContent(/disciplinas?, \d+ créditos?, CR projetado/);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();

    await user.click(summary);
    const dialog = await screen.findByRole('dialog', { name: 'Meu semestre' });
    expect(within(dialog).getByRole('textbox', { name: 'Nota esperada em Trabalho de Conclusão de Curso' })).toBeInTheDocument();
  });
});
