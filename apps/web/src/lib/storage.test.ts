import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearDataset, loadDataset, markRevealed, saveDataset, STORAGE_VERSION, writeRawForTests } from './storage';

const data = { curriculum: sampleCurriculum, transcript: sampleTranscript };

describe('storage', () => {
  beforeEach(async () => {
    await clearDataset();
  });

  it('round-trips a dataset and remembers the reveal', async () => {
    await saveDataset(data);
    const loaded = await loadDataset();
    expect(loaded?.data).toEqual(data);
    expect(loaded?.revealed).toBe(false);
    await markRevealed();
    expect((await loadDataset())?.revealed).toBe(true);
  });

  it('[RF-3] discards corrupted data', async () => {
    await writeRawForTests({ version: STORAGE_VERSION, data: { curriculum: 'nope' } });
    expect(await loadDataset()).toBeNull();
  });

  it('[RF-3] discards data saved by an older version', async () => {
    await writeRawForTests({ version: STORAGE_VERSION - 1, data });
    expect(await loadDataset()).toBeNull();
  });

  it('returns null when nothing is stored', async () => {
    expect(await loadDataset()).toBeNull();
  });
});
