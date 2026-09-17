import { env } from "@/config/env";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { getCurrentSession } from "@/server/authorization";

/**
 * Usa o papel atual do banco, mesmo quando o cookie ainda contém o papel antigo.
 * As operações administrativas continuam protegidas nos serviços e nas actions.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.role !== "admin" && session.role !== "moderador") redirect("/dashboard");

  if (env.ADMIN_MFA_REQUIRED) {
    const { prisma } = await import("@/server/db/prisma");
    const factor = await prisma.userMfa.findUnique({
      where: { userId: session.userId },
      select: { enabledAt: true },
    });
    if (!factor?.enabledAt) redirect("/seguranca");
  }
  return <AdminShell>{children}</AdminShell>;
}
