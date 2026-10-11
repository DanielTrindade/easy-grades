import { describe, expect, it } from 'vitest';
import { ParseError } from '../src/errors';
import { extractItems, groupRows, rowText, valueRightOf } from '../src/pdf/extract';
import { buildPdf } from './fixtures/build-pdf';

describe('extractItems', () => {
  it('returns non-blank text items with coordinates', async () => {
    const pdf = await buildPdf([[{ x: 75, y: 414.7, text: 'ICC001' }, { x: 118, y: 414.7, text: 'INTRODUÇÃO À COMPUTAÇÃO' }]]);
    const items = await extractItems(pdf);
    expect(items.map((i) => i.text)).toEqual(['ICC001', 'INTRODUÇÃO À COMPUTAÇÃO']);
    expect(items[0]).toMatchObject({ page: 1, x: 75, y: 414.7 });
    expect(items[0]!.width).toBeGreaterThan(0);
  });

  it('rejects bytes that are not a PDF', async () => {
    await expect(extractItems(new TextEncoder().encode('%PDF-1.7 garbage'))).rejects.toMatchObject({ code: 'INVALID_PDF' });
  });

  it('rejects documents with more than 20 pages', async () => {
    const pdf = await buildPdf(Array.from({ length: 21 }, () => [{ x: 10, y: 10, text: 'x' }]));
    const error = await extractItems(pdf).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ParseError);
    expect((error as ParseError).code).toBe('TOO_MANY_PAGES');
  });
});

describe('groupRows / valueRightOf', () => {
  const items = [
    { page: 1, x: 512, y: 636.5, width: 20, text: 'ICC001' },
    { page: 1, x: 74.9, y: 634.73, width: 20, text: 'ICC606' },
    { page: 1, x: 487, y: 634.23, width: 9, text: '90' },
    { page: 1, x: 21, y: 730.7, width: 20, text: 'Curso:' },
    { page: 1, x: 66, y: 730.7, width: 90, text: 'IE17 - Engenharia de Software' },
    { page: 1, x: 454, y: 730.7, width: 20, text: 'Versão:' },
  ];

  it('merges items within 1pt and separates a prerequisite printed 1.8pt above', () => {
    const rows = groupRows(items);
    expect(rows.map(rowText)).toEqual(['Curso: IE17 - Engenharia de Software Versão:', 'ICC001', 'ICC606 90']);
  });

  it('reads the closest value to the right of a label', () => {
    expect(valueRightOf(items, 'Curso:')).toBe('IE17 - Engenharia de Software');
    expect(valueRightOf(items, 'Inexistente:')).toBeNull();
  });
});
