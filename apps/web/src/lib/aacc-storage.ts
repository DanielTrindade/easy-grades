import { del, get, set } from 'idb-keyval';
import { z } from 'zod';
import { db } from './storage';

/** Bump when the stored shape changes; older records are discarded. */
export const AACC_STORAGE_VERSION = 1;
export const AACC_MAX_ITEMS = 100;
const KEY = 'aacc-activities';

export const AACC_TYPES = ['ensino', 'pesquisa', 'extensao', 'evento', 'monitoria', 'outros'] as const;
export type AaccType = (typeof AACC_TYPES)[number];

export const AACC_TYPE_LABELS: Record<AaccType, string> = {
  ensino: 'Ensino',
  pesquisa: 'Pesquisa',
  extensao: 'Extensão',
  evento: 'Evento',
  monitoria: 'Monitoria',
  outros: 'Outros',
};

const HOURS_MESSAGE = 'Informe horas entre 1 e 500.';

/** What the student types: validated before it becomes an activity. */
export const AaccInputSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'Informe a descrição da atividade.')
    .max(120, 'A descrição pode ter até 120 caracteres.'),
  hours: z.number(HOURS_MESSAGE).int(HOURS_MESSAGE).min(1, HOURS_MESSAGE).max(500, HOURS_MESSAGE),
  type: z.enum(AACC_TYPES, 'Escolha o tipo da atividade.'),
});
export type AaccInput = z.infer<typeof AaccInputSchema>;

/** A registered activity as stored; the id is generated when it is added. */
export const AaccActivitySchema = z.object({
  id: z.string().min(1).max(64),
  description: z.string().trim().min(1).max(120),
  hours: z.number().int().min(1).max(500),
  type: z.enum(AACC_TYPES),
});
export type AaccActivity = z.infer<typeof AaccActivitySchema>;

const StoredAaccSchema = z.object({
  version: z.literal(AACC_STORAGE_VERSION),
  items: z.array(AaccActivitySchema).max(AACC_MAX_ITEMS),
});

/** Corrupted or older data is erased and read as an empty list. Storage errors also read as empty. */
export async function loadAaccActivities(): Promise<AaccActivity[]> {
  try {
    const raw = await get<unknown>(KEY, db());
    if (raw === undefined) return [];
    const parsed = StoredAaccSchema.safeParse(raw);
    if (!parsed.success) {
      await del(KEY, db());
      return [];
    }
    return parsed.data.items;
  } catch {
    // Private mode or blocked storage: the list stays empty for this session.
    return [];
  }
}

export async function saveAaccActivities(items: AaccActivity[]): Promise<void> {
  try {
    await set(KEY, { version: AACC_STORAGE_VERSION, items }, db());
  } catch {
    // Storage unavailable: the activities last until the page is closed.
  }
}

export async function clearAaccActivities(): Promise<void> {
  try {
    await del(KEY, db());
  } catch {
    // Nothing to clear.
  }
}

/** Test helper: write an arbitrary value under the activities key. */
export async function writeRawAaccForTests(value: unknown): Promise<void> {
  await set(KEY, value, db());
}
