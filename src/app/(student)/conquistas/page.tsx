import type { Metadata } from "next";
import { Medal } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Conquistas" };

export default function ConquistasPage() {
  return (
    <FeaturePlaceholder
      title="Conquistas"
      description="As medalhas e conquistas desbloqueadas chegam em uma etapa dedicada."
      icon={Medal}
      breadcrumbs={[{ label: "Início", href: "/dashboard" }, { label: "Conquistas" }]}
    />
  );
}
