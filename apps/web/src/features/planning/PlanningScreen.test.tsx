import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { Toaster } from '@/components/ui/sonner';
import { analyze } from '@/lib/use-analysis';
import { clearPlan } from './plan-storage';
import { PlanningScreen } from './PlanningScreen';

const data = { curriculum: sampleCurriculum, transcript: sampleTranscript };
const savedAt = '2026-10-12T10:00:00.000Z';

function renderScreen() {
  render(
    <>
      <PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />
      <Toaster />
    </>,
  );
  return screen.findByRole('heading', { name: 'Meu semestre', level: 2 });
}

describe('PlanningScreen', () => {
  beforeEach(() => clearPlan());

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
    await user.click(within(row).getByRole('button', { name: 'Adicionada' }));
    expect(within(row).getByRole('button', { name: 'Adicionar' })).toBeDisabled();
  });

  it('adds a course from the catalog and removes it again with the same button', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.click(screen.getByRole('radio', { name: 'Eletivas' }));
    const row = screen.getAllByRole('listitem').find((li) => within(li).queryByRole('button', { name: /Adicionar/ }))!;
    await user.click(within(row).getByRole('button', { name: 'Adicionar' }));
    expect(within(row).getByRole('button', { name: 'Adicionada' })).toBeInTheDocument();
    await user.click(within(row).getByRole('button', { name: 'Adicionada' }));
    expect(within(row).getByRole('button', { name: 'Adicionar' })).toBeInTheDocument();
  });

  it('restores the chosen courses and the switch after the screen remounts', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    await screen.findByRole('heading', { name: 'Meu semestre', level: 2 });
    await user.click(screen.getByRole('radio', { name: 'Eletivas' }));
    const row = screen.getAllByRole('listitem').find((li) => within(li).queryByRole('button', { name: /Adicionar/ }))!;
    await user.click(within(row).getByRole('button', { name: 'Adicionar' }));
    await user.click(screen.getByRole('switch', { name: /Supor aprovação/ }));
    unmount();

    render(<PlanningScreen data={data} analysis={analyze(data)} savedAt={savedAt} />);
    await screen.findByRole('heading', { name: 'Meu semestre', level: 2 });
    expect(screen.getByRole('switch', { name: /Supor aprovação/ })).not.toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Eletivas' }));
    expect(screen.getAllByRole('listitem').some((li) => within(li).queryByRole('button', { name: 'Adicionada' }))).toBe(true);
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
});
