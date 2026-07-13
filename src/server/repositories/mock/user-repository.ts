import { mockUsers } from "@/mocks";
import type { UserEntity, UserRepository } from "../contracts/user-repository";

/** Implementação mock — lê de `src/mocks/data/users.ts` (ADR-0011). */
export class MockUserRepository implements UserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    return mockUsers.find((user) => user.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return mockUsers.find((user) => user.email === email) ?? null;
  }

  async list(): Promise<UserEntity[]> {
    return [...mockUsers];
  }
}
