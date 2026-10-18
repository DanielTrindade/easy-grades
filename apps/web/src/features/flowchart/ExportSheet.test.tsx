import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportSheet, type ExportImage } from './ExportSheet';

const image: ExportImage = { url: 'blob:fluxograma', blob: new Blob(['png'], { type: 'image/png' }) };

function stubShareSheet(canShare = true) {
  const share = vi.fn(async (_data: ShareData) => {});
  Object.defineProperty(navigator, 'canShare', { value: () => canShare, configurable: true });
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  return share;
}

beforeEach(() => {
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'canShare');
  Reflect.deleteProperty(navigator, 'share');
});

describe('ExportSheet', () => {
  it('shows the image in a content-fit medium sheet capped at half the visible height', () => {
    stubShareSheet();
    render(<ExportSheet image={image} onClose={() => {}} />);

    const sheet = screen.getByRole('dialog', { name: 'Fluxograma pronto' });
    expect(sheet).toHaveAttribute('data-detent', 'medium');
    expect(sheet.style.maxHeight).toBe('400px');
    expect(sheet.style.height).toBe('');
    expect(screen.getByAltText('Fluxograma do curso')).toBeInTheDocument();
  });

  it('keeps the decorative grabber instead of an expand control', () => {
    stubShareSheet();
    render(<ExportSheet image={image} onClose={() => {}} />);

    expect(screen.queryByRole('button', { name: /Expandir|Reduzir/ })).not.toBeInTheDocument();
    expect(document.querySelector('[data-sheet-grabber]')).toBeNull();
  });

  it('keeps a single Fechar in the header with a 44 px target', () => {
    stubShareSheet();
    render(<ExportSheet image={image} onClose={() => {}} />);

    const close = screen.getAllByRole('button', { name: 'Fechar' });
    expect(close).toHaveLength(1);
    expect(close[0]!.closest('[data-sheet-handle]')).not.toBeNull();
    expect(close[0]!.className).toContain('h-11');
  });

  it('paints the image on an opaque hairline surface', () => {
    stubShareSheet();
    render(<ExportSheet image={image} onClose={() => {}} />);

    const img = screen.getByAltText('Fluxograma do curso');
    expect(img.className).toEqual(expect.stringContaining('rounded-group'));
    expect(img.className).toEqual(expect.stringContaining('border-hairline'));
    expect(img.className).toEqual(expect.stringContaining('bg-surface'));
  });

  it('closes from the header Fechar', async () => {
    stubShareSheet();
    const onClose = vi.fn();
    render(<ExportSheet image={image} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('renders no sheet while there is no image', () => {
    render(<ExportSheet image={null} onClose={() => {}} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
