import { describe, expect, it } from 'vitest';
import { STATE_STYLE } from './state-style';

describe('STATE_STYLE', () => {
  it('sets the reprovada badge text in the error foreground token, not white (2.54:1 in dark mode)', () => {
    expect(STATE_STYLE.reprovada.badge).toContain('text-danger-foreground');
    expect(STATE_STYLE.reprovada.badge).not.toContain('text-white');
  });

  it('gives a concluída course the success wash in both modes, and a success left accent', () => {
    expect(STATE_STYLE.concluida.surface).toBe('bg-success-tint');
    expect(STATE_STYLE.concluida.badge).toContain('bg-success-tint text-success');
    expect(STATE_STYLE.concluida.accent).toBe('border-l-success');
    expect(STATE_STYLE.concluida.iconColor).toBe('text-success');
  });

  it('keeps the other statuses on the plain card surface', () => {
    for (const state of ['em_curso', 'disponivel', 'bloqueada', 'reprovada'] as const) {
      expect(STATE_STYLE[state].surface).toBe('bg-card');
    }
  });

  it('gives each status its left accent, with em curso in pen blue and disponível dashed', () => {
    expect(STATE_STYLE.em_curso.accent).toBe('border-l-pen');
    expect(STATE_STYLE.em_curso.badge).toContain('bg-pen-tint text-pen-ink');
    expect(STATE_STYLE.disponivel.accent).toBe('border-l-ink border-dashed');
    expect(STATE_STYLE.bloqueada.accent).toBe('border-l-ink-muted');
    expect(STATE_STYLE.reprovada.accent).toBe('border-l-danger');
  });
});
