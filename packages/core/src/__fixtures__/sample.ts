/**
 * FICTIONAL student on the real (public) IE17 2025/2 curriculum. Grades, external courses and optional course
 * codes are invented; no real transcript data lives in this repository. The official CR/percent below are what
 * an e-Campus transcript for this fictional history would print (computed with the documented formula).
 */
import type { Category, Curriculum, CurriculumCourse, Transcript, TranscriptEntry } from '../schemas';
import { mapStatus } from '../status';

type C = [code: string, name: string, period: number | null, credits: number, theory: number, practice: number, extension: number, prereqs: string[][]];

function course(category: Category, [code, name, period, credits, theory, practice, extension, prereqs]: C): CurriculumCourse {
  return {
    code, name, category, idealPeriod: period, credits,
    hours: { theory, practice, extension, total: theory + practice + extension },
    prerequisites: prereqs,
  };
}

const mandatory: C[] = [
  ['ICC001', 'INTRODUÇÃO À COMPUTAÇÃO', 1, 5, 60, 30, 0, []],
  ['ICC112', 'TEXTOS ACADÊMICOS EM COMPUTAÇÃO', 1, 3, 30, 30, 0, []],
  ['ICC114', 'COMPUTAÇÃO E UNIVERSIDADE', 1, 4, 60, 0, 0, []],
  ['ICC120', 'MATEMÁTICA DISCRETA', 1, 4, 60, 0, 0, []],
  ['IEM075', 'CÁLCULO DIFERENCIAL E INTEGRAL I', 1, 4, 60, 0, 0, []],
  ['ICC002', 'ALGORITMOS E ESTRUTURA DE DADOS I', 2, 5, 60, 30, 0, [['ICC001']]],
  ['ICC040', 'LINGUAGENS FORMAIS E AUTÔMATOS', 2, 4, 60, 0, 0, [['ICC120']]],
  ['ICC107', 'METODOLOGIA CIENTÍFICA EM COMPUTAÇÃO', 2, 4, 60, 0, 0, []],
  ['ICC260', 'FUNDAMENTOS DE INTELIGÊNCIA ARTIFICIAL', 2, 4, 60, 0, 0, [['ICC120']]],
  ['IEM012', 'ÁLGEBRA LINEAR I', 2, 4, 60, 0, 0, []],
  ['IEM076', 'CÁLCULO DIFERENCIAL E INTEGRAL II', 2, 4, 60, 0, 0, [['IEM075']]],
  ['ICC003', 'ALGORITMOS E ESTRUTURAS DE DADOS II', 3, 5, 60, 30, 0, [['ICC002']]],
  ['ICC066', 'INTRODUÇÃO A ORGANIZAÇÃO DE COMPUTADORES', 3, 4, 60, 0, 0, []],
  ['ICC430', 'ENGENHARIA DE SOFTWARE I', 3, 4, 60, 0, 0, [['ICC001']]],
  ['IEE001', 'PROBABILIDADE E ESTATISTICA', 3, 4, 60, 0, 0, []],
  ['IEM022', 'ÁLGEBRA LINEAR II', 3, 4, 60, 0, 0, [['IEM012']]],
  ['ICC027', 'PROGRAMAÇÃO ORIENTADA A OBJETOS', 4, 3, 30, 30, 0, [['ICC002']]],
  ['ICC065', 'SISTEMAS OPERACIONAIS I', 4, 4, 60, 0, 0, [['ICC066']]],
  ['ICC205', 'INTRODUÇÃO A BANCO DE DADOS', 4, 4, 60, 0, 0, [['ICC003']]],
  ['ICC253', 'CIÊNCIA DE DADOS', 4, 3, 30, 30, 0, [['ICC002']]],
  ['ICC431', 'ENGENHARIA DE SOFTWARE II', 4, 4, 60, 0, 0, [['ICC430']]],
  ['ICC045', 'LINGUAGENS DE PROGRAMAÇÃO', 5, 4, 60, 0, 0, [['ICC003']]],
  ['ICC309', 'REDES DE COMPUTADORES', 5, 4, 60, 0, 0, [['ICC002']]],
  ['ICC404', 'GERÊNCIA DE PROJETOS', 5, 4, 60, 0, 0, [['ICC431']]],
  ['ICC408', 'VERIFICAÇÃO E VALIDAÇÃO DE SOFTWARE', 5, 4, 60, 0, 0, [['ICC430']]],
  ['ICC006', 'PROJETO E ANÁLISE DE ALGORITMOS', 6, 4, 60, 0, 0, [['ICC003']]],
  ['ICC330', 'FUNDAMENTOS DE CIBERSEGURANÇA E DESENVOLVIMENTO', 6, 4, 60, 0, 0, [['ICC003']]],
  ['ICC412', 'PROCESSO DE DESENVOLVIMENTO DE SOFTWARE', 6, 4, 60, 0, 0, [['ICC430']]],
  ['ICC417', 'GERÊNCIA DE CONFIGURAÇÃO', 6, 3, 30, 30, 0, [['ICC431']]],
  ['ICC007', 'PROGRAMAÇÃO PARA WEB', 7, 3, 30, 30, 0, [['ICC205']]],
  ['ICC406', 'INTERAÇÃO HUMANO-COMPUTADOR', 7, 4, 60, 0, 0, [['ICC430']]],
  ['ICC103', 'EMPREENDEDORISMO EM INFORMÁTICA', 8, 4, 60, 0, 0, []],
  ['ICC106', 'COMPUTAÇÃO, ÉTICA E SOCIEDADE', 8, 4, 60, 0, 0, []],
  ['ICC150', 'TRABALHO DE CONCLUSÃO DE CURSO', 8, 5, 0, 150, 0, [['ICC107', 'ICC431']]],
  ['ICC418', 'PROJETOS PRÁTICOS EM ENGENHARIA DE SOFTWARE', 8, 5, 0, 150, 0, [['ICC412']]],
  ['ENADE01', 'ENADE - INGRESSANTE', null, 0, 0, 0, 0, []],
  ['ENADE02', 'ENADE - CONCLUINTE', null, 0, 0, 0, 0, []],
];

const electives: C[] = [
  ['ICC004', 'ALGORITMOS E ESTRUTURA DE DADOS AVANÇADOS', null, 4, 60, 0, 0, []],
  ['ICC010', 'PROGRAMAÇÃO PARA WEB II', null, 4, 60, 0, 0, [['ICC007']]],
  ['ICC014', 'LABORATÓRIO DE PROGRAMAÇÃO AVANÇADA', null, 2, 0, 60, 0, [['ICC003']]],
];

const extension: C[] = [['ICC600', 'PRÁTICAS EXTENSIONISTAS EM COMPUTAÇÃO I', 7, 12, 0, 0, 180, [['ICC001']]]];
const optional: C[] = [['IHP123', 'LINGUA BRASILEIRA DE SINAIS B', null, 4, 60, 0, 0, []]];

export const sampleCurriculum: Curriculum = {
  courseCode: 'IE17',
  courseName: 'Engenharia de Software',
  version: '2025/2',
  courses: [
    ...mandatory.map((c) => course('obrigatoria', c)),
    ...electives.map((c) => course('eletiva', c)),
    ...extension.map((c) => course('extensao', c)),
    ...optional.map((c) => course('optativa', c)),
  ],
  requirements: {
    totalHours: 3200,
    totalCredits: 150,
    byCategory: {
      obrigatoria: { hours: 2370, credits: 140 },
      optativa: { hours: 180, credits: 6 },
      eletiva: { hours: 120, credits: 4 },
      aacc: { hours: 210, credits: 0 },
      extensao: { hours: 320, credits: 0 },
    },
    minPeriods: 8,
    maxPeriods: 12,
    minCreditsPerPeriod: 12,
    maxCreditsPerPeriod: 30,
  },
};

type E = [code: string, name: string, category: Category, term: string, credits: number | null, hours: number | null, grade: number | null, rawStatus: string];

const rawEntries: E[] = [
  ['ICC600', 'PRÁTICAS EXTENSIONISTAS EM COMPUTAÇÃO I', 'extensao', '2026.2', 12, 180, null, 'Matricula'],
  ['LNG101', 'INGLÊS INSTRUMENTAL', 'outros', '2024.1', 4, 60, 7.8, 'Disp Nota'],
  ['EXT101', 'INTRODUÇÃO À PROGRAMAÇÃO (OUTRA IES)', 'externa', '2024.1', 5, 90, 8.4, 'Aprovado'],
  ['EXT102', 'FUNDAMENTOS DE ENGENHARIA DE SOFTWARE (OUTRA IES)', 'externa', '2024.1', 4, 60, 7.25, 'Aprovado'],
  ['EXT103', 'LABORATÓRIO DE PROGRAMAÇÃO (OUTRA IES)', 'externa', '2024.2', 2, 60, 9.1, 'Aprovado'],
  ['EXT104', 'INFORMÁTICA E SOCIEDADE (OUTRA IES)', 'externa', '2025.1', 2, 30, 6.9, 'Aprovado'],
  ['ICC014', 'LABORATÓRIO DE PROGRAMAÇÃO AVANÇADA', 'eletiva', '2025.1', 2, 60, 8.65, 'Aprovado'],
  ['ENADE01', 'ENADE - INGRESSANTE', 'obrigatoria', '2024.1', null, null, null, 'DispCalend'],
  ['ICC002', 'ALGORITMOS E ESTRUTURA DE DADOS I', 'obrigatoria', '2024.1', 5, 90, 7.4, 'TransfReal'],
  ['ICC003', 'ALGORITMOS E ESTRUTURAS DE DADOS II', 'obrigatoria', '2024.1', 5, 90, 8.05, 'Disp Nota'],
  ['ICC120', 'MATEMÁTICA DISCRETA', 'obrigatoria', '2024.1', 4, 60, 6.7, 'Aprovado'],
  ['IEM012', 'ÁLGEBRA LINEAR I', 'obrigatoria', '2024.1', 4, 60, 9, 'Aprovado'],
  ['IEM022', 'ÁLGEBRA LINEAR II', 'obrigatoria', '2024.1', 4, 60, 8.8, 'TransfReal'],
  ['ICC205', 'INTRODUÇÃO A BANCO DE DADOS', 'obrigatoria', '2024.2', 4, 60, 7.15, 'Aprovado'],
  ['ICC406', 'INTERAÇÃO HUMANO-COMPUTADOR', 'obrigatoria', '2024.2', 4, 60, 8.9, 'Aprovado'],
  ['IEE001', 'PROBABILIDADE E ESTATISTICA', 'obrigatoria', '2024.2', 4, 60, 5.6, 'Disp Nota'],
  ['IEM075', 'CÁLCULO DIFERENCIAL E INTEGRAL I', 'obrigatoria', '2024.2', 4, 60, 6.35, 'Aprovado'],
  ['ICC001', 'INTRODUÇÃO À COMPUTAÇÃO', 'obrigatoria', '2025.1', 5, 90, 8.7, 'Equivalenc'],
  ['ICC007', 'PROGRAMAÇÃO PARA WEB', 'obrigatoria', '2025.1', 3, 60, 9.3, 'Aprovado'],
  ['ICC027', 'PROGRAMAÇÃO ORIENTADA A OBJETOS', 'obrigatoria', '2025.1', 3, 60, 7.9, 'Equivalenc'],
  ['ICC066', 'INTRODUÇÃO A ORGANIZAÇÃO DE COMPUTADORES', 'obrigatoria', '2025.1', 4, 60, 8.15, 'Aprovado'],
  ['ICC107', 'METODOLOGIA CIENTÍFICA EM COMPUTAÇÃO', 'obrigatoria', '2025.1', 4, 60, 9.4, 'Equivalenc'],
  ['ICC112', 'TEXTOS ACADÊMICOS EM COMPUTAÇÃO', 'obrigatoria', '2025.1', 3, 60, 7.6, 'Equivalenc'],
  ['ICC114', 'COMPUTAÇÃO E UNIVERSIDADE', 'obrigatoria', '2025.1', 4, 60, 8, 'Equivalenc'],
  ['ICC430', 'ENGENHARIA DE SOFTWARE I', 'obrigatoria', '2025.1', 4, 60, 8.25, 'Equivalenc'],
  ['IEM076', 'CÁLCULO DIFERENCIAL E INTEGRAL II', 'obrigatoria', '2025.1', 4, 60, 5.9, 'Disp Nota'],
  ['ICC040', 'LINGUAGENS FORMAIS E AUTÔMATOS', 'obrigatoria', '2025.2', 4, 60, 7.05, 'Disp Nota'],
  ['ICC065', 'SISTEMAS OPERACIONAIS I', 'obrigatoria', '2025.2', 4, 60, 6.8, 'Aprovado'],
  ['ICC106', 'COMPUTAÇÃO, ÉTICA E SOCIEDADE', 'obrigatoria', '2025.2', 4, 60, 9.2, 'Equivalenc'],
  ['ICC253', 'CIÊNCIA DE DADOS', 'obrigatoria', '2025.2', 3, 60, 8.45, 'Aprovado'],
  ['ICC260', 'FUNDAMENTOS DE INTELIGÊNCIA ARTIFICIAL', 'obrigatoria', '2025.2', 4, 60, 7.7, 'Aprovado'],
  ['ICC431', 'ENGENHARIA DE SOFTWARE II', 'obrigatoria', '2025.2', 4, 60, 8.6, 'Aprovado'],
  ['ICC045', 'LINGUAGENS DE PROGRAMAÇÃO', 'obrigatoria', '2026.1', 4, 60, 7.35, 'Aprovado'],
  ['ICC309', 'REDES DE COMPUTADORES', 'obrigatoria', '2026.1', 4, 60, 8.1, 'Aprovado'],
  ['ICC404', 'GERÊNCIA DE PROJETOS', 'obrigatoria', '2026.1', 4, 60, 9.05, 'Aprovado'],
  ['ICC408', 'VERIFICAÇÃO E VALIDAÇÃO DE SOFTWARE', 'obrigatoria', '2026.1', 4, 60, 7.85, 'Aprovado'],
  ['ICC417', 'GERÊNCIA DE CONFIGURAÇÃO', 'obrigatoria', '2026.1', 3, 60, 8.3, 'Aprovado'],
  ['ICC006', 'PROJETO E ANÁLISE DE ALGORITMOS', 'obrigatoria', '2026.2', 4, 60, null, 'Matricula'],
  ['ICC103', 'EMPREENDEDORISMO EM INFORMÁTICA', 'obrigatoria', '2026.2', 4, 60, null, 'Matricula'],
  ['ICC330', 'FUNDAMENTOS DE CIBERSEGURANÇA E DESENVOLVIMENTO SEGURO', 'obrigatoria', '2026.2', 4, 60, null, 'Matricula'],
  ['ICC412', 'PROCESSO DE DESENVOLVIMENTO DE SOFTWARE', 'obrigatoria', '2026.2', 4, 60, null, 'Matricula'],
  ['DO060', 'DISCIPLINA OPTATIVA - 60H', 'optativa', '2024.1', 4, 60, 9.5, 'Disp Nota'],
  ['OPT201', 'ECONOMIA BÁSICA', 'optativa', '2024.1', 4, 60, 8.2, 'Disp Nota'],
  ['DO060', 'DISCIPLINA OPTATIVA - 60H', 'optativa', '2024.2', 4, 60, 7.75, 'Disp Nota'],
  ['DO060', 'DISCIPLINA OPTATIVA - 60H', 'optativa', '2024.2', 4, 60, 8.95, 'Disp Nota'],
  ['DO060', 'DISCIPLINA OPTATIVA - 60H', 'optativa', '2024.2', 4, 60, 8.4, 'Disp Nota'],
  ['DO060', 'DISCIPLINA OPTATIVA - 60H', 'optativa', '2024.2', 4, 60, 9.65, 'Disp Nota'],
  ['OPT202', 'ADMINISTRAÇÃO GERAL', 'optativa', '2024.2', 4, 60, 3.9, 'Repro Nota'],
  ['ICC204', 'APRENDIZAGEM DE MÁQUINA E MINERAÇÃO DE DADOS', 'optativa', '2025.1', 4, 60, 7.1, 'Aprovado'],
  ['OPT203', 'GEOMETRIA ANALÍTICA', 'optativa', '2025.2', 4, 60, 4.2, 'Repro Nota'],
];

const entries: TranscriptEntry[] = rawEntries.map(([code, name, category, term, credits, hours, grade, rawStatus]) => ({
  code, name, category, term, credits, hours, grade, rawStatus, status: mapStatus(rawStatus),
}));

export const sampleTranscript: Transcript = {
  courseCode: 'IE17',
  curriculumVersion: '2025/2',
  admissionTerm: '2024.1',
  officialCr: 7.757,
  officialProgressPercent: 64.69,
  aaccDoneHours: 0,
  extensaoDoneHours: 0,
  entries,
  pending: [
    { code: 'ICC006', name: 'PROJETO E ANÁLISE DE ALGORITMOS', idealPeriod: 6 },
    { code: 'ICC330', name: 'FUNDAMENTOS DE CIBERSEGURANÇA E DESENVOLVIMENTO', idealPeriod: 6 },
    { code: 'ICC412', name: 'PROCESSO DE DESENVOLVIMENTO DE SOFTWARE', idealPeriod: 6 },
    { code: 'ICC103', name: 'EMPREENDEDORISMO EM INFORMÁTICA', idealPeriod: 8 },
    { code: 'ICC150', name: 'TRABALHO DE CONCLUSÃO DE CURSO', idealPeriod: 8 },
    { code: 'ICC418', name: 'PROJETOS PRÁTICOS EM ENGENHARIA DE SOFTWARE', idealPeriod: 8 },
    { code: 'ENADE02', name: 'ENADE - CONCLUINTE', idealPeriod: null },
  ],
};
