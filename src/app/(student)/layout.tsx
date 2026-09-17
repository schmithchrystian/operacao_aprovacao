import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { StudentShell } from "@/components/layout/student-shell";
import { getCurrentSession } from "@/server/authorization";

/**
 * Revalida a sessão no servidor, incluindo bloqueio e revogação. As actions e
 * serviços mantêm suas próprias guardas; o layout oferece uma saída para o login.
 */
export default async function StudentLayout({ children }: { children: ReactNode }) {
  if (!(await getCurrentSession())) redirect("/login");

  return <StudentShell>{children}</StudentShell>;
}
