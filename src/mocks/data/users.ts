import type { UserEntity } from "@/server/repositories/contracts/user-repository";

/**
 * Mocks centralizados e tipados (ADR-0011, CLAUDE.md §23). Poucos itens — apenas o
 * suficiente para os repositórios mock funcionarem; seed rico vem com o Prisma. `createdAt`
 * fixo no passado (Fase 17 — admin dashboard "novos usuários") para o cálculo de "últimos 30
 * dias" nascer honesto (zero) num processo mock recém-iniciado.
 */
const SEED_CREATED_AT = "2026-01-01T00:00:00.000Z";

export const mockUsers: UserEntity[] = [
  {
    id: "user-1",
    name: "Ana Recruta",
    email: "ana.recruta@example.com",
    role: "aluno",
    isActive: true,
    createdAt: SEED_CREATED_AT,
  },
  {
    id: "user-2",
    name: "Bruno Professor",
    email: "bruno.professor@example.com",
    role: "professor",
    isActive: true,
    createdAt: SEED_CREATED_AT,
  },
  {
    id: "user-3",
    name: "Carla Moderadora",
    email: "carla.moderadora@example.com",
    role: "moderador",
    isActive: true,
    createdAt: SEED_CREATED_AT,
  },
  {
    id: "user-4",
    name: "Diego Admin",
    email: "diego.admin@example.com",
    role: "admin",
    isActive: true,
    createdAt: SEED_CREATED_AT,
  },
];
