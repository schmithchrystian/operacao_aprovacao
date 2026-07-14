import { RANKING_PAGE_SIZE, RANKING_TOP_HIGHLIGHT_COUNT } from "@/config/business";
import { mockRankingParticipants, type RankingParticipantEntity } from "@/mocks";
import { requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";
import type { RankingScoreEntity } from "@/server/repositories/contracts/ranking-score-repository";
import { computeLevel } from "../levels";
import { buildPeriodWindow, buildScopeKey, type RankingPeriodType, type RankingScopeType } from "./scope";

/**
 * Leitura do ranking (Fase 9 — agente `gamification`, CLAUDE.md §17). SÓ lê `RankingScore`
 * (tabela materializada) — nunca recalcula on-the-fly; todo dado exibido (aulas, tempo
 * válido, aproveitamento, pontos/XP/nível, sequência) já está gravado no `breakdown` da
 * última versão calculada (ver `recalculate.ts`).
 *
 * Privacidade (CLAUDE.md §17/§24, docs/DATA-MODEL.md `Profile`) — FAIL-CLOSED: uma linha só
 * entra nas listagens PÚBLICAS (`items`/`top3`) quando a identidade/privacidade do usuário foi
 * resolvida E o perfil está público (`isProfilePublic === true`) E `showInRanking === true`.
 * Perfil FECHADO (`isProfilePublic = false`) cascateia sobre o ranking mesmo com
 * `showInRanking = true` (achado M2 da revisão de segurança Fase 16 — "Perfil público" na UI
 * desativa as sub-preferências; o backend é a fonte autoritativa). Opt-out explícito
 * (`showInRanking = false`) OU identidade não resolvida (sem `Profile` nem participante de
 * demonstração) => também fora da listagem pública, por padrão — nunca vazar identidade/posição
 * sem consentimento explícito. A
 * posição/score REAL continua gravada (o `rank` reflete a classificação verdadeira entre TODOS
 * os participantes do escopo; só a listagem pública pula a linha). O próprio usuário
 * autenticado sempre recebe a SUA posição real em `currentUser`, mesmo com opt-out, identidade
 * não resolvida ou fora da página atual — nunca através da UI, sempre resolvido aqui no
 * servidor. `showRealName`/`showCityState` mascaram apenas identidade/localização nas linhas de
 * TERCEIROS; a própria linha do usuário (`currentUser`) nunca é mascarada para ele mesmo.
 *
 * FONTE DA PRIVACIDADE (Fase 16 — fecha a pendência da Fase 9, ver TODO histórico em
 * `src/mocks/data/ranking-participants.ts`): usuários com um `Profile` real
 * (`ProfileRepository`, Fase 16 — "Meu perfil") têm a identidade/privacidade resolvida a partir
 * de lá (+ `UserRepository.name` para o nome real) — a fonte editável de verdade. Participantes
 * SEM `Profile` (o dataset fictício de demonstração, `mockRankingParticipants`, ~49 dos 50
 * registros) continuam usando o mock como fallback — nenhuma migração de dados foi necessária
 * para isso funcionar, e o fail-closed acima cobre igualmente os dois casos.
 */
export interface RankingListEntryDTO {
  position: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  city: string | null;
  state: string | null;
  level: { index: number; name: string };
  contestName: string | null;
  points: number;
  validHours: number;
  lessonsCompleted: number;
  accuracyPercent: number;
  streakDays: number;
  /** Delta de posição vs. a versão anterior do mesmo escopo/período (positivo = subiu). */
  evolution: number;
  /** `true` quando esta linha é do próprio usuário autenticado. */
  isCurrentUser: boolean;
}

export interface RankingReadResult {
  periodType: RankingPeriodType;
  periodKey: string;
  scopeType: RankingScopeType;
  scopeKey: string;
  /** `null` quando o escopo/período nunca foi calculado (cron ainda não rodou para ele). */
  calculationVersion: number | null;
  page: number;
  pageSize: number;
  /** Total de participantes VISÍVEIS publicamente no escopo (exclui opt-out). */
  total: number;
  top3: RankingListEntryDTO[];
  items: RankingListEntryDTO[];
  /** Posição real do usuário autenticado, mesmo fora da página atual ou com opt-out. `null`
   *  só quando o usuário não tem linha calculada neste escopo/período. */
  currentUser: RankingListEntryDTO | null;
}

export interface GetRankingInput {
  periodType: RankingPeriodType;
  scopeType: RankingScopeType;
  /** Identificador cru do escopo (id do concurso/curso, nome da cidade/UF; ignorado para GLOBAL). */
  scopeKeyRaw: string;
  /** 1-based — default 1. */
  page?: number;
  /** Injeção de relógio para testes — default `new Date()`. */
  referenceDate?: Date;
}

/** Nome anonimizado padrão quando `showRealName` está desligado — também reaproveitado por
 *  `@/server/services/profile` (perfil público de outro usuário) para manter a MESMA convenção
 *  nas duas superfícies que escondem identidade real (CLAUDE.md §17/§24). */
export function anonymizedRankingName(userId: string): string {
  return `Candidato #${userId.slice(-4).toUpperCase()}`;
}

/** Identidade/privacidade já resolvida de UM usuário, qualquer que seja a fonte (ver
 *  `resolveRankingIdentities` abaixo) — o resto da função de leitura só enxerga este formato. */
interface ResolvedRankingIdentity {
  displayName: string;
  avatarUrl: string | null;
  city: string | null;
  state: string | null;
  /** Interruptor mestre de privacidade (revisão de segurança Fase 16, achado M2): um perfil
   *  FECHADO (`isProfilePublic=false`) não aparece nas listagens públicas do ranking, mesmo com
   *  `showInRanking=true` — a UI ("Perfil público" desativa as sub-preferências) fica alinhada
   *  ao backend autoritativo. O próprio dono ainda vê sua posição via `currentUser`. */
  isProfilePublic: boolean;
  showInRanking: boolean;
  showRealName: boolean;
  showCityState: boolean;
}

/**
 * Resolve identidade/privacidade de exibição para um CONJUNTO de usuários (Fase 16 — fecha a
 * pendência da Fase 9, ver TODO histórico em `mockRankingParticipants`): usuários com `Profile`
 * real (`ProfileRepository`) têm as flags e os campos que elas mascaram vindos de lá +
 * `UserRepository.name` (nome real, editável em "Meu perfil"); usuários SEM `Profile` (dataset
 * fictício de demonstração) caem para `mockRankingParticipants` como antes. Os perfis vêm em
 * LOTE (`findByUserIds`); o nome real (`UserRepository.findById`) ainda é resolvido um a um —
 * N+1 aceitável só no mock em memória. TODO(Fase de banco): resolver o nome por
 * `include: { user: true }`/lote no `PrismaProfileRepository` (ver pendência lá).
 */
async function resolveRankingIdentities(
  userIds: readonly string[],
  participantsById: ReadonlyMap<string, RankingParticipantEntity>,
): Promise<Map<string, ResolvedRankingIdentity>> {
  const repos = getRepositories();
  const profiles = await repos.profiles.findByUserIds(userIds);
  const resolved = new Map<string, ResolvedRankingIdentity>();

  for (const profile of profiles) {
    const user = await repos.users.findById(profile.userId);
    resolved.set(profile.userId, {
      displayName: user?.name ?? anonymizedRankingName(profile.userId),
      avatarUrl: profile.avatarUrl,
      city: profile.city,
      state: profile.state,
      isProfilePublic: profile.isProfilePublic,
      showInRanking: profile.showInRanking,
      showRealName: profile.showRealName,
      showCityState: profile.showCityState,
    });
  }

  for (const userId of userIds) {
    if (resolved.has(userId)) continue; // já resolvido via Profile real acima
    const participant = participantsById.get(userId);
    if (!participant) continue; // sem Profile E sem participante mock => fail-closed (ver uso)
    resolved.set(userId, {
      displayName: participant.displayName,
      avatarUrl: participant.avatarUrl,
      city: participant.city,
      state: participant.state,
      isProfilePublic: participant.isProfilePublic,
      showInRanking: participant.showInRanking,
      showRealName: participant.showRealName,
      showCityState: participant.showCityState,
    });
  }

  return resolved;
}

function toEntryDTO(
  row: RankingScoreEntity,
  identity: ResolvedRankingIdentity | undefined,
  contestName: string | null,
  previousRankByUser: ReadonlyMap<string, number | null>,
  isSelf: boolean,
): RankingListEntryDTO {
  const displayName = isSelf || !identity || identity.showRealName ? (identity?.displayName ?? row.userId) : anonymizedRankingName(row.userId);
  const showLocation = isSelf || !identity || identity.showCityState;
  const points = row.breakdown?.display.points ?? 0;
  const xp = row.breakdown?.display.xp ?? 0;
  const previousRank = previousRankByUser.get(row.userId) ?? null;
  const evolution = previousRank !== null && row.rank !== null ? previousRank - row.rank : 0;

  return {
    position: row.rank ?? 0,
    userId: row.userId,
    displayName,
    avatarUrl: identity?.avatarUrl ?? null,
    city: showLocation ? (identity?.city ?? null) : null,
    state: showLocation ? (identity?.state ?? null) : null,
    level: computeLevel(xp).level,
    contestName,
    points,
    validHours: row.breakdown?.metrics.validHours.raw ?? 0,
    lessonsCompleted: row.breakdown?.metrics.lessonsCompleted.raw ?? 0,
    accuracyPercent: row.breakdown?.metrics.mockExamPerformance.raw ?? 0,
    streakDays: row.breakdown?.display.streakDays ?? 0,
    evolution,
    isCurrentUser: isSelf,
  };
}

function emptyResult(input: {
  periodType: RankingPeriodType;
  periodKey: string;
  scopeType: RankingScopeType;
  scopeKey: string;
  page: number;
}): RankingReadResult {
  return {
    periodType: input.periodType,
    periodKey: input.periodKey,
    scopeType: input.scopeType,
    scopeKey: input.scopeKey,
    calculationVersion: null,
    page: input.page,
    pageSize: RANKING_PAGE_SIZE,
    total: 0,
    top3: [],
    items: [],
    currentUser: null,
  };
}

/**
 * Lê o ranking materializado de um escopo/período. `requireUser` garante sessão real — a
 * posição "do usuário atual" nunca é resolvida a partir de um `userId` vindo do cliente,
 * sempre da sessão (ADR-0006, anti-IDOR).
 */
export async function getRanking(input: GetRankingInput): Promise<RankingReadResult> {
  const session = await requireUser();
  const repos = getRepositories();

  const referenceDate = input.referenceDate ?? new Date();
  const window = buildPeriodWindow(input.periodType, referenceDate);
  const scopeKey = buildScopeKey(input.scopeType, input.scopeKeyRaw);
  const page = Math.max(1, Math.floor(input.page ?? 1));

  const latestVersion = await repos.rankingScores.findLatestVersion(
    input.periodType,
    window.periodKey,
    input.scopeType,
    scopeKey,
  );
  if (latestVersion === null) {
    return emptyResult({ periodType: input.periodType, periodKey: window.periodKey, scopeType: input.scopeType, scopeKey, page });
  }

  const rows = await repos.rankingScores.listByScopeAndVersion(
    input.periodType,
    window.periodKey,
    input.scopeType,
    scopeKey,
    latestVersion,
  );
  const sortedRows = [...rows].sort(
    (a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER),
  );

  const versionsDesc = await repos.rankingScores.listVersionsDesc(
    input.periodType,
    window.periodKey,
    input.scopeType,
    scopeKey,
  );
  const previousVersion = versionsDesc.find((version) => version < latestVersion) ?? null;
  let previousRankByUser = new Map<string, number | null>();
  if (previousVersion !== null) {
    const previousRows = await repos.rankingScores.listByScopeAndVersion(
      input.periodType,
      window.periodKey,
      input.scopeType,
      scopeKey,
      previousVersion,
    );
    previousRankByUser = new Map(previousRows.map((row) => [row.userId, row.rank ?? null]));
  }

  const participantsById = new Map(mockRankingParticipants.map((participant) => [participant.userId, participant]));
  // Fase 16: identidade/privacidade resolvida via `Profile` real quando existir, com fallback
  // para `mockRankingParticipants` (ver docstring do arquivo e `resolveRankingIdentities`).
  const identityByUserId = await resolveRankingIdentities(
    sortedRows.map((row) => row.userId),
    participantsById,
  );

  const buildDTO = (row: RankingScoreEntity): RankingListEntryDTO =>
    toEntryDTO(
      row,
      identityByUserId.get(row.userId),
      participantsById.get(row.userId)?.contestName ?? null,
      previousRankByUser,
      row.userId === session.userId,
    );

  // FAIL-CLOSED (revisão de segurança Fase 9 + achado M2 da Fase 16): uma linha só entra na
  // listagem PÚBLICA quando a identidade foi resolvida (via `Profile` real OU
  // `mockRankingParticipants`) E o perfil está público (`isProfilePublic === true`) E o usuário
  // não optou por sair do ranking (`showInRanking === true`). Perfil FECHADO cascateia sobre o
  // ranking (mesmo com `showInRanking=true`), alinhado ao backend autoritativo (M2). Identidade
  // não resolvida => NÃO pública por padrão. A linha do PRÓPRIO usuário autenticado é resolvida
  // à parte (`currentUserRow`) e sempre visível para ele, independentemente destas flags.
  const visibleRows = sortedRows.filter((row) => {
    const identity = identityByUserId.get(row.userId);
    return identity?.isProfilePublic === true && identity?.showInRanking === true;
  });

  const startIndex = (page - 1) * RANKING_PAGE_SIZE;
  const pageRows = visibleRows.slice(startIndex, startIndex + RANKING_PAGE_SIZE);

  const currentUserRow = sortedRows.find((row) => row.userId === session.userId) ?? null;

  return {
    periodType: input.periodType,
    periodKey: window.periodKey,
    scopeType: input.scopeType,
    scopeKey,
    calculationVersion: latestVersion,
    page,
    pageSize: RANKING_PAGE_SIZE,
    total: visibleRows.length,
    top3: visibleRows.slice(0, RANKING_TOP_HIGHLIGHT_COUNT).map(buildDTO),
    items: pageRows.map(buildDTO),
    currentUser: currentUserRow ? buildDTO(currentUserRow) : null,
  };
}

export interface RankingPositionSummary {
  position: number;
  totalParticipants: number;
  calculationVersion: number;
}

/**
 * Resolve a posição materializada de UM usuário num escopo/período — SEM paginação e SEM
 * aplicar máscara de privacidade (bloco de leitura interno; quem chama decide o que expor).
 * Não exige sessão: não é uma fronteira autorizada por si só — reaproveitado pela Fase 16
 * (`@/server/services/profile`) para "posição no ranking" tanto do próprio dono quanto de um
 * visitante consultando o perfil de outro usuário (onde `getRanking` não serve: seu
 * `currentUser` é sempre o usuário DA SESSÃO, nunca um alvo arbitrário). `null` quando o
 * escopo/período nunca foi calculado OU o usuário não tem linha nele.
 */
export async function getUserRankingPosition(
  userId: string,
  options?: {
    periodType?: RankingPeriodType;
    scopeType?: RankingScopeType;
    scopeKeyRaw?: string;
    referenceDate?: Date;
  },
): Promise<RankingPositionSummary | null> {
  const repos = getRepositories();
  const periodType = options?.periodType ?? "ALL_TIME";
  const scopeType = options?.scopeType ?? "GLOBAL";
  const scopeKeyRaw = options?.scopeKeyRaw ?? "global";
  const referenceDate = options?.referenceDate ?? new Date();

  const window = buildPeriodWindow(periodType, referenceDate);
  const scopeKey = buildScopeKey(scopeType, scopeKeyRaw);

  const latestVersion = await repos.rankingScores.findLatestVersion(periodType, window.periodKey, scopeType, scopeKey);
  if (latestVersion === null) {
    return null;
  }

  const row = await repos.rankingScores.findByUserScopeAndVersion(
    userId,
    periodType,
    window.periodKey,
    scopeType,
    scopeKey,
    latestVersion,
  );
  if (!row || row.rank === null) {
    return null;
  }

  const allRows = await repos.rankingScores.listByScopeAndVersion(
    periodType,
    window.periodKey,
    scopeType,
    scopeKey,
    latestVersion,
  );

  return { position: row.rank, totalParticipants: allRows.length, calculationVersion: latestVersion };
}
