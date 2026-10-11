import { PDFDocument, StandardFonts } from 'pdf-lib';

export interface Cell {
  x: number;
  y: number;
  text: string;
}

/** Builds an A4 PDF where every cell is drawn as its own text run at (x, y), like e-Campus reports. */
export async function buildPdf(pages: Cell[][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const cells of pages) {
    const page = doc.addPage([595, 842]);
    for (const cell of cells) page.drawText(cell.text, { x: cell.x, y: cell.y, size: 7, font });
  }
  return doc.save();
}
