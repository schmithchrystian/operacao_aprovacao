import { mockStore } from "@/server/repositories/mock/mock-store";
import type { UserEntity } from "@/server/repositories/contracts/user-repository";
import type { Role } from "@/types";

/** Domain fixtures must have a persisted identity as well as a session; never replaces authorization. */
export function ensureAuthenticatedUser(id: string, role: Role = "aluno"): void {
  const users = mockStore<UserEntity[]>("user", () => []);
  if (!users.some(user => user.id === id)) users.push({
    id, role, name: "Teste", email: `${id}@example.test`, isActive: true, deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  });
}
