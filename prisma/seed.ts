/**
 * Seed de desenvolvimento — Operação Aprovação.
 *
 * Repetível e idempotente: todo registro usa um `id` determinístico e é gravado via
 * `upsert`, então rodar o seed várias vezes não duplica dados nem falha por violação
 * de unicidade. Junções sem `id` próprio (apenas chave composta) usam `upsert` pela
 * própria chave composta gerada pelo Prisma.
 *
 * NÃO contém credenciais reais: todos os usuários usam o mesmo hash de senha
 * placeholder (`MOCK_PASSWORD_HASH`), gerado a partir de uma string fixa de
 * desenvolvimento — nunca usar em produção.
 *
 * Não é executado nesta fase (sem PostgreSQL disponível no ambiente). Para rodar
 * quando houver banco: `npx prisma db seed` (usa `migrations.seed` em
 * `prisma.config.ts`) ou diretamente `npx tsx prisma/seed.ts`.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import {
  PrismaClient,
  SystemRole,
  ContentStatus,
  Difficulty,
  LessonMaterialType,
  LessonProgressStatus,
  EnrollmentStatus,
  EnrollmentSource,
  StudySessionSource,
  StudySessionStatus,
  StudyActivityType,
  StudyPlanStatus,
  StudyPlanItemStatus,
  MockExamAttemptStatus,
  FlashcardReviewRating,
  BrainstormCardPriority,
  GamificationEventType,
  GamificationEventStatus,
  PointTransactionType,
  RankingPeriodType,
  RankingScopeType,
  NotificationType,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../src/generated/prisma/client";
import { LESSON_COMPLETION_MIN_PERCENT } from "../src/config/business";

if (process.env.NODE_ENV === "production" || ["production", "staging"].includes(process.env.APP_ENV ?? "") || process.env.ALLOW_DEMO_SEED !== "true") {
  throw new Error("Seed demonstrativo exige ALLOW_DEMO_SEED=true em ambiente local/teste; proibido em produção/staging.");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL não configurada. Defina-a em `.env` (ver `.env.example`) antes de rodar o seed.",
  );
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

/** Hash placeholder ÚNICO para todos os usuários seedados. Nunca usar em produção. */
const MOCK_PASSWORD_HASH = bcrypt.hashSync("dev-seed-only-not-a-real-password", 10);

/** Data de referência fixa do seed (mantém metas/streaks/ranking determinísticos). */
const REF_DATE = new Date("2026-07-13T12:00:00.000Z");
const REF_PERIOD_KEY = "2026-07";
const REF_WEEK_START = new Date("2026-07-06T00:00:00.000Z");

function daysAgo(days: number, base: Date = REF_DATE): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

// =============================================================================
// 1. RBAC — Role / Permission (baseline espelhando o SystemRole fixo)
// =============================================================================

async function seedRolesAndPermissions() {
  const roles = [
    { id: "role-student", name: "Aluno", isSystem: true },
    { id: "role-teacher", name: "Professor", isSystem: true },
    { id: "role-moderator", name: "Moderador", isSystem: true },
    { id: "role-admin", name: "Administrador", isSystem: true },
  ];
  for (const role of roles) {
    await prisma.role.upsert({ where: { id: role.id }, update: {}, create: role });
  }

  const permissions = [
    { id: "perm-course-publish", key: "course:publish", description: "Publicar/despublicar cursos" },
    { id: "perm-question-review", key: "question:review", description: "Revisar/aprovar questões" },
    { id: "perm-ranking-override", key: "ranking:override", description: "Ajustar/recalcular ranking manualmente" },
    { id: "perm-user-manage", key: "user:manage", description: "Gerenciar usuários e papéis" },
  ];
  for (const permission of permissions) {
    await prisma.permission.upsert({ where: { id: permission.id }, update: {}, create: permission });
  }

  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: "role-admin", permissionId: permission.id } },
      update: {},
      create: { roleId: "role-admin", permissionId: permission.id },
    });
  }
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: "role-moderator", permissionId: "perm-question-review" } },
    update: {},
    create: { roleId: "role-moderator", permissionId: "perm-question-review" },
  });
}

// =============================================================================
// 2. Usuários (admin, professores, 10 alunos) + perfis + streak + assinatura
// =============================================================================

const STUDENT_COUNT = 10;
const studentIds = Array.from({ length: STUDENT_COUNT }, (_, i) => `user-student-${String(i + 1).padStart(2, "0")}`);

async function seedUsers() {
  await prisma.user.upsert({
    where: { id: "user-admin" },
    update: {},
    create: {
      id: "user-admin",
      name: "Administração da Plataforma",
      email: "admin@operacaoaprovacao.local",
      passwordHash: MOCK_PASSWORD_HASH,
      role: SystemRole.ADMIN,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: "user-admin", roleId: "role-admin" } },
    update: {},
    create: { userId: "user-admin", roleId: "role-admin" },
  });

  const teacherUsers = [
    { id: "user-teacher-01", name: "Prof. Marina Alves", email: "marina.alves@operacaoaprovacao.local" },
    { id: "user-teacher-02", name: "Prof. Ricardo Souza", email: "ricardo.souza@operacaoaprovacao.local" },
  ];
  for (const t of teacherUsers) {
    await prisma.user.upsert({
      where: { id: t.id },
      update: {},
      create: { ...t, passwordHash: MOCK_PASSWORD_HASH, role: SystemRole.TEACHER },
    });
  }

  const studentNames = [
    "Ana Beatriz Ferreira",
    "Bruno Costa Lima",
    "Camila Rodrigues",
    "Diego Martins Pereira",
    "Elaine Souza Santos",
    "Fábio Henrique Silva",
    "Gabriela Nunes Oliveira",
    "Henrique Barbosa",
    "Isabela Cardoso Melo",
    "João Pedro Almeida",
  ];
  const cities = ["São Paulo", "Campinas", "Santos", "Guarulhos", "Sorocaba"];
  const states = ["SP"];

  for (let i = 0; i < STUDENT_COUNT; i++) {
    const id = studentIds[i]!;
    const name = studentNames[i]!;
    const email = `aluno${String(i + 1).padStart(2, "0")}@operacaoaprovacao.local`;
    await prisma.user.upsert({
      where: { id },
      update: {},
      create: { id, name, email, passwordHash: MOCK_PASSWORD_HASH, role: SystemRole.STUDENT },
    });
    await prisma.profile.upsert({
      where: { userId: id },
      update: {},
      create: {
        id: `profile-${id}`,
        userId: id,
        bio: `Futuro(a) aprovado(a) em concurso de segurança pública.`,
        city: cities[i % cities.length],
        state: states[0],
        isProfilePublic: true,
        showInRanking: true,
        showRealName: i % 5 !== 0, // um em cada cinco opta por não exibir o nome real
        showCityState: true,
        targetContestId: i % 3 === 0 ? "contest-pm" : i % 3 === 1 ? "contest-gcm" : "contest-pp",
      },
    });
    await prisma.userStreak.upsert({
      where: { userId: id },
      update: {},
      create: {
        userId: id,
        currentStreak: (i % 10) + 1,
        longestStreak: (i % 10) + 5,
        lastActiveDate: daysAgo(0),
        freezesAvailable: i % 2,
      },
    });
    await prisma.subscription.upsert({
      where: { id: `subscription-${id}` },
      update: {},
      create: {
        id: `subscription-${id}`,
        userId: id,
        plan: i < 6 ? SubscriptionPlan.MONTHLY : SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        provider: i < 6 ? "mock-provider" : null,
        currentPeriodStart: i < 6 ? daysAgo(10) : null,
        currentPeriodEnd: i < 6 ? daysAgo(-20) : null,
      },
    });
  }
}

// =============================================================================
// 3. Professores (entidade de atribuição de conteúdo, ligada opcionalmente a User)
// =============================================================================

async function seedTeachers() {
  await prisma.teacher.upsert({
    where: { id: "teacher-01" },
    update: {},
    create: {
      id: "teacher-01",
      userId: "user-teacher-01",
      name: "Prof. Marina Alves",
      bio: "Especialista em Direito Constitucional e Administrativo para concursos de segurança pública.",
    },
  });
  await prisma.teacher.upsert({
    where: { id: "teacher-02" },
    update: {},
    create: {
      id: "teacher-02",
      userId: "user-teacher-02",
      name: "Prof. Ricardo Souza",
      bio: "Professor de Português, Matemática e Raciocínio Lógico.",
    },
  });
}

// =============================================================================
// 4. Concursos e cursos (Polícia Militar, GCM, Polícia Penal)
// =============================================================================

const COURSES = [
  { contestId: "contest-pm", contestName: "Polícia Militar", courseId: "course-pm", courseTitle: "Curso Completo — Polícia Militar" },
  { contestId: "contest-gcm", contestName: "Guarda Civil Municipal", courseId: "course-gcm", courseTitle: "Curso Completo — Guarda Civil Municipal" },
  { contestId: "contest-pp", contestName: "Polícia Penal", courseId: "course-pp", courseTitle: "Curso Completo — Polícia Penal" },
] as const;

async function seedContestsAndCourses() {
  for (const c of COURSES) {
    await prisma.contest.upsert({
      where: { id: c.contestId },
      update: {},
      create: {
        id: c.contestId,
        slug: c.contestId,
        name: c.contestName,
        organizingBoard: "Banca a definir",
        description: `Preparação completa para o concurso de ${c.contestName}.`,
      },
    });
    await prisma.course.upsert({
      where: { id: c.courseId },
      update: {},
      create: {
        id: c.courseId,
        slug: c.courseId,
        title: c.courseTitle,
        description: `Trilha completa de estudos para ${c.contestName}: teoria, exercícios e simulados.`,
        status: ContentStatus.PUBLISHED,
        contestId: c.contestId,
        createdById: "user-admin",
      },
    });
  }
}

// =============================================================================
// 5. Matérias e assuntos (6 matérias, 2 assuntos cada)
// =============================================================================

const SUBJECTS = [
  { id: "subject-portugues", name: "Língua Portuguesa", topics: ["Interpretação de Texto", "Gramática Normativa"] },
  { id: "subject-matematica", name: "Matemática e Raciocínio Lógico", topics: ["Raciocínio Lógico", "Matemática Básica"] },
  { id: "subject-dir-constitucional", name: "Direito Constitucional", topics: ["Direitos Fundamentais", "Organização do Estado"] },
  { id: "subject-dir-penal", name: "Direito Penal", topics: ["Teoria do Crime", "Crimes em Espécie"] },
  { id: "subject-dir-administrativo", name: "Direito Administrativo", topics: ["Atos Administrativos", "Poderes Administrativos"] },
  { id: "subject-informatica", name: "Informática", topics: ["Conceitos Básicos", "Segurança da Informação"] },
] as const;

async function seedSubjectsAndTopics() {
  for (const s of SUBJECTS) {
    await prisma.subject.upsert({
      where: { id: s.id },
      update: {},
      create: { id: s.id, slug: s.id, name: s.name },
    });
    for (let i = 0; i < s.topics.length; i++) {
      const topicSlug = s.topics[i]!.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-");
      await prisma.topic.upsert({
        where: { id: `${s.id}-topic-${i + 1}` },
        update: {},
        create: {
          id: `${s.id}-topic-${i + 1}`,
          subjectId: s.id,
          slug: topicSlug,
          name: s.topics[i]!,
        },
      });
    }
  }
}

// =============================================================================
// 6. Módulos e aulas (2 módulos por curso; 20 aulas no total: 7 + 7 + 6)
// =============================================================================

type LessonSeed = {
  id: string;
  moduleId: string;
  order: number;
  title: string;
  subjectId: string;
  teacherId: string;
};

const MODULES = [
  { id: "module-pm-1", courseId: "course-pm", order: 1, title: "Bloco 1 — Fundamentos" },
  { id: "module-pm-2", courseId: "course-pm", order: 2, title: "Bloco 2 — Legislação Específica" },
  { id: "module-gcm-1", courseId: "course-gcm", order: 1, title: "Bloco 1 — Fundamentos" },
  { id: "module-gcm-2", courseId: "course-gcm", order: 2, title: "Bloco 2 — Legislação Específica" },
  { id: "module-pp-1", courseId: "course-pp", order: 1, title: "Bloco 1 — Fundamentos" },
  { id: "module-pp-2", courseId: "course-pp", order: 2, title: "Bloco 2 — Legislação Específica" },
] as const;

const LESSONS: LessonSeed[] = [
  // course-pm / module-pm-1 (4 aulas)
  { id: "lesson-pm-01", moduleId: "module-pm-1", order: 1, title: "Português: Interpretação de Texto I", subjectId: "subject-portugues", teacherId: "teacher-02" },
  { id: "lesson-pm-02", moduleId: "module-pm-1", order: 2, title: "Matemática: Raciocínio Lógico I", subjectId: "subject-matematica", teacherId: "teacher-02" },
  { id: "lesson-pm-03", moduleId: "module-pm-1", order: 3, title: "Direito Constitucional: Direitos Fundamentais I", subjectId: "subject-dir-constitucional", teacherId: "teacher-01" },
  { id: "lesson-pm-04", moduleId: "module-pm-1", order: 4, title: "Informática: Conceitos Básicos", subjectId: "subject-informatica", teacherId: "teacher-02" },
  // course-pm / module-pm-2 (3 aulas)
  { id: "lesson-pm-05", moduleId: "module-pm-2", order: 1, title: "Direito Penal: Teoria do Crime I", subjectId: "subject-dir-penal", teacherId: "teacher-01" },
  { id: "lesson-pm-06", moduleId: "module-pm-2", order: 2, title: "Direito Administrativo: Atos Administrativos", subjectId: "subject-dir-administrativo", teacherId: "teacher-01" },
  { id: "lesson-pm-07", moduleId: "module-pm-2", order: 3, title: "Revisão Comentada — Bloco PM", subjectId: "subject-portugues", teacherId: "teacher-02" },
  // course-gcm / module-gcm-1 (4 aulas)
  { id: "lesson-gcm-01", moduleId: "module-gcm-1", order: 1, title: "Português: Gramática Normativa", subjectId: "subject-portugues", teacherId: "teacher-02" },
  { id: "lesson-gcm-02", moduleId: "module-gcm-1", order: 2, title: "Matemática Básica para GCM", subjectId: "subject-matematica", teacherId: "teacher-02" },
  { id: "lesson-gcm-03", moduleId: "module-gcm-1", order: 3, title: "Direito Constitucional: Organização do Estado", subjectId: "subject-dir-constitucional", teacherId: "teacher-01" },
  { id: "lesson-gcm-04", moduleId: "module-gcm-1", order: 4, title: "Segurança da Informação Aplicada", subjectId: "subject-informatica", teacherId: "teacher-02" },
  // course-gcm / module-gcm-2 (3 aulas)
  { id: "lesson-gcm-05", moduleId: "module-gcm-2", order: 1, title: "Direito Penal: Crimes em Espécie", subjectId: "subject-dir-penal", teacherId: "teacher-01" },
  { id: "lesson-gcm-06", moduleId: "module-gcm-2", order: 2, title: "Direito Administrativo: Poderes Administrativos", subjectId: "subject-dir-administrativo", teacherId: "teacher-01" },
  { id: "lesson-gcm-07", moduleId: "module-gcm-2", order: 3, title: "Revisão Comentada — Bloco GCM", subjectId: "subject-matematica", teacherId: "teacher-02" },
  // course-pp / module-pp-1 (3 aulas)
  { id: "lesson-pp-01", moduleId: "module-pp-1", order: 1, title: "Português: Interpretação de Texto II", subjectId: "subject-portugues", teacherId: "teacher-02" },
  { id: "lesson-pp-02", moduleId: "module-pp-1", order: 2, title: "Direito Constitucional: Direitos Fundamentais II", subjectId: "subject-dir-constitucional", teacherId: "teacher-01" },
  { id: "lesson-pp-03", moduleId: "module-pp-1", order: 3, title: "Direito Penal: Teoria do Crime II", subjectId: "subject-dir-penal", teacherId: "teacher-01" },
  // course-pp / module-pp-2 (3 aulas)
  { id: "lesson-pp-04", moduleId: "module-pp-2", order: 1, title: "Direito Administrativo: Execução Penal", subjectId: "subject-dir-administrativo", teacherId: "teacher-01" },
  { id: "lesson-pp-05", moduleId: "module-pp-2", order: 2, title: "Raciocínio Lógico Aplicado", subjectId: "subject-matematica", teacherId: "teacher-02" },
  { id: "lesson-pp-06", moduleId: "module-pp-2", order: 3, title: "Revisão Comentada — Bloco Polícia Penal", subjectId: "subject-informatica", teacherId: "teacher-02" },
];

async function seedModulesAndLessons() {
  for (const m of MODULES) {
    await prisma.module.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        courseId: m.courseId,
        title: m.title,
        order: m.order,
        teacherId: m.order === 1 ? "teacher-02" : "teacher-01",
        status: ContentStatus.PUBLISHED,
      },
    });
  }

  for (const l of LESSONS) {
    await prisma.lesson.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        moduleId: l.moduleId,
        title: l.title,
        description: `Aula sobre ${l.title.toLowerCase()}.`,
        order: l.order,
        durationSeconds: 1800 + (l.order % 3) * 300,
        videoUrl: `https://videos.mock.operacaoaprovacao.local/${l.id}.m3u8`,
        videoProvider: "mock",
        teacherId: l.teacherId,
        status: ContentStatus.PUBLISHED,
        publishedAt: daysAgo(60),
      },
    });
  }

  // Um material por módulo (apostila em PDF da primeira aula do módulo).
  const firstLessonPerModule = MODULES.map((m) => LESSONS.find((l) => l.moduleId === m.id && l.order === 1)!);
  for (const l of firstLessonPerModule) {
    await prisma.lessonMaterial.upsert({
      where: { id: `material-${l.id}` },
      update: {},
      create: {
        id: `material-${l.id}`,
        lessonId: l.id,
        type: LessonMaterialType.PDF,
        title: `Apostila — ${l.title}`,
        url: `https://materiais.mock.operacaoaprovacao.local/${l.id}.pdf`,
        order: 1,
      },
    });
  }
}

// =============================================================================
// 7. Matrículas
// =============================================================================

/** student index (0-based) -> courseId primário do aluno. */
function primaryCourseForStudent(index: number): string {
  return index % 3 === 0 ? "course-pm" : index % 3 === 1 ? "course-gcm" : "course-pp";
}

async function seedEnrollments() {
  for (let i = 0; i < studentIds.length; i++) {
    const userId = studentIds[i]!;
    const courseId = primaryCourseForStudent(i);
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {},
      create: {
        id: `enrollment-${userId}-${courseId}`,
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
        source: EnrollmentSource.SUBSCRIPTION,
        enrolledAt: daysAgo(45),
      },
    });
  }
  // Dois alunos com matrícula extra em um segundo curso (cenário multi-curso).
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: studentIds[0]!, courseId: "course-gcm" } },
    update: {},
    create: {
      id: `enrollment-${studentIds[0]}-course-gcm-extra`,
      userId: studentIds[0]!,
      courseId: "course-gcm",
      status: EnrollmentStatus.ACTIVE,
      source: EnrollmentSource.MANUAL,
      enrolledAt: daysAgo(20),
    },
  });
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: studentIds[4]!, courseId: "course-pp" } },
    update: {},
    create: {
      id: `enrollment-${studentIds[4]}-course-pp-extra`,
      userId: studentIds[4]!,
      courseId: "course-pp",
      status: EnrollmentStatus.ACTIVE,
      source: EnrollmentSource.MANUAL,
      enrolledAt: daysAgo(15),
    },
  });
}

// =============================================================================
// 8. Progresso de aulas + eventos/pontuação de gamificação decorrentes
// =============================================================================

async function grantGamificationPoints(params: {
  idSuffix: string;
  userId: string;
  type: GamificationEventType;
  sourceType: string;
  sourceId: string;
  points: number;
  xp: number;
  reason: string;
}) {
  const idempotencyKey = `${params.sourceType.toLowerCase()}-completed:${params.userId}:${params.sourceId}`;
  const eventId = `gamevent-${params.idSuffix}`;
  await prisma.gamificationEvent.upsert({
    where: { id: eventId },
    update: {},
    create: {
      id: eventId,
      userId: params.userId,
      type: params.type,
      idempotencyKey,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      points: params.points,
      xp: params.xp,
      ruleVersion: 1,
      status: GamificationEventStatus.PROCESSED,
      processedAt: daysAgo(1),
    },
  });
  await prisma.pointTransaction.upsert({
    where: { id: `pointtx-${params.idSuffix}` },
    update: {},
    create: {
      id: `pointtx-${params.idSuffix}`,
      userId: params.userId,
      gamificationEventId: eventId,
      idempotencyKey,
      type: PointTransactionType.EARN,
      points: params.points,
      xp: params.xp,
      reason: params.reason,
    },
  });
}

async function seedLessonProgressAndGamification() {
  for (let i = 0; i < studentIds.length; i++) {
    const userId = studentIds[i]!;
    const courseId = primaryCourseForStudent(i);
    const courseLessons = LESSONS.filter((l) => MODULES.find((m) => m.id === l.moduleId)?.courseId === courseId).sort(
      (a, b) => a.order - b.order,
    );
    const [firstLesson, secondLesson] = courseLessons;

    if (firstLesson) {
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId: firstLesson.id } },
        update: {},
        create: {
          id: `progress-${userId}-${firstLesson.id}`,
          userId,
          lessonId: firstLesson.id,
          status: LessonProgressStatus.COMPLETED,
          watchedPercent: Math.max(LESSON_COMPLETION_MIN_PERCENT, 0.92),
          lastPositionSecs: 1700,
          validSeconds: 1700,
          completedAt: daysAgo(5),
        },
      });
      await grantGamificationPoints({
        idSuffix: `${userId}-${firstLesson.id}`,
        userId,
        type: GamificationEventType.LESSON_COMPLETED,
        sourceType: "lesson",
        sourceId: firstLesson.id,
        points: 100,
        xp: 100,
        reason: `Conclusão da aula "${firstLesson.title}"`,
      });
    }

    if (secondLesson) {
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId: secondLesson.id } },
        update: {},
        create: {
          id: `progress-${userId}-${secondLesson.id}`,
          userId,
          lessonId: secondLesson.id,
          status: LessonProgressStatus.IN_PROGRESS,
          watchedPercent: 0.45,
          lastPositionSecs: 800,
          validSeconds: 800,
        },
      });
    }
  }
}

// =============================================================================
// 9. Sessões de estudo (aula + Pomodoro) e atividades
// =============================================================================

async function seedStudySessions() {
  for (const userId of studentIds) {
    const lessonSessionId = `session-lesson-${userId}`;
    await prisma.studySession.upsert({
      where: { id: lessonSessionId },
      update: {},
      create: {
        id: lessonSessionId,
        userId,
        source: StudySessionSource.LESSON,
        status: StudySessionStatus.FINISHED,
        startedAt: daysAgo(5, new Date("2026-07-13T14:00:00.000Z")),
        endedAt: daysAgo(5, new Date("2026-07-13T14:30:00.000Z")),
        validSeconds: 1700,
      },
    });
    await prisma.studyActivity.upsert({
      where: { id: `${lessonSessionId}-activity-1` },
      update: {},
      create: {
        id: `${lessonSessionId}-activity-1`,
        sessionId: lessonSessionId,
        type: StudyActivityType.VIDEO_HEARTBEAT,
        occurredAt: daysAgo(5, new Date("2026-07-13T14:10:00.000Z")),
        payload: { positionSeconds: 600, durationSeconds: 1800, playing: true, tabVisible: true },
        isValid: true,
      },
    });
    await prisma.studyActivity.upsert({
      where: { id: `${lessonSessionId}-activity-2` },
      update: {},
      create: {
        id: `${lessonSessionId}-activity-2`,
        sessionId: lessonSessionId,
        type: StudyActivityType.VIDEO_HEARTBEAT,
        occurredAt: daysAgo(5, new Date("2026-07-13T14:28:00.000Z")),
        payload: { positionSeconds: 1700, durationSeconds: 1800, playing: true, tabVisible: true },
        isValid: true,
      },
    });

    const pomodoroSessionId = `session-pomodoro-${userId}`;
    await prisma.studySession.upsert({
      where: { id: pomodoroSessionId },
      update: {},
      create: {
        id: pomodoroSessionId,
        userId,
        source: StudySessionSource.POMODORO,
        status: StudySessionStatus.FINISHED,
        startedAt: daysAgo(2, new Date("2026-07-13T09:00:00.000Z")),
        endedAt: daysAgo(2, new Date("2026-07-13T09:25:00.000Z")),
        validSeconds: 1500,
      },
    });
    await prisma.studyActivity.upsert({
      where: { id: `${pomodoroSessionId}-activity-1` },
      update: {},
      create: {
        id: `${pomodoroSessionId}-activity-1`,
        sessionId: pomodoroSessionId,
        type: StudyActivityType.POMODORO_TICK,
        occurredAt: daysAgo(2, new Date("2026-07-13T09:12:00.000Z")),
        payload: { cycle: 1, phase: "focus" },
        isValid: true,
      },
    });
    await prisma.studyActivity.upsert({
      where: { id: `${pomodoroSessionId}-activity-2` },
      update: {},
      create: {
        id: `${pomodoroSessionId}-activity-2`,
        sessionId: pomodoroSessionId,
        type: StudyActivityType.POMODORO_TICK,
        occurredAt: daysAgo(2, new Date("2026-07-13T09:25:00.000Z")),
        payload: { cycle: 1, phase: "completed" },
        isValid: true,
      },
    });

    await grantGamificationPoints({
      idSuffix: `${userId}-${pomodoroSessionId}`,
      userId,
      type: GamificationEventType.POMODORO_COMPLETED,
      sourceType: "study_session",
      sourceId: pomodoroSessionId,
      points: 50,
      xp: 50,
      reason: "Ciclo de Pomodoro concluído com atividade válida",
    });
  }
}

// =============================================================================
// 10. Plano de estudos
// =============================================================================

async function seedStudyPlans() {
  for (let i = 0; i < studentIds.length; i++) {
    const userId = studentIds[i]!;
    const planId = `study-plan-${userId}`;
    await prisma.studyPlan.upsert({
      where: { id: planId },
      update: {},
      create: {
        id: planId,
        userId,
        title: "Plano de estudos — Reta final",
        startDate: daysAgo(45),
        endDate: daysAgo(-45),
        status: StudyPlanStatus.ACTIVE,
      },
    });
    const subjectA = SUBJECTS[i % SUBJECTS.length]!;
    const subjectB = SUBJECTS[(i + 1) % SUBJECTS.length]!;
    await prisma.studyPlanItem.upsert({
      where: { id: `${planId}-item-1` },
      update: {},
      create: {
        id: `${planId}-item-1`,
        studyPlanId: planId,
        subjectId: subjectA.id,
        title: `Revisar ${subjectA.name}`,
        targetDate: daysAgo(-3),
        estimatedMinutes: 60,
        order: 1,
        status: StudyPlanItemStatus.DONE,
        completedAt: daysAgo(4),
      },
    });
    await prisma.studyPlanItem.upsert({
      where: { id: `${planId}-item-2` },
      update: {},
      create: {
        id: `${planId}-item-2`,
        studyPlanId: planId,
        subjectId: subjectB.id,
        title: `Praticar exercícios de ${subjectB.name}`,
        targetDate: daysAgo(-7),
        estimatedMinutes: 90,
        order: 2,
        status: StudyPlanItemStatus.PENDING,
      },
    });
  }
}

// =============================================================================
// 11. Simulados, questões e alternativas (3 simulados, 30 questões, 4 alternativas cada)
// =============================================================================

const MOCK_EXAMS = [
  { id: "mock-exam-pm", title: "Simulado — Polícia Militar", courseId: "course-pm" },
  { id: "mock-exam-gcm", title: "Simulado — Guarda Civil Municipal", courseId: "course-gcm" },
  { id: "mock-exam-pp", title: "Simulado — Polícia Penal", courseId: "course-pp" },
] as const;

const QUESTIONS_PER_EXAM = 10;
const OPTION_LABELS = ["A", "B", "C", "D"] as const;

async function seedMockExamsAndQuestions() {
  for (const exam of MOCK_EXAMS) {
    await prisma.mockExam.upsert({
      where: { id: exam.id },
      update: {},
      create: {
        id: exam.id,
        title: exam.title,
        description: `Simulado completo com ${QUESTIONS_PER_EXAM} questões cobrindo as matérias do edital.`,
        durationMinutes: 180,
        status: ContentStatus.PUBLISHED,
        createdById: "user-admin",
      },
    });

    for (let q = 1; q <= QUESTIONS_PER_EXAM; q++) {
      const subject = SUBJECTS[(q - 1) % SUBJECTS.length]!;
      const questionId = `question-${exam.id}-${String(q).padStart(2, "0")}`;
      const correctIndex = (q - 1) % 4;
      const difficulty = q % 3 === 0 ? Difficulty.HARD : q % 3 === 1 ? Difficulty.EASY : Difficulty.MEDIUM;

      await prisma.question.upsert({
        where: { id: questionId },
        update: {},
        create: {
          id: questionId,
          statement: `(${exam.title}) Questão ${q} sobre ${subject.name}: assinale a alternativa correta.`,
          subjectId: subject.id,
          topicId: `${subject.id}-topic-${(q % 2) + 1}`,
          board: "Banca Mock",
          difficulty,
          explanation: `A alternativa correta trata corretamente o tema de ${subject.name} abordado no enunciado.`,
          status: ContentStatus.PUBLISHED,
          createdById: "user-admin",
        },
      });

      for (let o = 0; o < OPTION_LABELS.length; o++) {
        const label = OPTION_LABELS[o]!;
        await prisma.questionOption.upsert({
          where: { id: `${questionId}-opt-${label}` },
          update: {},
          create: {
            id: `${questionId}-opt-${label}`,
            questionId,
            label,
            text: `Alternativa ${label} para a questão ${q} de ${subject.name}.`,
            isCorrect: o === correctIndex,
            order: o + 1,
          },
        });
      }

      await prisma.mockExamQuestion.upsert({
        where: { mockExamId_questionId: { mockExamId: exam.id, questionId } },
        update: {},
        create: { mockExamId: exam.id, questionId, order: q },
      });
    }
  }
}

// =============================================================================
// 12. Tentativas de simulado + respostas
// =============================================================================

async function seedMockExamAttempts() {
  for (let i = 0; i < studentIds.length; i++) {
    const userId = studentIds[i]!;
    const courseId = primaryCourseForStudent(i);
    const exam = MOCK_EXAMS.find((e) => e.courseId === courseId)!;
    const attemptId = `attempt-${userId}-${exam.id}`;

    const questionIds = Array.from(
      { length: QUESTIONS_PER_EXAM },
      (_, q) => `question-${exam.id}-${String(q + 1).padStart(2, "0")}`,
    );
    // ~70% de acerto — determinístico por índice do aluno.
    const wrongPositions = new Set([i % QUESTIONS_PER_EXAM, (i + 3) % QUESTIONS_PER_EXAM, (i + 6) % QUESTIONS_PER_EXAM]);
    const correctCount = QUESTIONS_PER_EXAM - wrongPositions.size;

    await prisma.mockExamAttempt.upsert({
      where: { id: attemptId },
      update: {},
      create: {
        id: attemptId,
        userId,
        mockExamId: exam.id,
        status: MockExamAttemptStatus.FINISHED,
        startedAt: daysAgo(3, new Date("2026-07-13T08:00:00.000Z")),
        finishedAt: daysAgo(3, new Date("2026-07-13T10:30:00.000Z")),
        correctCount,
        wrongCount: wrongPositions.size,
        blankCount: 0,
        scorePercent: (correctCount / QUESTIONS_PER_EXAM) * 100,
      },
    });

    for (let q = 0; q < questionIds.length; q++) {
      const questionId = questionIds[q]!;
      const isCorrect = !wrongPositions.has(q);
      const correctIndex = q % 4;
      const chosenIndex = isCorrect ? correctIndex : (correctIndex + 1) % 4;
      const chosenLabel = OPTION_LABELS[chosenIndex]!;

      await prisma.questionAttempt.upsert({
        where: { mockExamAttemptId_questionId: { mockExamAttemptId: attemptId, questionId } },
        update: {},
        create: {
          id: `qattempt-${attemptId}-${questionId}`,
          userId,
          questionId,
          mockExamAttemptId: attemptId,
          selectedOptionId: `${questionId}-opt-${chosenLabel}`,
          isCorrect,
          timeSpentSeconds: 90 + q * 5,
        },
      });
    }

    await grantGamificationPoints({
      idSuffix: `${userId}-${attemptId}`,
      userId,
      type: GamificationEventType.MOCK_EXAM_COMPLETED,
      sourceType: "mock_exam_attempt",
      sourceId: attemptId,
      points: 300,
      xp: 300,
      reason: `Simulado "${exam.title}" finalizado`,
    });
  }

  // Uma questão favoritada por dois alunos (caderno de erros / favoritos).
  await prisma.questionFavorite.upsert({
    where: { userId_questionId: { userId: studentIds[0]!, questionId: "question-mock-exam-pm-01" } },
    update: {},
    create: { userId: studentIds[0]!, questionId: "question-mock-exam-pm-01" },
  });
  await prisma.questionFavorite.upsert({
    where: { userId_questionId: { userId: studentIds[1]!, questionId: "question-mock-exam-pm-03" } },
    update: {},
    create: { userId: studentIds[1]!, questionId: "question-mock-exam-pm-03" },
  });
}

// =============================================================================
// 13. Flashcards (6 decks por matéria + 2 decks pessoais = 20 flashcards)
// =============================================================================

async function seedFlashcards() {
  for (const subject of SUBJECTS) {
    await prisma.flashcardDeck.upsert({
      where: { id: `deck-${subject.id}` },
      update: {},
      create: {
        id: `deck-${subject.id}`,
        subjectId: subject.id,
        title: `Flashcards — ${subject.name}`,
        isPublic: true,
      },
    });
  }
  await prisma.flashcardDeck.upsert({
    where: { id: `deck-personal-${studentIds[0]}` },
    update: {},
    create: {
      id: `deck-personal-${studentIds[0]}`,
      userId: studentIds[0]!,
      subjectId: "subject-portugues",
      title: "Meus flashcards — Revisão rápida",
      isPublic: false,
    },
  });
  await prisma.flashcardDeck.upsert({
    where: { id: `deck-personal-${studentIds[1]}` },
    update: {},
    create: {
      id: `deck-personal-${studentIds[1]}`,
      userId: studentIds[1]!,
      subjectId: "subject-dir-penal",
      title: "Meus flashcards — Pontos fracos",
      isPublic: false,
    },
  });

  // 3 flashcards por matéria (6 x 3 = 18) + 1 em cada deck pessoal (2) = 20.
  let cardIndex = 0;
  for (const subject of SUBJECTS) {
    for (let c = 1; c <= 3; c++) {
      cardIndex++;
      const cardId = `flashcard-${String(cardIndex).padStart(2, "0")}`;
      await prisma.flashcard.upsert({
        where: { id: cardId },
        update: {},
        create: {
          id: cardId,
          deckId: `deck-${subject.id}`,
          subjectId: subject.id,
          topicId: `${subject.id}-topic-${((c - 1) % 2) + 1}`,
          question: `[${subject.name}] Pergunta de revisão ${c}?`,
          answer: `[${subject.name}] Resposta de revisão ${c}.`,
          difficulty: c === 1 ? Difficulty.EASY : c === 2 ? Difficulty.MEDIUM : Difficulty.HARD,
          tags: [subject.id, `revisao-${c}`],
          status: ContentStatus.PUBLISHED,
        },
      });
    }
  }
  for (const [deckOwner, subjectId] of [
    [studentIds[0]!, "subject-portugues"],
    [studentIds[1]!, "subject-dir-penal"],
  ] as const) {
    cardIndex++;
    const cardId = `flashcard-${String(cardIndex).padStart(2, "0")}`;
    await prisma.flashcard.upsert({
      where: { id: cardId },
      update: {},
      create: {
        id: cardId,
        deckId: `deck-personal-${deckOwner}`,
        subjectId,
        question: "Pergunta pessoal de revisão — ponto fraco identificado no simulado.",
        answer: "Resposta anotada após revisão do erro no simulado.",
        difficulty: Difficulty.HARD,
        tags: ["caderno-de-erros"],
        status: ContentStatus.PUBLISHED,
      },
    });
  }

  // Revisões (SM-2 simplificado) para os 2 alunos com deck pessoal.
  for (const [i, userId] of [studentIds[0]!, studentIds[1]!].entries()) {
    const cardId = `flashcard-${String(19 + i).padStart(2, "0")}`;
    await prisma.flashcardReview.upsert({
      where: { id: `review-${userId}-${cardId}-1` },
      update: {},
      create: {
        id: `review-${userId}-${cardId}-1`,
        userId,
        flashcardId: cardId,
        rating: i === 0 ? FlashcardReviewRating.HARD : FlashcardReviewRating.AGAIN,
        intervalDays: i === 0 ? 3 : 1,
        easeFactor: i === 0 ? 2.3 : 2.0,
        repetition: 1,
        reviewedAt: daysAgo(2),
        nextReviewAt: daysAgo(-1),
      },
    });
    await grantGamificationPoints({
      idSuffix: `${userId}-flashcard-${cardId}`,
      userId,
      type: GamificationEventType.FLASHCARD_CORRECT,
      sourceType: "flashcard",
      sourceId: cardId,
      points: 5,
      xp: 5,
      reason: "Flashcard revisado com classificação positiva",
    });
  }
}

// =============================================================================
// 14. Brainstorm (2 alunos, 5 colunas padrão, algumas cartas)
// =============================================================================

const BOARD_COLUMNS = ["Ideias", "Estudar", "Revisar", "Dúvidas", "Resolvido"];

async function seedBrainstorm() {
  for (const userId of [studentIds[0]!, studentIds[1]!]) {
    const boardId = `board-${userId}`;
    await prisma.brainstormBoard.upsert({
      where: { id: boardId },
      update: {},
      create: { id: boardId, userId, title: "Meu quadro de estudos" },
    });
    const columnIds: string[] = [];
    for (let i = 0; i < BOARD_COLUMNS.length; i++) {
      const columnId = `${boardId}-col-${i + 1}`;
      columnIds.push(columnId);
      await prisma.brainstormColumn.upsert({
        where: { id: columnId },
        update: {},
        create: { id: columnId, boardId, name: BOARD_COLUMNS[i]!, order: i + 1 },
      });
    }
    await prisma.brainstormCard.upsert({
      where: { id: `${boardId}-card-1` },
      update: {},
      create: {
        id: `${boardId}-card-1`,
        columnId: columnIds[0]!,
        subjectId: "subject-dir-constitucional",
        title: "Revisar controle de constitucionalidade",
        content: "Aprofundar ADI, ADC e ADPF antes do próximo simulado.",
        tags: ["constitucional", "revisao"],
        priority: BrainstormCardPriority.HIGH,
        order: 1,
      },
    });
    await prisma.brainstormCard.upsert({
      where: { id: `${boardId}-card-2` },
      update: {},
      create: {
        id: `${boardId}-card-2`,
        columnId: columnIds[3]!,
        subjectId: "subject-dir-penal",
        title: "Dúvida: diferença entre dolo eventual e culpa consciente",
        tags: ["duvida", "penal"],
        priority: BrainstormCardPriority.MEDIUM,
        order: 1,
      },
    });
  }
}

// =============================================================================
// 15. Conquistas (10) + desbloqueios
// =============================================================================

const ACHIEVEMENTS = [
  { id: "ach-primeira-aula", key: "first-lesson-completed", name: "Primeira Vitória", description: "Concluiu a primeira aula.", points: 50 },
  { id: "ach-modulo-completo", key: "module-completed", name: "Módulo Dominado", description: "Concluiu um módulo inteiro.", points: 150 },
  { id: "ach-curso-completo", key: "course-completed", name: "Missão Cumprida", description: "Concluiu um curso inteiro.", points: 500 },
  { id: "ach-sequencia-7", key: "streak-7-days", name: "Constância de Ferro", description: "7 dias seguidos de estudo.", points: 200 },
  { id: "ach-sequencia-30", key: "streak-30-days", name: "Disciplina de Elite", description: "30 dias seguidos de estudo.", points: 800 },
  { id: "ach-simulado-nota-alta", key: "mock-exam-high-score", name: "Nota de Aprovado", description: "Simulado com nota acima de 80%.", points: 300 },
  { id: "ach-100-questoes", key: "100-questions-answered", name: "Caçador de Questões", description: "Respondeu 100 questões.", points: 250 },
  { id: "ach-flashcard-mestre", key: "flashcard-master", name: "Memória de Aço", description: "50 flashcards revisados.", points: 150 },
  { id: "ach-meta-diaria-30", key: "daily-goal-30-times", name: "Rotina Vencedora", description: "Bateu a meta diária 30 vezes.", points: 300 },
  { id: "ach-top-10-ranking", key: "top-10-ranking", name: "Elite do Ranking", description: "Chegou ao Top 10 do ranking geral.", points: 400 },
] as const;

async function seedAchievements() {
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { id: a.id },
      update: {},
      create: { id: a.id, key: a.key, name: a.name, description: a.description, points: a.points },
    });
  }

  const unlocks: Array<{ userId: string; achievementId: string }> = [
    { userId: studentIds[0]!, achievementId: "ach-primeira-aula" },
    { userId: studentIds[0]!, achievementId: "ach-simulado-nota-alta" },
    { userId: studentIds[1]!, achievementId: "ach-primeira-aula" },
    { userId: studentIds[2]!, achievementId: "ach-primeira-aula" },
    { userId: studentIds[2]!, achievementId: "ach-sequencia-7" },
  ];
  for (const u of unlocks) {
    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId: u.userId, achievementId: u.achievementId } },
      update: {},
      create: { userId: u.userId, achievementId: u.achievementId, unlockedAt: daysAgo(3) },
    });
    await prisma.notification.upsert({
      where: { id: `notification-ach-${u.userId}-${u.achievementId}` },
      update: {},
      create: {
        id: `notification-ach-${u.userId}-${u.achievementId}`,
        userId: u.userId,
        type: NotificationType.ACHIEVEMENT_UNLOCKED,
        title: "Nova conquista desbloqueada!",
        message: `Você desbloqueou a conquista "${ACHIEVEMENTS.find((a) => a.id === u.achievementId)!.name}".`,
        isRead: false,
      },
    });
  }
}

// =============================================================================
// 16. Ranking, metas diárias/semanais
// =============================================================================

async function seedRankingGoalsAndNotifications() {
  for (let i = 0; i < studentIds.length; i++) {
    const userId = studentIds[i]!;
    const score = 100 - i * 5.5;
    await prisma.rankingScore.upsert({
      where: { id: `ranking-${userId}-${REF_PERIOD_KEY}` },
      update: {},
      create: {
        id: `ranking-${userId}-${REF_PERIOD_KEY}`,
        userId,
        periodType: RankingPeriodType.MONTHLY,
        periodKey: REF_PERIOD_KEY,
        scopeType: RankingScopeType.GLOBAL,
        scopeKey: "global",
        calculationVersion: 1,
        score,
        rank: i + 1,
        breakdown: {
          simuladoPerformance: 70 - i,
          lessonsCompleted: 60 - i,
          consistency: 50 - i,
          validTime: 40 - i,
          goalsCompleted: 30 - i,
        },
        calculatedAt: daysAgo(0),
      },
    });

    await prisma.dailyGoal.upsert({
      where: { userId_date: { userId, date: daysAgo(0) } },
      update: {},
      create: {
        id: `daily-goal-${userId}`,
        userId,
        date: daysAgo(0),
        targetMinutes: 60,
        targetPoints: 150,
        achieved: i % 2 === 0,
        achievedAt: i % 2 === 0 ? daysAgo(0) : null,
      },
    });
    await prisma.weeklyGoal.upsert({
      where: { userId_weekStart: { userId, weekStart: REF_WEEK_START } },
      update: {},
      create: {
        id: `weekly-goal-${userId}`,
        userId,
        weekStart: REF_WEEK_START,
        targetMinutes: 300,
        targetPoints: 500,
        achieved: i % 3 === 0,
        achievedAt: i % 3 === 0 ? daysAgo(0) : null,
      },
    });
  }

  await prisma.auditLog.upsert({
    where: { id: "auditlog-seed-course-publish-pm" },
    update: {},
    create: {
      id: "auditlog-seed-course-publish-pm",
      actorUserId: "user-admin",
      action: "course.publish",
      entityType: "Course",
      entityId: "course-pm",
      after: { status: ContentStatus.PUBLISHED },
      createdAt: daysAgo(60),
    },
  });
  await prisma.auditLog.upsert({
    where: { id: "auditlog-seed-points-adjustment" },
    update: {},
    create: {
      id: "auditlog-seed-points-adjustment",
      actorUserId: "user-admin",
      action: "points.manual_adjustment",
      entityType: "PointTransaction",
      entityId: `pointtx-${studentIds[0]}-lesson-pm-01`,
      after: { note: "Ajuste manual de exemplo — auditoria administrativa." },
      createdAt: daysAgo(2),
    },
  });
}

// =============================================================================
// Orquestração
// =============================================================================

async function main() {
  console.info("[seed] Iniciando seed idempotente do banco de desenvolvimento...");
  await seedRolesAndPermissions();
  await seedUsers();
  await seedTeachers();
  await seedContestsAndCourses();
  await seedSubjectsAndTopics();
  await seedModulesAndLessons();
  await seedEnrollments();
  await seedLessonProgressAndGamification();
  await seedStudySessions();
  await seedStudyPlans();
  await seedMockExamsAndQuestions();
  await seedMockExamAttempts();
  await seedFlashcards();
  await seedBrainstorm();
  await seedAchievements();
  await seedRankingGoalsAndNotifications();
  console.info("[seed] Concluído com sucesso.");
}

main()
  .catch((error) => {
    console.error("[seed] Falhou:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
