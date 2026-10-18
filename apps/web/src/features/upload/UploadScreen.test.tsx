import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, uploadDocuments } from '@/lib/api';
import { UploadScreen } from './UploadScreen';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  uploadDocuments: vi.fn(),
}));

const uploadDocumentsMock = vi.mocked(uploadDocuments);

const OFFLINE_MESSAGE = 'Você está offline. Para ler novos PDFs, conecte-se. Seus dados já salvos continuam disponíveis.';

function pdfFile(name: string) {
  return new File(['%PDF-1.7'], name, { type: 'application/pdf' });
}

function setOnLine(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
}

afterEach(() => {
  setOnLine(true);
});

describe('UploadScreen offline', () => {
  it('explains that new PDFs need a connection and disables reading them', () => {
    setOnLine(false);
    render(<UploadScreen onParsed={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent(OFFLINE_MESSAGE);
    expect(screen.getByRole('status')).toHaveClass('rounded-card', 'p-4');
    expect(screen.getByRole('button', { name: 'Ler meus PDFs' })).toBeDisabled();
  });

  it('shows no notice while online', () => {
    setOnLine(true);
    render(<UploadScreen onParsed={vi.fn()} />);
    expect(screen.queryByText(OFFLINE_MESSAGE)).not.toBeInTheDocument();
  });

  it('keeps one live region in the DOM and fills it in, so screen readers announce the change', () => {
    setOnLine(true);
    render(<UploadScreen onParsed={vi.fn()} />);
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();

    setOnLine(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent(OFFLINE_MESSAGE);
  });

  it('updates when the connection drops and returns', () => {
    setOnLine(true);
    render(<UploadScreen onParsed={vi.fn()} />);
    setOnLine(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent(OFFLINE_MESSAGE);
    setOnLine(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByText(OFFLINE_MESSAGE)).not.toBeInTheDocument();
  });
});

describe('UploadScreen form', () => {
  beforeEach(() => {
    uploadDocumentsMock.mockReset();
  });

  it('makes Ler meus PDFs the accent capsule and keeps it disabled without both files', () => {
    setOnLine(true);
    render(<UploadScreen onParsed={vi.fn()} />);
    const submit = screen.getByRole('button', { name: 'Ler meus PDFs' });
    expect(submit).toHaveClass('bg-pen', 'rounded-full');
    expect(submit).toBeDisabled();
  });

  it('reads both PDFs and hands the parsed data over', async () => {
    setOnLine(true);
    const onParsed = vi.fn().mockResolvedValue(undefined);
    uploadDocumentsMock.mockResolvedValueOnce({ curriculum: sampleCurriculum, transcript: sampleTranscript });
    const user = userEvent.setup();
    render(<UploadScreen onParsed={onParsed} />);
    await user.upload(screen.getByLabelText(/Currículo do curso/), pdfFile('curriculo.pdf'));
    await user.upload(screen.getByLabelText(/Histórico escolar/), pdfFile('historico.pdf'));
    const submit = screen.getByRole('button', { name: 'Ler meus PDFs' });
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(onParsed).toHaveBeenCalledTimes(1);
  });

  it('keeps a failed read visible as an alert card', async () => {
    setOnLine(true);
    uploadDocumentsMock.mockRejectedValueOnce(new ApiError('INTERNAL'));
    const user = userEvent.setup();
    render(<UploadScreen onParsed={vi.fn()} />);
    await user.upload(screen.getByLabelText(/Currículo do curso/), pdfFile('curriculo.pdf'));
    await user.upload(screen.getByLabelText(/Histórico escolar/), pdfFile('historico.pdf'));
    await user.click(screen.getByRole('button', { name: 'Ler meus PDFs' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveClass('rounded-card', 'p-4');
    expect(screen.getByRole('button', { name: 'Ler meus PDFs' })).toBeEnabled();
  });
});
