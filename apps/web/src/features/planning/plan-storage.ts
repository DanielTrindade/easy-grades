import { del, get, set } from 'idb-keyval';
import { z } from 'zod';
import { db } from '@/lib/storage';
import type { PlanningState } from './planning-state';

/** Bump when the stored shape changes; older records are ignored. */
export const PLAN_STORAGE_VERSION = 1;
const KEY = 'planning-plan';

const GradesSchema = z.record(z.string().min(1).max(12), z.number().min(0).max(10));
const StoredPlanSchema = z.object({
  version: z.literal(PLAN_STORAGE_VERSION),
  savedAt: z.string(),
  countInProgress: z.boolean(),
  current: GradesSchema,
  next: GradesSchema,
});

/**
 * The plan belongs to one dataset: `savedAt` identifies it, so a new upload starts with an empty plan.
 * Storage errors read as "no plan", the same as private mode.
 */
export async function loadPlan(savedAt: string): Promise<PlanningState | null> {
  try {
    const parsed = StoredPlanSchema.safeParse(await get<unknown>(KEY, db()));
    if (!parsed.success || parsed.data.savedAt !== savedAt) return null;
    const { current, next, countInProgress } = parsed.data;
    return { current, next, countInProgress };
  } catch {
    return null;
  }
}

export async function savePlan(savedAt: string, state: PlanningState): Promise<void> {
  try {
    await set(KEY, { version: PLAN_STORAGE_VERSION, savedAt, ...state }, db());
  } catch {
    // Storage unavailable: the plan still works for this session.
  }
}

export async function clearPlan(): Promise<void> {
  try {
    await del(KEY, db());
  } catch {
    // Nothing to clear.
  }
}
