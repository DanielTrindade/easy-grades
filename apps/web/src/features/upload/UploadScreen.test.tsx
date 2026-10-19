import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fetchCourseVersions, fetchCourses, uploadDocuments, uploadTranscript } from '@/lib/api';
import { UploadScreen } from './UploadScreen';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchCourses: vi.fn(),
  fetchCourseVersions: vi.fn(),
  uploadDocuments: vi.fn(),
  uploadTranscript: vi.fn(),
}));

const uploadDocumentsMock = vi.mocked(uploadDocuments);
const uploadTranscriptMock = vi.mocked(uploadTranscript);
const fetchCoursesMock = vi.mocked(fetchCourses);
const fetchCourseVersionsMock = vi.mocked(fetchCourseVersions);

const OFFLINE_MESSAGE = 'Você está offline. Para ler novos PDFs, conecte-se. Seus dados já salvos continuam disponíveis.';

const COURSES = [
  { id: 2663, code: 'IE17', name: 'Engenharia de Software' },
  { id: 72, code: 'FA01', name: 'Administração' },
];
const VERSIONS = [{ id: 11572, version: '2025/2', situation: 'corrente' }];

function pdfFile(name: string) {
  return new File(['%PDF-1.7'], name, { type: 'application/pdf' });
}

function setOnLine(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
}

beforeEach(() => {
  setOnLine(true);
  fetchCoursesMock.mockReset().mockResolvedValue(COURSES);
  fetchCourseVersionsMock.mockReset().mockResolvedValue(VERSIONS);
  uploadDocumentsMock.mockReset();
  uploadTranscriptMock.mockReset();
});

afterEach(() => {
  setOnLine(true);
});

describe('UploadScreen offline', () => {
  it('explains that new PDFs need a connection and disables reading them', () => {
    setOnLine(false);
    render(<UploadScreen onParsed={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent(OFFLINE_MESSAGE);
    expect(screen.getByRole('status')).toHaveClass('rounded-card', 'p-4');
    expect(screen.getByRole('button', { name: 'Ler meu histórico' })).toBeDisabled();
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

describe('UploadScreen with the published curriculum', () => {
  it('lists the courses the e-Campus publishes', async () => {
    const user = userEvent.setup();
    render(<UploadScreen onParsed={vi.fn()} />);
    expect(await screen.findByRole('button', { name: /Engenharia de Software/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Administração/ })).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar curso' }), 'administ');
    await waitFor(() => expect(screen.queryByRole('button', { name: /Engenharia de Software/ })).not.toBeInTheDocument());
  });

  it('reads only the transcript once a course and a version are picked', async () => {
    const onParsed = vi.fn().mockResolvedValue(undefined);
    uploadTranscriptMock.mockResolvedValueOnce({ curriculum: sampleCurriculum, transcript: sampleTranscript });
    const user = userEvent.setup();
    render(<UploadScreen onParsed={onParsed} />);

    await user.click(await screen.findByRole('button', { name: /Engenharia de Software/ }));
    await waitFor(() => expect(fetchCourseVersionsMock).toHaveBeenCalledWith(2663));
    await user.upload(screen.getByLabelText(/Histórico escolar/), pdfFile('historico.pdf'));

    const submit = screen.getByRole('button', { name: 'Ler meu histórico' });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    expect(uploadTranscriptMock).toHaveBeenCalledWith(expect.any(File), 2663, 11572);
    expect(uploadDocumentsMock).not.toHaveBeenCalled();
    expect(onParsed).toHaveBeenCalledTimes(1);
  });

  it('keeps a failed read visible as an alert card', async () => {
    uploadTranscriptMock.mockRejectedValueOnce(new ApiError('INTERNAL'));
    const user = userEvent.setup();
    render(<UploadScreen onParsed={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: /Engenharia de Software/ }));
    await user.upload(screen.getByLabelText(/Histórico escolar/), pdfFile('historico.pdf'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ler meu histórico' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Ler meu histórico' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveClass('rounded-card', 'p-4');
  });

  it('reports a version mismatch the way the server explains it', async () => {
    uploadTranscriptMock.mockRejectedValueOnce(new ApiError('CURRICULUM_MISMATCH'));
    const user = userEvent.setup();
    render(<UploadScreen onParsed={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: /Engenharia de Software/ }));
    await user.upload(screen.getByLabelText(/Histórico escolar/), pdfFile('historico.pdf'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ler meu histórico' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Ler meu histórico' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/diferentes/i);
  });
});

describe('UploadScreen with both PDFs', () => {
  it('falls back to reading the two documents the student uploaded', async () => {
    const onParsed = vi.fn().mockResolvedValue(undefined);
    uploadDocumentsMock.mockResolvedValueOnce({ curriculum: sampleCurriculum, transcript: sampleTranscript });
    const user = userEvent.setup();
    render(<UploadScreen onParsed={onParsed} />);

    await user.click(await screen.findByRole('button', { name: 'Prefiro enviar os dois PDFs' }));
    await user.upload(screen.getByLabelText(/Currículo do curso/), pdfFile('curriculo.pdf'));
    await user.upload(screen.getByLabelText(/Histórico escolar/), pdfFile('historico.pdf'));

    const submit = screen.getByRole('button', { name: 'Ler meus PDFs' });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    expect(uploadDocumentsMock).toHaveBeenCalledTimes(1);
    expect(uploadTranscriptMock).not.toHaveBeenCalled();
    expect(onParsed).toHaveBeenCalledTimes(1);
  });

  it('makes Ler meus PDFs the accent capsule and keeps it disabled without both files', async () => {
    const user = userEvent.setup();
    render(<UploadScreen onParsed={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Prefiro enviar os dois PDFs' }));
    const submit = screen.getByRole('button', { name: 'Ler meus PDFs' });
    expect(submit).toHaveClass('bg-pen', 'rounded-full');
    expect(submit).toBeDisabled();
  });
});
