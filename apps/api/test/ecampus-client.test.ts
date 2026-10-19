import { afterEach, describe, expect, it, vi } from 'vitest';
import { ecampusClient, EcampusError } from '../src/ecampus/client';

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ecampusClient.listCourses', () => {
  it('maps the e-Campus rows to courses', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      jsonResponse([{ IDCURSO: 2663, CODCURSO: 'IE17', NOMECURSO: 'Engenharia de Software' }]),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(ecampusClient.listCourses()).resolves.toEqual([
      { id: 2663, code: 'IE17', name: 'Engenharia de Software' },
    ]);
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('nivel_curso=3');
  });

  it('rejects an answer that is not the expected shape', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse([{ id: 1 }])));
    await expect(ecampusClient.listCourses()).rejects.toThrow();
  });

  it('reports a failing status as an e-Campus error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    await expect(ecampusClient.listCourses()).rejects.toBeInstanceOf(EcampusError);
  });
});

describe('ecampusClient.fetchCurriculumPdf', () => {
  it('returns the PDF bytes', async () => {
    const pdf = new TextEncoder().encode('%PDF-1.4 rest');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(pdf, { headers: { 'Content-Type': 'application/pdf' } })),
    );
    const bytes = await ecampusClient.fetchCurriculumPdf(2663, 11572);
    expect(new TextDecoder().decode(bytes)).toContain('%PDF-');
  });

  it('refuses an answer that is not a PDF', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>erro</html>', { headers: { 'Content-Type': 'text/html' } })),
    );
    await expect(ecampusClient.fetchCurriculumPdf(2663, 11572)).rejects.toBeInstanceOf(EcampusError);
  });

  it('refuses a PDF-looking answer that is not one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nao sou pdf', { headers: { 'Content-Type': 'application/pdf' } })),
    );
    await expect(ecampusClient.fetchCurriculumPdf(2663, 11572)).rejects.toBeInstanceOf(EcampusError);
  });
});
