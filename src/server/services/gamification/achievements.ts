/**
 * Conquistas (CLAUDE.md §15/§25, Fase 8 — agente `gamification`).
 *
 * Estatísticas necessárias para avaliar os critérios. Alimentadas por
 * `computeUserGamificationStats` (`./read.ts`) a partir do ledger de `GamificationEvent`
 * (auditável — CLAUDE.md §15). Campos cuja origem definitiva ainda não existe (domínios das
 * fases futuras) permanecem com valor neutro (0/false) até o agente dono da fase alimentá-los
 * — nunca são inventados aqui.
 */
export interface UserGamificationStats {
  /** Nº de aulas concluídas (evento `LESSON_COMPLETED` no ledger). */
  lessonsCompleted: number;
  /**
   * Todos os 7 dias da primeira semana de estudo tiveram atividade válida.
   * TODO(Fase 12 — study-tracking): depende do calendário de atividade real; hoje sempre
   * `false` até essa fase alimentar o dado.
   */
  firstWeekFullyActive: boolean;
  /** Sequência atual de dias consecutivos com estudo válido.
   *  TODO(Fase 12 — study-tracking/`UserStreak`): hoje é uma aproximação por eventos
   *  `STREAK_7`/`STREAK_30` já concedidos no ledger (ver `./read.ts`), não o contador exato. */
  streakDays: number;
  /** Nº de simulados concluídos (evento `MOCK_EXAM_COMPLETED`). */
  mockExamsCompleted: number;
  /** Melhor percentual de acerto (0–100) já obtido em um simulado.
   *  TODO(Fase 10 — simulations): sem fonte própria ainda; hoje sempre 0. */
  bestMockExamAccuracyPercent: number;
  /** Nº de simulados concluídos acima de um limiar alto de acerto (critério de
   *  "especialista em simulados"). TODO(Fase 10 — simulations): sem fonte própria ainda. */
  mockExamsAboveAccuracyThreshold: number;
  /** Nº de questões respondidas corretamente (evento `QUESTION_CORRECT`). */
  questionsCorrect: number;
  /** Horas de estudo válido acumuladas. TODO(Fase 12 — study-tracking): sem fonte própria
   *  ainda (tempo válido real); hoje sempre 0. */
  studyHours: number;
  /** Proxy provisório de domínio de flashcards — hoje é a contagem de eventos
   *  `FLASHCARD_CORRECT` no ledger. TODO(Fase 14 — flashcards): critério definitivo de
   *  "mestria" (ex.: repetição espaçada, classificação "Fácil" consolidada) é do agente dono. */
  flashcardsMastered: number;
  /** Nº de metas semanais concluídas (evento `WEEKLY_GOAL_COMPLETED`). */
  weeklyGoalsCompleted: number;
}

export interface AchievementDefinition {
  /** Chave estável — corresponde a `Achievement.key` no Prisma e a `UserAchievement.achievementKey`. */
  key: string;
  name: string;
  description: string;
  /** Nome de ícone `lucide-react` — o `frontend` resolve para o componente. */
  icon: string;
  /** Critério PURO — apenas lê `UserGamificationStats`, nunca faz I/O. */
  isUnlocked: (stats: UserGamificationStats) => boolean;
}

/**
 * As ~18 conquistas iniciais (CLAUDE.md, lista do agente `gamification`). Pontuação de
 * conquista não é concedida aqui — o §15 não lista bônus de pontos por conquista; conquistas
 * são reconhecimento (badge), não uma segunda fonte de pontos/XP.
 */
export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    key: "first-victory",
    name: "Primeira vitória",
    description: "Concluiu a primeira aula.",
    icon: "Star",
    isUnlocked: (stats) => stats.lessonsCompleted >= 1,
  },
  {
    key: "first-week-complete",
    name: "Primeira semana completa",
    description: "Estudou todos os dias da primeira semana na plataforma.",
    icon: "CalendarCheck",
    isUnlocked: (stats) => stats.firstWeekFullyActive,
  },
  {
    key: "lessons-10",
    name: "10 aulas concluídas",
    description: "Concluiu 10 aulas.",
    icon: "BookOpen",
    isUnlocked: (stats) => stats.lessonsCompleted >= 10,
  },
  {
    key: "lessons-50",
    name: "50 aulas concluídas",
    description: "Concluiu 50 aulas.",
    icon: "BookOpen",
    isUnlocked: (stats) => stats.lessonsCompleted >= 50,
  },
  {
    key: "lessons-100",
    name: "100 aulas concluídas",
    description: "Concluiu 100 aulas.",
    icon: "BookOpenCheck",
    isUnlocked: (stats) => stats.lessonsCompleted >= 100,
  },
  {
    key: "first-mock-exam",
    name: "Primeiro simulado",
    description: "Concluiu o primeiro simulado.",
    icon: "ClipboardCheck",
    isUnlocked: (stats) => stats.mockExamsCompleted >= 1,
  },
  {
    key: "accuracy-80",
    name: "Acima de 80% de acertos",
    description: "Obteve mais de 80% de acerto em um simulado.",
    icon: "Target",
    isUnlocked: (stats) => stats.bestMockExamAccuracyPercent > 80,
  },
  {
    key: "accuracy-90",
    name: "Acima de 90% de acertos",
    description: "Obteve mais de 90% de acerto em um simulado.",
    icon: "Target",
    isUnlocked: (stats) => stats.bestMockExamAccuracyPercent > 90,
  },
  {
    key: "questions-100",
    name: "100 questões corretas",
    description: "Acertou 100 questões.",
    icon: "CheckCircle2",
    isUnlocked: (stats) => stats.questionsCorrect >= 100,
  },
  {
    key: "questions-1000",
    name: "1000 questões corretas",
    description: "Acertou 1.000 questões.",
    icon: "CheckCircle2",
    isUnlocked: (stats) => stats.questionsCorrect >= 1000,
  },
  {
    key: "study-hours-10",
    name: "10 horas de estudo",
    description: "Acumulou 10 horas de estudo válido.",
    icon: "Clock",
    isUnlocked: (stats) => stats.studyHours >= 10,
  },
  {
    key: "study-hours-50",
    name: "50 horas de estudo",
    description: "Acumulou 50 horas de estudo válido.",
    icon: "Clock",
    isUnlocked: (stats) => stats.studyHours >= 50,
  },
  {
    key: "study-hours-100",
    name: "100 horas de estudo",
    description: "Acumulou 100 horas de estudo válido.",
    icon: "Clock",
    isUnlocked: (stats) => stats.studyHours >= 100,
  },
  {
    key: "streak-7",
    name: "Sequência de 7 dias",
    description: "Estudou por 7 dias consecutivos.",
    icon: "Flame",
    isUnlocked: (stats) => stats.streakDays >= 7,
  },
  {
    key: "streak-30",
    name: "Sequência de 30 dias",
    description: "Estudou por 30 dias consecutivos.",
    icon: "Trophy",
    isUnlocked: (stats) => stats.streakDays >= 30,
  },
  {
    key: "flashcards-master",
    name: "Mestre dos flashcards",
    description: "Demonstrou domínio consistente nos flashcards.",
    icon: "Layers",
    isUnlocked: (stats) => stats.flashcardsMastered >= 100,
  },
  {
    key: "mock-exam-specialist",
    name: "Especialista em simulados",
    description: "Manteve alto desempenho em vários simulados.",
    icon: "Award",
    isUnlocked: (stats) => stats.mockExamsAboveAccuracyThreshold >= 5,
  },
  {
    key: "weekly-goal-complete",
    name: "Meta semanal concluída",
    description: "Concluiu uma meta semanal.",
    icon: "CalendarCheck2",
    isUnlocked: (stats) => stats.weeklyGoalsCompleted >= 1,
  },
] as const;

/**
 * Função PURA e IDEMPOTENTE: dado o estado atual e as conquistas já desbloqueadas
 * (`alreadyUnlockedKeys`), devolve só as conquistas RECÉM atingidas (ainda não presentes em
 * `alreadyUnlockedKeys`). Chamar de novo com o mesmo `stats`/`alreadyUnlockedKeys` sempre
 * devolve o mesmo resultado e nunca "reabre" uma conquista já concedida — quem persiste
 * (`UserAchievementRepository.unlock`) é responsável por adicionar a chave a
 * `alreadyUnlockedKeys` antes da próxima avaliação.
 */
export function evaluateAchievements(
  stats: UserGamificationStats,
  alreadyUnlockedKeys: readonly string[],
): AchievementDefinition[] {
  const unlockedSet = new Set(alreadyUnlockedKeys);
  return ACHIEVEMENTS.filter((achievement) => !unlockedSet.has(achievement.key) && achievement.isUnlocked(stats));
}
