import {
  ERROR_MESSAGES,
  ErrorResponseSchema,
  ParseResponseSchema,
  type ErrorCode,
  type ParseResponse,
} from '@easy-grades/core';

export class ApiError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = 'ApiError';
    this.code = code;
  }
}

export const OFFLINE_MESSAGE = 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';

export async function uploadDocuments(curriculo: File, historico: File, signal?: AbortSignal): Promise<ParseResponse> {
  const body = new FormData();
  body.append('curriculo', curriculo);
  body.append('historico', historico);

  let response: Response;
  try {
    response = await fetch('/api/parse', { method: 'POST', body, signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError('INTERNAL', OFFLINE_MESSAGE);
  }

  if (!response.ok) {
    const parsed = ErrorResponseSchema.safeParse(await response.json().catch(() => null));
    if (parsed.success) throw new ApiError(parsed.data.error.code, parsed.data.error.message);
    throw new ApiError(response.status === 429 ? 'RATE_LIMITED' : 'INTERNAL');
  }
  const data = ParseResponseSchema.safeParse(await response.json().catch(() => null));
  if (!data.success) throw new ApiError('INTERNAL');
  return data.data;
}
