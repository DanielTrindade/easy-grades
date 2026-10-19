import { ERROR_MESSAGES, type ErrorCode } from '@easy-grades/core';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyError, type FastifyInstance, type FastifyReply } from 'fastify';
import { basename } from 'node:path';
import { ERROR_STATUS, ParseError } from './errors';
import { CurriculumService, type EcampusReader } from './ecampus/curriculum-service';
import { curriculumRoute } from './routes/curriculum';
import { MAX_FILE_BYTES, parseRoute } from './routes/parse';

export interface AppOptions {
  staticDir?: string;
  rateLimitMax?: number;
  parseTimeoutMs?: number;
  logger?: boolean;
  trustProxy?: boolean;
  /** Injected in tests so the e-Campus is never called. */
  ecampusClient?: EcampusReader;
}

const MULTIPART_ERRORS: Record<string, ErrorCode> = {
  FST_REQ_FILE_TOO_LARGE: 'TOO_LARGE',
  FST_FILES_LIMIT: 'INVALID_UPLOAD',
  FST_PARTS_LIMIT: 'INVALID_UPLOAD',
  FST_FIELDS_LIMIT: 'INVALID_UPLOAD',
  FST_INVALID_MULTIPART_CONTENT_TYPE: 'INVALID_UPLOAD',
  FST_PROTO_VIOLATION: 'INVALID_UPLOAD',
};

// The service worker, its Workbox runtime and the manifest must be revalidated on every load, or a stale worker
// keeps serving an old build after a deploy.
const NO_CACHE_FILE = /^(sw\.js|workbox-[\w-]+\.js|manifest\.webmanifest)$/;

function setStaticHeaders(reply: FastifyReply, filePath: string): void {
  const name = basename(filePath);
  if (!NO_CACHE_FILE.test(name)) return;
  reply.header('cache-control', 'no-cache');
  if (name.endsWith('.webmanifest')) reply.header('content-type', 'application/manifest+json');
}

const SAFE_ROUTE_IDS: Record<string, string> = {
  '/api/health': 'api.health',
  '/api/parse': 'api.parse',
  '/api/courses': 'api.courses',
  '/api/courses/:id/versions': 'api.courses.versions',
  '/api/curriculum': 'api.curriculum',
};

function safeRouteId(route: string | undefined): string {
  return route ? (SAFE_ROUTE_IDS[route] ?? 'unmatched') : 'unmatched';
}

function sendError(reply: FastifyReply, code: ErrorCode): FastifyReply {
  return reply.code(ERROR_STATUS[code]).send({ error: { code, message: ERROR_MESSAGES[code] } });
}

export async function buildApp(opts: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    // Allowlist route identifiers; request paths and query strings may contain PII.
    logger: opts.logger
      ? {
          level: 'info',
          serializers: {
            req: (req) => ({ method: req.method, route: safeRouteId(req.routeOptions?.url) }),
            res: (res) => ({ statusCode: res.statusCode }),
          },
        }
      : false,
    trustProxy: opts.trustProxy ?? false,
    bodyLimit: 1024 * 1024,
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        // Explicit so the PWA's worker and manifest do not depend on how helmet inherits default-src.
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: null,
      },
    },
    crossOriginEmbedderPolicy: false,
  });
  await app.register(rateLimit, { global: false });
  await app.register(multipart, {
    limits: { fileSize: MAX_FILE_BYTES, files: 2, fields: 0, parts: 2, fieldNameSize: 32, headerPairs: 50 },
  });

  app.setErrorHandler((err: FastifyError, request, reply) => {
    if (err instanceof ParseError) return sendError(reply, err.code);
    if (err.statusCode === 429) {
      request.log.warn({ method: request.method, route: safeRouteId(request.routeOptions.url) }, 'rate limit exceeded');
      return sendError(reply, 'RATE_LIMITED');
    }
    const mapped = err.code ? MULTIPART_ERRORS[err.code] : undefined;
    if (mapped) return sendError(reply, mapped);
    if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) return sendError(reply, 'INVALID_UPLOAD');
    // Error metadata may echo user content; keep only safe request context.
    request.log.error({ method: request.method, route: safeRouteId(request.routeOptions.url) }, 'unhandled error');
    return sendError(reply, 'INTERNAL');
  });

  app.get('/api/health', async () => ({ ok: true }));
  const curriculumService = new CurriculumService(opts.ecampusClient);
  await app.register(parseRoute, {
    rateLimitMax: opts.rateLimitMax ?? 10,
    parseTimeoutMs: opts.parseTimeoutMs ?? 10_000,
    curriculumService,
  });
  await app.register(curriculumRoute, {
    rateLimitMax: opts.rateLimitMax ?? 30,
    service: curriculumService,
  });

  if (opts.staticDir) {
    await app.register(fastifyStatic, { root: opts.staticDir, wildcard: false, setHeaders: setStaticHeaders });
    app.setNotFoundHandler((request, reply) => {
      if (request.method !== 'GET' || request.url.startsWith('/api/')) return sendError(reply, 'NOT_FOUND');
      return reply.sendFile('index.html');
    });
  } else {
    app.setNotFoundHandler((_request, reply) => sendError(reply, 'NOT_FOUND'));
  }
  return app;
}
