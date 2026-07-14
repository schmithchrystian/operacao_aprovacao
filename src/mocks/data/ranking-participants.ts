/**
 * Participantes do ranking (ADR-0011, CLAUDE.md §17/§23, Fase 9 — agente `gamification`).
 *
 * Este arquivo cobre DUAS necessidades:
 *
 * 1. **Identidade/privacidade de perfil** — RESOLVIDO PARCIALMENTE na Fase 16 (`backend`):
 *    `ProfileRepository` agora existe e `src/server/services/gamification/ranking/read.ts`
 *    consulta a privacidade real de lá (`isProfilePublic`/`showInRanking`/`showRealName`/
 *    `showCityState` + `avatarUrl`/`city`/`state`) para qualquer usuário que tenha um `Profile`
 *    — hoje só `user-1..4` (`src/mocks/data/profiles.ts`). Este arquivo (`mockRankingParticipants`)
 *    continua servindo dois papéis que NÃO migraram para `Profile`: (a) fallback de
 *    identidade/privacidade para os ~49 participantes FICTÍCIOS de demonstração (sem `User`/
 *    `Profile` reais — ver `resolveRankingIdentities` em `ranking/read.ts`); (b) dados
 *    demográficos de ESCOPO (`contestId`/`courseId`/`city`/`state` usados por
 *    `selectCandidatesForScope`/`discoverScopesFromParticipants`, `ranking/scope.ts`) — Profile
 *    não modela `courseId` nem é a fonte de agrupamento por escopo, então esta metade do
 *    arquivo permanece necessária mesmo com `Profile` implementado.
 *
 * 2. **Métricas sem fonte real ainda** (aproveitamento em simulados — Fase 10 `simulations`;
 *    metas concluídas — Fases 11/12/15 `study-tracking`) e um "piso" de atividade para
 *    participantes fictícios que não têm usuário/ledger reais (`fallback*`) — necessário para
 *    o ranking ter volume demonstrável (CLAUDE.md §23 pede mocks compatíveis com os contratos
 *    reais). Participantes com entidade real em `UserRepository` (hoje só `user-1`) têm
 *    `lessonsCompleted`/`validHours`/`consistency` calculados de verdade a partir do ledger
 *    (`LessonProgress`/`StudySession`/`GamificationEvent`) em
 *    `src/server/services/gamification/ranking/metrics.ts` — os campos `fallback*` abaixo só
 *    são usados quando NÃO há usuário real correspondente.
 *
 * Geração determinística (sem `Math.random()`/`Date.now()`): mesma lista a cada carregamento
 * do módulo — requisito direto de "recálculo idempotente" (rodar o motor de ranking 2x deve
 * produzir o mesmo resultado), já que os dados de entrada nunca mudam entre execuções.
 */

export interface RankingParticipantEntity {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  city: string | null;
  state: string | null;
  contestId: string | null;
  contestName: string | null;
  courseId: string | null;
  /** Flags de privacidade (mock do futuro `Profile`, Fase 16 — TODO, ver cabeçalho do arquivo). */
  isProfilePublic: boolean;
  showInRanking: boolean;
  showRealName: boolean;
  showCityState: boolean;
  /** Aproveitamento (0-100) — TODO(Fase 10 — `simulations`): sem `MockExamAttempt` real ainda. */
  mockExamAccuracyPercent: number;
  /** Metas concluídas no período — TODO(Fases 11/12/15): sem `DailyGoal`/`WeeklyGoal` real ainda. */
  mockGoalsCompletedCount: number;
  /** Usados SÓ quando `userId` não existe em `UserRepository` (sem ledger real). */
  fallbackLessonsCompleted: number;
  fallbackValidHours: number;
  /** 0-1 — fração de dias ativos no período. */
  fallbackConsistency: number;
  /** Pontos ilustrativos (aprox. `GAMIFICATION_REWARDS`) — só usados sem ledger real. */
  fallbackPoints: number;
  /** ISO 8601 — primeira/última atividade (desempate "menor tempo para pontuar"). */
  firstActivityAt: string;
  lastActivityAt: string;
}

/** Hash determinístico 0..1 a partir de um inteiro — nunca `Math.random()` (CLAUDE.md §23,
 *  reprodutibilidade exigida pelo recálculo idempotente do ranking). */
function seededFraction(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const FIRST_NAMES = [
  "Ana",
  "Bruno",
  "Carla",
  "Diego",
  "Elaine",
  "Fábio",
  "Gabriela",
  "Hugo",
  "Isabela",
  "João",
  "Karina",
  "Lucas",
  "Marina",
  "Nathan",
  "Otávio",
  "Paula",
  "Rafael",
  "Sabrina",
  "Thiago",
  "Vanessa",
] as const;

const LAST_NAMES = [
  "Silva",
  "Souza",
  "Oliveira",
  "Santos",
  "Pereira",
  "Costa",
  "Almeida",
  "Ribeiro",
  "Carvalho",
  "Gomes",
] as const;

const CITY_STATE_PAIRS = [
  { city: "São Paulo", state: "SP" },
  { city: "Campinas", state: "SP" },
  { city: "Rio de Janeiro", state: "RJ" },
  { city: "Niterói", state: "RJ" },
  { city: "Belo Horizonte", state: "MG" },
  { city: "Uberlândia", state: "MG" },
  { city: "Curitiba", state: "PR" },
  { city: "Porto Alegre", state: "RS" },
  { city: "Salvador", state: "BA" },
  { city: "Recife", state: "PE" },
] as const;

/** `contestId`/`contestName`/`courseId` DEVEM coincidir com `mockCourses` (`courses.ts`) — o
 *  índice `3` representa "sem concurso selecionado" (participante só aparece no escopo GLOBAL). */
const CONTEST_COURSE_SLOTS = [
  { contestId: "contest-pm-soldado", contestName: "Polícia Militar — Soldado", courseId: "course-1" },
  {
    contestId: "contest-gcm-agente",
    contestName: "Guarda Civil Municipal — Agente",
    courseId: "course-2",
  },
  {
    contestId: "contest-pp-agente",
    contestName: "Polícia Penal — Agente Penitenciário",
    courseId: "course-3",
  },
  { contestId: null, contestName: null, courseId: null },
] as const;

const BASE_TIMESTAMP = Date.parse("2026-01-05T08:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function buildFictitiousParticipant(index: number): RankingParticipantEntity {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length]!;
  const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length]!;
  const cityState = CITY_STATE_PAIRS[index % CITY_STATE_PAIRS.length]!;
  const slot = CONTEST_COURSE_SLOTS[index % CONTEST_COURSE_SLOTS.length]!;

  const r1 = seededFraction(index * 3 + 1);
  const r2 = seededFraction(index * 3 + 2);
  const r3 = seededFraction(index * 3 + 3);
  const r4 = seededFraction(index * 5 + 7);
  const r5 = seededFraction(index * 7 + 11);

  const lessonsCompleted = Math.round(r1 * 140);
  const validHours = Math.round(r2 * 120 * 10) / 10;
  const accuracyPercent = Math.round(35 + r3 * 60);
  const consistency = Math.round(r4 * 100) / 100;
  const goalsCompleted = Math.round(r5 * 12);
  const points = lessonsCompleted * 100 + goalsCompleted * 150 + Math.round(accuracyPercent * 3);

  // ~1 em cada 9 participantes optou por sair das listagens públicas (privacidade, CLAUDE.md §17).
  const showInRanking = index % 9 !== 0;
  // ~1 em cada 6 prefere não exibir o nome real (mostrado como apelido nas listagens públicas).
  const showRealName = index % 6 !== 0;
  const showCityState = index % 7 !== 0;

  const firstActivityAt = new Date(BASE_TIMESTAMP - Math.round(r1 * 200) * DAY_MS).toISOString();
  const lastActivityAt = new Date(
    Date.parse(firstActivityAt) + Math.round(r2 * 60) * DAY_MS,
  ).toISOString();

  return {
    userId: `ranking-user-${String(index).padStart(3, "0")}`,
    displayName: `${firstName} ${lastName}`,
    avatarUrl: null,
    city: cityState.city,
    state: cityState.state,
    contestId: slot.contestId,
    contestName: slot.contestName,
    courseId: slot.courseId,
    isProfilePublic: index % 11 !== 0,
    showInRanking,
    showRealName,
    showCityState,
    mockExamAccuracyPercent: accuracyPercent,
    mockGoalsCompletedCount: goalsCompleted,
    fallbackLessonsCompleted: lessonsCompleted,
    fallbackValidHours: validHours,
    fallbackConsistency: consistency,
    fallbackPoints: points,
    firstActivityAt,
    lastActivityAt,
  };
}

/** Participante real (existe em `mockUsers`/ledger) — identidade/privacidade vêm daqui, as
 *  métricas de aulas/tempo/constância são recalculadas a partir do ledger real em
 *  `ranking/metrics.ts` (os campos `fallback*`/`mockExamAccuracyPercent`/`mockGoalsCompletedCount`
 *  seguem servindo para o que ainda não tem fonte real: simulados e metas). */
const REAL_PARTICIPANTS: RankingParticipantEntity[] = [
  {
    userId: "user-1",
    displayName: "Ana Recruta",
    avatarUrl: null,
    city: "São Paulo",
    state: "SP",
    contestId: "contest-pm-soldado",
    contestName: "Polícia Militar — Soldado",
    courseId: "course-1",
    isProfilePublic: true,
    showInRanking: true,
    showRealName: true,
    showCityState: true,
    mockExamAccuracyPercent: 74,
    mockGoalsCompletedCount: 6,
    fallbackLessonsCompleted: 0,
    fallbackValidHours: 0,
    fallbackConsistency: 0,
    fallbackPoints: 0,
    firstActivityAt: "2025-11-01T08:00:00.000Z",
    lastActivityAt: "2026-01-05T08:00:00.000Z",
  },
];

/**
 * 1 participante real (`user-1`, ver `REAL_PARTICIPANTS`) + 49 fictícios — 50 no total,
 * volume suficiente para a normalização (min-max) do ranking fazer diferença real entre os
 * participantes (CLAUDE.md §17: "não utilizar somente pontos totais").
 */
export const mockRankingParticipants: RankingParticipantEntity[] = [
  ...REAL_PARTICIPANTS,
  ...Array.from({ length: 49 }, (_, i) => buildFictitiousParticipant(i + 1)),
];
