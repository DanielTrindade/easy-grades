import { sampleCurriculum, sampleTranscript } from '@easy-grades/core/fixtures';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, OFFLINE_MESSAGE, uploadDocuments } from './api';

const pdf = (name: string) => new File(['%PDF-1.7'], name, { type: 'application/pdf' });
const respond = (status: number, body: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('uploadDocuments', () => {
  it('posts both files and returns the validated response', async () => {
    const fetchSpy = respond(200, { curriculum: sampleCurriculum, transcript: sampleTranscript });
    const result = await uploadDocuments(pdf('c.pdf'), pdf('h.pdf'));
    expect(result.transcript.officialCr).toBe(7.757);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/api/parse');
    const body = init!.body as FormData;
    expect(body.get('curriculo')).toBeInstanceOf(File);
    expect(body.get('historico')).toBeInstanceOf(File);
  });

  it('surfaces the server error code and message', async () => {
    respond(422, { error: { code: 'NOT_CURRICULUM', message: 'Arquivo errado.' } });
    await expect(uploadDocuments(pdf('c.pdf'), pdf('h.pdf'))).rejects.toMatchObject({ code: 'NOT_CURRICULUM', message: 'Arquivo errado.' });
  });

  it('maps network failures to an offline message', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(uploadDocuments(pdf('c.pdf'), pdf('h.pdf'))).rejects.toMatchObject({ code: 'INTERNAL', message: OFFLINE_MESSAGE });
  });

  it('rejects responses that do not match the schema', async () => {
    respond(200, { curriculum: {}, transcript: {} });
    await expect(uploadDocuments(pdf('c.pdf'), pdf('h.pdf'))).rejects.toBeInstanceOf(ApiError);
  });
});
