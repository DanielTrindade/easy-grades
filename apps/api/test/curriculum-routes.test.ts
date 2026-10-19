import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp, type AppOptions } from '../src/app';
import type { EcampusReader } from '../src/ecampus/curriculum-service';
import { buildPdf } from './fixtures/build-pdf';
import { curriculumPages } from './fixtures/curriculum-fixture';
import { transcriptPages } from './fixtures/transcript-fixture';

let pdf: Uint8Array;
let transcript: Uint8Array;
let otherTranscript: Uint8Array;

beforeAll(async () => {
  pdf = await buildPdf(curriculumPages());
  transcript = await buildPdf(transcriptPages());
  otherTranscript = await buildPdf(transcriptPages({ courseCode: 'FA01', version: '2027/1' }));
});

const reader = (overrides: Partial<EcampusReader> = {}): EcampusReader => ({
  listCourses: async () => [
    { id: 2663, code: 'IE17', name: 'Engenharia de Software' },
    { id: 72, code: 'FA01', name: 'Administração' },
  ],
  listVersions: async (courseId: number) =>
    courseId === 2663
      ? [{ id: 11572, version: '2025/2', situation: 'corrente' }]
      : [{ id: 999, version: '2027/1', situation: 'corrente' }],
  fetchCurriculumPdf: async () => pdf,
  ...overrides,
});

async function start(opts: AppOptions = {}) {
  return buildApp({ parseTimeoutMs: 30_000, ecampusClient: reader(), ...opts });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/courses', () => {
  it('lists the courses the e-Campus publishes', async () => {
    const res = await (await start()).inject({ method: 'GET', url: '/api/courses' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      courses: [
        { id: 2663, code: 'IE17', name: 'Engenharia de Software' },
        { id: 72, code: 'FA01', name: 'Administração' },
      ],
    });
  });

  it('reports the e-Campus being unreachable as an internal error', async () => {
    const app = await start({
      ecampusClient: reader({
        listCourses: async () => {
          throw new Error('e-Campus caiu');
        },
      }),
    });
    const res = await app.inject({ method: 'GET', url: '/api/courses' });
    expect(res.statusCode).toBe(500);
    expect(res.json().error.code).toBe('INTERNAL');
  });
});

describe('GET /api/courses/:id/versions', () => {
  it('lists the versions of a course', async () => {
    const res = await (await start()).inject({ method: 'GET', url: '/api/courses/2663/versions' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ versions: [{ id: 11572, version: '2025/2', situation: 'corrente' }] });
  });

  it('rejects a course id that is not a number', async () => {
    const res = await (await start()).inject({ method: 'GET', url: '/api/courses/abc/versions' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });
});

describe('GET /api/curriculum', () => {  it('returns the parsed curriculum of a course version', async () => {
    const res = await (await start()).inject({ method: 'GET', url: '/api/curriculum?curso=2663&versao=11572' });
    expect(res.statusCode).toBe(200);
    const { curriculum } = res.json();
    expect(curriculum.courseCode).toBe('IE17');
    expect(curriculum.version).toBe('2025/2');
    expect(curriculum.courses.length).toBeGreaterThan(10);
  });

  it('rejects missing or invalid identifiers', async () => {
    const server = await start();
    for (const url of ['/api/curriculum', '/api/curriculum?curso=2663', '/api/curriculum?curso=x&versao=y']) {
      const res = await server.inject({ method: 'GET', url });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    }
  });

  it('answers from the cache instead of asking the e-Campus again', async () => {
    const fetchCurriculumPdf = vi.fn(async () => pdf);
    const app = await start({ ecampusClient: reader({ fetchCurriculumPdf }) });
    const url = '/api/curriculum?curso=2663&versao=11572';
    await app.inject({ method: 'GET', url });
    await app.inject({ method: 'GET', url });
    expect(fetchCurriculumPdf).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/parse/historico', () => {
  const upload = (server: FastifyInstance, file: Blob) => {
    const body = new FormData();
    body.append('historico', file, 'historico.pdf');
    return server.inject({
      method: 'POST',
      url: '/api/parse/historico?curso=2663&versao=11572',
      payload: body,
    });
  };

  it('pairs the published curriculum with the uploaded transcript', async () => {
    const server = await start();
    const res = await upload(server, new Blob([transcript], { type: 'application/pdf' }));
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.curriculum.courseCode).toBe('IE17');
    expect(body.transcript.entries.length).toBeGreaterThan(0);
  });

  it('refuses a transcript of another course version', async () => {
    const server = await start();
    const res = await upload(server, new Blob([otherTranscript], { type: 'application/pdf' }));
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('CURRICULUM_MISMATCH');
  });

  it('rejects a request without a course version', async () => {
    const server = await start();
    const body = new FormData();
    body.append('historico', new Blob([transcript], { type: 'application/pdf' }), 'historico.pdf');
    const res = await server.inject({ method: 'POST', url: '/api/parse/historico', payload: body });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });

  it('rejects a file that is not a PDF', async () => {
    const server = await start();
    const res = await upload(server, new Blob(['nao sou pdf'], { type: 'application/pdf' }));
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_PDF');
  });
});
