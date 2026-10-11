import { describe, expect, it } from 'vitest';
import { addTerms, compareTerms, formatTerm, nextTerm, termFromAdmission, termFromLabel, termIndex } from './terms';

describe('terms', () => {
  it('parses "Periodo" labels from the transcript', () => {
    expect(termFromLabel('Periodo: 1° Semestre de 2024')).toBe('2024.1');
    expect(termFromLabel('Periodo: 2º Semestre de 2026')).toBe('2026.2');
    expect(termFromLabel('Periodo: qualquer coisa')).toBeNull();
  });
  it('parses the admission label', () => {
    expect(termFromAdmission('2024/1° Semestre')).toBe('2024.1');
    expect(termFromAdmission('sem data')).toBeNull();
  });
  it('orders and advances terms', () => {
    expect(termIndex('2024.2') - termIndex('2024.1')).toBe(1);
    expect(compareTerms('2025.1', '2024.2')).toBeGreaterThan(0);
    expect(nextTerm('2024.1')).toBe('2024.2');
    expect(nextTerm('2024.2')).toBe('2025.1');
    expect(addTerms('2024.1', 11)).toBe('2029.2');
    expect(formatTerm('2025.1')).toBe('2025/1');
  });
});
