import { EventEmitter } from 'node:events';
import { Worker, type Worker as WorkerType } from 'node:worker_threads';
import { describe, expect, it, vi } from 'vitest';
import { parseInWorker } from '../src/parser-worker-client';

class DeferredCleanupWorker extends EventEmitter {
  abortReceived = false;
  terminationFinished = false;
  private releaseCleanup!: () => void;
  private readonly cleanup = new Promise<void>((resolve) => {
    this.releaseCleanup = resolve;
  });

  postMessage(message: { type: 'parse' | 'abort' }): void {
    if (message.type !== 'abort') return;
    this.abortReceived = true;
    void this.cleanup.then(() => {
      this.emit('message', { type: 'cancelled', ok: false, code: 'PARSE_TIMEOUT' });
    });
  }

  async terminate(): Promise<number> {
    this.terminationFinished = true;
    this.emit('exit', 1);
    return 1;
  }

  releaseTaskTeardown(): void {
    this.releaseCleanup();
  }
}

describe('parseInWorker timeout', () => {
  it('waits for cancellation teardown and worker termination before rejecting', async () => {
    const worker = new DeferredCleanupWorker();
    const parsePromise = parseInWorker(new Uint8Array([1]), new Uint8Array([2]), {
      timeoutMs: 5,
      abortGraceMs: 500,
      createWorker: () => worker as unknown as WorkerType,
    });
    let settled = false;
    void parsePromise.catch(() => {
      settled = true;
    });

    await vi.waitFor(() => expect(worker.abortReceived).toBe(true), { timeout: 250 });
    expect(settled).toBe(false);
    worker.releaseTaskTeardown();

    await expect(parsePromise).rejects.toMatchObject({ code: 'PARSE_TIMEOUT' });
    expect(worker.terminationFinished).toBe(true);
  });

  it('terminates a real synchronously busy worker before rejecting on timeout', async () => {
    const worker = new Worker(
      `const { parentPort } = require('node:worker_threads');
parentPort.postMessage('busy');
while (true) {}`,
      { eval: true, execArgv: [] },
    );
    const events: string[] = [];
    worker.once('exit', () => events.push('exit'));

    let readinessTimer: NodeJS.Timeout | undefined;
    try {
      const readiness = new Promise<unknown>((resolve, reject) => {
        readinessTimer = setTimeout(() => reject(new Error('Worker did not start')), 10_000);
        worker.once('message', resolve);
        worker.once('error', reject);
      });
      expect(await readiness).toBe('busy');
      clearTimeout(readinessTimer);

      const parsePromise = parseInWorker(new Uint8Array([1]), new Uint8Array([2]), {
        timeoutMs: 10,
        abortGraceMs: 10,
        createWorker: () => worker,
      }).then(
        (result) => {
          events.push('resolved');
          return result;
        },
        (error: unknown) => {
          events.push('rejected');
          throw error;
        },
      );
      let parseWatchdog: NodeJS.Timeout | undefined;
      const watchdog = new Promise<never>((_resolve, reject) => {
        parseWatchdog = setTimeout(() => reject(new Error('Timed out waiting for worker termination')), 2_000);
      });

      try {
        await expect(Promise.race([parsePromise, watchdog])).rejects.toMatchObject({ code: 'PARSE_TIMEOUT' });
      } finally {
        clearTimeout(parseWatchdog);
      }
      expect(events).toEqual(['exit', 'rejected']);
    } finally {
      clearTimeout(readinessTimer);
      if (worker.threadId !== -1) await worker.terminate();
    }
  });
});
