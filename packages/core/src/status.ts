import type { Status } from './schemas';

const RAW_TO_STATUS: Record<string, Status> = {
  aprovado: 'aprovado',
  dispnota: 'disp_nota',
  equivalenc: 'equivalencia',
  equivalencia: 'equivalencia',
  transfreal: 'transf_real',
  dispcalend: 'disp_calend',
  disp: 'disp',
  matricula: 'matriculado',
  matriculado: 'matriculado',
  repronota: 'reprovado_nota',
  reprofreq: 'reprovado_freq',
  trancado: 'trancado',
  tranc: 'trancado',
};

function normalize(raw: string): string {
  return raw.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z]/gi, '').toLowerCase();
}

export function mapStatus(raw: string): Status {
  return RAW_TO_STATUS[normalize(raw)] ?? 'desconhecido';
}

const COMPLETED = new Set<Status>(['aprovado', 'disp_nota', 'equivalencia', 'transf_real', 'disp_calend', 'disp']);
const IN_CR = new Set<Status>(['aprovado', 'disp_nota', 'transf_real', 'reprovado_nota', 'reprovado_freq']);
const FAILED = new Set<Status>(['reprovado_nota', 'reprovado_freq']);

export const isCompleted = (s: Status): boolean => COMPLETED.has(s);
export const countsInCr = (s: Status): boolean => IN_CR.has(s);
export const isFailed = (s: Status): boolean => FAILED.has(s);
export const isInProgress = (s: Status): boolean => s === 'matriculado';

export const STATUS_LABELS: Record<Status, string> = {
  aprovado: 'Aprovado',
  disp_nota: 'Dispensa com nota',
  equivalencia: 'Equivalência',
  transf_real: 'Transferência',
  disp_calend: 'Dispensa (calendário)',
  disp: 'Dispensa',
  matriculado: 'Matriculado',
  reprovado_nota: 'Reprovado por nota',
  reprovado_freq: 'Reprovado por falta',
  trancado: 'Trancado',
  desconhecido: 'Situação não reconhecida',
};
