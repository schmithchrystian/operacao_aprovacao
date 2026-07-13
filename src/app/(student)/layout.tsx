import type { ReactNode } from "react";
import { StudentShell } from "@/components/layout/student-shell";
import { requireUser } from "@/server/authorization";

/**
 * Autorização real (server-side, ADR-0006): qualquer papel autenticado acessa a área
 * do aluno, mas é preciso estar autenticado — `requireUser` lança `AuthError` caso
 * contrário. O redirecionamento de UX para `/login` fica no `middleware.ts`.
 */
export default async function StudentLayout({ children }: { children: ReactNode }) {
  await requireUser();

  return <StudentShell>{children}</StudentShell>;
}
