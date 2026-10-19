import type { Cell } from './build-pdf';

/** Synthetic "Currículo de Curso" laid out with the coordinates measured on real e-Campus PDFs. */
type Course = [period: number | null, code: string, name: string, credits: number, theory: number, practice: number, extension: number, prereqs: [string, number | null][]];

function columnHeader(y: number): Cell[] {
  return [
    { x: 24.4, y, text: 'PERÍODO' },
    { x: 78.5, y, text: 'CÓD.' },
    { x: 192, y, text: 'NOME DA DISCIPLINA' },
    { x: 367.1, y: y + 2, text: 'CRÉD.' },
    { x: 395.3, y: y + 2, text: 'TEOR.' },
    { x: 423.5, y: y + 2, text: 'PRAT.' },
    { x: 452.4, y: y + 2, text: 'EXTE.' },
    { x: 479.8, y: y + 2, text: 'TOTAL' },
    { x: 511.5, y, text: 'PRÉ-REQUISITO' },
  ];
}

/** Lays out courses top-down from `startY`; returns cells and the next free y. */
function courseRows(courses: Course[], startY: number): { cells: Cell[]; nextY: number } {
  const cells: Cell[] = [];
  let y = startY;
  for (const [period, code, name, credits, theory, practice, extension, prereqs] of courses) {
    if (period !== null) cells.push({ x: 36.8, y, text: String(period) });
    cells.push({ x: code.startsWith('ENADE') ? 70.3 : 74.9, y, text: code }, { x: 118, y, text: name });
    if (credits) cells.push({ x: 375.8, y, text: String(credits) });
    if (theory) cells.push({ x: 401.6, y, text: String(theory) });
    if (practice) cells.push({ x: 429.6, y, text: String(practice) });
    if (extension) cells.push({ x: 458.1, y, text: String(extension) });
    const total = theory + practice + extension;
    if (total) cells.push({ x: 487.1, y: y - 0.5, text: String(total) });
    // First prerequisite ~1.8pt above the baseline, extra ones stacked on the lines below.
    prereqs.forEach(([pre, block], k) => {
      const py = y + 1.77 - 15 * k;
      const label = block === null ? 'SEM BLOCO' : `BLOCO ${block}`;
      cells.push({ x: 512, y: py, text: pre }, { x: 547, y: py, text: label });
    });
    y -= 15 * Math.max(1, prereqs.length);
  }
  return { cells, nextY: y };
}

export function curriculumPages(opts: { courseCode?: string; version?: string } = {}): Cell[][] {
  const page1: Cell[] = [
    { x: 182, y: 797, text: 'UNIVERSIDADE FEDERAL DO AMAZONAS' },
    { x: 182.6, y: 769.7, text: 'Currículo de Curso (por versão e situação)' },
    { x: 21, y: 730.7, text: 'Curso:' },
    { x: 66, y: 730.7, text: `${opts.courseCode ?? 'IE17'} - Engenharia de Software` },
    { x: 454, y: 730.7, text: 'Versão:' },
    { x: 500, y: 730.7, text: opts.version ?? '2025/2' },
    ...columnHeader(661.6),
    { x: 261.5, y: 640, text: 'OBRIGATÓRIAS' },
  ];
  const mandatory = courseRows(
    [
      [1, 'ICC001', 'INTRODUÇÃO À COMPUTAÇÃO', 5, 60, 30, 0, []],
      [1, 'ICC120', 'MATEMÁTICA DISCRETA', 4, 60, 0, 0, []],
      [2, 'ICC002', 'ALGORITMOS E ESTRUTURA DE DADOS I', 5, 60, 30, 0, [['ICC001', 1]]],
      [2, 'ICC040', 'LINGUAGENS FORMAIS E AUTÔMATOS', 4, 60, 0, 0, [['ICC120', 1]]],
      [3, 'ICC044', 'COMPILADORES', 4, 60, 0, 0, [['ICC040', 1], ['ICC120', 2]]],
      [8, 'ICC150', 'TRABALHO DE CONCLUSÃO DE CURSO', 5, 0, 150, 0, [['ICC107', 1], ['ICC431', 1]]],
      [8, 'ICC418', 'PROJETOS PRÁTICOS EM ENGENHARIA DE SOFTWARE', 5, 0, 150, 0, [['ICC412', 1]]],
      [null, 'ENADE01', 'ENADE - INGRESSANTE', 0, 0, 0, 0, []],
    ],
    625,
  );
  page1.push(...mandatory.cells, { x: 25, y: mandatory.nextY, text: 'TOTAL' }, { x: 371.3, y: mandatory.nextY, text: '140' });

  const page2: Cell[] = [...columnHeader(801.6), { x: 272, y: 780, text: 'ELETIVAS' }];
  const electives = courseRows(
    [
      [null, 'ICC004', 'ALGORITMOS E ESTRUTURA DE DADOS AVANÇADOS', 4, 60, 0, 0, []],
      [null, 'ICC010', 'PROGRAMAÇÃO PARA WEB II', 4, 60, 0, 0, [['ICC007', 1]]],
    ],
    765,
  );
  page2.push(...electives.cells, { x: 270.8, y: electives.nextY - 10, text: 'OPTATIVAS' });
  const optional = courseRows([[null, 'IHP123', 'LINGUA BRASILEIRA DE SINAIS B', 4, 60, 0, 0, []]], electives.nextY - 25);
  page2.push(...optional.cells, { x: 207.5, y: optional.nextY - 10, text: 'ATIVIDADE CURRICULAR DE EXTENSÃO' });
  const extension = courseRows([[5, 'ICC606', 'PRÁTICAS EXTENSIONISTAS EM COMPUTAÇÃO VII', 6, 0, 0, 90, [['ICC001', 1]]]], optional.nextY - 25);
  page2.push(...extension.cells);

  const footer: [string, string, number][] = [
    ['CARGA HORÁRIA TOTAL', '3200', 424.65],
    ['CARGA HORÁRIA DE OPTATIVAS', '180', 410.65],
    ['CARGA HORÁRIA DE OBRIGATÓRIAS', '2370', 397.65],
    ['CARGA HORÁRIA DE ELETIVAS', '120', 384.65],
    ['CARGA HORÁRIA DE ATIVIDADES-ACADÊMICO-', '210', 371.65],
    ['CARGA HORÁRIA DE ATIVIDADE CURRICULAR DE', '320', 350.65],
    ['MÍNIMO DE PERÍODOS', '8', 325.65],
    ['MÁXIMO DE PERÍODOS', '12', 312.65],
  ];
  for (const [label, value, y] of footer) {
    const labelY = label.includes('ATIVIDADE') ? y + 1 : y;
    page2.push({ x: 25, y: labelY, text: label }, { x: 258, y, text: '=' }, { x: 268, y, text: value });
  }
  const credits: [string, string, number][] = [
    ['TOTAL DE CRÉDITOS', '150', 423.65],
    ['CRÉDITOS DE OPTATIVAS', '6', 410.65],
    ['CRÉDITOS DE OBRIGATÓRIAS', '140', 397.65],
    ['CRÉDITOS DE ELETIVAS', '4', 384.65],
  ];
  for (const [label, value, y] of credits) page2.push({ x: 325, y: y + 1, text: label }, { x: 526, y, text: '=' }, { x: 536, y, text: value });
  page2.push(
    { x: 25, y: 281.65, text: 'MÍNIMO DE CRÉDITOS' },
    { x: 258, y: 281.65, text: '= 12' },
    { x: 25, y: 265.65, text: 'MÁXIMO DE CRÉDITOS' },
    { x: 258, y: 265.65, text: '= 30' },
  );
  return [page1, page2];
}

/**
 * A matrix that does not group prerequisites into blocks — e-Campus prints `SEM BLOCO` instead of `BLOCO n` —
 * carrying a legacy version. Modelled on the real report of FA01 (Administração), whose prerequisites all
 * print without a block number.
 */
export function semBlocoCurriculumPages(
  opts: { courseCode?: string; courseName?: string; version?: string } = {},
): Cell[][] {
  const page: Cell[] = [
    { x: 182, y: 797, text: 'UNIVERSIDADE FEDERAL DO AMAZONAS' },
    { x: 182.6, y: 769.7, text: 'Currículo de Curso (por versão e situação)' },
    { x: 21, y: 730.7, text: 'Curso:' },
    { x: 66, y: 730.7, text: `${opts.courseCode ?? 'FA01'} - ${opts.courseName ?? 'Administração'}` },
    { x: 454, y: 730.7, text: 'Versão:' },
    { x: 500, y: 730.7, text: opts.version ?? '1981' },
    ...columnHeader(661.6),
    { x: 261.5, y: 640, text: 'OBRIGATÓRIAS' },
  ];
  const courses = courseRows(
    [
      [1, 'FAA501', 'ADMINISTRAÇÃO FINANCEIRA', 4, 60, 0, 0, []],
      [2, 'FAA502', 'CONTABILIDADE GERAL', 4, 60, 0, 0, [['FAA501', null]]],
      [3, 'FAA503', 'AUDITORIA', 4, 60, 0, 0, [['FAA502', null], ['FAA501', null]]],
      [4, 'FAA504', 'ADMINISTRAÇÃO PÚBLICA', 4, 60, 0, 0, [['FAA503', 1]]],
    ],
    625,
  );
  page.push(...courses.cells, { x: 25, y: courses.nextY, text: 'TOTAL' }, { x: 371.3, y: courses.nextY, text: '16' });
  page.push(
    { x: 25, y: 350.65, text: 'CARGA HORÁRIA TOTAL' },
    { x: 258, y: 350.65, text: '=' },
    { x: 268, y: 350.65, text: '960' },
    { x: 25, y: 337.65, text: 'CARGA HORÁRIA DE OBRIGATÓRIAS' },
    { x: 258, y: 337.65, text: '=' },
    { x: 268, y: 337.65, text: '960' },
    { x: 325, y: 350.65, text: 'TOTAL DE CRÉDITOS' },
    { x: 526, y: 350.65, text: '=' },
    { x: 536, y: 350.65, text: '16' },
  );
  return [page];
}
