import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentLayout from "@/app/(student)/layout";
import AdminLayout from "@/app/admin/layout";
const { session, redirect } = vi.hoisted(() => ({ session: vi.fn(), redirect: vi.fn() }));
vi.mock("@/server/authorization", () => ({ getCurrentSession: session }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/layout/student-shell", () => ({
  StudentShell: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/layout/admin-shell", () => ({
  AdminShell: ({ children }: { children: ReactNode }) => children,
}));
beforeEach(() => {
  session.mockReset();
  redirect.mockReset().mockImplementation((path: string) => {
    throw new Error(`redirect:${path}`);
  });
});

describe("Layouts com sessão atualizada", () => {
  it.each([StudentLayout, AdminLayout])(
    "redireciona sessão ausente ou revogada ao login",
    async (layout) => {
      session.mockResolvedValue(null);
      await expect(layout({ children: "Conteúdo" })).rejects.toThrow("redirect:/login");
    },
  );
  it("redireciona administrador rebaixado à área do aluno", async () => {
    session.mockResolvedValue({ userId: "u", role: "aluno" });
    await expect(AdminLayout({ children: "Admin" })).rejects.toThrow("redirect:/dashboard");
  });
  it.each(["admin", "moderador"])("preserva acesso administrativo para %s", async (role) => {
    session.mockResolvedValue({ userId: "u", role });
    expect(await AdminLayout({ children: "Admin" })).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });
  it("permite aluno com sessão válida", async () => {
    session.mockResolvedValue({ userId: "u", role: "aluno" });
    expect(await StudentLayout({ children: "Estudos" })).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });
  it("não mascara falha de banco como sessão expirada", async () => {
    session.mockRejectedValue(new Error("Database unavailable"));
    await expect(StudentLayout({ children: "Estudos" })).rejects.toThrow("Database unavailable");
    expect(redirect).not.toHaveBeenCalled();
  });
});
