import { register } from 'tsx/esm/api';

register();
await import('./parser-worker.ts');
