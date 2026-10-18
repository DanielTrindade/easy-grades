import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

function rule(selector: string): string {
  const start =
    selector === 'body'
      ? css.lastIndexOf('body {', css.indexOf('--tab-bar-space: 0px;'))
      : css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Missing rule ${selector}`);
  return css.slice(start, css.indexOf('}', start));
}

describe('bottom chrome', () => {
  it('sums the tab bar and the screen accessory into one variable', () => {
    const body = rule('body');
    expect(body).toContain('--tab-bar-space: 0px;');
    expect(body).toContain('--accessory-space: 0px;');
    expect(body).toContain('--bottom-chrome: calc(var(--tab-bar-space) + var(--accessory-space));');
  });

  it('reserves room for the expanded and the minimized tab bar', () => {
    expect(rule("body[data-tab-bar='expanded']")).toContain('--tab-bar-space: 4.25rem;');
    expect(rule("body[data-tab-bar='minimized']")).toContain('--tab-bar-space: 3.75rem;');
  });

  it('reserves room for a screen accessory such as the Meu semestre bar', () => {
    expect(rule('body[data-bottom-accessory]')).toContain('--accessory-space: 3.75rem;');
  });

  it('keeps toasts above all of it', () => {
    expect(rule("[data-sonner-toaster][data-y-position='bottom']")).toContain(
      'bottom: calc(var(--bottom-chrome) + 1.5rem + env(safe-area-inset-bottom)) !important;',
    );
    expect(css).not.toContain('data-summary-bar');
  });
});

describe('semester bar beside the minimized tab bar', () => {
  it('reserves a single row when the tab bar is minimized', () => {
    expect(rule("body[data-tab-bar='minimized'][data-bottom-accessory]")).toContain('--accessory-space: 0px;');
  });

  it('moves the bar next to the minimized pill and back with the snappy spring', () => {
    const base = rule('.semester-bar');
    expect(base).toContain('transition: left 430ms var(--ease-spring-snappy), bottom 430ms var(--ease-spring-snappy);');
    const beside = rule("body[data-tab-bar='minimized'] .semester-bar");
    expect(beside).toContain('left: calc(max(0.75rem, env(safe-area-inset-left)) + 10.5rem);');
    expect(beside).toContain('bottom: calc(0.75rem + env(safe-area-inset-bottom));');
  });

  it('swaps to a compact summary beside the pill, and drops the action word on the narrowest phones', () => {
    expect(rule('.semester-bar-compact')).toContain('display: none;');
    expect(rule("body[data-tab-bar='minimized'] .semester-bar .semester-bar-full")).toContain('display: none;');
    expect(rule("body[data-tab-bar='minimized'] .semester-bar .semester-bar-compact")).toContain('display: inline;');
    expect(rule("body[data-tab-bar='minimized'] .semester-bar .semester-bar-cta-label")).toContain('display: none;');
  });
});

describe('toasts', () => {
  it('are glass capsules on the navigation layer', () => {
    const toast = rule("[data-sonner-toaster] [data-sonner-toast][data-styled='true']");
    expect(toast).toContain('-webkit-backdrop-filter: var(--glass-filter);');
    expect(toast).toContain('backdrop-filter: var(--glass-filter);');
    expect(toast).toContain('box-shadow: inset 0 1px 0 var(--glass-edge), var(--glass-shadow);');
  });

  it('shows a visible keyboard focus ring', () => {
    const focus = rule("[data-sonner-toaster] [data-sonner-toast][data-styled='true']:focus-visible");
    expect(focus).toContain('outline: 2px solid var(--pen);');
    expect(focus).toContain('outline-offset: 2px;');
  });
});

describe('app header', () => {
  it('pins the height of the desktop header row', () => {
    const height = /--app-header-height:\s*([^;]+);/.exec(css)?.[1]?.trim();
    expect(height).toBe('3.8125rem');
  });

  it('grows the header row on touch pointers, where the section links get 44 px', () => {
    expect(css).toMatch(/@media \(pointer: coarse\) \{\s*:root \{\s*--app-header-height: 4\.5625rem;/);
  });
});
