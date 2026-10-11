import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParseError } from '../src/errors';
import { extractItems } from '../src/pdf/extract';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({ getDocument: vi.fn() }));

const getDocumentMock = vi.mocked(getDocument);
const extractCancellable = extractItems as unknown as (data: Uint8Array, signal: AbortSignal) => Promise<unknown>;

beforeEach(() => {
  getDocumentMock.mockReset();
});

describe('extractItems cancellation', () => {
  it('destroys a loading task and settles with the abort reason', async () => {
    let resolveLoad!: (document: { numPages: number; getPage: () => Promise<never> }) => void;
    const document = { numPages: 1, getPage: vi.fn() };
    let destructionFinished = false;
    const task = {
      promise: new Promise((resolve) => {
        resolveLoad = resolve;
      }),
      destroy: vi.fn(async () => {
        destructionFinished = true;
        resolveLoad(document);
      }),
    };
    getDocumentMock.mockReturnValue(task as unknown as ReturnType<typeof getDocument>);

    const controller = new AbortController();
    setTimeout(() => resolveLoad(document), 10);
    const operation = extractCancellable(new Uint8Array([37, 80, 68, 70, 45, 49]), controller.signal);
    controller.abort(new ParseError('PARSE_TIMEOUT'));

    await expect(operation).rejects.toMatchObject({ code: 'PARSE_TIMEOUT' });
    expect(task.destroy).toHaveBeenCalledTimes(1);
    expect(destructionFinished).toBe(true);
  });

  it('destroys the loading task after page extraction fails', async () => {
    const page = {
      getTextContent: vi.fn(async () => {
        throw new Error('synthetic failure');
      }),
      cleanup: vi.fn(),
    };
    const task = {
      promise: Promise.resolve({ numPages: 1, getPage: vi.fn(async () => page) }),
      destroy: vi.fn(async () => undefined),
    };
    getDocumentMock.mockReturnValue(task as unknown as ReturnType<typeof getDocument>);

    await expect(extractItems(new Uint8Array([37, 80, 68, 70, 45, 49]))).rejects.toMatchObject({ code: 'INVALID_PDF' });
    expect(page.cleanup).toHaveBeenCalledTimes(1);
    expect(task.destroy).toHaveBeenCalledTimes(1);
  });
});
