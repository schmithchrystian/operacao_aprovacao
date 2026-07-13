import type { Metadata } from "next";
import { Timer } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Modo foco" };

export default function ModoFocoPage() {
  return (
    <FeaturePlaceholder
      title="Modo foco"
      description="O timer Pomodoro e o modo de estudo sem distrações chegam em uma etapa dedicada."
      icon={Timer}
      breadcrumbs={[{ label: "Início", href: "/dashboard" }, { label: "Modo foco" }]}
    />
  );
}
