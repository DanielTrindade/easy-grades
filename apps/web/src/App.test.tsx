import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { clearAaccActivities, loadAaccActivities, saveAaccActivities } from './lib/aacc-storage';
import { clearDataset, loadDataset, saveDataset, STORAGE_VERSION, writeRawForTests } from './lib/storage';

// Lets a test make the flowchart throw on render, to exercise its error boundary.
const flowchart = vi.hoisted(() => ({ broken: false }));
vi.mock('@/features/flowchart/FlowchartScreen', () => ({
  default: () => {
    if (flowchart.broken) throw new Error('flowchart boom');
    return <p>Fluxograma de teste</p>;
  },
}));

describe('App', () => {
  beforeEach(async () => {
    await clearDataset();
    await clearAaccActivities();
    flowchart.broken = false;
    window.location.hash = '';
  });

  it('shows the upload screen when nothing is stored', async () => {
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Ler meus PDFs' }, { timeout: 10000 })).toBeDisabled();
  });

  it('[RF-3] falls back to the upload screen when stored data is corrupted', async () => {
    await writeRawForTests({ version: STORAGE_VERSION, data: 42 });
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Ler meus PDFs' })).toBeInTheDocument();
  });

  it('opens the dashboard with the stored dataset', async () => {
    await saveDataset({ curriculum: sampleCurriculum, transcript: sampleTranscript });
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: '64,69%' }, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByText('7,757')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('aria-current', 'page');
  });

  it('[reveal] plays the marker reveal once per dataset, not again after navigating back', async () => {
    await saveDataset({ curriculum: sampleCurriculum, transcript: sampleTranscript });
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: '64,69%' }, { timeout: 10000 });
    const band = document.querySelector('.marker-band');
    expect(band).toHaveAttribute('data-reveal');
    fireEvent.animationEnd(band!);

    await act(async () => {
      window.location.hash = '/disciplinas';
    });
    await waitFor(() => expect(screen.getByRole('link', { name: 'Disciplinas' })).toHaveAttribute('aria-current', 'page'));

    await act(async () => {
      window.location.hash = '/visao-geral';
    });
    await waitFor(() => expect(document.querySelector('.marker-band')).not.toBeNull());
    expect(document.querySelector('.marker-band')).not.toHaveAttribute('data-reveal');
  });

  it('[clear] confirming "Limpar dados" empties storage and returns to the upload screen', async () => {
    await saveDataset({ curriculum: sampleCurriculum, transcript: sampleTranscript });
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: '64,69%' }, { timeout: 10000 });

    fireEvent.click(screen.getByRole('button', { name: 'Limpar dados' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Limpar dados' }));

    expect(await screen.findByRole('button', { name: 'Ler meus PDFs' }, { timeout: 10000 })).toBeDisabled();
    expect(await loadDataset()).toBeNull();
  });

  it('[clear] the dialog warns that registered activities are erased too, and confirming removes them', async () => {
    await saveDataset({ curriculum: sampleCurriculum, transcript: sampleTranscript });
    await saveAaccActivities([{ id: 'a1', description: 'Monitoria de cálculo', hours: 20, type: 'monitoria' }]);
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: '64,69%' }, { timeout: 10000 });

    fireEvent.click(screen.getByRole('button', { name: 'Limpar dados' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(
      within(dialog).getByText(
        'O currículo, o histórico, as atividades complementares e o planejamento serão apagados deste navegador. Você pode enviar os PDFs de novo quando quiser.',
      ),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Limpar dados' }));

    expect(await screen.findByRole('button', { name: 'Ler meus PDFs' }, { timeout: 10000 })).toBeDisabled();
    await waitFor(async () => expect(await loadAaccActivities()).toEqual([]));
  });

  it('[reset] "Limpar dados e recomeçar" after a flowchart crash keeps the registered activities', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await saveDataset({ curriculum: sampleCurriculum, transcript: sampleTranscript });
    await saveAaccActivities([{ id: 'a1', description: 'Monitoria de cálculo', hours: 20, type: 'monitoria' }]);
    flowchart.broken = true;
    window.location.hash = '/fluxograma';
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Limpar dados e recomeçar' }, { timeout: 10000 }));

    await waitFor(async () => expect(await loadDataset()).toBeNull());
    expect(await loadAaccActivities()).toEqual([
      { id: 'a1', description: 'Monitoria de cálculo', hours: 20, type: 'monitoria' },
    ]);
  });
});
