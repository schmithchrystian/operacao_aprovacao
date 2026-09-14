import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import bcrypt from "bcryptjs";
import { prisma } from "../src/server/db/prisma";
import { env } from "../src/config/env";
async function main() {
  if (
    env.APP_ENV !== "test" ||
    env.DATA_SOURCE !== "prisma" ||
    !env.DATABASE_URL ||
    !new URL(env.DATABASE_URL).pathname.includes("test")
  )
    throw new Error("QA fixture requires an explicitly isolated test database.");
  const suffix = randomBytes(6).toString("hex"),
    password = randomBytes(24).toString("base64url"),
    passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      name: "QA Admin",
      email: `qa-admin-${suffix}@example.invalid`,
      passwordHash,
      role: "ADMIN",
      profile: { create: { isProfilePublic: false } },
    },
  });
  const student = await prisma.user.create({
    data: {
      name: "QA Student",
      email: `qa-student-${suffix}@example.invalid`,
      passwordHash,
      profile: { create: { isProfilePublic: false } },
    },
  });
  const contest = await prisma.contest.create({
    data: { name: "Concurso de validação", slug: `qa-contest-${suffix}` },
  });
  const subject = await prisma.subject.create({
    data: { name: "Matéria de validação", slug: `qa-subject-${suffix}` },
  });
  const course = await prisma.course.create({
    data: {
      contestId: contest.id,
      slug: `qa-course-${suffix}`,
      title: "Curso de validação",
      description: "Conteúdo fictício exclusivo do teste local.",
      teacherName: "Equipe QA",
      status: "PUBLISHED",
      modules: {
        create: {
          subjectId: subject.id,
          title: "Módulo inicial",
          slug: "introducao",
          order: 1,
          status: "PUBLISHED",
          lessons: {
            create: [
              { title: "Aula de validação", order: 1, durationSeconds: 600, status: "PUBLISHED" },
              { title: "Segunda aula", order: 2, durationSeconds: 600, status: "PUBLISHED" },
            ],
          },
        },
      },
    },
    include: { modules: { include: { lessons: true } } },
  });
  await prisma.enrollment.create({ data: { userId: student.id, courseId: course.id } });
  const output = {
    admin: { email: admin.email, password, id: admin.id },
    student: { email: student.email, password, id: student.id },
    courseSlug: course.slug,
    lessonPath: `/cursos/${course.slug}/modulos/introducao/aulas/${course.modules[0]!.lessons[0]!.id}`,
  };
  await writeFile("/tmp/study-qa-fixture.json", JSON.stringify(output, null, 2), { mode: 0o600 });
  console.log(
    "Synthetic QA fixture created; credentials are in /tmp/study-qa-fixture.json (0600).",
  );
}
main().finally(() => prisma.$disconnect());
