import { describe, expect, it } from 'vitest';
import { formatGradeInput, parseGradeInput, stepGrade } from './grade-input';

describe('parseGradeInput', () => {
  it('accepts a comma or a dot as the decimal separator', () => {
    expect(parseGradeInput('7,5')).toBe(7.5);
    expect(parseGradeInput('7.5')).toBe(7.5);
    expect(parseGradeInput(' 8 ')).toBe(8);
  });

  it('clamps to 0..10', () => {
    expect(parseGradeInput('12')).toBe(10);
    expect(parseGradeInput('-3')).toBe(0);
  });

  it('rounds to one decimal, the step of the control', () => {
    expect(parseGradeInput('7,26')).toBe(7.3);
  });

  it('returns null for text that is not a number', () => {
    expect(parseGradeInput('')).toBeNull();
    expect(parseGradeInput('   ')).toBeNull();
    expect(parseGradeInput('abc')).toBeNull();
    expect(parseGradeInput('7,5,1')).toBeNull();
  });
});

describe('formatGradeInput and stepGrade', () => {
  it('shows the grade with one decimal and a comma', () => {
    expect(formatGradeInput(8)).toBe('8,0');
    expect(formatGradeInput(7.25)).toBe('7,3');
  });

  it('steps by 0.1 and stays inside 0..10', () => {
    expect(stepGrade(7.9, 0.1)).toBe(8);
    expect(stepGrade(0, -0.1)).toBe(0);
    expect(stepGrade(10, 0.1)).toBe(10);
  });
});
