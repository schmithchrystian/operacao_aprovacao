import type { Metadata } from "next";
import { PlayCircle } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Aula" };

interface LessonPageProps {
  params: Promise<{ slug: string; moduleSlug: string; lessonId: string }>;
}

/**
 * Placeholder mínimo da página da aula — o player de vídeo, o registro de heartbeat de
 * tempo válido e a navegação entre aulas são da Fase 7 (agente `study-tracking`). Esta rota
 * só precisa existir para os links de `LessonRow`/`ContinueMissionCard` funcionarem.
 */
export default async function LessonPage({ params }: LessonPageProps) {
  const { slug } = await params;

  return (
    <FeaturePlaceholder
      title="Aula"
      description="O player de vídeo e o registro de progresso da aula chegam em uma etapa dedicada."
      icon={PlayCircle}
      breadcrumbs={[
        { label: "Início", href: "/dashboard" },
        { label: "Cursos", href: "/cursos" },
        { label: "Curso", href: `/cursos/${slug}` },
        { label: "Aula" },
      ]}
    />
  );
}
