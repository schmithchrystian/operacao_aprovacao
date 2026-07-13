import type { LucideIcon } from "lucide-react";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/layout/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";

interface FeaturePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  breadcrumbs: BreadcrumbItem[];
}

/**
 * Composição título + breadcrumb + EmptyState usada pelas 13 páginas do aluno
 * (e pela home do admin) enquanto a funcionalidade real não é implementada.
 * Evita duplicar o mesmo bloco em cada `page.tsx` (CLAUDE.md §6).
 */
export function FeaturePlaceholder({ title, description, icon, breadcrumbs }: FeaturePlaceholderProps) {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <EmptyState icon={icon} title="Em construção" description={description} />
    </div>
  );
}
