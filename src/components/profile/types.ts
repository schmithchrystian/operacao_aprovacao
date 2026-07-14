import type { PrivacySettingsDTO, ProfileAggregatesDTO, ProfileDTO } from "@/contracts/profile";

/**
 * Visão "meu perfil" do `ProfileDTO` (Fase 16 — UI do agente `frontend`). `aggregates`/`privacy`
 * são sempre preenchidos pelo serviço quando `isOwnProfile === true`
 * (`buildFullProfileDTO`/`getOwnProfile`, `@/server/services/profile/read.ts`) — este tipo só
 * formaliza essa garantia do lado do frontend, para os componentes de "meu perfil"
 * (cabeçalho/estatísticas/privacidade) não espalharem `!`/`as` para lidar com campos que o
 * schema declara nullable só por causa da visão de VISITANTE (`getPublicProfile`).
 */
export type OwnProfileDTO = ProfileDTO & {
  aggregates: ProfileAggregatesDTO;
  privacy: PrivacySettingsDTO;
};

/** Type guard usado na fronteira (Server Component da página + após cada mutação no client):
 *  nunca confia cegamente em `isOwnProfile`, também exige `aggregates`/`privacy` presentes. */
export function isOwnProfileComplete(profile: ProfileDTO): profile is OwnProfileDTO {
  return profile.isOwnProfile && profile.aggregates !== null && profile.privacy !== null;
}
