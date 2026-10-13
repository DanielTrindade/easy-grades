import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAaccActivities } from '@/lib/aacc-storage';
import { useAaccActivities } from '@/lib/use-aacc-activities';
import { AaccCard } from './AaccCard';

// Radix Select scrolls the highlighted option into view; jsdom has no layout to scroll.
Element.prototype.scrollIntoView ??= () => {};

/** Wires the card to the real hook and IndexedDB, as OverviewScreen does. */
function Harness({ officialHours = 0 }: { officialHours?: number }) {
  const { items, add, remove, loading } = useAaccActivities();
  const registered = items.reduce((sum, item) => sum + item.hours, 0);
  return (
    <AaccCard
      officialHours={officialHours}
      requiredHours={150}
      countedHours={registered}
      activities={items}
      loading={loading}
      onAdd={add}
      onRemove={remove}
    />
  );
}

async function register(user: ReturnType<typeof userEvent.setup>, description: string, hours: string) {
  await user.type(screen.getByLabelText('Descrição'), description);
  await user.clear(screen.getByLabelText('Horas'));
  await user.type(screen.getByLabelText('Horas'), hours);
  await user.click(screen.getByRole('button', { name: 'Registrar atividade' }));
}

describe('AaccCard', () => {
  beforeEach(async () => {
    await clearAaccActivities();
  });

  it('registers an activity, lists it and adds it to the pending total', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Harness />);
    await waitFor(() => expect(screen.getByText('Nenhuma atividade registrada ainda.')).toBeInTheDocument());

    await register(user, 'Monitoria de cálculo', '30');
    expect(screen.getByRole('listitem')).toHaveTextContent('Monitoria de cálculo');
    expect(screen.getByText('Registradas por você: 30 h (pendentes)')).toBeInTheDocument();

    await register(user, 'Semana de tecnologia', '12');
    expect(screen.getByText('Registradas por você: 42 h (pendentes)')).toBeInTheDocument();
    expect(screen.getByLabelText('Descrição')).toHaveValue('');
    // Two full registrations take longer than the default timeout when the whole suite runs in parallel.
  }, 15_000);

  it('wraps a long activity description instead of cutting it off', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Harness />);
    const long = 'Participação no projeto de extensão sobre práticas sustentáveis em comunidades ribeirinhas';
    await register(user, long, '20');

    const description = screen.getByText(long);
    expect(description).toHaveClass('break-words');
    expect(description).not.toHaveClass('truncate');
    // Registering takes longer than the default timeout when the whole suite runs in parallel.
  }, 15_000);

  it('removes an activity from the list and from the pending total', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Harness />);
    await register(user, 'Monitoria de cálculo', '30');

    await user.click(screen.getByRole('button', { name: 'Remover Monitoria de cálculo' }));
    expect(screen.queryByText('Monitoria de cálculo')).not.toBeInTheDocument();
    expect(screen.getByText('Registradas por você: 0 h (pendentes)')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma atividade registrada ainda.')).toBeInTheDocument();
  });

  it('keeps the activities after the card remounts', async () => {
    const user = userEvent.setup({ delay: null });
    const { unmount } = render(<Harness />);
    await register(user, 'Extensão rural', '20');
    unmount();

    render(<Harness />);
    expect(await screen.findByText('Extensão rural')).toBeInTheDocument();
    expect(screen.getByText('Registradas por você: 20 h (pendentes)')).toBeInTheDocument();
  });

  it('rejects hours outside 1 to 500 and registers nothing', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Harness />);
    await waitFor(() => expect(screen.getByText('Nenhuma atividade registrada ainda.')).toBeInTheDocument());

    await register(user, 'Atividade sem horas', '0');
    expect(screen.getByRole('alert')).toHaveTextContent('Informe horas entre 1 e 500.');
    expect(screen.getByText('Nenhuma atividade registrada ainda.')).toBeInTheDocument();

    await register(user, 'Atividade longa demais', '501');
    expect(screen.getByRole('alert')).toHaveTextContent('Informe horas entre 1 e 500.');
    expect(screen.queryByText('Atividade longa demais')).not.toBeInTheDocument();
  });

  it('asks for a description', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Harness />);
    await waitFor(() => expect(screen.getByText('Nenhuma atividade registrada ainda.')).toBeInTheDocument());

    await user.clear(screen.getByLabelText('Horas'));
    await user.type(screen.getByLabelText('Horas'), '5');
    await user.click(screen.getByRole('button', { name: 'Registrar atividade' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe a descrição da atividade.');
  });

  it('saves the chosen type with the activity', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Harness />);
    await waitFor(() => expect(screen.getByText('Nenhuma atividade registrada ainda.')).toBeInTheDocument());

    // Keyboard only: Radix Select needs pointer-capture APIs that jsdom does not have.
    screen.getByLabelText('Tipo').focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('listbox');
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Pesquisa' })).toHaveFocus());
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(screen.getByLabelText('Tipo')).toHaveTextContent('Pesquisa');
    await register(user, 'Iniciação científica', '40');
    expect(within(screen.getByRole('listitem')).getByText('Pesquisa')).toBeInTheDocument();
  });

  it('warns about double counting when the history already has AACC hours', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Harness officialHours={40} />);
    await waitFor(() => expect(screen.getByText('Nenhuma atividade registrada ainda.')).toBeInTheDocument());
    expect(screen.queryByText(/já tem/)).not.toBeInTheDocument();

    await register(user, 'Evento de física', '10');
    expect(
      screen.getByText(
        'O histórico já tem 40 h lançadas. Confira se alguma atividade registrada aqui já foi lançada e remova-a para não contar duas vezes.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the official hours next to the pending ones', async () => {
    render(<Harness officialHours={40} />);
    expect(await screen.findByText('Oficial no histórico: 40 h de 150 h')).toBeInTheDocument();
  });

  it('is not interactive while the stored activities are still loading', () => {
    render(
      <AaccCard
        officialHours={0}
        requiredHours={150}
        countedHours={0}
        activities={[]}
        loading
        onAdd={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Registrar atividade' })).toBeDisabled();
  });
});
