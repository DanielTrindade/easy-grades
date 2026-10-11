import { describe, expect, it } from 'vitest';
import { formatCr, formatHours, formatPercent, toTitleCase } from './format';
import { viewFromHash } from './use-hash-view';

describe('format', () => {
  it('formats numbers the Brazilian way', () => {
    expect(formatCr(7.456)).toBe('7,456');
    expect(formatCr(null)).toBe('sem nota');
    expect(formatPercent(64.69)).toBe('64,69%');
    expect(formatHours(3200)).toBe('3.200 h');
  });

  it('title-cases course names keeping roman numerals and connectives', () => {
    expect(toTitleCase('ALGORITMOS E ESTRUTURAS DE DADOS II')).toBe('Algoritmos e Estruturas de Dados II');
    expect(toTitleCase('INTRODUÇÃO À COMPUTAÇÃO')).toBe('Introdução à Computação');
    expect(toTitleCase('LABORATÓRIO DE PROGRAMAÇÃO A')).toBe('Laboratório de Programação A');
  });
});

describe('viewFromHash', () => {
  it('reads known views and falls back to the overview', () => {
    expect(viewFromHash('#/fluxograma')).toBe('fluxograma');
    expect(viewFromHash('#/qualquer')).toBe('visao-geral');
    expect(viewFromHash('')).toBe('visao-geral');
  });
});
