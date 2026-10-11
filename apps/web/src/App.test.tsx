import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { clearDataset, loadDataset, saveDataset, STORAGE_VERSION, writeRawForTests } from './lib/storage';

describe('App', () => {
  beforeEach(async () => {
    await clearDataset();
    window.location.hash = '';
  });

  it('shows the upload screen when nothing is stored', async () => {
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Ler meus PDFs' })).toBeDisabled();
  });

  it('[RF-3] falls back to the upload screen when stored data is corrupted', async () => {
    await writeRawForTests({ version: STORAGE_VERSION, data: 42 });
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Ler meus PDFs' })).toBeInTheDocument();
  });

  it('opens the dashboard with the stored dataset', async () => {
    await saveDataset({ curriculum: sampleCurriculum, transcript: sampleTranscript });
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: '64,69%' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('7,757')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('aria-current', 'page');
  });

  it('[reveal] plays the waters reveal once per dataset, not again after navigating back', async () => {
    await saveDataset({ curriculum: sampleCurriculum, transcript: sampleTranscript });
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: '64,69%' }, { timeout: 5000 });
    const band = document.querySelector('.waters-band');
    expect(band).toHaveAttribute('data-reveal');
    fireEvent.animationEnd(band!);

    await act(async () => {
      window.location.hash = '/disciplinas';
    });
    await waitFor(() => expect(screen.getByRole('link', { name: 'Disciplinas' })).toHaveAttribute('aria-current', 'page'));

    await act(async () => {
      window.location.hash = '/visao-geral';
    });
    await waitFor(() => expect(document.querySelector('.waters-band')).not.toBeNull());
    expect(document.querySelector('.waters-band')).not.toHaveAttribute('data-reveal');
  });

  it('[clear] confirming "Limpar dados" empties storage and returns to the upload screen', async () => {
    await saveDataset({ curriculum: sampleCurriculum, transcript: sampleTranscript });
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: '64,69%' }, { timeout: 5000 });

    fireEvent.click(screen.getByRole('button', { name: 'Limpar dados' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Limpar dados' }));

    expect(await screen.findByRole('button', { name: 'Ler meus PDFs' })).toBeDisabled();
    expect(await loadDataset()).toBeNull();
  });
});
