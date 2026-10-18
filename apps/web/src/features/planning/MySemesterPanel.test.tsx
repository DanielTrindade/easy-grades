import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MySemesterPanel, type ChosenCourse, type MySemesterPanelProps } from './MySemesterPanel';

const chosen: ChosenCourse[] = [
  { code: 'DCC101', name: 'PROGRAMAÇÃO PARA WEB II', credits: 4, grade: 7, pending: false },
  { code: 'DCC102', name: 'BANCO DE DADOS', credits: 4, grade: 8, pending: false },
];

function renderPanel(overrides: Partial<MySemesterPanelProps> = {}) {
  const props: MySemesterPanelProps = {
    chosen,
    credits: 8,
    minCredits: 12,
    maxCredits: 30,
    inProgress: [],
    currentCr: 7.5,
    projected: 7.7,
    scenarios: { best: 8, worst: 7.2 },
    history: [],
    projectedTerm: null,
    onGradeChange: vi.fn(),
    onRemove: vi.fn(),
    onUseSuggestion: vi.fn(),
    ...overrides,
  };
  render(<MySemesterPanel {...props} />);
  return props;
}

describe('MySemesterPanel', () => {
  it('names each Remover button after its discipline', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: 'Remover Programação para Web II do semestre' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remover Banco de Dados do semestre' })).toBeInTheDocument();
  });

  it('keeps "Usar sugestão" at 44 px below md, like the other touch targets of the panel', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: 'Usar sugestão' })).toHaveClass('max-md:h-11');
  });

  it('makes Usar sugestão the screen accent action', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: 'Usar sugestão' })).toHaveClass('bg-pen', 'text-pen-foreground');
  });

  it('removes the course whose Remover button was pressed', async () => {
    const user = userEvent.setup({ delay: null });
    const { onRemove } = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Remover Banco de Dados do semestre' }));
    expect(onRemove).toHaveBeenCalledWith('DCC102');
  });
});
