import type { AchievementEntity } from "@/server/repositories/contracts/achievement-repository";

/**
 * Mocks centralizados e tipados (ADR-0011, CLAUDE.md §23). Fase 17 — agente `backend` (admin de
 * conteúdo — CRUD de METADADOS de conquista). `key`/`name` espelham (mas não importam — mocks
 * não devem depender de `server/services`, ver ADR-0002/docs/ARCHITECTURE.md §2) algumas das
 * conquistas reais do motor de gamificação (`@/server/services/gamification/achievements.ts`,
 * lista `ACHIEVEMENTS`). Ver PENDÊNCIA em `achievement-repository.ts`: editar um registro aqui
 * não altera o critério de desbloqueio real (desacoplado de propósito nesta fase).
 */
export const mockAchievements: AchievementEntity[] = [
  {
    id: "achievement-first-victory",
    key: "first-victory",
    name: "Primeira vitória",
    description: "Concluiu a primeira aula.",
    icon: "Star",
    criteria: null,
    points: 0,
    deletedAt: null,
  },
  {
    id: "achievement-lessons-10",
    key: "lessons-10",
    name: "10 aulas concluídas",
    description: "Concluiu 10 aulas.",
    icon: "BookOpen",
    criteria: null,
    points: 0,
    deletedAt: null,
  },
  {
    id: "achievement-streak-7",
    key: "streak-7",
    name: "Sequência de 7 dias",
    description: "Estudou por 7 dias consecutivos.",
    icon: "Flame",
    criteria: null,
    points: 0,
    deletedAt: null,
  },
  {
    id: "achievement-first-mock-exam",
    key: "first-mock-exam",
    name: "Primeiro simulado",
    description: "Concluiu o primeiro simulado.",
    icon: "ClipboardCheck",
    criteria: null,
    points: 0,
    deletedAt: null,
  },
];
