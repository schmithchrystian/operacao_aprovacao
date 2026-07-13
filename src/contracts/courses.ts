import { z } from "zod";
import { idSchema } from "./common";

/**
 * DTOs de leitura de cursos/trilhas (Fase 6 — backend/dados).
 *
 * Fronteira de domínio (CLAUDE.md §12, docs/ARCHITECTURE.md §5): este contrato descreve a
 * FORMA da estrutura Curso → Módulo → Aula, matrícula e progresso agregado. As regras de
 * TEMPO VÁLIDO assistido por vídeo e o cálculo definitivo de heartbeat são do agente
 * `study-tracking` (Fase 7/12) — aqui só se lê o status já registrado em `LessonProgress`
 * (mock nesta fase) para derivar liberação sequencial/pré-requisito e progresso agregado.
 * Pontos por conclusão de aula/módulo/curso são do agente `gamification` (Fase 8) — nenhum
 * valor de pontuação aparece neste contrato.
 */

/** Status de liberação de uma aula (ou rollup de um módulo) para um aluno específico. */
export const lessonStatusSchema = z.enum(["locked", "available", "in_progress", "completed"]);
export type LessonStatus = z.infer<typeof lessonStatusSchema>;

/** Status agregado do curso para o aluno (escala distinta do status de aula/módulo). */
export const courseStatusSchema = z.enum(["nao_iniciado", "em_andamento", "concluido"]);
export type CourseStatus = z.infer<typeof courseStatusSchema>;

export const courseDifficultySchema = z.enum(["iniciante", "intermediario", "avancado"]);
export type CourseDifficulty = z.infer<typeof courseDifficultySchema>;

/** Resumo de uma aula dentro de um módulo (usado em `CourseDetailDTO.modules[].lessons`). */
export const lessonSummaryDTOSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(1),
  title: z.string().min(1),
  durationMinutes: z.number().int().min(0),
  status: lessonStatusSchema,
});
export type LessonSummaryDTO = z.infer<typeof lessonSummaryDTOSchema>;

/** Módulo com suas aulas já anotadas com status de liberação e progresso agregado. */
export const moduleDTOSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  order: z.number().int().min(1),
  title: z.string().min(1),
  /** Percentual (0–100) de aulas concluídas no módulo. */
  progressPercent: z.number().min(0).max(100),
  status: lessonStatusSchema,
  lessons: z.array(lessonSummaryDTOSchema),
});
export type ModuleDTO = z.infer<typeof moduleDTOSchema>;

/** Cartão de curso para catálogo/listagem. */
export const courseSummaryDTOSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  contestId: z.string().min(1),
  contestName: z.string().min(1),
  /** Carga horária total do curso, em horas. */
  workloadHours: z.number().int().min(0),
  teacherName: z.string().min(1),
  /** Cor de destaque da capa (token hex — o `frontend` decide a aplicação visual). */
  coverColor: z.string().min(1),
  difficulty: courseDifficultySchema,
  /** Nomes das matérias cobertas pelo curso (derivadas dos módulos, sem duplicidade). */
  subjects: z.array(z.string().min(1)),
  /** Percentual (0–100) de aulas concluídas no curso; 0 quando o aluno não está matriculado. */
  progressPercent: z.number().min(0).max(100),
  status: courseStatusSchema,
  /** `true` quando o usuário autenticado possui matrícula ativa neste curso. */
  enrolled: z.boolean(),
});
export type CourseSummaryDTO = z.infer<typeof courseSummaryDTOSchema>;

/** Aponta a aula de retomada (próxima aula não concluída) dentro de um curso. */
export const resumePointDTOSchema = z.object({
  courseId: z.string().min(1),
  moduleId: z.string().min(1),
  lessonId: z.string().min(1),
  lessonTitle: z.string().min(1),
  href: z.string().min(1),
});
export type ResumePointDTO = z.infer<typeof resumePointDTOSchema>;

/** Curso completo com trilha (módulos → aulas) e ponto de retomada, para a página do curso. */
export const courseDetailDTOSchema = z.object({
  course: courseSummaryDTOSchema,
  modules: z.array(moduleDTOSchema),
  /**
   * Aula de retomada (primeira aula não concluída e já liberada). Um aluno matriculado sem
   * nenhum progresso recebe a 1ª aula do curso aqui (sempre disponível — comportamento
   * desejado). É `null` apenas quando o curso está 100% concluído (nada a retomar) ou quando
   * a única aula restante está bloqueada por pré-requisito não atendido.
   */
  nextLesson: resumePointDTOSchema.omit({ courseId: true }).nullable(),
});
export type CourseDetailDTO = z.infer<typeof courseDetailDTOSchema>;

/** Resultado de uma matrícula (nova ou já existente — `enroll` é idempotente). */
export const enrollmentResultDTOSchema = z.object({
  courseId: z.string().min(1),
  status: z.enum(["active", "completed", "cancelled"]),
  enrolledAt: z.string().min(1),
});
export type EnrollmentResultDTO = z.infer<typeof enrollmentResultDTOSchema>;

/** Entrada de `listCoursesAction` — filtro opcional por concurso. Nunca aceita `userId`. */
export const listCoursesInputSchema = z.object({
  contestId: z.string().min(1).optional(),
});
export type ListCoursesInput = z.infer<typeof listCoursesInputSchema>;

/** Entrada de `getCourseDetailAction`. */
export const getCourseDetailInputSchema = z.object({
  slug: z.string().min(1, "Informe o curso."),
});
export type GetCourseDetailInput = z.infer<typeof getCourseDetailInputSchema>;

/** Entrada de `enrollAction`. */
export const enrollInputSchema = z.object({
  courseId: idSchema,
});
export type EnrollInput = z.infer<typeof enrollInputSchema>;
