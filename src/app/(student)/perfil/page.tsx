import type { Metadata } from "next";
import { User } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Perfil" };

export default function PerfilPage() {
  return (
    <FeaturePlaceholder
      title="Perfil"
      description="Os dados da conta, preferências e nível chegam em uma etapa dedicada."
      icon={User}
      breadcrumbs={[{ label: "Início", href: "/dashboard" }, { label: "Perfil" }]}
    />
  );
}
