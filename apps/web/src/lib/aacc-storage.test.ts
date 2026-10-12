import { beforeEach, describe, expect, it } from 'vitest';
import {
  AACC_STORAGE_VERSION,
  AaccInputSchema,
  clearAaccActivities,
  loadAaccActivities,
  saveAaccActivities,
  writeRawAaccForTests,
  type AaccActivity,
} from './aacc-storage';

const activities: AaccActivity[] = [
  { id: 'a1', description: 'Monitoria de cálculo', hours: 30, type: 'monitoria' },
  { id: 'a2', description: 'Semana de tecnologia', hours: 12, type: 'evento' },
];

describe('aacc storage', () => {
  beforeEach(async () => {
    await clearAaccActivities();
  });

  it('round-trips the registered activities', async () => {
    await saveAaccActivities(activities);
    expect(await loadAaccActivities()).toEqual(activities);
  });

  it('clears the stored activities', async () => {
    await saveAaccActivities(activities);
    await clearAaccActivities();
    expect(await loadAaccActivities()).toEqual([]);
  });

  it('returns an empty list when nothing is stored', async () => {
    expect(await loadAaccActivities()).toEqual([]);
  });

  it('discards corrupted data', async () => {
    await writeRawAaccForTests({ version: AACC_STORAGE_VERSION, items: [{ id: 'x', hours: 'muitas' }] });
    expect(await loadAaccActivities()).toEqual([]);
  });

  it('discards data saved by another version', async () => {
    await writeRawAaccForTests({ version: AACC_STORAGE_VERSION + 1, items: activities });
    expect(await loadAaccActivities()).toEqual([]);
  });

  it('discards more than 100 items', async () => {
    const items = Array.from({ length: 101 }, (_, i) => ({ ...activities[0], id: `i${i}` }));
    await writeRawAaccForTests({ version: AACC_STORAGE_VERSION, items });
    expect(await loadAaccActivities()).toEqual([]);
  });

  it('accepts hours from 1 to 500 and rejects anything else', () => {
    const base = { description: 'Extensão', type: 'extensao' } as const;
    expect(AaccInputSchema.safeParse({ ...base, hours: 1 }).success).toBe(true);
    expect(AaccInputSchema.safeParse({ ...base, hours: 500 }).success).toBe(true);
    expect(AaccInputSchema.safeParse({ ...base, hours: 0 }).success).toBe(false);
    expect(AaccInputSchema.safeParse({ ...base, hours: 501 }).success).toBe(false);
    expect(AaccInputSchema.safeParse({ ...base, hours: 2.5 }).success).toBe(false);
    expect(AaccInputSchema.safeParse({ ...base, hours: Number.NaN }).success).toBe(false);
  });

  it('trims the description and rejects empty or over-long ones', () => {
    const base = { hours: 10, type: 'ensino' } as const;
    expect(AaccInputSchema.parse({ ...base, description: '  Monitoria  ' }).description).toBe('Monitoria');
    expect(AaccInputSchema.safeParse({ ...base, description: '   ' }).success).toBe(false);
    expect(AaccInputSchema.safeParse({ ...base, description: 'a'.repeat(120) }).success).toBe(true);
    expect(AaccInputSchema.safeParse({ ...base, description: 'a'.repeat(121) }).success).toBe(false);
  });

  it('rejects an unknown activity type', () => {
    expect(AaccInputSchema.safeParse({ description: 'Curso', hours: 5, type: 'estagio' }).success).toBe(false);
  });
});
