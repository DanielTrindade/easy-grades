import { describe, expect, it } from 'vitest';
import { STATE_STYLE } from './state-style';

describe('STATE_STYLE', () => {
  it('sets the reprovada badge text in the error foreground token, not white (2.54:1 in dark mode)', () => {
    expect(STATE_STYLE.reprovada.badge).toContain('text-erro-foreground');
    expect(STATE_STYLE.reprovada.badge).not.toContain('text-white');
  });

  it('gives a concluída course the esmeralda wash in both modes, and an esmeralda left accent', () => {
    expect(STATE_STYLE.concluida.surface).toBe('bg-esmeralda-fundo');
    expect(STATE_STYLE.concluida.badge).toContain('bg-esmeralda-fundo text-esmeralda-texto');
    expect(STATE_STYLE.concluida.accent).toBe('border-l-esmeralda');
  });

  it('keeps the other statuses on the plain card surface', () => {
    for (const state of ['em_curso', 'disponivel', 'bloqueada', 'reprovada'] as const) {
      expect(STATE_STYLE[state].surface).toBe('bg-card');
    }
  });

  it('gives each status its left accent, with disponível dashed', () => {
    expect(STATE_STYLE.em_curso.accent).toBe('border-l-texto');
    expect(STATE_STYLE.disponivel.accent).toBe('border-l-texto border-dashed');
    expect(STATE_STYLE.bloqueada.accent).toBe('border-l-suave');
    expect(STATE_STYLE.reprovada.accent).toBe('border-l-erro');
  });
});
