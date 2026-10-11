import type { Curriculum, RequirementKey, Transcript } from './schemas';
import { isCompleted } from './status';

export interface CategoryProgress {
  key: RequirementKey;
  label: string;
  requiredHours: number;
  doneHours: number;
  rawHours: number;
  percent: number;
}
export interface Progress {
  categories: CategoryProgress[];
  requiredHours: number;
  doneHours: number;
  percent: number;
  officialPercent: number | null;
  divergent: boolean;
}

export const REQUIREMENT_LABELS: Record<RequirementKey, string> = {
  obrigatoria: 'Obrigatórias',
  optativa: 'Optativas',
  eletiva: 'Eletivas',
  aacc: 'Atividades complementares',
  extensao: 'Extensão',
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const pct = (done: number, required: number) => (required === 0 ? 100 : round2((done / required) * 100));

function completedHours(t: Transcript, category: 'obrigatoria' | 'optativa' | 'eletiva' | 'extensao'): number {
  return t.entries
    .filter((e) => e.category === category && isCompleted(e.status))
    .reduce((sum, e) => sum + (e.hours ?? 0), 0);
}

export function computeProgress(c: Curriculum, t: Transcript): Progress {
  const raw: Record<RequirementKey, number> = {
    obrigatoria: completedHours(t, 'obrigatoria'),
    optativa: completedHours(t, 'optativa'),
    eletiva: completedHours(t, 'eletiva'),
    extensao: Math.max(completedHours(t, 'extensao'), t.extensaoDoneHours ?? 0),
    aacc: t.aaccDoneHours ?? 0,
  };
  const keys: RequirementKey[] = ['obrigatoria', 'optativa', 'eletiva', 'aacc', 'extensao'];
  const categories = keys.map((key) => {
    const requiredHours = c.requirements.byCategory[key].hours;
    const doneHours = Math.min(raw[key], requiredHours);
    return { key, label: REQUIREMENT_LABELS[key], requiredHours, rawHours: raw[key], doneHours, percent: pct(doneHours, requiredHours) };
  });
  const doneHours = categories.reduce((s, x) => s + x.doneHours, 0);
  const requiredHours = c.requirements.totalHours;
  const percent = pct(doneHours, requiredHours);
  const officialPercent = t.officialProgressPercent;
  return {
    categories,
    requiredHours,
    doneHours,
    percent,
    officialPercent,
    divergent: officialPercent !== null && Math.abs(officialPercent - percent) > 0.5,
  };
}
