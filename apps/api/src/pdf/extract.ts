import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ParseError } from '../errors.js';

export interface TextItem {
  page: number;
  x: number;
  y: number;
  width: number;
  text: string;
}
export interface Row {
  page: number;
  y: number;
  items: TextItem[];
}

export const MAX_PAGES = 20;
const ITEMS_PER_EVENT_LOOP_TURN = 1024;

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function abortReason(signal?: AbortSignal): Error | undefined {
  if (!signal?.aborted) return undefined;
  return signal.reason instanceof Error ? signal.reason : new Error('PDF extraction was aborted');
}

function throwIfAborted(signal?: AbortSignal): void {
  const reason = abortReason(signal);
  if (reason) throw reason;
}

/** Extracts every non-blank text item with its page coordinates. PDF y grows upwards. */
export async function extractItems(data: Uint8Array, signal?: AbortSignal): Promise<TextItem[]> {
  throwIfAborted(signal);
  // pdfjs 6 has no eval-based font path; also disable font faces, system fonts, worker fetches and XFA.
  const task = getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false,
    useWorkerFetch: false,
    enableXfa: false,
    stopAtErrors: true,
    verbosity: 0,
  });
  let destroyPromise: Promise<void> | undefined;
  const destroyTask = (): Promise<void> => (destroyPromise ??= task.destroy());
  const onAbort = (): void => {
    void destroyTask().catch(() => undefined);
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    throwIfAborted(signal);
    const doc = await task.promise;
    throwIfAborted(signal);
    if (doc.numPages > MAX_PAGES) throw new ParseError('TOO_MANY_PAGES');
    const items: TextItem[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      throwIfAborted(signal);
      const page = await doc.getPage(p);
      try {
        throwIfAborted(signal);
        const content = await page.getTextContent();
        throwIfAborted(signal);
        let itemsUntilYield = 0;
        for (const raw of content.items) {
          if (itemsUntilYield === ITEMS_PER_EVENT_LOOP_TURN) {
            itemsUntilYield = 0;
            await yieldToEventLoop();
            throwIfAborted(signal);
          }
          itemsUntilYield++;
          if (!('str' in raw)) continue;
          const text = raw.str.replace(/\s+/g, ' ').trim();
          if (!text) continue;
          items.push({ page: p, x: raw.transform[4] ?? 0, y: raw.transform[5] ?? 0, width: raw.width, text });
        }
      } finally {
        page.cleanup();
      }
    }
    await yieldToEventLoop();
    throwIfAborted(signal);
    return items;
  } catch (err) {
    const reason = abortReason(signal);
    if (reason) throw reason;
    if (err instanceof ParseError) throw err;
    throw new ParseError('INVALID_PDF');
  } finally {
    signal?.removeEventListener('abort', onAbort);
    await destroyTask();
  }
}

/** Groups items into visual rows: same page, y within `tolerance` of the row's first (highest) item. */
export function groupRows(items: readonly TextItem[], tolerance = 1): Row[] {
  const sorted = [...items].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  const rows: Row[] = [];
  for (const item of sorted) {
    const last = rows.at(-1);
    if (last && last.page === item.page && last.y - item.y <= tolerance) last.items.push(item);
    else rows.push({ page: item.page, y: item.y, items: [item] });
  }
  for (const row of rows) row.items.sort((a, b) => a.x - b.x);
  return rows;
}

export const rowText = (row: Row): string => row.items.map((i) => i.text).join(' ');

/** Text of the closest item to the right of `label`, on the same visual line. */
export function valueRightOf(items: readonly TextItem[], label: string): string | null {
  const anchor = items.find((i) => i.text === label);
  if (!anchor) return null;
  const candidates = items.filter(
    (i) => i.page === anchor.page && Math.abs(i.y - anchor.y) <= 1.5 && i.x >= anchor.x + anchor.width - 1 && i !== anchor,
  );
  candidates.sort((a, b) => a.x - b.x);
  return candidates[0]?.text ?? null;
}

/** Text of the first item inside an x window, aligned (dy range) with `label`. */
export function valueNear(
  items: readonly TextItem[],
  anchor: TextItem,
  xMin: number,
  xMax: number,
  dyMin = -1.5,
  dyMax = 1.5,
): string | null {
  const hit = items.find(
    (i) => i.page === anchor.page && i.x >= xMin && i.x <= xMax && i.y - anchor.y >= dyMin && i.y - anchor.y <= dyMax && /\d/.test(i.text),
  );
  return hit?.text ?? null;
}
