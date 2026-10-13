import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { pwaOptions } from './pwa-options';

const { manifest, workbox, registerType } = pwaOptions;

function matches(pattern: unknown, url: string): boolean {
  if (pattern instanceof RegExp) return pattern.test(url);
  throw new Error(`expected a RegExp, got ${typeof pattern}`);
}

// Workbox calls a function urlPattern with the real URL and whether the request is same-origin.
function routeMatches(urlPattern: unknown, path: string, sameOrigin = true): boolean {
  if (typeof urlPattern !== 'function') throw new Error(`expected a function matcher, got ${typeof urlPattern}`);
  return Boolean(urlPattern({ url: new URL(path, 'http://localhost'), sameOrigin }));
}

function handlerFor(path: string): string | undefined {
  const rule = (workbox?.runtimeCaching ?? []).find(
    (entry) => typeof entry.urlPattern === 'function' && routeMatches(entry.urlPattern, path),
  );
  return rule?.handler as string | undefined;
}

describe('PWA manifest', () => {
  it('names the app in Portuguese and opens at the root', () => {
    expect(manifest.name).toBe('Easy Grades');
    expect(manifest.short_name).toBe('Easy Grades');
    expect(manifest.description).toMatch(/currículo/);
    expect(manifest.lang).toBe('pt-BR');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
  });

  it('is standalone with the spec colors and any orientation', () => {
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('any');
    expect(manifest.background_color).toBe('#F4F6FA');
    expect(manifest.theme_color).toBe('#1D3FA0');
  });

  it('declares 192, 512 and a separate 512 maskable icon', () => {
    const icons = manifest.icons ?? [];
    expect(icons).toContainEqual(expect.objectContaining({ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }));
    expect(icons).toContainEqual(expect.objectContaining({ src: '/icons/icon-512.png', sizes: '512x512', purpose: 'any' }));
    expect(icons).toContainEqual(
      expect.objectContaining({ src: '/icons/maskable-512.png', sizes: '512x512', purpose: 'maskable' }),
    );
  });

  it.each(['icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon-180.png'])(
    'ships the generated %s in public/icons',
    (name) => {
      expect(existsSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../public/icons', name))).toBe(true);
    },
  );
});

describe('PWA service worker', () => {
  it('asks the user before activating a new version', () => {
    expect(registerType).toBe('prompt');
  });

  it('precaches the app shell and nothing else', () => {
    const globs = workbox?.globPatterns ?? [];
    for (const ext of ['js', 'css', 'html', 'woff2', 'svg', 'png']) {
      expect(globs.join(' ')).toContain(ext);
    }
    expect(globs.join(' ')).not.toMatch(/pdf/);
  });

  it('falls back to index.html for app routes but never for /api', () => {
    expect(workbox?.navigateFallback).toBe('/index.html');
    const denylist = workbox?.navigateFallbackDenylist ?? [];
    expect(denylist.some((pattern) => matches(pattern, '/api/parse'))).toBe(true);
    expect(denylist.some((pattern) => matches(pattern, '/visao-geral'))).toBe(false);
  });

  it('matches /api by pathname, so the rule applies to real API URLs', () => {
    const rules = (workbox?.runtimeCaching ?? []).filter((entry) => typeof entry.urlPattern === 'function');
    expect(rules.length).toBeGreaterThan(0);
    expect(routeMatches(rules[0]?.urlPattern, '/api/parse')).toBe(true);
    expect(routeMatches(rules[0]?.urlPattern, '/api/parse?debug=1')).toBe(true);
    expect(routeMatches(rules[0]?.urlPattern, '/apiary')).toBe(false);
    expect(routeMatches(rules[0]?.urlPattern, '/visao-geral')).toBe(false);
    expect(routeMatches(rules[0]?.urlPattern, '/api/parse', false)).toBe(false);
  });

  it('serves /api from the network only', () => {
    expect(handlerFor('/api/parse')).toBe('NetworkOnly');
  });

  it('serves uploaded PDFs from the network only, whatever the query string', () => {
    expect(handlerFor('/relatorio.pdf')).toBe('NetworkOnly');
    expect(handlerFor('/relatorio.PDF')).toBe('NetworkOnly');
    expect(handlerFor('/relatorio.pdf?v=2')).toBe('NetworkOnly');
  });

  it('does not match app routes that only mention pdf or api', () => {
    expect(handlerFor('/pdf-guide')).toBeUndefined();
    expect(handlerFor('/docs/api-notes')).toBeUndefined();
  });
});
