import {
  ERROR_MESSAGES,
  ErrorResponseSchema,
  ParseResponseSchema,
  type ErrorCode,
  type ParseResponse,
} from '@easy-grades/core';
import { z } from 'zod';

export class ApiError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = 'ApiError';
    this.code = code;
  }
}

export const OFFLINE_MESSAGE = 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';

const CourseSchema = z.object({ id: z.number(), code: z.string(), name: z.string() });
const VersionSchema = z.object({ id: z.number(), version: z.string(), situation: z.string() });

export type EcampusCourse = z.infer<typeof CourseSchema>;
export type EcampusVersion = z.infer<typeof VersionSchema>;

async function readError(response: Response): Promise<ApiError> {
  const parsed = ErrorResponseSchema.safeParse(await response.json().catch(() => null));
  if (parsed.success) return new ApiError(parsed.data.error.code, parsed.data.error.message);
  return new ApiError(response.status === 429 ? 'RATE_LIMITED' : 'INTERNAL');
}

async function request(url: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError('INTERNAL', OFFLINE_MESSAGE);
  }
  if (!response.ok) throw await readError(response);
  return response;
}

export async function uploadDocuments(curriculo: File, historico: File, signal?: AbortSignal): Promise<ParseResponse> {
  const body = new FormData();
  body.append('curriculo', curriculo);
  body.append('historico', historico);

  const response = await request('/api/parse', { method: 'POST', body, signal });
  const data = ParseResponseSchema.safeParse(await response.json().catch(() => null));
  if (!data.success) throw new ApiError('INTERNAL');
  return data.data;
}

/** The courses the e-Campus publishes, with the identifiers its matrices are keyed by. */
export async function fetchCourses(signal?: AbortSignal): Promise<EcampusCourse[]> {
  const response = await request('/api/courses', { method: 'GET', signal });
  const data = z.object({ courses: z.array(CourseSchema) }).safeParse(await response.json().catch(() => null));
  if (!data.success) throw new ApiError('INTERNAL');
  return data.data.courses;
}

/** The versions published for one course. */
export async function fetchCourseVersions(courseId: number, signal?: AbortSignal): Promise<EcampusVersion[]> {
  const response = await request(`/api/courses/${courseId}/versions`, { method: 'GET', signal });
  const data = z.object({ versions: z.array(VersionSchema) }).safeParse(await response.json().catch(() => null));
  if (!data.success) throw new ApiError('INTERNAL');
  return data.data.versions;
}

/** Sends only the transcript; the server reads the matrix the e-Campus publishes for the course and version. */
export async function uploadTranscript(
  historico: File,
  courseId: number,
  versionId: number,
  signal?: AbortSignal,
): Promise<ParseResponse> {
  const body = new FormData();
  body.append('historico', historico);
  const response = await request(`/api/parse/historico?curso=${courseId}&versao=${versionId}`, {
    method: 'POST',
    body,
    signal,
  });
  const data = ParseResponseSchema.safeParse(await response.json().catch(() => null));
  if (!data.success) throw new ApiError('INTERNAL');
  return data.data;
}
