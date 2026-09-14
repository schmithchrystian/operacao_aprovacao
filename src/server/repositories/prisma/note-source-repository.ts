/** Private notes eligible for a user's explicit flashcard import. */
export async function listNoteSources(userId: string) {
  const { prisma } = await import("@/server/db/prisma");
  const rows = await prisma.lessonNote.findMany({
    where: { userId, content: { not: "" }, lesson: { deletedAt: null } },
    include: { lesson: { select: { title: true } } }, orderBy: { updatedAt: "asc" },
  });
  return rows.map((row) => ({ id: `lesson:${row.lessonId}`, question: row.lesson.title, answer: row.content }));
}
