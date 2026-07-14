import { mockUsers } from "@/mocks";
import type { UserEntity, UserRepository } from "../contracts/user-repository";
import type { Role } from "@/types";
import { mockStore } from "./mock-store";

/** Implementação mock — seed inicial de `src/mocks/data/users.ts` (ADR-0011). Estado via
 *  `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo (Fase 17 — gestão
 *  de usuários: alterar papel/ativar-desativar). */
const store = mockStore<UserEntity[]>("user", () => [...mockUsers]);

export class MockUserRepository implements UserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    return store.find((user) => user.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return store.find((user) => user.email === email) ?? null;
  }

  async list(): Promise<UserEntity[]> {
    return [...store];
  }

  async updateRole(userId: string, role: Role): Promise<UserEntity> {
    const index = store.findIndex((user) => user.id === userId);
    if (index < 0) {
      throw new Error(`[mocks/user] Usuário não encontrado: ${userId}`);
    }
    const updated: UserEntity = { ...store[index]!, role };
    store[index] = updated;
    return updated;
  }

  async setActive(userId: string, isActive: boolean): Promise<UserEntity> {
    const index = store.findIndex((user) => user.id === userId);
    if (index < 0) {
      throw new Error(`[mocks/user] Usuário não encontrado: ${userId}`);
    }
    const updated: UserEntity = { ...store[index]!, isActive };
    store[index] = updated;
    return updated;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockUserStore(): void {
  store.splice(0, store.length, ...mockUsers);
}
