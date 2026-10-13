import type { CourseState } from '@easy-grades/core';
import { CircleCheck, CircleDashed, CircleDot, CircleX, Lock, type LucideIcon } from 'lucide-react';

export interface StateStyle {
  icon: LucideIcon;
  badge: string;
  accent: string;
  iconColor: string;
}

/**
 * Status is always color + icon + text, never color alone. Icons sit on paper, where highlighter yellow is too
 * faint, so the done icon uses the ink blue and the highlighter only fills the badge.
 */
export const STATE_STYLE: Record<CourseState, StateStyle> = {
  concluida: { icon: CircleCheck, badge: 'bg-marca text-tinta-escura border-tinta', accent: 'border-l-tinta', iconColor: 'text-tinta' },
  em_curso: { icon: CircleDot, badge: 'bg-tinta text-papel border-tinta', accent: 'border-l-tinta', iconColor: 'text-tinta' },
  disponivel: { icon: CircleDashed, badge: 'bg-transparent text-foreground border-tinta border-dashed', accent: 'border-l-tinta', iconColor: 'text-tinta' },
  bloqueada: { icon: Lock, badge: 'bg-muted text-grafite border-pauta', accent: 'border-l-pauta', iconColor: 'text-grafite' },
  reprovada: { icon: CircleX, badge: 'bg-correcao text-white border-correcao', accent: 'border-l-correcao', iconColor: 'text-correcao' },
};
