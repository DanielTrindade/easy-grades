import { ParseResponseSchema, type ParseResponse } from '@easy-grades/core';
import { createStore, del, get, set, type UseStore } from 'idb-keyval';

/** Bump when the stored shape changes; older records are discarded. */
export const STORAGE_VERSION = 1;
const KEY = 'dataset';

interface StoredDataset {
  version: number;
  savedAt: string;
  revealed: boolean;
  data: ParseResponse;
}

export interface Dataset {
  data: ParseResponse;
  savedAt: string;
  /** Whether the first-visit reveal animation already played for this dataset. */
  revealed: boolean;
}

let store: UseStore | undefined;
const db = (): UseStore => (store ??= createStore('easy-grades', 'kv'));

export async function loadDataset(): Promise<Dataset | null> {
  try {
    const raw = await get<Partial<StoredDataset>>(KEY, db());
    if (!raw) return null;
    const parsed = ParseResponseSchema.safeParse(raw.data);
    if (raw.version !== STORAGE_VERSION || !parsed.success) {
      await del(KEY, db());
      return null;
    }
    return { data: parsed.data, savedAt: String(raw.savedAt ?? ''), revealed: raw.revealed === true };
  } catch {
    // Private mode or blocked storage: behave as if nothing was saved.
    return null;
  }
}

export async function saveDataset(data: ParseResponse): Promise<Dataset> {
  const record: StoredDataset = { version: STORAGE_VERSION, savedAt: new Date().toISOString(), revealed: false, data };
  try {
    await set(KEY, record, db());
  } catch {
    // Storage unavailable: the dashboard still works for this session.
  }
  return { data, savedAt: record.savedAt, revealed: false };
}

export async function markRevealed(): Promise<void> {
  try {
    const raw = await get<StoredDataset>(KEY, db());
    if (raw) await set(KEY, { ...raw, revealed: true }, db());
  } catch {
    // Non-critical.
  }
}

export async function clearDataset(): Promise<void> {
  try {
    await del(KEY, db());
  } catch {
    // Nothing to clear.
  }
}

/** Test helper: write an arbitrary value under the dataset key. */
export async function writeRawForTests(value: unknown): Promise<void> {
  await set(KEY, value, db());
}
