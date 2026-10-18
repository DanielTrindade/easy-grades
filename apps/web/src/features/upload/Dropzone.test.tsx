import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dropzone } from './Dropzone';
import { MAX_PDF_BYTES, validatePdf } from './validate-pdf';

describe('validatePdf', () => {
  it('accepts PDFs up to 5 MB', () => {
    expect(validatePdf(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toBeNull();
    expect(validatePdf(new File(['x'], 'a.txt', { type: 'text/plain' }))).toBe('Esse arquivo não é um PDF.');
    const big = new File([new Uint8Array(MAX_PDF_BYTES + 1)], 'a.pdf', { type: 'application/pdf' });
    expect(validatePdf(big)).toBe('Arquivo grande demais. O limite é 5 MB.');
  });
});

describe('Dropzone', () => {
  it('passes a valid PDF to onFile', async () => {
    const onFile = vi.fn();
    render(<Dropzone id="curriculo" label="Currículo do curso" documentName="Currículo de Curso" file={null} onFile={onFile} />);
    const file = new File(['%PDF-1.7'], 'curriculo.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText(/Currículo do curso/), file);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('explains why a file was rejected', async () => {
    const onFile = vi.fn();
    render(<Dropzone id="historico" label="Histórico escolar" documentName="Histórico" file={null} onFile={onFile} />);
    await userEvent.upload(screen.getByLabelText(/Histórico escolar/), new File(['x'], 'foto.png', { type: 'image/png' }), {
      applyAccept: false,
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Esse arquivo não é um PDF.');
    expect(onFile).toHaveBeenCalledWith(null);
  });

  it('is a large opaque card', () => {
    render(
      <Dropzone id="curriculo" label="Currículo do curso" documentName="Currículo de Curso" file={null} onFile={vi.fn()} />,
    );
    expect(screen.getByText('Currículo do curso').closest('label')).toHaveClass('rounded-card', 'bg-surface');
  });

  it('marks a chosen file in pen blue with a check icon and the file name', () => {
    const file = new File(['%PDF-1.7'], 'curriculo.pdf', { type: 'application/pdf' });
    render(
      <Dropzone id="curriculo" label="Currículo do curso" documentName="Currículo de Curso" file={file} onFile={vi.fn()} />,
    );
    const label = screen.getByText('curriculo.pdf').closest('label')!;
    expect(label).toHaveAttribute('data-filled');
    expect(label.querySelector('svg')).toHaveClass('text-pen');
  });

  it('clears the input after a pick so the same file can be chosen again', async () => {
    render(<Dropzone id="curriculo" label="Currículo do curso" documentName="Currículo de Curso" file={null} onFile={vi.fn()} />);
    const input = screen.getByLabelText(/Currículo do curso/) as HTMLInputElement;
    await userEvent.upload(input, new File(['%PDF-1.7'], 'curriculo.pdf', { type: 'application/pdf' }));
    expect(input.value).toBe('');
  });
});
