import type { CourseState } from '@easy-grades/core';
import { CircleCheck, CircleDashed, CircleDot, CircleX, Lock, type LucideIcon } from 'lucide-react';

export interface StateStyle {
  icon: LucideIcon;
  badge: string;
  /** Card background. Concluída courses get a highlighter wash; the mix is 20% so grafite text stays at 4.5:1 in dark mode. */
  surface: string;
  /** 4px left accent (plus dashed outline for disponível). */
  accent: string;
  iconColor: string;
}

/**
 * Status is always color + icon + text, never color alone. Icons sit on paper, where highlighter yellow is too
 * faint, so the done icon uses the ink blue and the highlighter only fills the badge and the card wash.
 */
export const STATE_STYLE: Record<CourseState, StateStyle> = {
  concluida: {
    icon: CircleCheck,
    badge: 'bg-marca text-tinta-escura border-tinta',
    surface: 'bg-[color-mix(in_oklch,var(--marca)_20%,var(--card))]',
    accent: 'border-l-marca',
    iconColor: 'text-tinta',
  },
  em_curso: { icon: CircleDot, badge: 'bg-tinta text-papel border-tinta', surface: 'bg-card', accent: 'border-l-tinta', iconColor: 'text-tinta' },
  disponivel: {
    icon: CircleDashed,
    badge: 'bg-transparent text-foreground border-tinta border-dashed',
    surface: 'bg-card',
    accent: 'border-l-tinta border-dashed',
    iconColor: 'text-tinta',
  },
  bloqueada: { icon: Lock, badge: 'bg-muted text-grafite border-pauta', surface: 'bg-card', accent: 'border-l-pauta', iconColor: 'text-grafite' },
  reprovada: {
    icon: CircleX,
    badge: 'bg-correcao text-correcao-foreground border-correcao',
    surface: 'bg-card',
    accent: 'border-l-correcao',
    iconColor: 'text-correcao',
  },
};
