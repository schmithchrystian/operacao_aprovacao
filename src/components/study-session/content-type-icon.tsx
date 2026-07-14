import {
  FileText,
  Layers,
  ListChecks,
  Network,
  NotebookText,
  RotateCcw,
  Video,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import type { ContentType } from "@/contracts/study-session";

/**
 * Ícone por tipo de conteúdo de "Montar estudo" (Fase 11). Mapeamento ESTÁTICO — diferente do
 * `ICON_ALLOWLIST` de `@/components/shared/lucide-icon` (que existe para resolver com segurança
 * um NOME de ícone vindo como string do backend), aqui `ContentType` já é um enum fechado
 * validado por Zod e conhecido em tempo de compilação, então indexar `Record<ContentType,
 * LucideIcon>` diretamente é seguro e exaustivo (TS aponta erro se faltar uma chave).
 */
export const CONTENT_TYPE_ICON: Record<ContentType, LucideIcon> = {
  videoaula: Video,
  pdf: FileText,
  questoes: ListChecks,
  flashcards: Layers,
  revisao: RotateCcw,
  simulado: ClipboardList,
  resumo: NotebookText,
  mapa_mental: Network,
};
