import type { Cell } from './build-pdf';

/** Fake personal data. The parser must never let any of these strings reach its output. */
export const FAKE_PII = [
  'FULANO DE TAL FICTICIO',
  '99999999',
  '123.456.789-00',
  '01/01/2000',
  'MAE FICTICIA DA SILVA',
  '1234567 / SSP-AM',
  'SISU - AMPLA CONCORRENCIA',
  'PROFESSORA FICTICIA',
  'Doutorado',
  'Sem Evasão',
];

function studentHeader(opts: { courseCode: string; version: string }): Cell[] {
  return [
    { x: 197.6, y: 800, text: 'UNIVERSIDADE FEDERAL DO AMAZONAS' },
    { x: 230, y: 760, text: 'Histórico Escolar Analítico' },
    { x: 21, y: 720, text: 'Aluno:' },
    { x: 89, y: 720, text: '99999999 - FULANO DE TAL FICTICIO' },
    { x: 340, y: 720, text: 'Data de Nascimento:' },
    { x: 430, y: 720, text: '01/01/2000' },
    { x: 340, y: 705, text: 'CPF:' },
    { x: 370, y: 705, text: '123.456.789-00' },
    { x: 21, y: 700, text: 'Documento de' },
    { x: 89, y: 695, text: '1234567 / SSP-AM' },
    { x: 21, y: 680, text: 'Filiação:' },
    { x: 89, y: 680, text: 'MAE FICTICIA DA SILVA' },
    { x: 22, y: 650.08, text: 'Curso:' },
    { x: 89, y: 649.73, text: `${opts.courseCode} - Engenharia de Software` },
    { x: 21, y: 591.08, text: 'Forma de Ingresso:' },
    { x: 89, y: 590.73, text: 'SISU - AMPLA CONCORRENCIA' },
    { x: 340, y: 591.08, text: 'Versão (Currículo) :' },
    { x: 409, y: 590.73, text: opts.version },
    { x: 21, y: 576.08, text: 'Situação do Aluno:' },
    { x: 89, y: 575.73, text: 'Sem Evasão' },
    { x: 339, y: 576.08, text: 'Ano/Período Ingresso:' },
    { x: 417, y: 575.73, text: '2024/1° Semestre' },
  ];
}

function entry(y: number, code: string, name: string, credits: string, hours: string, grade: string, status: string): Cell[] {
  const cells: Cell[] = [
    { x: 19, y, text: code },
    { x: 70, y, text: name },
    { x: credits.length > 1 ? 392.1 : 396.6, y, text: credits },
    { x: hours.length > 2 ? 419.7 : 424.1, y, text: hours },
  ];
  if (grade) cells.push({ x: grade.length > 4 ? 462 : 466.4, y, text: grade });
  if (status) cells.push({ x: 498, y, text: status });
  return cells;
}

function teacher(y: number): Cell[] {
  return [
    { x: 70, y: y - 13, text: 'Docente(s):' },
    { x: 480, y: y - 13, text: 'Titulação:' },
    { x: 70, y: y - 26, text: 'PROFESSORA FICTICIA' },
    { x: 480, y: y - 26, text: 'Doutorado' },
  ];
}

// x of the six summary-table columns: CH exigida, CH realizada, % CH, créditos exigidos, créditos realizados, % créditos.
const SUMMARY_X = [232.8, 296, 348.2, 416.5, 477.5, 530] as const;

function summaryRow(label: string, y: number, values: readonly string[], valuesDy = 0): Cell[] {
  return [
    { x: 23, y, text: label },
    ...values.flatMap((text, i) => (text ? [{ x: SUMMARY_X[i]!, y: y + valuesDy, text }] : [])),
  ];
}

/** Summary table at the end of the body. `partial` leaves the ELETIVAS credit cells empty. */
function summaryTable(mode: 'full' | 'partial' | 'none'): Cell[] {
  if (mode === 'none') return [];
  return [
    { x: 23, y: 290, text: 'COMPONENTES CURRICULARES' },
    ...summaryRow('DISCIPLINAS OBRIGATÓRIAS', 272, ['2370', '1830', '77,22 %', '140', '114', '81,43 %']),
    ...summaryRow('DISCIPLINAS OPTATIVAS', 258, ['180', '180', '100,00 %', '6', '6', '100,00 %']),
    ...summaryRow('DISCIPLINAS ELETIVAS', 244, ['120', '60', '50,00 %', mode === 'partial' ? '' : '4', mode === 'partial' ? '' : '2', mode === 'partial' ? '' : '50,00 %']),
    ...summaryRow('ATIVIDADE CURRICULAR DE EXTENSÃO', 230, ['320', '0', '0,00 %', '0', '0', '0,00 %']),
    // The AACC values sit ~4.7 pt below the label, and the label wraps onto a second line ("CULTURAIS").
    ...summaryRow('ATIVIDADES-ACADÊMICO-CIENTÍFICO-', 216, ['210', '30', '14,29 %', '0', '0', '0,00 %'], -4.7),
    { x: 23, y: 207, text: 'CULTURAIS' },
    ...summaryRow('TOTAL', 190, ['3200', '2100', '65,63 %', '150', '122', '81,33 %']),
  ];
}

/** ENADE block after the summary table: header row, then one label row per exam status. */
function enadeBlock(): Cell[] {
  return [
    { x: 23, y: 165, text: 'ENADE' },
    { x: 290, y: 165, text: 'ANO' },
    { x: 362, y: 165, text: 'SITUAÇÃO' },
    { x: 23, y: 150, text: 'INGRESSANTE' },
    { x: 290, y: 150, text: '2024' },
    { x: 362, y: 150, text: 'Dispensado em razão' },
    { x: 440, y: 150, text: 'calendário trienal' },
  ];
}

export function transcriptPages(
  opts: { courseCode?: string; version?: string; table?: 'full' | 'partial' | 'none'; enade?: boolean } = {},
): Cell[][] {
  const header = studentHeader({ courseCode: opts.courseCode ?? 'IE17', version: opts.version ?? '2025/2' });
  const page1: Cell[] = [
    ...header,
    { x: 20, y: 555.65, text: 'Código' },
    { x: 82, y: 555.65, text: 'Nome da Disciplina/Atividade' },
    { x: 387.5, y: 555.65, text: 'CR.' },
    { x: 415.5, y: 555.65, text: 'C.H.' },
    { x: 457.3, y: 555.65, text: 'Média' },
    { x: 498, y: 555.65, text: 'Situação' },
    { x: 197.6, y: 532.7, text: 'ATIVIDADE CURRICULAR DE EXTENSÃO' },
    { x: 19, y: 511.65, text: 'Periodo: 2° Semestre de 2026' },
    ...entry(496.57, 'ICC600', 'PRÁTICAS EXTENSIONISTAS EM COMPUTAÇÃO I', '12', '180', '*****', 'Matricula'),
    ...teacher(496.57),
    { x: 178.7, y: 440, text: 'Disciplinas Externas - Origem do Aproveitamento' },
    { x: 19, y: 420, text: 'Periodo: 1° Semestre de 2024' },
    ...entry(405, 'ICC020', 'INTRODUÇAO A PROGRAMAÇÃO', '5', '90', '9.50', 'Aprovado'),
    { x: 261.5, y: 365, text: 'OBRIGATÓRIAS' },
    { x: 19, y: 350, text: 'Periodo: 1° Semestre de 2024' },
    { x: 19, y: 335, text: 'ENADE01' },
    { x: 70, y: 335, text: 'ENADE - INGRESSANTE' },
    { x: 394.8, y: 335, text: '**' },
    { x: 426.8, y: 335, text: '**' },
    { x: 466.4, y: 335, text: '*****' },
    { x: 498, y: 335, text: 'DispCalend' },
    { x: 562, y: 335, text: '(1)' },
    ...entry(310, 'ICC001', 'INTRODUÇÃO À COMPUTAÇÃO', '5', '90', '9.50', 'Equivalenc'),
    ...teacher(310),
    ...entry(260, 'ICC002', 'ALGORITMOS E ESTRUTURA DE DADOS I', '5', '90', '8.10', 'TransfReal'),
    { x: 19, y: 230, text: 'Periodo: 2° Semestre de 2024' },
    ...entry(215, 'ICC120', 'MATEMÁTICA DISCRETA', '4', '60', '2.30', 'Repro Nota'),
    ...entry(195, 'ICC040', 'LINGUAGENS FORMAIS E AUTÔMATOS', '4', '60', '10.00', 'Aprovado'),
  ];

  const page2: Cell[] = [
    ...header,
    { x: 19, y: 560, text: 'Periodo: 2° Semestre de 2026' },
    ...entry(545, 'ICC003', 'ALGORITMOS E ESTRUTURAS DE DADOS II', '5', '90', '*****', 'Matricula'),
    { x: 267.9, y: 515, text: 'OPTATIVAS' },
    { x: 19, y: 495, text: 'Periodo: 2° Semestre de 2025' },
    ...entry(480, 'IHP123', 'LINGUA BRASILEIRA DE SINAIS B', '4', '60', '7.00', 'Disp Nota'),
    ...entry(460, 'FAA011', 'INTRODUÇÃO À ADMINISTRAÇÃO', '4', '60', '3.00', 'Cancelado'),
    { x: 194, y: 430, text: 'DISCIPLINAS A VENCER (OBRIGATÓRIAS)' },
    { x: 20, y: 412, text: 'Código' },
    { x: 70, y: 412, text: 'Nome da Disciplina/Atividade' },
    { x: 19, y: 395, text: 'Período Ideal: 8' },
    ...entry(380, 'ICC150', 'TRABALHO DE CONCLUSÃO DE CURSO', '5', '150', '', ''),
    { x: 19, y: 360, text: 'Período Ideal:' },
    { x: 19, y: 345, text: 'ENADE02' },
    { x: 70, y: 345, text: 'ENADE - CONCLUINTE' },
    { x: 163.6, y: 320, text: '** COEFICIENTE DE RENDIMENTO ESCOLAR = 7.250 **' },
    ...summaryTable(opts.table ?? 'full'),
    ...(opts.enade === false ? [] : enadeBlock()),
  ];

  const page3: Cell[] = [
    ...header,
    { x: 259.6, y: 557.6, text: 'OBSERVAÇÕES' },
    { x: 20, y: 540, text: 'A disciplina ICC001 - INTRODUÇÃO À COMPUTAÇÃO foi o aproveitamento de estudo realizado pela(s)' },
    { x: 20, y: 528, text: 'FAE011 - INTRODUCÃO À ECONOMIA.' },
  ];
  return [page1, page2, page3];
}
