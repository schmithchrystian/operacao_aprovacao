import { z } from "zod";
import { idSchema } from "./common";

/**
 * DTOs do dashboard administrativo (Fase 17 — agente `backend`). Agrega métricas REAIS dos
 * domínios já existentes (`server/services/admin/dashboard-service.ts`) — sem uma segunda fonte
 * de verdade paralela às tabelas/repositórios de cada domínio.
 *
 * `activeSubscriptions` consulta assinaturas Stripe válidas no ambiente Prisma.
 * Limite de interpretação:
 * - `engagementScore`: heurística simples (média de conclusão + retenção) — não é uma fórmula
 *   oficial do agente `gamification`; documentar/revisar com esse agente antes de expor como
 *   métrica "definitiva" num relatório executivo.
 */

export const adminDashboardTopCourseSchema = z.object({
  courseId: idSchema,
  title: z.string().min(1),
  /** Proxy de "acesso" = nº de matrículas (`Enrollment`) — não há telemetria de pageview. */
  accessCount: z.number().int().min(0),
});
export type AdminDashboardTopCourse = z.infer<typeof adminDashboardTopCourseSchema>;

export const adminDashboardTopLessonSchema = z.object({
  lessonId: idSchema,
  title: z.string().min(1),
  /** Nº de registros `LessonProgress` (qualquer status) — proxy de "assistida". */
  viewCount: z.number().int().min(0),
});
export type AdminDashboardTopLesson = z.infer<typeof adminDashboardTopLessonSchema>;

export const adminDashboardTopMockExamSchema = z.object({
  mockExamId: idSchema,
  title: z.string().min(1),
  attemptCount: z.number().int().min(0),
});
export type AdminDashboardTopMockExam = z.infer<typeof adminDashboardTopMockExamSchema>;

export const adminDashboardDTOSchema = z.object({
  totalStudents: z.number().int().min(0),
  activeUsers: z.number().int().min(0),
  newUsersLast30Days: z.number().int().min(0),
  averageStudyMinutesPerStudent: z.number().min(0),
  completionRatePercent: z.number().min(0).max(100),
  averagePerformancePercent: z.number().min(0).max(100),
  retentionRatePercent: z.number().min(0).max(100),
  /** Heurística — ver PENDÊNCIA no topo do arquivo. */
  engagementScore: z.number().min(0).max(100),
  topCourses: z.array(adminDashboardTopCourseSchema),
  topLessons: z.array(adminDashboardTopLessonSchema),
  topMockExams: z.array(adminDashboardTopMockExamSchema),
  /** Assinaturas pagas válidas; o modo de demonstração não simula receita. */
  activeSubscriptions: z.number().int().min(0),
  /** ISO 8601 — instante do cálculo (nunca `Date.now()` implícito; injetado pelo service). */
  generatedAt: z.string().min(1),
});
export type AdminDashboardDTO = z.infer<typeof adminDashboardDTOSchema>;
