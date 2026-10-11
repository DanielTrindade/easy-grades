import { z } from 'zod';

export const ERROR_CODES = [
  'INVALID_UPLOAD', 'MISSING_FILE', 'INVALID_PDF', 'TOO_LARGE', 'TOO_MANY_PAGES', 'NOT_CURRICULUM',
  'NOT_TRANSCRIPT', 'CURRICULUM_MISMATCH', 'PARSE_TIMEOUT', 'RATE_LIMITED', 'NOT_FOUND', 'INTERNAL',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  INVALID_UPLOAD: 'Envio inválido. Selecione os dois PDFs e tente de novo.',
  MISSING_FILE: 'Falta um dos arquivos. Envie o currículo e o histórico.',
  INVALID_PDF: 'Um dos arquivos não é um PDF válido.',
  TOO_LARGE: 'Arquivo grande demais. O limite é 5 MB por PDF.',
  TOO_MANY_PAGES: 'Esse PDF tem páginas demais para ser um currículo ou histórico do e-Campus.',
  NOT_CURRICULUM: 'O arquivo do currículo não parece ser um "Currículo de Curso" do e-Campus.',
  NOT_TRANSCRIPT: 'O arquivo do histórico não parece ser um "Histórico Escolar Analítico" do e-Campus.',
  CURRICULUM_MISMATCH:
    'O histórico e o currículo são de cursos ou versões diferentes. Baixe o currículo da versão indicada no seu histórico.',
  PARSE_TIMEOUT: 'A leitura do PDF demorou demais. Confira se enviou o arquivo certo.',
  RATE_LIMITED: 'Muitas tentativas em pouco tempo. Aguarde um minuto e tente de novo.',
  NOT_FOUND: 'Endereço não encontrado.',
  INTERNAL: 'Não foi possível ler os arquivos agora. Tente de novo em instantes.',
};

export const ErrorResponseSchema = z.object({
  error: z.object({ code: z.enum(ERROR_CODES), message: z.string() }),
});
