import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = {
  title: "Administração",
};

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Administração</h1>
      <EmptyState
        icon={Settings}
        title="Em construção"
        description="O painel administrativo de conteúdo será implementado em uma etapa dedicada."
      />
    </div>
  );
}
