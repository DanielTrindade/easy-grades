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

  it('serves /api from the network only', () => {
    const rule = (workbox?.runtimeCaching ?? []).find(
      (entry) => entry.urlPattern instanceof RegExp && entry.urlPattern.test('/api/parse'),
    );
    expect(rule?.handler).toBe('NetworkOnly');
  });

  it('serves uploaded PDFs from the network only', () => {
    const rule = (workbox?.runtimeCaching ?? []).find(
      (entry) => entry.urlPattern instanceof RegExp && entry.urlPattern.test('/relatorio.pdf'),
    );
    expect(rule?.handler).toBe('NetworkOnly');
  });
});
