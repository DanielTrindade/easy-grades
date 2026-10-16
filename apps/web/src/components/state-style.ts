import type { CourseState } from '@easy-grades/core';
import { CircleCheck, CircleDashed, CircleDot, CircleX, Lock, type LucideIcon } from 'lucide-react';

export interface StateStyle {
  icon: LucideIcon;
  badge: string;
  /** Card background. Concluída courses get the success wash in both modes, so the done pattern reads at a glance. */
  surface: string;
  /** 4px left accent (plus dashed outline for disponível). */
  accent: string;
  iconColor: string;
}

/**
 * Status is always color + icon + text, never color alone. Success green marks what is approved, pen blue what is in
 * progress, graphite what is still open (disponível, bloqueada) and danger what failed.
 */
export const STATE_STYLE: Record<CourseState, StateStyle> = {
  concluida: {
    icon: CircleCheck,
    badge: 'bg-success-tint text-success border-success',
    surface: 'bg-success-tint',
    accent: 'border-l-success',
    iconColor: 'text-success',
  },
  em_curso: { icon: CircleDot, badge: 'bg-pen-tint text-pen-ink border-pen-tint', surface: 'bg-card', accent: 'border-l-pen', iconColor: 'text-pen-ink' },
  disponivel: {
    icon: CircleDashed,
    badge: 'bg-transparent text-foreground border-ink border-dashed',
    surface: 'bg-card',
    accent: 'border-l-ink border-dashed',
    iconColor: 'text-ink',
  },
  bloqueada: { icon: Lock, badge: 'bg-muted text-ink-muted border-hairline', surface: 'bg-card', accent: 'border-l-ink-muted', iconColor: 'text-ink-muted' },
  reprovada: {
    icon: CircleX,
    badge: 'bg-danger text-danger-foreground border-danger',
    surface: 'bg-card',
    accent: 'border-l-danger',
    iconColor: 'text-danger',
  },
};
