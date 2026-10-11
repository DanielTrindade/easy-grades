import { resolve } from 'node:path';
import { buildApp } from './app';

const app = await buildApp({
  staticDir: process.env.STATIC_DIR ? resolve(process.env.STATIC_DIR) : undefined,
  logger: true,
  trustProxy: process.env.TRUST_PROXY === 'true',
});
await app.listen({ port: Number(process.env.PORT ?? 3001), host: process.env.HOST ?? '0.0.0.0' });
