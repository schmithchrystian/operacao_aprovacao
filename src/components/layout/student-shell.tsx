import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface StudentShellProps {
  children: ReactNode;
}

/**
 * Shell visual do aluno: sidebar (desktop) + topbar (com menu mobile) + conteúdo.
 * Server Component — composição de Sidebar/Topbar, que isolam suas próprias partes client.
 */
export function StudentShell({ children }: StudentShellProps) {
  return (
    <div className="bg-background flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
