import type { FastifyPluginAsync } from 'fastify';
import { ParseError } from '../errors';
import { CurriculumService, type EcampusReader } from '../ecampus/curriculum-service';

function positiveId(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export interface CurriculumRouteOptions {
  rateLimitMax?: number;
  /** Injected in tests so the e-Campus is never called. */
  client?: EcampusReader;
  service?: CurriculumService;
}

export const curriculumRoute: FastifyPluginAsync<CurriculumRouteOptions> = async (app, opts) => {
  const rateLimit = { max: opts.rateLimitMax ?? 30, timeWindow: '1 minute' };
  const service = opts.service ?? new CurriculumService(opts.client);

  app.get('/api/courses', { config: { rateLimit } }, async () => {
    try {
      return { courses: await service.listCourses() };
    } catch {
      throw new ParseError('INTERNAL');
    }
  });

  app.get<{ Params: { id: string } }>('/api/courses/:id/versions', { config: { rateLimit } }, async (request) => {
    const courseId = positiveId(request.params.id);
    if (courseId === null) throw new ParseError('NOT_FOUND');
    try {
      return { versions: await service.listVersions(courseId) };
    } catch {
      throw new ParseError('INTERNAL');
    }
  });

  app.get<{ Querystring: { curso?: string; versao?: string } }>(
    '/api/curriculum',
    { config: { rateLimit } },
    async (request) => {
      const courseId = positiveId(request.query.curso);
      const versionId = positiveId(request.query.versao);
      if (courseId === null || versionId === null) throw new ParseError('NOT_FOUND');
      try {
        return { curriculum: await service.getCurriculum(courseId, versionId) };
      } catch (error) {
        if (error instanceof ParseError) throw error;
        throw new ParseError('INTERNAL');
      }
    },
  );
};
