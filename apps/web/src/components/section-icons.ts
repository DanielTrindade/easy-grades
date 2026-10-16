import { BookOpen, CalendarDays, LayoutDashboard, Workflow, type LucideIcon } from 'lucide-react';
import type { View } from '@/lib/use-hash-view';

export const SECTION_ICONS: Record<View, LucideIcon> = {
  'visao-geral': LayoutDashboard,
  fluxograma: Workflow,
  disciplinas: BookOpen,
  planejamento: CalendarDays,
};
