import type { CourseState } from '@easy-grades/core';
import { CircleCheck, CircleDashed, CircleDot, CircleX, Lock, type LucideIcon } from 'lucide-react';

export interface StateStyle {
  icon: LucideIcon;
  badge: string;
  accent: string;
  iconColor: string;
}

/** Status is always color + icon + text, never color alone. */
export const STATE_STYLE: Record<CourseState, StateStyle> = {
  concluida: { icon: CircleCheck, badge: 'bg-igapo text-primary-foreground border-igapo', accent: 'border-l-igapo', iconColor: 'text-igapo' },
  em_curso: { icon: CircleDot, badge: 'bg-solimoes text-[#2b2118] border-solimoes', accent: 'border-l-solimoes', iconColor: 'text-solimoes' },
  disponivel: { icon: CircleDashed, badge: 'bg-transparent text-foreground border-vitoria border-dashed', accent: 'border-l-vitoria', iconColor: 'text-vitoria' },
  bloqueada: { icon: Lock, badge: 'bg-muted text-muted-foreground border-neblina', accent: 'border-l-neblina', iconColor: 'text-neblina' },
  reprovada: { icon: CircleX, badge: 'bg-urucum text-white border-urucum', accent: 'border-l-urucum', iconColor: 'text-urucum' },
};
