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
 * entra nas listagens PÚBLICAS (`items`/`top3`) quando o participante/perfil foi resolvido E
 * `showInRanking === true`. Opt-out explícito (`showInRanking = false`) OU perfil não
 * resolvido (ausente/inconsistente) => fora da listagem pública, por padrão — nunca vazar
 * identidade/posição sem consentimento explícito. A posição/score REAL continua gravada (o
 * `rank` reflete a classificação verdadeira entre TODOS os participantes do escopo; só a
 * listagem pública pula a linha). O próprio usuário autenticado sempre recebe a SUA posição
 * real em `currentUser`, mesmo com opt-out, perfil não resolvido ou fora da página atual —
 * nunca através da UI, sempre resolvido aqui no servidor. `showRealName`/`showCityState`
 * mascaram apenas identidade/localização nas linhas de TERCEIROS; a própria linha do usuário
 * (`currentUser`) nunca é mascarada para ele mesmo.
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

function anonymizedName(userId: string): string {
  return `Candidato #${userId.slice(-4).toUpperCase()}`;
}

function toEntryDTO(
  row: RankingScoreEntity,
  participant: RankingParticipantEntity | undefined,
  previousRankByUser: ReadonlyMap<string, number | null>,
  isSelf: boolean,
): RankingListEntryDTO {
  const displayName = isSelf || !participant || participant.showRealName ? (participant?.displayName ?? row.userId) : anonymizedName(row.userId);
  const showLocation = isSelf || !participant || participant.showCityState;
  const points = row.breakdown?.display.points ?? 0;
  const xp = row.breakdown?.display.xp ?? 0;
  const previousRank = previousRankByUser.get(row.userId) ?? null;
  const evolution = previousRank !== null && row.rank !== null ? previousRank - row.rank : 0;

  return {
    position: row.rank ?? 0,
    userId: row.userId,
    displayName,
    avatarUrl: participant?.avatarUrl ?? null,
    city: showLocation ? (participant?.city ?? null) : null,
    state: showLocation ? (participant?.state ?? null) : null,
    level: computeLevel(xp).level,
    contestName: participant?.contestName ?? null,
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

  const buildDTO = (row: RankingScoreEntity): RankingListEntryDTO =>
    toEntryDTO(row, participantsById.get(row.userId), previousRankByUser, row.userId === session.userId);

  // FAIL-CLOSED (revisão de segurança Fase 9): uma linha só entra na listagem PÚBLICA quando o
  // participante/perfil foi resolvido E `showInRanking === true`. Uma linha sem participante
  // resolvido (perfil ausente/inconsistente) é tratada como NÃO pública por padrão — nunca
  // vazar identidade/posição de quem não temos consentimento explícito para exibir. A linha do
  // PRÓPRIO usuário autenticado é resolvida à parte (`currentUserRow`) e sempre visível para ele.
  const visibleRows = sortedRows.filter((row) => participantsById.get(row.userId)?.showInRanking === true);

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
