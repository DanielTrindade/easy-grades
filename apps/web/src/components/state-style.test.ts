import { describe, expect, it } from 'vitest';
import { STATE_STYLE } from './state-style';

describe('STATE_STYLE', () => {
  it('sets the reprovada badge text in the correction foreground token, not white (2.54:1 in dark mode)', () => {
    expect(STATE_STYLE.reprovada.badge).toContain('text-correcao-foreground');
    expect(STATE_STYLE.reprovada.badge).not.toContain('text-white');
  });

  it('gives a concluída course a highlighter wash in light mode only, and a marca left accent', () => {
    expect(STATE_STYLE.concluida.surface).toBe('bg-[color-mix(in_oklch,var(--marca)_20%,var(--card))] dark:bg-card');
    expect(STATE_STYLE.concluida.accent).toBe('border-l-marca');
  });

  it('keeps the other statuses on the plain card surface', () => {
    for (const state of ['em_curso', 'disponivel', 'bloqueada', 'reprovada'] as const) {
      expect(STATE_STYLE[state].surface).toBe('bg-card');
    }
  });

  it('gives each status its left accent, with disponível dashed', () => {
    expect(STATE_STYLE.em_curso.accent).toBe('border-l-tinta');
    expect(STATE_STYLE.disponivel.accent).toBe('border-l-tinta border-dashed');
    expect(STATE_STYLE.bloqueada.accent).toBe('border-l-pauta');
    expect(STATE_STYLE.reprovada.accent).toBe('border-l-correcao');
  });
});
