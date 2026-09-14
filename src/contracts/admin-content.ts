import { achievementCriteriaSchema } from "./achievement-criteria";
import { z } from "zod";
import { idSchema } from "./common";

/**
 * Contratos de gestão de conteúdo administrativo (Fase 17 — agente `backend`). Cobre o caminho
 * vertical priorizado (Curso → Módulo → Aula, Questão, Conquista) com profundidade completa
 * (criar/editar/reordenar/soft-delete) e os domínios "ao menos create/list" (Concurso, Matéria,
 * Assunto, Professor, Simulado de catálogo) — ver `docs`/relatório da fase para o detalhamento
 * de escopo por entidade.
 *
 * REGRA DURA (CLAUDE.md §24): toda operação DESTRUTIVA (soft-delete) exige `confirm: true`
 * explícito no payload (`confirmDeleteInputSchema`) — nunca inferido de um clique de UI.
 */

export const contentStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export type ContentStatusInput = z.infer<typeof contentStatusSchema>;

/** Entrada de uma operação destrutiva (soft-delete). `confirm` só aceita literal `true` — um
 *  payload sem o campo (ou com `confirm: false`) já falha na validação Zod. */
export const confirmDeleteInputSchema = z.object({
  id: idSchema,
  confirm: z.literal(true),
});
export type ConfirmDeleteInput = z.infer<typeof confirmDeleteInputSchema>;

// =============================================================================
// CURSOS
// =============================================================================

export const courseDifficultyInputSchema = z.enum(["iniciante", "intermediario", "avancado"]);
export type CourseDifficultyInput = z.infer<typeof courseDifficultyInputSchema>;

export const adminCourseDTOSchema = z.object({
  id: idSchema,
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  contestId: idSchema,
  contestName: z.string().min(1),
  teacherName: z.string(),
  workloadHours: z.number().int().min(0),
  coverColor: z.string().min(1),
  difficulty: courseDifficultyInputSchema,
  status: contentStatusSchema,
  deletedAt: z.string().nullable(),
});
export type AdminCourseDTO = z.infer<typeof adminCourseDTOSchema>;

export const createCourseInputSchema = z.object({
  slug: z
    .string()
    .min(1, "Informe o slug.")
    .max(160)
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen."),
  title: z.string().min(1, "Informe o título.").max(200),
  description: z.string().min(1, "Informe a descrição.").max(5000),
  contestId: idSchema,
  teacherName: z.string().max(160).optional(),
  workloadHours: z.coerce.number().int().min(0).max(10_000).optional(),
  coverColor: z.string().min(1).max(20).optional(),
  difficulty: courseDifficultyInputSchema.optional(),
});
export type CreateCourseInput = z.infer<typeof createCourseInputSchema>;

export const updateCourseInputSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  contestId: idSchema.optional(),
  teacherName: z.string().max(160).optional(),
  workloadHours: z.coerce.number().int().min(0).max(10_000).optional(),
  coverColor: z.string().min(1).max(20).optional(),
  difficulty: courseDifficultyInputSchema.optional(),
  status: contentStatusSchema.optional(),
});
export type UpdateCourseInput = z.infer<typeof updateCourseInputSchema>;

// =============================================================================
// MÓDULOS
// =============================================================================

export const adminModuleDTOSchema = z.object({
  id: idSchema,
  courseId: idSchema,
  subjectId: idSchema,
  order: z.number().int().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  teacherId: idSchema.nullable(),
  status: contentStatusSchema,
  deletedAt: z.string().nullable(),
});
export type AdminModuleDTO = z.infer<typeof adminModuleDTOSchema>;

export const createModuleInputSchema = z.object({
  courseId: idSchema,
  subjectId: idSchema,
  slug: z
    .string()
    .min(1, "Informe o slug.")
    .max(160)
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen."),
  title: z.string().min(1, "Informe o título.").max(200),
  description: z.string().max(2000).optional(),
  teacherId: idSchema.optional(),
  order: z.coerce.number().int().min(1).optional(),
});
export type CreateModuleInput = z.infer<typeof createModuleInputSchema>;

export const updateModuleInputSchema = z.object({
  id: idSchema,
  subjectId: idSchema.optional(),
  slug: z.string().min(1).max(160).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  teacherId: idSchema.nullable().optional(),
  status: contentStatusSchema.optional(),
});
export type UpdateModuleInput = z.infer<typeof updateModuleInputSchema>;

/** Reordenar módulos de um curso (drag-and-drop admin) — `moduleIds` é a lista COMPLETA dos
 *  módulos do curso, na ordem final desejada (mesmo padrão de `reorderPlanItemsInputSchema`). */
export const reorderModulesInputSchema = z.object({
  courseId: idSchema,
  moduleIds: z.array(idSchema).min(1).max(200),
});
export type ReorderModulesInput = z.infer<typeof reorderModulesInputSchema>;

// =============================================================================
// AULAS
// =============================================================================

export const adminLessonDTOSchema = z.object({
  id: idSchema,
  moduleId: idSchema,
  order: z.number().int().min(1),
  title: z.string().min(1),
  durationMinutes: z.number().int().min(0),
  requiresLessonId: idSchema.nullable(),
  videoUrl: z.string().nullable(),
  teacherId: idSchema.nullable(),
  status: contentStatusSchema,
  deletedAt: z.string().nullable(),
});
export type AdminLessonDTO = z.infer<typeof adminLessonDTOSchema>;

export const createLessonInputSchema = z.object({
  moduleId: idSchema,
  title: z.string().min(1, "Informe o título.").max(200),
  durationMinutes: z.coerce.number().int().min(0).max(600),
  requiresLessonId: idSchema.optional(),
  videoUrl: z.string().url("Informe uma URL válida.").max(2000).optional(),
  teacherId: idSchema.optional(),
  order: z.coerce.number().int().min(1).optional(),
});
export type CreateLessonInput = z.infer<typeof createLessonInputSchema>;

export const updateLessonInputSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200).optional(),
  durationMinutes: z.coerce.number().int().min(0).max(600).optional(),
  requiresLessonId: idSchema.nullable().optional(),
  videoUrl: z.string().url("Informe uma URL válida.").max(2000).nullable().optional(),
  teacherId: idSchema.nullable().optional(),
  status: contentStatusSchema.optional(),
});
export type UpdateLessonInput = z.infer<typeof updateLessonInputSchema>;

/**
 * Entrada dedicada de "vincular vídeo" (CLAUDE.md/Fase 17 — item explícito do escopo). Mesmo
 * efeito de `updateLessonInputSchema` restrito a `videoUrl`, exposto como Action própria para o
 * fluxo de UI "vincular vídeo" ficar semanticamente separado de uma edição geral da aula.
 * `videoUrl: null` desvincula o vídeo já associado.
 */
export const linkLessonVideoInputSchema = z.object({
  id: idSchema,
  videoUrl: z.string().url("Informe uma URL válida.").max(2000).nullable(),
});
export type LinkLessonVideoInput = z.infer<typeof linkLessonVideoInputSchema>;

/** Reordenar aulas de um módulo (drag-and-drop admin) — `lessonIds` é a lista COMPLETA. */
export const reorderLessonsInputSchema = z.object({
  moduleId: idSchema,
  lessonIds: z.array(idSchema).min(1).max(500),
});
export type ReorderLessonsInput = z.infer<typeof reorderLessonsInputSchema>;

// =============================================================================
// CONCURSOS (escopo "ao menos create/list" — CLAUDE.md/Fase 17)
// =============================================================================

export const adminContestDTOSchema = z.object({
  id: idSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
  organizingBoard: z.string().nullable(),
  description: z.string().nullable(),
  deletedAt: z.string().nullable(),
});
export type AdminContestDTO = z.infer<typeof adminContestDTOSchema>;

export const createContestInputSchema = z.object({
  slug: z
    .string()
    .min(1, "Informe o slug.")
    .max(160)
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen."),
  name: z.string().min(1, "Informe o nome.").max(200),
  organizingBoard: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
});
export type CreateContestInput = z.infer<typeof createContestInputSchema>;

export const updateContestInputSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(200).optional(),
  organizingBoard: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});
export type UpdateContestInput = z.infer<typeof updateContestInputSchema>;

// =============================================================================
// MATÉRIAS E ASSUNTOS (escopo "cadastrar/editar" — CLAUDE.md/Fase 17)
// =============================================================================

export const adminSubjectDTOSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  deletedAt: z.string().nullable(),
});
export type AdminSubjectDTO = z.infer<typeof adminSubjectDTOSchema>;

export const createSubjectInputSchema = z.object({ name: z.string().min(1, "Informe o nome.").max(160) });
export type CreateSubjectInput = z.infer<typeof createSubjectInputSchema>;

export const updateSubjectInputSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(160).optional(),
});
export type UpdateSubjectInput = z.infer<typeof updateSubjectInputSchema>;

export const adminTopicDTOSchema = z.object({
  id: idSchema,
  subjectId: idSchema,
  name: z.string().min(1),
  deletedAt: z.string().nullable(),
});
export type AdminTopicDTO = z.infer<typeof adminTopicDTOSchema>;

export const createTopicInputSchema = z.object({
  subjectId: idSchema,
  name: z.string().min(1, "Informe o nome.").max(160),
});
export type CreateTopicInput = z.infer<typeof createTopicInputSchema>;

export const updateTopicInputSchema = z.object({
  id: idSchema,
  subjectId: idSchema.optional(),
  name: z.string().min(1).max(160).optional(),
});
export type UpdateTopicInput = z.infer<typeof updateTopicInputSchema>;

// =============================================================================
// PROFESSORES (escopo "cadastrar/editar" — CLAUDE.md/Fase 17)
// =============================================================================

export const adminTeacherDTOSchema = z.object({
  id: idSchema,
  userId: idSchema.nullable(),
  name: z.string().min(1),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  deletedAt: z.string().nullable(),
});
export type AdminTeacherDTO = z.infer<typeof adminTeacherDTOSchema>;

export const createTeacherInputSchema = z.object({
  userId: idSchema.optional(),
  name: z.string().min(1, "Informe o nome.").max(160),
  bio: z.string().max(2000).optional(),
  avatarUrl: z.string().url("Informe uma URL válida.").max(2000).optional(),
});
export type CreateTeacherInput = z.infer<typeof createTeacherInputSchema>;

export const updateTeacherInputSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(160).optional(),
  bio: z.string().max(2000).nullable().optional(),
  avatarUrl: z.string().url("Informe uma URL válida.").max(2000).nullable().optional(),
});
export type UpdateTeacherInput = z.infer<typeof updateTeacherInputSchema>;

// =============================================================================
// QUESTÕES (criar/editar — caminho vertical priorizado)
// =============================================================================

export const questionDifficultyInputSchema = z.enum(["EASY", "MEDIUM", "HARD"]);
export type AdminQuestionDifficultyInput = z.infer<typeof questionDifficultyInputSchema>;

export const questionOptionDraftSchema = z.object({
  label: z.string().min(1, "Informe o rótulo (ex.: A).").max(5),
  text: z.string().min(1, "Informe o texto da alternativa.").max(2000),
  isCorrect: z.boolean(),
});
export type QuestionOptionDraftInput = z.infer<typeof questionOptionDraftSchema>;

/** Exatamente 1 alternativa correta — reforçado no service (defesa em profundidade, mesmo
 *  padrão de `reorderPlanItems`), pois quem monta o payload pode chamar o serviço direto. */
export const questionOptionsInputSchema = z
  .array(questionOptionDraftSchema)
  .min(2, "Informe ao menos 2 alternativas.")
  .max(10, "No máximo 10 alternativas.")
  .refine((options) => options.filter((option) => option.isCorrect).length === 1, {
    message: "Marque exatamente uma alternativa como correta.",
  });

export const adminQuestionOptionDTOSchema = z.object({
  id: idSchema,
  label: z.string().min(1),
  text: z.string().min(1),
  isCorrect: z.boolean(),
  order: z.number().int().min(1),
});
export type AdminQuestionOptionDTO = z.infer<typeof adminQuestionOptionDTOSchema>;

export const adminQuestionDTOSchema = z.object({
  id: idSchema,
  statement: z.string().min(1),
  subjectId: idSchema,
  topicId: idSchema.nullable(),
  board: z.string().nullable(),
  difficulty: questionDifficultyInputSchema,
  explanation: z.string().nullable(),
  status: contentStatusSchema,
  createdAt: z.string().min(1),
  deletedAt: z.string().nullable(),
  options: z.array(adminQuestionOptionDTOSchema),
});
export type AdminQuestionDTO = z.infer<typeof adminQuestionDTOSchema>;

export const createQuestionInputSchema = z.object({
  statement: z.string().min(1, "Informe o enunciado.").max(5000),
  subjectId: idSchema,
  topicId: idSchema.optional(),
  board: z.string().max(120).optional(),
  difficulty: questionDifficultyInputSchema,
  explanation: z.string().max(5000).optional(),
  options: questionOptionsInputSchema,
});
export type CreateQuestionInput = z.infer<typeof createQuestionInputSchema>;

export const updateQuestionInputSchema = z.object({
  id: idSchema,
  statement: z.string().min(1).max(5000).optional(),
  subjectId: idSchema.optional(),
  topicId: idSchema.nullable().optional(),
  board: z.string().max(120).nullable().optional(),
  difficulty: questionDifficultyInputSchema.optional(),
  explanation: z.string().max(5000).nullable().optional(),
  status: contentStatusSchema.optional(),
  options: questionOptionsInputSchema.optional(),
});
export type UpdateQuestionInput = z.infer<typeof updateQuestionInputSchema>;

// =============================================================================
// SIMULADOS DE CATÁLOGO (criar/editar)
// =============================================================================

export const adminMockExamDTOSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  description: z.string().nullable(),
  durationMinutes: z.number().int().min(0),
  status: contentStatusSchema,
  questionIds: z.array(idSchema),
  createdById: idSchema.nullable(),
  createdAt: z.string().min(1),
  deletedAt: z.string().nullable(),
});
export type AdminMockExamDTO = z.infer<typeof adminMockExamDTOSchema>;

export const createMockExamInputSchema = z.object({
  title: z.string().min(1, "Informe o título.").max(200),
  description: z.string().max(2000).optional(),
  durationMinutes: z.coerce.number().int().min(1).max(600),
  questionIds: z.array(idSchema).min(1, "Selecione ao menos 1 questão.").max(120),
});
export type CreateMockExamInput = z.infer<typeof createMockExamInputSchema>;

export const updateMockExamInputSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  durationMinutes: z.coerce.number().int().min(1).max(600).optional(),
  questionIds: z.array(idSchema).min(1).max(120).optional(),
  status: contentStatusSchema.optional(),
});
export type UpdateMockExamInput = z.infer<typeof updateMockExamInputSchema>;

// =============================================================================
// CONQUISTAS (criar/editar — caminho vertical priorizado)
// =============================================================================

export const adminAchievementDTOSchema = z.object({
  id: idSchema,
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  points: z.number().int().min(0),
  criteria: achievementCriteriaSchema.nullable().optional(),
  deletedAt: z.string().nullable(),
});
export type AdminAchievementDTO = z.infer<typeof adminAchievementDTOSchema>;

export const createAchievementInputSchema = z.object({
  key: z
    .string()
    .min(1, "Informe a chave.")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen."),
  name: z.string().min(1, "Informe o nome.").max(160),
  description: z.string().max(2000).optional(),
  icon: z.string().max(80).optional(),
  points: z.coerce.number().int().min(0).max(100_000).optional(),
  criteria: achievementCriteriaSchema.nullable().optional(),
});
export type CreateAchievementInput = z.infer<typeof createAchievementInputSchema>;

export const updateAchievementInputSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  icon: z.string().max(80).nullable().optional(),
  points: z.coerce.number().int().min(0).max(100_000).optional(),
  criteria: achievementCriteriaSchema.nullable().optional(),
});
export type UpdateAchievementInput = z.infer<typeof updateAchievementInputSchema>;
