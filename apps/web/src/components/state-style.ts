import type { CourseState } from '@easy-grades/core';
import { CircleCheck, CircleDashed, CircleDot, CircleX, Lock, type LucideIcon } from 'lucide-react';

export interface StateStyle {
  icon: LucideIcon;
  badge: string;
  /** Card background. Concluída courses get the esmeralda wash in both modes, so the done pattern reads at a glance. */
  surface: string;
  /** 4px left accent (plus dashed outline for disponível). */
  accent: string;
  iconColor: string;
}

/**
 * Status is always color + icon + text, never color alone. Graphite marks the states still open (em curso, disponível,
 * bloqueada); esmeralda marks what is approved; erro marks what failed.
 */
export const STATE_STYLE: Record<CourseState, StateStyle> = {
  concluida: {
    icon: CircleCheck,
    badge: 'bg-esmeralda-fundo text-esmeralda-texto border-esmeralda',
    surface: 'bg-esmeralda-fundo',
    accent: 'border-l-esmeralda',
    iconColor: 'text-esmeralda-texto',
  },
  em_curso: { icon: CircleDot, badge: 'bg-texto text-fundo border-texto', surface: 'bg-card', accent: 'border-l-texto', iconColor: 'text-texto' },
  disponivel: {
    icon: CircleDashed,
    badge: 'bg-transparent text-foreground border-texto border-dashed',
    surface: 'bg-card',
    accent: 'border-l-texto border-dashed',
    iconColor: 'text-texto',
  },
  bloqueada: { icon: Lock, badge: 'bg-muted text-suave border-linha', surface: 'bg-card', accent: 'border-l-suave', iconColor: 'text-suave' },
  reprovada: {
    icon: CircleX,
    badge: 'bg-erro text-erro-foreground border-erro',
    surface: 'bg-card',
    accent: 'border-l-erro',
    iconColor: 'text-erro',
  },
};
