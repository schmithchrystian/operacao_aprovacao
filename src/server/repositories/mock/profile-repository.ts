import { mockProfiles } from "@/mocks";
import {
  DEFAULT_PRIVACY_SETTINGS,
  type ProfileCreateInput,
  type ProfileEntity,
  type ProfilePrivacyUpdateInput,
  type ProfileRepository,
  type ProfileUpdateInput,
} from "../contracts/profile-repository";
import { mockStore } from "./mock-store";

/**
 * Implementação mock — seed inicial de `src/mocks/data/profiles.ts` (ADR-0011, Fase 16). Estado
 * via `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo (mesmo motivo
 * documentado lá: Route Handlers/Server Actions/Server Components podem carregar instâncias de
 * módulo separadas dentro do mesmo processo).
 */
const store = mockStore<ProfileEntity[]>("profile", () => [...mockProfiles]);
const sequence = mockStore<{ value: number }>("profile:sequence", () => ({ value: store.length }));

export class MockProfileRepository implements ProfileRepository {
  async findByUserId(userId: string): Promise<ProfileEntity | null> {
    return store.find((profile) => profile.userId === userId) ?? null;
  }

  async findByUserIds(userIds: readonly string[]): Promise<ProfileEntity[]> {
    const idSet = new Set(userIds);
    return store.filter((profile) => idSet.has(profile.userId));
  }

  async create(input: ProfileCreateInput): Promise<ProfileEntity> {
    sequence.value += 1;
    const nowIso = input.now.toISOString();
    const profile: ProfileEntity = {
      id: `profile-mock-${sequence.value}`,
      userId: input.userId,
      bio: null,
      avatarUrl: null,
      phone: null,
      birthDate: null,
      city: null,
      state: null,
      targetContestId: null,
      ...DEFAULT_PRIVACY_SETTINGS,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    store.push(profile);
    return profile;
  }

  async update(input: ProfileUpdateInput): Promise<ProfileEntity> {
    const index = store.findIndex((profile) => profile.userId === input.userId);
    if (index < 0) {
      throw new Error(`[mocks/profile] Perfil não encontrado para o usuário: ${input.userId}`);
    }
    const current = store[index]!;
    const updated: ProfileEntity = {
      ...current,
      bio: input.bio === undefined ? current.bio : input.bio,
      avatarUrl: input.avatarUrl === undefined ? current.avatarUrl : input.avatarUrl,
      phone: input.phone === undefined ? current.phone : input.phone,
      birthDate: input.birthDate === undefined ? current.birthDate : input.birthDate,
      city: input.city === undefined ? current.city : input.city,
      state: input.state === undefined ? current.state : input.state,
      targetContestId: input.targetContestId === undefined ? current.targetContestId : input.targetContestId,
      updatedAt: input.now.toISOString(),
    };
    store[index] = updated;
    return updated;
  }

  async updatePrivacy(input: ProfilePrivacyUpdateInput): Promise<ProfileEntity> {
    const index = store.findIndex((profile) => profile.userId === input.userId);
    if (index < 0) {
      throw new Error(`[mocks/profile] Perfil não encontrado para o usuário: ${input.userId}`);
    }
    const current = store[index]!;
    const updated: ProfileEntity = {
      ...current,
      isProfilePublic: input.isProfilePublic ?? current.isProfilePublic,
      showInRanking: input.showInRanking ?? current.showInRanking,
      showRealName: input.showRealName ?? current.showRealName,
      showCityState: input.showCityState ?? current.showCityState,
      showStudyHours: input.showStudyHours ?? current.showStudyHours,
      showPerformance: input.showPerformance ?? current.showPerformance,
      updatedAt: input.now.toISOString(),
    };
    store[index] = updated;
    return updated;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockProfileStore(): void {
  store.splice(0, store.length, ...mockProfiles);
  sequence.value = store.length;
}
