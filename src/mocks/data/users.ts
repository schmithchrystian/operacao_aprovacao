import type { UserEntity } from "@/server/repositories/contracts/user-repository";

/**
 * Mocks centralizados e tipados (ADR-0011, CLAUDE.md §23). Poucos itens — apenas o
 * suficiente para os repositórios mock funcionarem; seed rico vem com o Prisma.
 */
export const mockUsers: UserEntity[] = [
  { id: "user-1", name: "Ana Recruta", email: "ana.recruta@example.com", role: "aluno" },
  {
    id: "user-2",
    name: "Bruno Professor",
    email: "bruno.professor@example.com",
    role: "professor",
  },
  {
    id: "user-3",
    name: "Carla Moderadora",
    email: "carla.moderadora@example.com",
    role: "moderador",
  },
  { id: "user-4", name: "Diego Admin", email: "diego.admin@example.com", role: "admin" },
];
