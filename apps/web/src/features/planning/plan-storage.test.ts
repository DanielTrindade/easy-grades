import { beforeEach, describe, expect, it, vi } from 'vitest';

const kv = vi.hoisted(() => new Map<string, unknown>());

vi.mock('idb-keyval', () => ({
  createStore: () => ({}),
  get: async (key: string) => kv.get(key),
  set: async (key: string, value: unknown) => {
    kv.set(key, value);
  },
  del: async (key: string) => {
    kv.delete(key);
  },
}));

import { clearPlan, loadPlan, savePlan } from './plan-storage';
import type { PlanningState } from './planning-state';

const plan: PlanningState = {
  current: { ICC006: 9 },
  next: { ICC150: 8.5 },
  countInProgress: false,
};

describe('plan storage', () => {
  beforeEach(() => kv.clear());

  it('restores the plan saved for the same dataset', async () => {
    await savePlan('2026-10-12T10:00:00.000Z', plan);
    expect(await loadPlan('2026-10-12T10:00:00.000Z')).toEqual(plan);
  });

  it('ignores a plan saved for another dataset', async () => {
    await savePlan('2026-10-12T10:00:00.000Z', plan);
    expect(await loadPlan('2026-11-01T08:00:00.000Z')).toBeNull();
  });

  it('discards stored values that do not match the schema', async () => {
    kv.set('planning-plan', { version: 1, savedAt: 'x', countInProgress: true, current: { ICC006: 99 }, next: {} });
    expect(await loadPlan('x')).toBeNull();
  });

  it('forgets the plan when the data is cleared', async () => {
    await savePlan('2026-10-12T10:00:00.000Z', plan);
    await clearPlan();
    expect(await loadPlan('2026-10-12T10:00:00.000Z')).toBeNull();
  });
});
