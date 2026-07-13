import type { Metadata } from "next";
import { Layers } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Flashcards" };

export default function FlashcardsPage() {
  return (
    <FeaturePlaceholder
      title="Flashcards"
      description="A revisão com repetição espaçada (Errei, Difícil, Médio, Fácil) chega em uma etapa dedicada."
      icon={Layers}
      breadcrumbs={[{ label: "Início", href: "/dashboard" }, { label: "Flashcards" }]}
    />
  );
}
