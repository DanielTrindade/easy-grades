export const MAX_PDF_BYTES = 5 * 1024 * 1024;

export function validatePdf(file: File): string | null {
  const looksLikePdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!looksLikePdf) return 'Esse arquivo não é um PDF.';
  if (file.size > MAX_PDF_BYTES) return 'Arquivo grande demais. O limite é 5 MB.';
  return null;
}
