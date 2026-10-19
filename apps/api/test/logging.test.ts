import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('production request logging', () => {
  // Spawns a tsx subprocess, which is slow when the suite runs in parallel.
  it('records only safe route identifiers for normal, error and rate-limited requests', () => {
    const script = `
      import { buildApp } from './src/app.ts';
      const app = await buildApp({ logger: true, trustProxy: true, rateLimitMax: 1 });
      app.get('/private/:student', async () => {
        throw new Error('FULANO DE TAL FICTICIO 123.456.789-00');
      });
      const ip = '203.0.113.47';
      await app.inject({
        method: 'GET',
        url: '/api/health?nome=FULANO%20DE%20TAL&cpf=123.456.789-00',
        headers: { 'x-forwarded-for': ip },
      });
      const upload = new FormData();
      upload.append(
        'curriculo',
        new Blob(['%PDF-fake'], { type: 'application/pdf' }),
        'FULANO-DE-TAL-123.456.789-00.pdf',
      );
      await app.inject({
        method: 'POST',
        url: '/api/parse?nome=FULANO%20DE%20TAL&cpf=123.456.789-00',
        headers: { 'x-forwarded-for': ip },
        payload: upload,
      });
      await app.inject({
        method: 'POST',
        url: '/api/parse?nome=FULANO%20DE%20TAL&cpf=123.456.789-00',
        headers: { 'x-forwarded-for': ip },
      });
      await app.inject({
        method: 'GET',
        url: '/private/FULANO%20DE%20TAL?cpf=123.456.789-00',
        headers: { 'x-forwarded-for': ip },
      });
      await app.close();
    `;
    const apiDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const output = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
      cwd: apiDirectory,
      encoding: 'utf8',
    });
    const logEntries = output
      .split(/\r?\n/)
      .filter((line) => line.startsWith('{'))
      .map(
        (line) =>
          JSON.parse(line) as {
            req?: { method: string; route?: string };
            method?: string;
            route?: string;
            msg?: string;
          },
      );
    const requestLogs = logEntries.flatMap((entry) => (entry.req ? [entry.req] : []));

    expect(requestLogs).toContainEqual({ method: 'GET', route: 'api.health' });
    expect(requestLogs).toContainEqual({ method: 'POST', route: 'api.parse' });
    expect(requestLogs).toContainEqual({ method: 'GET', route: 'unmatched' });
    expect(logEntries).toContainEqual(expect.objectContaining({ method: 'POST', route: 'api.parse', msg: 'rate limit exceeded' }));
    expect(logEntries).toContainEqual(expect.objectContaining({ method: 'GET', route: 'unmatched', msg: 'unhandled error' }));
    for (const secret of [
      'FULANO',
      '123.456.789-00',
      '203.0.113.47',
      '/private/',
      'cpf=',
      'nome=',
      '.pdf',
    ]) {
      expect(output).not.toContain(secret);
    }
  }, 60_000);
});
