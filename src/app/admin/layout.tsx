import type { ReactNode } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { requireRole } from "@/server/authorization";

/**
 * Autorização real (server-side) da área admin (ADR-0006, CLAUDE.md §11): bloqueia
 * qualquer papel além de `admin`/`moderador` lançando `ForbiddenError` — a separação
 * feita no `middleware.ts` é só UX (evita o flash de conteúdo), nunca a proteção real.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole("admin", "moderador");

  return <AdminShell>{children}</AdminShell>;
}
