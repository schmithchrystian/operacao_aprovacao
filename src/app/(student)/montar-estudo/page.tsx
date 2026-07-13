import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Montar estudo" };

export default function MontarEstudoPage() {
  return (
    <FeaturePlaceholder
      title="Montar estudo"
      description="A montagem personalizada de sessões de estudo chega em uma etapa dedicada."
      icon={ClipboardList}
      breadcrumbs={[{ label: "Início", href: "/dashboard" }, { label: "Montar estudo" }]}
    />
  );
}
