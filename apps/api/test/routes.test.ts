import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp, type AppOptions } from '../src/app';
import { buildPdf } from './fixtures/build-pdf';
import { curriculumPages } from './fixtures/curriculum-fixture';
import { FAKE_PII, transcriptPages } from './fixtures/transcript-fixture';

let curriculo: Uint8Array;
let historico: Uint8Array;
let app: FastifyInstance | undefined;

beforeAll(async () => {
  curriculo = await buildPdf(curriculumPages());
  historico = await buildPdf(transcriptPages());
});
afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function start(opts: AppOptions = {}): Promise<FastifyInstance> {
  app = await buildApp(opts);
  return app;
}

function form(files: Record<string, Uint8Array>): FormData {
  const body = new FormData();
  for (const [field, bytes] of Object.entries(files)) {
    body.append(field, new Blob([bytes], { type: 'application/pdf' }), `${field}.pdf`);
  }
  return body;
}

const upload = (server: FastifyInstance, files: Record<string, Uint8Array>) =>
  server.inject({ method: 'POST', url: '/api/parse', payload: form(files) });

describe('GET /api/health', () => {
  it('answers with security headers', async () => {
    const res = await (await start()).inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('POST /api/parse', () => {
  it('returns the parsed, PII-free documents', async () => {
    const res = await upload(await start(), { curriculo, historico });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.curriculum.courseCode).toBe('IE17');
    expect(body.transcript.entries.length).toBeGreaterThan(0);
    for (const pii of FAKE_PII) expect(res.body).not.toContain(pii);
  });

  it('[RF-2] reports swapped files as NOT_CURRICULUM', async () => {
    const res = await upload(await start(), { curriculo: historico, historico: curriculo });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ error: { code: 'NOT_CURRICULUM', message: expect.any(String) } });
  });

  // Factories: the PDFs only exist after beforeAll runs.
  it.each([
    ['a missing file', () => ({ curriculo }), 400, 'MISSING_FILE'],
    ['a non-PDF file', () => ({ curriculo, historico: new TextEncoder().encode('hello') }), 400, 'INVALID_PDF'],
    ['an unexpected field', () => ({ curriculo, outro: historico }), 400, 'INVALID_UPLOAD'],
  ] as const)('rejects %s', async (_label, files, status, code) => {
    const res = await upload(await start(), files());
    expect(res.statusCode).toBe(status);
    expect(res.json().error.code).toBe(code);
  });

  it('rejects more than two files', async () => {
    const body = form({ curriculo, historico });
    body.append('historico', new Blob([historico]), 'x.pdf');
    const res = await (await start()).inject({ method: 'POST', url: '/api/parse', payload: body });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_UPLOAD');
  });

  it('rejects files above 5 MB', async () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 10);
    big.set(new TextEncoder().encode('%PDF-'));
    const res = await upload(await start(), { curriculo: big, historico });
    expect(res.statusCode).toBe(413);
    expect(res.json().error.code).toBe('TOO_LARGE');
  });

  it('rejects non-multipart requests', async () => {
    const res = await (await start()).inject({ method: 'POST', url: '/api/parse', payload: { a: 1 } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_UPLOAD');
  });

  it('rate-limits per IP', async () => {
    const server = await start({ rateLimitMax: 2 });
    await upload(server, { curriculo });
    await upload(server, { curriculo });
    const res = await upload(server, { curriculo });
    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe('RATE_LIMITED');
  });

  it('times out slow parses', async () => {
    const res = await upload(await start({ parseTimeoutMs: 1 }), { curriculo, historico });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('PARSE_TIMEOUT');
  });

  it('never sends stack traces', async () => {
    const res = await upload(await start(), { curriculo, historico: new TextEncoder().encode('%PDF-broken') });
    expect(Object.keys(res.json())).toEqual(['error']);
    expect(res.body).not.toContain('at ');
  });
});

describe('static hosting', () => {
  it('serves the SPA and falls back to index.html, but not for /api', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'eg-static-'));
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Easy Grades</title>');
    const server = await start({ staticDir: dir });
    expect((await server.inject({ method: 'GET', url: '/' })).body).toContain('Easy Grades');
    expect((await server.inject({ method: 'GET', url: '/planejamento' })).body).toContain('Easy Grades');
    const api = await server.inject({ method: 'GET', url: '/api/nope' });
    expect(api.statusCode).toBe(404);
    expect(api.json().error.code).toBe('NOT_FOUND');
  });
});
