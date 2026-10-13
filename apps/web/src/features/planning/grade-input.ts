import { clampGrade } from './planning-state';

/** Reads what the student typed: comma or dot, clamped to 0–10. Null when it is not a number. */
export function parseGradeInput(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '' || !/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return clampGrade(Number(normalized));
}

/** Shows the grade with one decimal and a comma, as pt-BR writes it. */
export const formatGradeInput = (value: number): string => value.toFixed(1).replace('.', ',');

export const stepGrade = (value: number, delta: number): number => clampGrade(value + delta);
