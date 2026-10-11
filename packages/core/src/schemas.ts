import { z } from 'zod';

export const CATEGORIES = ['obrigatoria', 'optativa', 'eletiva', 'extensao', 'outros', 'externa'] as const;
export const CategorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategorySchema>;

export const STATUSES = [
  'aprovado', 'disp_nota', 'equivalencia', 'transf_real', 'disp_calend', 'disp',
  'matriculado', 'reprovado_nota', 'reprovado_freq', 'trancado', 'desconhecido',
] as const;
export const StatusSchema = z.enum(STATUSES);
export type Status = z.infer<typeof StatusSchema>;

const CodeSchema = z.string().regex(/^[A-Z]{2,7}\d{2,3}$/);
const TermSchema = z.string().regex(/^\d{4}\.[12]$/);
const NameSchema = z.string().min(1).max(200);
const Int = z.number().int().min(0);

export const CurriculumCourseSchema = z.object({
  code: CodeSchema,
  name: NameSchema,
  category: CategorySchema,
  idealPeriod: z.number().int().min(1).max(20).nullable(),
  credits: Int,
  hours: z.object({ theory: Int, practice: Int, extension: Int, total: Int }),
  prerequisites: z.array(z.array(CodeSchema).min(1)),
});
export type CurriculumCourse = z.infer<typeof CurriculumCourseSchema>;

const RequirementSchema = z.object({ hours: Int, credits: Int });
export const REQUIREMENT_KEYS = ['obrigatoria', 'optativa', 'eletiva', 'aacc', 'extensao'] as const;
export type RequirementKey = (typeof REQUIREMENT_KEYS)[number];

export const CurriculumSchema = z.object({
  courseCode: z.string().regex(/^[A-Z0-9]{2,8}$/),
  courseName: z.string().max(200),
  version: z.string().regex(/^\d{4}\/\d$/),
  courses: z.array(CurriculumCourseSchema),
  requirements: z.object({
    totalHours: Int,
    totalCredits: Int,
    byCategory: z.object({
      obrigatoria: RequirementSchema,
      optativa: RequirementSchema,
      eletiva: RequirementSchema,
      aacc: RequirementSchema,
      extensao: RequirementSchema,
    }),
    minPeriods: Int,
    maxPeriods: Int,
    minCreditsPerPeriod: Int,
    maxCreditsPerPeriod: Int.nullable(),
  }),
});
export type Curriculum = z.infer<typeof CurriculumSchema>;

export const TranscriptEntrySchema = z.object({
  code: CodeSchema,
  name: NameSchema,
  category: CategorySchema,
  term: TermSchema,
  credits: Int.nullable(),
  hours: Int.nullable(),
  grade: z.number().min(0).max(10).nullable(),
  status: StatusSchema,
  rawStatus: z.string().max(40),
});
export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;

export const PendingCourseSchema = z.object({
  code: CodeSchema,
  name: NameSchema,
  idealPeriod: z.number().int().min(1).max(20).nullable(),
});
export type PendingCourse = z.infer<typeof PendingCourseSchema>;

export const TranscriptSchema = z.object({
  courseCode: z.string().regex(/^[A-Z0-9]{2,8}$/),
  curriculumVersion: z.string().regex(/^\d{4}\/\d$/),
  admissionTerm: TermSchema.nullable(),
  officialCr: z.number().min(0).max(10).nullable(),
  officialProgressPercent: z.number().min(0).max(100).nullable(),
  aaccDoneHours: Int.nullable(),
  extensaoDoneHours: Int.nullable(),
  entries: z.array(TranscriptEntrySchema),
  pending: z.array(PendingCourseSchema),
});
export type Transcript = z.infer<typeof TranscriptSchema>;

export const ParseResponseSchema = z.object({ curriculum: CurriculumSchema, transcript: TranscriptSchema });
export type ParseResponse = z.infer<typeof ParseResponseSchema>;
