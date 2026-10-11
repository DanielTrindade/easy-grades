import { describe, expect, it } from 'vitest';
import { countsInCr, isCompleted, isFailed, isInProgress, mapStatus } from './status';

describe('mapStatus', () => {
  it.each([
    ['Aprovado', 'aprovado'],
    ['Disp Nota', 'disp_nota'],
    ['Equivalenc', 'equivalencia'],
    ['TransfReal', 'transf_real'],
    ['DispCalend', 'disp_calend'],
    ['Disp', 'disp'],
    ['Matricula', 'matriculado'],
    ['Repro Nota', 'reprovado_nota'],
    ['Repro Freq', 'reprovado_freq'],
    ['Trancado', 'trancado'],
  ])('maps %s', (raw, expected) => {
    expect(mapStatus(raw)).toBe(expected);
  });

  it('[RF-1] maps unknown statuses to desconhecido', () => {
    expect(mapStatus('Cancelado')).toBe('desconhecido');
    expect(mapStatus('')).toBe('desconhecido');
  });

  it('classifies statuses', () => {
    expect(isCompleted('equivalencia')).toBe(true);
    expect(countsInCr('equivalencia')).toBe(false);
    expect(countsInCr('reprovado_nota')).toBe(true);
    expect(isFailed('reprovado_freq')).toBe(true);
    expect(isInProgress('matriculado')).toBe(true);
    expect(isCompleted('desconhecido')).toBe(false);
    expect(countsInCr('desconhecido')).toBe(false);
  });
});
