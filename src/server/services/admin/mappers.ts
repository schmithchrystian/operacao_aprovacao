import type {
  AdminAchievementDTO,
  AdminContestDTO,
  AdminCourseDTO,
  AdminLessonDTO,
  AdminModuleDTO,
  AdminMockExamDTO,
  AdminQuestionDTO,
  AdminQuestionOptionDTO,
  AdminSubjectDTO,
  AdminTeacherDTO,
  AdminTopicDTO,
} from "@/contracts/admin-content";
import type { AdminUserDTO } from "@/contracts/admin-users";
import type { AchievementEntity } from "@/server/repositories/contracts/achievement-repository";
import type { ContestEntity } from "@/server/repositories/contracts/contest-repository";
import type { CourseEntity } from "@/server/repositories/contracts/course-repository";
import type { LessonEntity } from "@/server/repositories/contracts/lesson-repository";
import type { ModuleEntity } from "@/server/repositories/contracts/module-repository";
import type { MockExamEntity } from "@/server/repositories/contracts/mock-exam-repository";
import type { QuestionOptionEntity } from "@/server/repositories/contracts/question-option-repository";
import type { QuestionEntity } from "@/server/repositories/contracts/question-repository";
import type { SubjectEntity } from "@/server/repositories/contracts/subject-repository";
import type { TeacherEntity } from "@/server/repositories/contracts/teacher-repository";
import type { TopicEntity } from "@/server/repositories/contracts/topic-repository";
import type { UserEntity } from "@/server/repositories/contracts/user-repository";

/**
 * Mapeadores Entity → DTO do módulo administrativo (Fase 17 — agente `backend`, ADR-0003: "DTO
 * ≠ modelo persistido"). Concentrados aqui por serem em grande número e majoritariamente 1:1 —
 * evita espalhar dezenas de funções triviais por arquivo de serviço (CLAUDE.md §8, "evitar
 * arquivos gigantes" tem o efeito inverso quando o conteúdo é só mapeamento repetitivo).
 */

export function toAdminCourseDTO(entity: CourseEntity): AdminCourseDTO {
  return { ...entity };
}

export function toAdminModuleDTO(entity: ModuleEntity): AdminModuleDTO {
  return { ...entity };
}

export function toAdminLessonDTO(entity: LessonEntity): AdminLessonDTO {
  return { ...entity };
}

export function toAdminContestDTO(entity: ContestEntity): AdminContestDTO {
  return { ...entity };
}

export function toAdminSubjectDTO(entity: SubjectEntity): AdminSubjectDTO {
  return { ...entity };
}

export function toAdminTopicDTO(entity: TopicEntity): AdminTopicDTO {
  return { ...entity };
}

export function toAdminTeacherDTO(entity: TeacherEntity): AdminTeacherDTO {
  return { ...entity };
}

export function toAdminQuestionOptionDTO(entity: QuestionOptionEntity): AdminQuestionOptionDTO {
  return { id: entity.id, label: entity.label, text: entity.text, isCorrect: entity.isCorrect, order: entity.order };
}

export function toAdminQuestionDTO(entity: QuestionEntity, options: QuestionOptionEntity[]): AdminQuestionDTO {
  return {
    id: entity.id,
    statement: entity.statement,
    subjectId: entity.subjectId,
    topicId: entity.topicId,
    board: entity.board,
    difficulty: entity.difficulty,
    explanation: entity.explanation,
    status: entity.status,
    createdAt: entity.createdAt,
    deletedAt: entity.deletedAt,
    options: options
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(toAdminQuestionOptionDTO),
  };
}

export function toAdminMockExamDTO(entity: MockExamEntity): AdminMockExamDTO {
  return {
    id: entity.id,
    title: entity.title,
    description: entity.description,
    durationMinutes: entity.durationMinutes,
    status: entity.status,
    questionIds: entity.questionIds,
    createdById: entity.createdById,
    createdAt: entity.createdAt,
    deletedAt: entity.deletedAt,
  };
}

export function toAdminAchievementDTO(entity: AchievementEntity): AdminAchievementDTO {
  return {
    id: entity.id,
    key: entity.key,
    name: entity.name,
    description: entity.description,
    icon: entity.icon,
    points: entity.points,
    deletedAt: entity.deletedAt,
  };
}

/**
 * Mapeamento EXPLÍCITO de campos (nunca `{ ...entity }`) — achado da revisão de segurança da
 * Fase 17: `UserEntity` hoje só tem campos públicos, mas a implementação Prisma real trará
 * `passwordHash`/`emailVerified`/etc. no modelo persistido; um spread vazaria esses campos ao
 * cliente. Listar campo a campo garante que só o previsto no contrato (`AdminUserDTO`) sai.
 */
export function toAdminUserDTO(entity: UserEntity): AdminUserDTO {
  return {
    id: entity.id,
    name: entity.name,
    email: entity.email,
    role: entity.role,
    isActive: entity.isActive,
    createdAt: entity.createdAt,
  };
}
