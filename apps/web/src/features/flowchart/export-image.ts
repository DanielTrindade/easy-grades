export const EXPORT_FILE_NAME = 'fluxograma.png';

export function imageFile(blob: Blob): File {
  return new File([blob], EXPORT_FILE_NAME, { type: 'image/png' });
}

/**
 * Whether the browser can hand the image to the system share sheet. That is the only way to save it on iOS: an
 * installed PWA has no downloads UI, and a plain `<a download>` silently does nothing there.
 */
export function canShareImage(blob: Blob): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [imageFile(blob)] });
}

/** Hands the blob to the browser's download. The object URL lives until the download has read it. */
export function downloadImage(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = EXPORT_FILE_NAME;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
