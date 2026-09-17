# Inventário da revisão

Base: `b640716c317e3f20cc15fadb6a74188fc9b58794`. Contagens anteriores à criação dos relatórios.

750 arquivos versionados; 90.748 linhas físicas. Inventário estrutural/varredura automatizada de todo o conjunto; profundidade da revisão manual e limites descritos no [relatório](RELATORIO.md). Um arquivo nesta lista não é certificado como livre de defeitos. Hashes para rastreabilidade em [inventario-base.json](evidencias/inventario-base.json).

## Repositórios Prisma pendentes

| Arquivo | Métodos com `not implemented` |
|---|---:|
| [achievement-repository.ts](../../src/server/repositories/prisma/achievement-repository.ts) | 7 — `findById`, `findByKey`, `list`, `listForAdmin`, `create`, `update`, `softDelete` |
| [brainstorm-board-repository.ts](../../src/server/repositories/prisma/brainstorm-board-repository.ts) | 3 — `findById`, `listByUserId`, `create` |
| [brainstorm-card-repository.ts](../../src/server/repositories/prisma/brainstorm-card-repository.ts) | 7 — `findById`, `listByColumnIds`, `create`, `update`, `reorderColumn`, `moveToColumn`, `delete` |
| [brainstorm-column-repository.ts](../../src/server/repositories/prisma/brainstorm-column-repository.ts) | 3 — `findById`, `listByBoardId`, `createMany` |
| [contest-repository.ts](../../src/server/repositories/prisma/contest-repository.ts) | 7 — `findById`, `findBySlug`, `list`, `listForAdmin`, `create`, `update`, `softDelete` |
| [course-repository.ts](../../src/server/repositories/prisma/course-repository.ts) | 8 — `findById`, `findBySlug`, `list`, `listByContestId`, `listForAdmin`, `create`, `update`, `softDelete` |
| [daily-goal-repository.ts](../../src/server/repositories/prisma/daily-goal-repository.ts) | 3 — `findByUserIdAndDate`, `listByUserId`, `upsert` |
| [enrollment-repository.ts](../../src/server/repositories/prisma/enrollment-repository.ts) | 3 — `findByUserAndCourse`, `listByUserId`, `create` |
| [flashcard-deck-repository.ts](../../src/server/repositories/prisma/flashcard-deck-repository.ts) | 5 — `findById`, `listSystemDecks`, `listByUserId`, `findByUserIdAndKind`, `create` |
| [flashcard-repository.ts](../../src/server/repositories/prisma/flashcard-repository.ts) | 4 — `findById`, `listByDeckId`, `listByDeckIds`, `create` |
| [flashcard-review-repository.ts](../../src/server/repositories/prisma/flashcard-review-repository.ts) | 4 — `findLatestByUserAndFlashcard`, `listLatestByUserIdForFlashcardIds`, `listByUserId`, `create` |
| [focus-session-repository.ts](../../src/server/repositories/prisma/focus-session-repository.ts) | 4 — `findById`, `findActiveByUserId`, `create`, `save` |
| [gamification-event-repository.ts](../../src/server/repositories/prisma/gamification-event-repository.ts) | 3 — `findByIdempotencyKey`, `create`, `listByUserId` |
| [lesson-progress-repository.ts](../../src/server/repositories/prisma/lesson-progress-repository.ts) | 3 — `findByUserAndLesson`, `listByUserId`, `upsert` |
| [lesson-repository.ts](../../src/server/repositories/prisma/lesson-repository.ts) | 7 — `findById`, `listByModuleId`, `listByModuleIdForAdmin`, `create`, `update`, `softDelete`, `reorder` |
| [mock-exam-attempt-repository.ts](../../src/server/repositories/prisma/mock-exam-attempt-repository.ts) | 5 — `findById`, `listByUserId`, `create`, `finalize`, `expire` |
| [mock-exam-repository.ts](../../src/server/repositories/prisma/mock-exam-repository.ts) | 7 — `findById`, `list`, `listForAdmin`, `create`, `createCatalog`, `update`, `softDelete` |
| [module-repository.ts](../../src/server/repositories/prisma/module-repository.ts) | 7 — `findById`, `listByCourseId`, `listByCourseIdForAdmin`, `create`, `update`, `softDelete`, `reorder` |
| [notification-repository.ts](../../src/server/repositories/prisma/notification-repository.ts) | 2 — `listByUserId`, `createMany` |
| [point-transaction-repository.ts](../../src/server/repositories/prisma/point-transaction-repository.ts) | 4 — `findByIdempotencyKey`, `create`, `listByUserId`, `sumByUserId` |
| [profile-repository.ts](../../src/server/repositories/prisma/profile-repository.ts) | 5 — `findByUserId`, `findByUserIds`, `create`, `update`, `updatePrivacy` |
| [question-attempt-repository.ts](../../src/server/repositories/prisma/question-attempt-repository.ts) | 3 — `listByMockExamAttemptId`, `listByUserId`, `upsertForMockExamAttempt` |
| [question-favorite-repository.ts](../../src/server/repositories/prisma/question-favorite-repository.ts) | 3 — `listByUserId`, `isFavorite`, `toggle` |
| [question-option-repository.ts](../../src/server/repositories/prisma/question-option-repository.ts) | 4 — `findById`, `listByQuestionId`, `listByQuestionIds`, `replaceForQuestion` |
| [question-repository.ts](../../src/server/repositories/prisma/question-repository.ts) | 7 — `findById`, `findByIds`, `list`, `listForAdmin`, `create`, `update`, `softDelete` |
| [ranking-score-repository.ts](../../src/server/repositories/prisma/ranking-score-repository.ts) | 5 — `upsert`, `listByScopeAndVersion`, `findLatestVersion`, `listVersionsDesc`, `findByUserScopeAndVersion` |
| [study-mission-repository.ts](../../src/server/repositories/prisma/study-mission-repository.ts) | 2 — `findById`, `create` |
| [study-plan-item-repository.ts](../../src/server/repositories/prisma/study-plan-item-repository.ts) | 6 — `findById`, `listByPlanId`, `createMany`, `update`, `reorder`, `deleteByPlanId` |
| [study-plan-repository.ts](../../src/server/repositories/prisma/study-plan-repository.ts) | 5 — `findById`, `findActiveByUserId`, `listByUserId`, `create`, `update` |
| [study-session-repository.ts](../../src/server/repositories/prisma/study-session-repository.ts) | 4 — `findSession`, `saveSession`, `listSessionsByUserAndLesson`, `listRecentSessionsByUserId` |
| [subject-repository.ts](../../src/server/repositories/prisma/subject-repository.ts) | 6 — `findById`, `list`, `listForAdmin`, `create`, `update`, `softDelete` |
| [teacher-repository.ts](../../src/server/repositories/prisma/teacher-repository.ts) | 6 — `findById`, `list`, `listForAdmin`, `create`, `update`, `softDelete` |
| [topic-repository.ts](../../src/server/repositories/prisma/topic-repository.ts) | 7 — `findById`, `listBySubjectId`, `list`, `listForAdmin`, `create`, `update`, `softDelete` |
| [user-achievement-repository.ts](../../src/server/repositories/prisma/user-achievement-repository.ts) | 3 — `listByUserId`, `findByUserAndKey`, `unlock` |
| [user-repository.ts](../../src/server/repositories/prisma/user-repository.ts) | 5 — `findById`, `findByEmail`, `list`, `updateRole`, `setActive` |
| [user-streak-repository.ts](../../src/server/repositories/prisma/user-streak-repository.ts) | 2 — `findByUserId`, `upsert` |
| [weekly-goal-repository.ts](../../src/server/repositories/prisma/weekly-goal-repository.ts) | 3 — `findByUserIdAndWeekStart`, `listByUserId`, `upsert` |

Total: **172 métodos**, em **37 classes**. `findCredentialsByEmail` de usuário é o único método implementado desse conjunto.

## Arquivos por área

Leitura de rotas/actions foi rastreada até autorização/serviços; administração usa `withAdminAudit`, logo ausência de `requireRole` no próprio arquivo da action não significa autorização ausente. Testes existentes executados em conjunto. Arquivos binários/assets inventariados, sem atribuir auditoria semântica a uma contagem de linhas.


### .claude

11 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [.claude/agents/architect.md](../../.claude/agents/architect.md) | 130 | 0 |
| [.claude/agents/backend.md](../../.claude/agents/backend.md) | 183 | 0 |
| [.claude/agents/database.md](../../.claude/agents/database.md) | 187 | 0 |
| [.claude/agents/frontend.md](../../.claude/agents/frontend.md) | 177 | 0 |
| [.claude/agents/gamification.md](../../.claude/agents/gamification.md) | 189 | 0 |
| [.claude/agents/reviewer.md](../../.claude/agents/reviewer.md) | 131 | 0 |
| [.claude/agents/security.md](../../.claude/agents/security.md) | 145 | 0 |
| [.claude/agents/simulations.md](../../.claude/agents/simulations.md) | 147 | 0 |
| [.claude/agents/study-tracking.md](../../.claude/agents/study-tracking.md) | 192 | 0 |
| [.claude/agents/tester.md](../../.claude/agents/tester.md) | 131 | 0 |
| [.claude/launch.json](../../.claude/launch.json) | 11 | 0 |

### Configuração da raiz

13 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [.gitignore](../../.gitignore) | 43 | 0 |
| [.prettierignore](../../.prettierignore) | 4 | 0 |
| [.prettierrc](../../.prettierrc) | 7 | 0 |
| [CLAUDE.md](../../CLAUDE.md) | 1201 | 0 |
| [components.json](../../components.json) | 25 | 0 |
| [eslint.config.mjs](../../eslint.config.mjs) | 18 | 0 |
| [next.config.ts](../../next.config.ts) | 100 | 1 |
| [package-lock.json](../../package-lock.json) | 13542 | 0 |
| [package.json](../../package.json) | 63 | 0 |
| [postcss.config.mjs](../../postcss.config.mjs) | 7 | 0 |
| [prisma.config.ts](../../prisma.config.ts) | 17 | 0 |
| [tsconfig.json](../../tsconfig.json) | 35 | 0 |
| [vitest.config.ts](../../vitest.config.ts) | 19 | 0 |

### docs

26 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) | 153 | 0 |
| [docs/DATA-MODEL.md](../../docs/DATA-MODEL.md) | 301 | 0 |
| [docs/FLASHCARDS.md](../../docs/FLASHCARDS.md) | 277 | 1 |
| [docs/SECURITY.md](../../docs/SECURITY.md) | 190 | 2 |
| [docs/production/AUTHENTICATION_PLAN.md](../../docs/production/AUTHENTICATION_PLAN.md) | 412 | 0 |
| [docs/production/BACKUP_AND_RECOVERY.md](../../docs/production/BACKUP_AND_RECOVERY.md) | 182 | 0 |
| [docs/production/CI_CD.md](../../docs/production/CI_CD.md) | 196 | 0 |
| [docs/production/CLOUDFLARE_PLAN.md](../../docs/production/CLOUDFLARE_PLAN.md) | 110 | 0 |
| [docs/production/COST_MODEL.md](../../docs/production/COST_MODEL.md) | 133 | 0 |
| [docs/production/CURRENT_STATE.md](../../docs/production/CURRENT_STATE.md) | 152 | 3 |
| [docs/production/DOMAIN_AND_DNS.md](../../docs/production/DOMAIN_AND_DNS.md) | 130 | 0 |
| [docs/production/EMAIL_PLAN.md](../../docs/production/EMAIL_PLAN.md) | 93 | 0 |
| [docs/production/ENVIRONMENTS.md](../../docs/production/ENVIRONMENTS.md) | 55 | 0 |
| [docs/production/FINALIZATION_TASKS.md](../../docs/production/FINALIZATION_TASKS.md) | 199 | 1 |
| [docs/production/GO_LIVE_CHECKLIST.md](../../docs/production/GO_LIVE_CHECKLIST.md) | 267 | 1 |
| [docs/production/MOCK_MIGRATION_PLAN.md](../../docs/production/MOCK_MIGRATION_PLAN.md) | 259 | 2 |
| [docs/production/MONITORING_PLAN.md](../../docs/production/MONITORING_PLAN.md) | 79 | 0 |
| [docs/production/PRODUCTION_ROADMAP.md](../../docs/production/PRODUCTION_ROADMAP.md) | 195 | 1 |
| [docs/production/RISK_MATRIX.md](../../docs/production/RISK_MATRIX.md) | 55 | 1 |
| [docs/production/ROADMAP_SKELETON.md](../../docs/production/ROADMAP_SKELETON.md) | 30 | 0 |
| [docs/production/SECURITY_CHECKLIST.md](../../docs/production/SECURITY_CHECKLIST.md) | 136 | 1 |
| [docs/production/STORAGE_PLAN.md](../../docs/production/STORAGE_PLAN.md) | 80 | 1 |
| [docs/production/SUPABASE_DECISION.md](../../docs/production/SUPABASE_DECISION.md) | 110 | 0 |
| [docs/production/TARGET_ARCHITECTURE.md](../../docs/production/TARGET_ARCHITECTURE.md) | 134 | 0 |
| [docs/production/VERCEL_DEPLOYMENT.md](../../docs/production/VERCEL_DEPLOYMENT.md) | 266 | 1 |
| [docs/production/VIDEO_HOSTING_DECISION.md](../../docs/production/VIDEO_HOSTING_DECISION.md) | 113 | 0 |

### prisma

3 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [prisma/migrations/0000_init/migration.sql](../../prisma/migrations/0000_init/migration.sql) | 1201 | 0 |
| [prisma/schema.prisma](../../prisma/schema.prisma) | 1129 | 0 |
| [prisma/seed.ts](../../prisma/seed.ts) | 1232 | 0 |

### public

5 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [public/file.svg](../../public/file.svg) | 1 | 0 |
| [public/globe.svg](../../public/globe.svg) | 1 | 0 |
| [public/next.svg](../../public/next.svg) | 1 | 0 |
| [public/vercel.svg](../../public/vercel.svg) | 1 | 0 |
| [public/window.svg](../../public/window.svg) | 1 | 0 |

### src/app

72 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [src/app/(auth)/layout.tsx](../../src/app/%28auth%29/layout.tsx) | 18 | 0 |
| [src/app/(auth)/login/login-form.tsx](../../src/app/%28auth%29/login/login-form.tsx) | 105 | 0 |
| [src/app/(auth)/login/page.tsx](../../src/app/%28auth%29/login/page.tsx) | 26 | 0 |
| [src/app/(student)/acompanhamento/loading.tsx](../../src/app/%28student%29/acompanhamento/loading.tsx) | 42 | 0 |
| [src/app/(student)/acompanhamento/page.tsx](../../src/app/%28student%29/acompanhamento/page.tsx) | 252 | 0 |
| [src/app/(student)/brainstorm/loading.tsx](../../src/app/%28student%29/brainstorm/loading.tsx) | 24 | 0 |
| [src/app/(student)/brainstorm/page.tsx](../../src/app/%28student%29/brainstorm/page.tsx) | 72 | 0 |
| [src/app/(student)/conquistas/loading.tsx](../../src/app/%28student%29/conquistas/loading.tsx) | 25 | 0 |
| [src/app/(student)/conquistas/page.tsx](../../src/app/%28student%29/conquistas/page.tsx) | 48 | 0 |
| [src/app/(student)/cursos/[slug]/loading.tsx](../../src/app/%28student%29/cursos/%5Bslug%5D/loading.tsx) | 26 | 0 |
| [src/app/(student)/cursos/[slug]/modulos/[moduleSlug]/aulas/[lessonId]/page.tsx](../../src/app/%28student%29/cursos/%5Bslug%5D/modulos/%5BmoduleSlug%5D/aulas/%5BlessonId%5D/page.tsx) | 180 | 0 |
| [src/app/(student)/cursos/[slug]/page.tsx](../../src/app/%28student%29/cursos/%5Bslug%5D/page.tsx) | 140 | 0 |
| [src/app/(student)/cursos/loading.tsx](../../src/app/%28student%29/cursos/loading.tsx) | 24 | 0 |
| [src/app/(student)/cursos/page.tsx](../../src/app/%28student%29/cursos/page.tsx) | 40 | 0 |
| [src/app/(student)/dashboard/loading.tsx](../../src/app/%28student%29/dashboard/loading.tsx) | 33 | 0 |
| [src/app/(student)/dashboard/page.tsx](../../src/app/%28student%29/dashboard/page.tsx) | 132 | 0 |
| [src/app/(student)/flashcards/loading.tsx](../../src/app/%28student%29/flashcards/loading.tsx) | 29 | 0 |
| [src/app/(student)/flashcards/page.tsx](../../src/app/%28student%29/flashcards/page.tsx) | 66 | 0 |
| [src/app/(student)/flashcards/revisar/loading.tsx](../../src/app/%28student%29/flashcards/revisar/loading.tsx) | 14 | 0 |
| [src/app/(student)/flashcards/revisar/page.tsx](../../src/app/%28student%29/flashcards/revisar/page.tsx) | 63 | 0 |
| [src/app/(student)/layout.tsx](../../src/app/%28student%29/layout.tsx) | 14 | 0 |
| [src/app/(student)/modo-foco/loading.tsx](../../src/app/%28student%29/modo-foco/loading.tsx) | 18 | 0 |
| [src/app/(student)/modo-foco/page.tsx](../../src/app/%28student%29/modo-foco/page.tsx) | 38 | 0 |
| [src/app/(student)/montar-estudo/loading.tsx](../../src/app/%28student%29/montar-estudo/loading.tsx) | 22 | 0 |
| [src/app/(student)/montar-estudo/page.tsx](../../src/app/%28student%29/montar-estudo/page.tsx) | 45 | 0 |
| [src/app/(student)/perfil/loading.tsx](../../src/app/%28student%29/perfil/loading.tsx) | 28 | 0 |
| [src/app/(student)/perfil/page.tsx](../../src/app/%28student%29/perfil/page.tsx) | 106 | 0 |
| [src/app/(student)/plano-de-estudos/loading.tsx](../../src/app/%28student%29/plano-de-estudos/loading.tsx) | 25 | 0 |
| [src/app/(student)/plano-de-estudos/page.tsx](../../src/app/%28student%29/plano-de-estudos/page.tsx) | 50 | 0 |
| [src/app/(student)/ranking/loading.tsx](../../src/app/%28student%29/ranking/loading.tsx) | 22 | 0 |
| [src/app/(student)/ranking/page.tsx](../../src/app/%28student%29/ranking/page.tsx) | 133 | 0 |
| [src/app/(student)/simulados/[attemptId]/loading.tsx](../../src/app/%28student%29/simulados/%5BattemptId%5D/loading.tsx) | 18 | 0 |
| [src/app/(student)/simulados/[attemptId]/page.tsx](../../src/app/%28student%29/simulados/%5BattemptId%5D/page.tsx) | 83 | 0 |
| [src/app/(student)/simulados/[attemptId]/resultado/loading.tsx](../../src/app/%28student%29/simulados/%5BattemptId%5D/resultado/loading.tsx) | 28 | 0 |
| [src/app/(student)/simulados/[attemptId]/resultado/page.tsx](../../src/app/%28student%29/simulados/%5BattemptId%5D/resultado/page.tsx) | 168 | 0 |
| [src/app/(student)/simulados/caderno-de-erros/loading.tsx](../../src/app/%28student%29/simulados/caderno-de-erros/loading.tsx) | 20 | 0 |
| [src/app/(student)/simulados/caderno-de-erros/page.tsx](../../src/app/%28student%29/simulados/caderno-de-erros/page.tsx) | 49 | 0 |
| [src/app/(student)/simulados/favoritos/loading.tsx](../../src/app/%28student%29/simulados/favoritos/loading.tsx) | 19 | 0 |
| [src/app/(student)/simulados/favoritos/page.tsx](../../src/app/%28student%29/simulados/favoritos/page.tsx) | 39 | 0 |
| [src/app/(student)/simulados/historico/loading.tsx](../../src/app/%28student%29/simulados/historico/loading.tsx) | 16 | 0 |
| [src/app/(student)/simulados/historico/page.tsx](../../src/app/%28student%29/simulados/historico/page.tsx) | 43 | 0 |
| [src/app/(student)/simulados/loading.tsx](../../src/app/%28student%29/simulados/loading.tsx) | 34 | 0 |
| [src/app/(student)/simulados/page.tsx](../../src/app/%28student%29/simulados/page.tsx) | 135 | 0 |
| [src/app/(student)/trilha/page.tsx](../../src/app/%28student%29/trilha/page.tsx) | 16 | 0 |
| [src/app/admin/assuntos/page.tsx](../../src/app/admin/assuntos/page.tsx) | 29 | 0 |
| [src/app/admin/auditoria/page.tsx](../../src/app/admin/auditoria/page.tsx) | 33 | 0 |
| [src/app/admin/avisos/page.tsx](../../src/app/admin/avisos/page.tsx) | 37 | 0 |
| [src/app/admin/concursos/page.tsx](../../src/app/admin/concursos/page.tsx) | 19 | 0 |
| [src/app/admin/configuracao/page.tsx](../../src/app/admin/configuracao/page.tsx) | 38 | 0 |
| [src/app/admin/conquistas/page.tsx](../../src/app/admin/conquistas/page.tsx) | 19 | 0 |
| [src/app/admin/cursos/[id]/page.tsx](../../src/app/admin/cursos/%5Bid%5D/page.tsx) | 73 | 0 |
| [src/app/admin/cursos/page.tsx](../../src/app/admin/cursos/page.tsx) | 35 | 0 |
| [src/app/admin/layout.tsx](../../src/app/admin/layout.tsx) | 14 | 0 |
| [src/app/admin/materias/page.tsx](../../src/app/admin/materias/page.tsx) | 19 | 0 |
| [src/app/admin/page.tsx](../../src/app/admin/page.tsx) | 136 | 0 |
| [src/app/admin/professores/page.tsx](../../src/app/admin/professores/page.tsx) | 19 | 0 |
| [src/app/admin/questoes/page.tsx](../../src/app/admin/questoes/page.tsx) | 39 | 0 |
| [src/app/admin/simulados/page.tsx](../../src/app/admin/simulados/page.tsx) | 33 | 0 |
| [src/app/admin/usuarios/page.tsx](../../src/app/admin/usuarios/page.tsx) | 19 | 0 |
| [src/app/api/auth/[...nextauth]/route.ts](../../src/app/api/auth/%5B...nextauth%5D/route.ts) | 8 | 0 |
| [src/app/api/cron/ranking-recalc/route.ts](../../src/app/api/cron/ranking-recalc/route.ts) | 132 | 1 |
| [src/app/api/focus/heartbeat/route.ts](../../src/app/api/focus/heartbeat/route.ts) | 34 | 0 |
| [src/app/api/progress/heartbeat/route.ts](../../src/app/api/progress/heartbeat/route.ts) | 34 | 0 |
| [src/app/error.tsx](../../src/app/error.tsx) | 29 | 0 |
| [src/app/favicon.ico](../../src/app/favicon.ico) | 275 | 0 |
| [src/app/global-error.tsx](../../src/app/global-error.tsx) | 61 | 0 |
| [src/app/globals.css](../../src/app/globals.css) | 147 | 0 |
| [src/app/layout.tsx](../../src/app/layout.tsx) | 41 | 0 |
| [src/app/loading.tsx](../../src/app/loading.tsx) | 9 | 0 |
| [src/app/not-found.tsx](../../src/app/not-found.tsx) | 25 | 0 |
| [src/app/page.tsx](../../src/app/page.tsx) | 10 | 0 |
| [src/app/providers.tsx](../../src/app/providers.tsx) | 22 | 0 |

### src/components

175 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [src/components/achievements/achievement-card.tsx](../../src/components/achievements/achievement-card.tsx) | 53 | 0 |
| [src/components/achievements/achievement-grid.tsx](../../src/components/achievements/achievement-grid.tsx) | 81 | 0 |
| [src/components/achievements/level-header.tsx](../../src/components/achievements/level-header.tsx) | 63 | 0 |
| [src/components/achievements/level-track.tsx](../../src/components/achievements/level-track.tsx) | 89 | 0 |
| [src/components/admin/assuntos/topic-form-dialog.tsx](../../src/components/admin/assuntos/topic-form-dialog.tsx) | 158 | 0 |
| [src/components/admin/assuntos/topics-manager.tsx](../../src/components/admin/assuntos/topics-manager.tsx) | 99 | 0 |
| [src/components/admin/auditoria/audit-log-table.tsx](../../src/components/admin/auditoria/audit-log-table.tsx) | 204 | 0 |
| [src/components/admin/avisos/broadcast-form.tsx](../../src/components/admin/avisos/broadcast-form.tsx) | 162 | 0 |
| [src/components/admin/avisos/moderation-panel.tsx](../../src/components/admin/avisos/moderation-panel.tsx) | 129 | 0 |
| [src/components/admin/charts/admin-ranking-bar-chart.tsx](../../src/components/admin/charts/admin-ranking-bar-chart.tsx) | 68 | 0 |
| [src/components/admin/concursos/contests-manager.tsx](../../src/components/admin/concursos/contests-manager.tsx) | 98 | 0 |
| [src/components/admin/concursos/create-contest-dialog.tsx](../../src/components/admin/concursos/create-contest-dialog.tsx) | 145 | 0 |
| [src/components/admin/concursos/edit-contest-dialog.tsx](../../src/components/admin/concursos/edit-contest-dialog.tsx) | 136 | 0 |
| [src/components/admin/configuracao/config-form.tsx](../../src/components/admin/configuracao/config-form.tsx) | 256 | 0 |
| [src/components/admin/confirm-dialog.tsx](../../src/components/admin/confirm-dialog.tsx) | 94 | 0 |
| [src/components/admin/conquistas/achievements-manager.tsx](../../src/components/admin/conquistas/achievements-manager.tsx) | 113 | 0 |
| [src/components/admin/conquistas/create-achievement-dialog.tsx](../../src/components/admin/conquistas/create-achievement-dialog.tsx) | 171 | 0 |
| [src/components/admin/conquistas/edit-achievement-dialog.tsx](../../src/components/admin/conquistas/edit-achievement-dialog.tsx) | 153 | 0 |
| [src/components/admin/content-status-badge.tsx](../../src/components/admin/content-status-badge.tsx) | 32 | 0 |
| [src/components/admin/cursos/courses-manager.tsx](../../src/components/admin/cursos/courses-manager.tsx) | 117 | 0 |
| [src/components/admin/cursos/create-course-dialog.tsx](../../src/components/admin/cursos/create-course-dialog.tsx) | 222 | 0 |
| [src/components/admin/cursos/create-lesson-dialog.tsx](../../src/components/admin/cursos/create-lesson-dialog.tsx) | 190 | 0 |
| [src/components/admin/cursos/create-module-dialog.tsx](../../src/components/admin/cursos/create-module-dialog.tsx) | 173 | 0 |
| [src/components/admin/cursos/edit-course-dialog.tsx](../../src/components/admin/cursos/edit-course-dialog.tsx) | 200 | 0 |
| [src/components/admin/cursos/edit-lesson-dialog.tsx](../../src/components/admin/cursos/edit-lesson-dialog.tsx) | 183 | 0 |
| [src/components/admin/cursos/edit-module-dialog.tsx](../../src/components/admin/cursos/edit-module-dialog.tsx) | 169 | 0 |
| [src/components/admin/cursos/lessons-manager.tsx](../../src/components/admin/cursos/lessons-manager.tsx) | 222 | 0 |
| [src/components/admin/cursos/link-video-dialog.tsx](../../src/components/admin/cursos/link-video-dialog.tsx) | 136 | 0 |
| [src/components/admin/cursos/modules-manager.tsx](../../src/components/admin/cursos/modules-manager.tsx) | 184 | 0 |
| [src/components/admin/materias/subject-form-dialog.tsx](../../src/components/admin/materias/subject-form-dialog.tsx) | 148 | 0 |
| [src/components/admin/materias/subjects-manager.tsx](../../src/components/admin/materias/subjects-manager.tsx) | 94 | 0 |
| [src/components/admin/professores/teacher-form-dialog.tsx](../../src/components/admin/professores/teacher-form-dialog.tsx) | 170 | 0 |
| [src/components/admin/professores/teachers-manager.tsx](../../src/components/admin/professores/teachers-manager.tsx) | 114 | 0 |
| [src/components/admin/questoes/create-question-dialog.tsx](../../src/components/admin/questoes/create-question-dialog.tsx) | 231 | 0 |
| [src/components/admin/questoes/edit-question-dialog.tsx](../../src/components/admin/questoes/edit-question-dialog.tsx) | 227 | 0 |
| [src/components/admin/questoes/question-options-editor.tsx](../../src/components/admin/questoes/question-options-editor.tsx) | 100 | 0 |
| [src/components/admin/questoes/questions-manager.tsx](../../src/components/admin/questoes/questions-manager.tsx) | 123 | 0 |
| [src/components/admin/simulados/create-mock-exam-dialog.tsx](../../src/components/admin/simulados/create-mock-exam-dialog.tsx) | 170 | 0 |
| [src/components/admin/simulados/mock-exams-manager.tsx](../../src/components/admin/simulados/mock-exams-manager.tsx) | 103 | 0 |
| [src/components/admin/usuarios/change-role-dialog.tsx](../../src/components/admin/usuarios/change-role-dialog.tsx) | 103 | 0 |
| [src/components/admin/usuarios/users-manager.tsx](../../src/components/admin/usuarios/users-manager.tsx) | 118 | 0 |
| [src/components/brainstorm/brainstorm-map.tsx](../../src/components/brainstorm/brainstorm-map.tsx) | 110 | 1 |
| [src/components/brainstorm/brainstorm-workspace.tsx](../../src/components/brainstorm/brainstorm-workspace.tsx) | 164 | 0 |
| [src/components/brainstorm/card-form-dialog.tsx](../../src/components/brainstorm/card-form-dialog.tsx) | 403 | 0 |
| [src/components/brainstorm/create-board-dialog.tsx](../../src/components/brainstorm/create-board-dialog.tsx) | 125 | 0 |
| [src/components/brainstorm/kanban-board.tsx](../../src/components/brainstorm/kanban-board.tsx) | 305 | 0 |
| [src/components/brainstorm/kanban-card.tsx](../../src/components/brainstorm/kanban-card.tsx) | 283 | 0 |
| [src/components/brainstorm/kanban-column.tsx](../../src/components/brainstorm/kanban-column.tsx) | 175 | 0 |
| [src/components/brainstorm/labels.ts](../../src/components/brainstorm/labels.ts) | 70 | 0 |
| [src/components/brainstorm/optimistic-move.ts](../../src/components/brainstorm/optimistic-move.ts) | 63 | 0 |
| [src/components/charts/accuracy-breakdown-chart.tsx](../../src/components/charts/accuracy-breakdown-chart.tsx) | 57 | 1 |
| [src/components/charts/attempt-performance-chart.tsx](../../src/components/charts/attempt-performance-chart.tsx) | 74 | 0 |
| [src/components/charts/consistency-chart.tsx](../../src/components/charts/consistency-chart.tsx) | 63 | 0 |
| [src/components/charts/evolution-chart.tsx](../../src/components/charts/evolution-chart.tsx) | 82 | 0 |
| [src/components/charts/exam-progress-chart.tsx](../../src/components/charts/exam-progress-chart.tsx) | 85 | 0 |
| [src/components/charts/flashcard-retention-chart.tsx](../../src/components/charts/flashcard-retention-chart.tsx) | 57 | 1 |
| [src/components/charts/study-hours-chart.tsx](../../src/components/charts/study-hours-chart.tsx) | 81 | 0 |
| [src/components/charts/subject-performance-chart.tsx](../../src/components/charts/subject-performance-chart.tsx) | 77 | 0 |
| [src/components/charts/time-distribution-chart.tsx](../../src/components/charts/time-distribution-chart.tsx) | 83 | 0 |
| [src/components/courses/course-card.tsx](../../src/components/courses/course-card.tsx) | 101 | 0 |
| [src/components/courses/course-catalog.tsx](../../src/components/courses/course-catalog.tsx) | 81 | 0 |
| [src/components/courses/enroll-button.tsx](../../src/components/courses/enroll-button.tsx) | 42 | 0 |
| [src/components/courses/lesson-row.tsx](../../src/components/courses/lesson-row.tsx) | 70 | 0 |
| [src/components/courses/lesson-status.tsx](../../src/components/courses/lesson-status.tsx) | 59 | 0 |
| [src/components/courses/module-section.tsx](../../src/components/courses/module-section.tsx) | 58 | 0 |
| [src/components/dashboard/achievements-list.tsx](../../src/components/dashboard/achievements-list.tsx) | 53 | 0 |
| [src/components/dashboard/continue-mission-card.tsx](../../src/components/dashboard/continue-mission-card.tsx) | 60 | 0 |
| [src/components/dashboard/gamification-panel.tsx](../../src/components/dashboard/gamification-panel.tsx) | 74 | 0 |
| [src/components/dashboard/goals-panel.tsx](../../src/components/dashboard/goals-panel.tsx) | 60 | 0 |
| [src/components/dashboard/performance-summary-card.tsx](../../src/components/dashboard/performance-summary-card.tsx) | 41 | 0 |
| [src/components/flashcards/card-form-dialog.tsx](../../src/components/flashcards/card-form-dialog.tsx) | 322 | 0 |
| [src/components/flashcards/create-deck-dialog.tsx](../../src/components/flashcards/create-deck-dialog.tsx) | 166 | 0 |
| [src/components/flashcards/deck-card.tsx](../../src/components/flashcards/deck-card.tsx) | 82 | 0 |
| [src/components/flashcards/deck-list.tsx](../../src/components/flashcards/deck-list.tsx) | 48 | 0 |
| [src/components/flashcards/favorite-toggle-button.tsx](../../src/components/flashcards/favorite-toggle-button.tsx) | 65 | 0 |
| [src/components/flashcards/flashcard-face.tsx](../../src/components/flashcards/flashcard-face.tsx) | 118 | 0 |
| [src/components/flashcards/flashcards-workspace.tsx](../../src/components/flashcards/flashcards-workspace.tsx) | 133 | 0 |
| [src/components/flashcards/generate-from-source-button.tsx](../../src/components/flashcards/generate-from-source-button.tsx) | 62 | 0 |
| [src/components/flashcards/labels.ts](../../src/components/flashcards/labels.ts) | 90 | 0 |
| [src/components/flashcards/retention-panel.tsx](../../src/components/flashcards/retention-panel.tsx) | 66 | 0 |
| [src/components/flashcards/review-session.tsx](../../src/components/flashcards/review-session.tsx) | 184 | 0 |
| [src/components/focus/focus-finish-dialog.tsx](../../src/components/focus/focus-finish-dialog.tsx) | 265 | 1 |
| [src/components/focus/focus-mode-form.tsx](../../src/components/focus/focus-mode-form.tsx) | 302 | 0 |
| [src/components/focus/focus-session-result.tsx](../../src/components/focus/focus-session-result.tsx) | 111 | 1 |
| [src/components/focus/focus-timer.tsx](../../src/components/focus/focus-timer.tsx) | 429 | 0 |
| [src/components/focus/focus-workspace.tsx](../../src/components/focus/focus-workspace.tsx) | 86 | 0 |
| [src/components/focus/labels.ts](../../src/components/focus/labels.ts) | 73 | 0 |
| [src/components/layout/admin-mobile-nav.tsx](../../src/components/layout/admin-mobile-nav.tsx) | 37 | 0 |
| [src/components/layout/admin-nav-items.ts](../../src/components/layout/admin-nav-items.ts) | 67 | 0 |
| [src/components/layout/admin-shell.tsx](../../src/components/layout/admin-shell.tsx) | 67 | 0 |
| [src/components/layout/admin-sidebar-nav.tsx](../../src/components/layout/admin-sidebar-nav.tsx) | 67 | 0 |
| [src/components/layout/breadcrumbs.tsx](../../src/components/layout/breadcrumbs.tsx) | 46 | 0 |
| [src/components/layout/mobile-nav.tsx](../../src/components/layout/mobile-nav.tsx) | 34 | 0 |
| [src/components/layout/nav-items.ts](../../src/components/layout/nav-items.ts) | 43 | 0 |
| [src/components/layout/sidebar-nav.tsx](../../src/components/layout/sidebar-nav.tsx) | 52 | 0 |
| [src/components/layout/sidebar.tsx](../../src/components/layout/sidebar.tsx) | 22 | 0 |
| [src/components/layout/student-shell.tsx](../../src/components/layout/student-shell.tsx) | 23 | 0 |
| [src/components/layout/theme-toggle.tsx](../../src/components/layout/theme-toggle.tsx) | 28 | 0 |
| [src/components/layout/topbar.tsx](../../src/components/layout/topbar.tsx) | 125 | 0 |
| [src/components/lessons/lesson-notes.tsx](../../src/components/lessons/lesson-notes.tsx) | 48 | 1 |
| [src/components/lessons/lesson-player.tsx](../../src/components/lessons/lesson-player.tsx) | 331 | 0 |
| [src/components/lessons/victory-dialog.tsx](../../src/components/lessons/victory-dialog.tsx) | 100 | 1 |
| [src/components/profile/br-states.ts](../../src/components/profile/br-states.ts) | 40 | 0 |
| [src/components/profile/edit-profile-dialog.tsx](../../src/components/profile/edit-profile-dialog.tsx) | 283 | 1 |
| [src/components/profile/privacy-settings-card.tsx](../../src/components/profile/privacy-settings-card.tsx) | 172 | 0 |
| [src/components/profile/profile-achievements.tsx](../../src/components/profile/profile-achievements.tsx) | 59 | 0 |
| [src/components/profile/profile-contests.tsx](../../src/components/profile/profile-contests.tsx) | 52 | 0 |
| [src/components/profile/profile-header.tsx](../../src/components/profile/profile-header.tsx) | 141 | 0 |
| [src/components/profile/profile-preview-dialog.tsx](../../src/components/profile/profile-preview-dialog.tsx) | 182 | 0 |
| [src/components/profile/profile-stats.tsx](../../src/components/profile/profile-stats.tsx) | 77 | 0 |
| [src/components/profile/profile-workspace.tsx](../../src/components/profile/profile-workspace.tsx) | 59 | 0 |
| [src/components/profile/types.ts](../../src/components/profile/types.ts) | 20 | 0 |
| [src/components/ranking/ranking-avatar.tsx](../../src/components/ranking/ranking-avatar.tsx) | 30 | 0 |
| [src/components/ranking/ranking-current-user-bar.tsx](../../src/components/ranking/ranking-current-user-bar.tsx) | 52 | 0 |
| [src/components/ranking/ranking-evolution.tsx](../../src/components/ranking/ranking-evolution.tsx) | 36 | 0 |
| [src/components/ranking/ranking-filters.tsx](../../src/components/ranking/ranking-filters.tsx) | 169 | 0 |
| [src/components/ranking/ranking-pagination.tsx](../../src/components/ranking/ranking-pagination.tsx) | 49 | 0 |
| [src/components/ranking/ranking-podium.tsx](../../src/components/ranking/ranking-podium.tsx) | 102 | 0 |
| [src/components/ranking/ranking-query.ts](../../src/components/ranking/ranking-query.ts) | 113 | 0 |
| [src/components/ranking/ranking-results.tsx](../../src/components/ranking/ranking-results.tsx) | 173 | 0 |
| [src/components/shared/empty-state.tsx](../../src/components/shared/empty-state.tsx) | 30 | 0 |
| [src/components/shared/error-state.tsx](../../src/components/shared/error-state.tsx) | 40 | 0 |
| [src/components/shared/feature-placeholder.tsx](../../src/components/shared/feature-placeholder.tsx) | 25 | 0 |
| [src/components/shared/lucide-icon.tsx](../../src/components/shared/lucide-icon.tsx) | 66 | 0 |
| [src/components/shared/page-skeleton.tsx](../../src/components/shared/page-skeleton.tsx) | 27 | 0 |
| [src/components/shared/progress-bar.tsx](../../src/components/shared/progress-bar.tsx) | 44 | 0 |
| [src/components/shared/stat-card.tsx](../../src/components/shared/stat-card.tsx) | 32 | 0 |
| [src/components/shared/xp-badge.tsx](../../src/components/shared/xp-badge.tsx) | 24 | 0 |
| [src/components/simulations/attempt-runner.tsx](../../src/components/simulations/attempt-runner.tsx) | 287 | 0 |
| [src/components/simulations/attempt-terminal-state.tsx](../../src/components/simulations/attempt-terminal-state.tsx) | 80 | 0 |
| [src/components/simulations/attempt-timer.tsx](../../src/components/simulations/attempt-timer.tsx) | 71 | 0 |
| [src/components/simulations/catalog-exam-card.tsx](../../src/components/simulations/catalog-exam-card.tsx) | 38 | 0 |
| [src/components/simulations/error-notebook-list.tsx](../../src/components/simulations/error-notebook-list.tsx) | 100 | 0 |
| [src/components/simulations/favorite-toggle-button.tsx](../../src/components/simulations/favorite-toggle-button.tsx) | 68 | 0 |
| [src/components/simulations/favorites-list.tsx](../../src/components/simulations/favorites-list.tsx) | 70 | 0 |
| [src/components/simulations/history-list.tsx](../../src/components/simulations/history-list.tsx) | 133 | 0 |
| [src/components/simulations/labels.ts](../../src/components/simulations/labels.ts) | 58 | 0 |
| [src/components/simulations/mock-exam-builder-form.tsx](../../src/components/simulations/mock-exam-builder-form.tsx) | 369 | 0 |
| [src/components/simulations/question-navigator.tsx](../../src/components/simulations/question-navigator.tsx) | 54 | 0 |
| [src/components/simulations/question-review-list.tsx](../../src/components/simulations/question-review-list.tsx) | 129 | 0 |
| [src/components/simulations/result-summary.tsx](../../src/components/simulations/result-summary.tsx) | 48 | 0 |
| [src/components/simulations/simulados-hub-link-card.tsx](../../src/components/simulations/simulados-hub-link-card.tsx) | 49 | 0 |
| [src/components/simulations/start-catalog-exam-button.tsx](../../src/components/simulations/start-catalog-exam-button.tsx) | 43 | 0 |
| [src/components/study-plan/date-format.ts](../../src/components/study-plan/date-format.ts) | 122 | 0 |
| [src/components/study-plan/generate-plan-form.tsx](../../src/components/study-plan/generate-plan-form.tsx) | 307 | 0 |
| [src/components/study-plan/labels.ts](../../src/components/study-plan/labels.ts) | 66 | 0 |
| [src/components/study-plan/plan-item-row.tsx](../../src/components/study-plan/plan-item-row.tsx) | 158 | 0 |
| [src/components/study-plan/reorder-day-items.ts](../../src/components/study-plan/reorder-day-items.ts) | 52 | 0 |
| [src/components/study-plan/study-plan-calendar.tsx](../../src/components/study-plan/study-plan-calendar.tsx) | 463 | 0 |
| [src/components/study-plan/study-plan-workspace.tsx](../../src/components/study-plan/study-plan-workspace.tsx) | 60 | 0 |
| [src/components/study-session/content-type-icon.tsx](../../src/components/study-session/content-type-icon.tsx) | 30 | 0 |
| [src/components/study-session/session-block-list.tsx](../../src/components/study-session/session-block-list.tsx) | 54 | 0 |
| [src/components/study-session/study-session-builder-form.tsx](../../src/components/study-session/study-session-builder-form.tsx) | 490 | 0 |
| [src/components/tracking/diagnosis-panel.tsx](../../src/components/tracking/diagnosis-panel.tsx) | 92 | 0 |
| [src/components/tracking/labels.ts](../../src/components/tracking/labels.ts) | 64 | 0 |
| [src/components/tracking/overdue-reviews-card.tsx](../../src/components/tracking/overdue-reviews-card.tsx) | 50 | 0 |
| [src/components/tracking/pending-contents-card.tsx](../../src/components/tracking/pending-contents-card.tsx) | 40 | 0 |
| [src/components/tracking/weak-contents-card.tsx](../../src/components/tracking/weak-contents-card.tsx) | 53 | 0 |
| [src/components/ui/avatar.tsx](../../src/components/ui/avatar.tsx) | 109 | 0 |
| [src/components/ui/badge.tsx](../../src/components/ui/badge.tsx) | 52 | 0 |
| [src/components/ui/button.tsx](../../src/components/ui/button.tsx) | 58 | 0 |
| [src/components/ui/card.tsx](../../src/components/ui/card.tsx) | 103 | 0 |
| [src/components/ui/dialog.tsx](../../src/components/ui/dialog.tsx) | 124 | 0 |
| [src/components/ui/dropdown-menu.tsx](../../src/components/ui/dropdown-menu.tsx) | 272 | 0 |
| [src/components/ui/input.tsx](../../src/components/ui/input.tsx) | 20 | 0 |
| [src/components/ui/label.tsx](../../src/components/ui/label.tsx) | 20 | 0 |
| [src/components/ui/native-select.tsx](../../src/components/ui/native-select.tsx) | 27 | 0 |
| [src/components/ui/progress.tsx](../../src/components/ui/progress.tsx) | 83 | 0 |
| [src/components/ui/separator.tsx](../../src/components/ui/separator.tsx) | 25 | 0 |
| [src/components/ui/sheet.tsx](../../src/components/ui/sheet.tsx) | 138 | 0 |
| [src/components/ui/skeleton.tsx](../../src/components/ui/skeleton.tsx) | 13 | 0 |
| [src/components/ui/sonner.tsx](../../src/components/ui/sonner.tsx) | 49 | 0 |
| [src/components/ui/switch.tsx](../../src/components/ui/switch.tsx) | 56 | 0 |
| [src/components/ui/table.tsx](../../src/components/ui/table.tsx) | 76 | 0 |
| [src/components/ui/tooltip.tsx](../../src/components/ui/tooltip.tsx) | 66 | 0 |

### src/config

2 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [src/config/business.ts](../../src/config/business.ts) | 431 | 1 |
| [src/config/env.ts](../../src/config/env.ts) | 90 | 0 |

### src/contracts

21 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [src/contracts/admin-audit.ts](../../src/contracts/admin-audit.ts) | 42 | 1 |
| [src/contracts/admin-config.ts](../../src/contracts/admin-config.ts) | 94 | 1 |
| [src/contracts/admin-content.ts](../../src/contracts/admin-content.ts) | 436 | 0 |
| [src/contracts/admin-dashboard.ts](../../src/contracts/admin-dashboard.ts) | 59 | 4 |
| [src/contracts/admin-notifications.ts](../../src/contracts/admin-notifications.ts) | 56 | 2 |
| [src/contracts/admin-users.ts](../../src/contracts/admin-users.ts) | 43 | 2 |
| [src/contracts/auth.ts](../../src/contracts/auth.ts) | 16 | 0 |
| [src/contracts/brainstorm.ts](../../src/contracts/brainstorm.ts) | 177 | 1 |
| [src/contracts/common.ts](../../src/contracts/common.ts) | 47 | 0 |
| [src/contracts/courses.ts](../../src/contracts/courses.ts) | 122 | 0 |
| [src/contracts/dashboard.ts](../../src/contracts/dashboard.ts) | 148 | 1 |
| [src/contracts/flashcards.ts](../../src/contracts/flashcards.ts) | 175 | 1 |
| [src/contracts/focus.ts](../../src/contracts/focus.ts) | 154 | 1 |
| [src/contracts/index.ts](../../src/contracts/index.ts) | 19 | 0 |
| [src/contracts/profile.ts](../../src/contracts/profile.ts) | 228 | 0 |
| [src/contracts/progress.ts](../../src/contracts/progress.ts) | 128 | 0 |
| [src/contracts/ranking.ts](../../src/contracts/ranking.ts) | 71 | 0 |
| [src/contracts/simulations.ts](../../src/contracts/simulations.ts) | 307 | 0 |
| [src/contracts/study-plan.ts](../../src/contracts/study-plan.ts) | 205 | 0 |
| [src/contracts/study-session.ts](../../src/contracts/study-session.ts) | 132 | 0 |
| [src/contracts/tracking.ts](../../src/contracts/tracking.ts) | 179 | 1 |

### src/lib

3 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [src/lib/fetch-action-result.ts](../../src/lib/fetch-action-result.ts) | 56 | 0 |
| [src/lib/routes.ts](../../src/lib/routes.ts) | 18 | 0 |
| [src/lib/utils.ts](../../src/lib/utils.ts) | 50 | 0 |

### src/middleware.ts

1 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [src/middleware.ts](../../src/middleware.ts) | 52 | 0 |

### src/mocks

28 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [src/mocks/data/achievements.ts](../../src/mocks/data/achievements.ts) | 52 | 1 |
| [src/mocks/data/brainstorm.ts](../../src/mocks/data/brainstorm.ts) | 277 | 1 |
| [src/mocks/data/contests.ts](../../src/mocks/data/contests.ts) | 34 | 0 |
| [src/mocks/data/courses.ts](../../src/mocks/data/courses.ts) | 53 | 0 |
| [src/mocks/data/credentials.ts](../../src/mocks/data/credentials.ts) | 25 | 1 |
| [src/mocks/data/dashboard-achievements.ts](../../src/mocks/data/dashboard-achievements.ts) | 37 | 1 |
| [src/mocks/data/dashboard-contest.ts](../../src/mocks/data/dashboard-contest.ts) | 32 | 1 |
| [src/mocks/data/dashboard-gamification.ts](../../src/mocks/data/dashboard-gamification.ts) | 78 | 1 |
| [src/mocks/data/dashboard-goals.ts](../../src/mocks/data/dashboard-goals.ts) | 89 | 2 |
| [src/mocks/data/dashboard-next-lesson.ts](../../src/mocks/data/dashboard-next-lesson.ts) | 61 | 0 |
| [src/mocks/data/dashboard-ranking.ts](../../src/mocks/data/dashboard-ranking.ts) | 27 | 1 |
| [src/mocks/data/dashboard-study.ts](../../src/mocks/data/dashboard-study.ts) | 116 | 1 |
| [src/mocks/data/enrollments.ts](../../src/mocks/data/enrollments.ts) | 16 | 0 |
| [src/mocks/data/flashcards.ts](../../src/mocks/data/flashcards.ts) | 517 | 1 |
| [src/mocks/data/gamification-ledger-seed.ts](../../src/mocks/data/gamification-ledger-seed.ts) | 120 | 0 |
| [src/mocks/data/lesson-progress.ts](../../src/mocks/data/lesson-progress.ts) | 125 | 0 |
| [src/mocks/data/mock-exam-attempts.ts](../../src/mocks/data/mock-exam-attempts.ts) | 164 | 0 |
| [src/mocks/data/mock-exams.ts](../../src/mocks/data/mock-exams.ts) | 111 | 0 |
| [src/mocks/data/modules.ts](../../src/mocks/data/modules.ts) | 300 | 0 |
| [src/mocks/data/profiles.ts](../../src/mocks/data/profiles.ts) | 105 | 1 |
| [src/mocks/data/questions.ts](../../src/mocks/data/questions.ts) | 570 | 0 |
| [src/mocks/data/ranking-participants.ts](../../src/mocks/data/ranking-participants.ts) | 231 | 3 |
| [src/mocks/data/study-plan.ts](../../src/mocks/data/study-plan.ts) | 262 | 0 |
| [src/mocks/data/subjects.ts](../../src/mocks/data/subjects.ts) | 48 | 0 |
| [src/mocks/data/teachers.ts](../../src/mocks/data/teachers.ts) | 18 | 0 |
| [src/mocks/data/topics.ts](../../src/mocks/data/topics.ts) | 78 | 0 |
| [src/mocks/data/users.ts](../../src/mocks/data/users.ts) | 44 | 0 |
| [src/mocks/index.ts](../../src/mocks/index.ts) | 44 | 0 |

### src/server/actions

31 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [src/server/actions/admin/achievements.ts](../../src/server/actions/admin/achievements.ts) | 61 | 0 |
| [src/server/actions/admin/audit.ts](../../src/server/actions/admin/audit.ts) | 18 | 0 |
| [src/server/actions/admin/config.ts](../../src/server/actions/admin/config.ts) | 28 | 0 |
| [src/server/actions/admin/contests.ts](../../src/server/actions/admin/contests.ts) | 54 | 0 |
| [src/server/actions/admin/courses.ts](../../src/server/actions/admin/courses.ts) | 59 | 0 |
| [src/server/actions/admin/dashboard.ts](../../src/server/actions/admin/dashboard.ts) | 16 | 0 |
| [src/server/actions/admin/lessons.ts](../../src/server/actions/admin/lessons.ts) | 88 | 0 |
| [src/server/actions/admin/list-users.ts](../../src/server/actions/admin/list-users.ts) | 25 | 0 |
| [src/server/actions/admin/mock-exams.ts](../../src/server/actions/admin/mock-exams.ts) | 54 | 0 |
| [src/server/actions/admin/moderation.ts](../../src/server/actions/admin/moderation.ts) | 18 | 0 |
| [src/server/actions/admin/modules.ts](../../src/server/actions/admin/modules.ts) | 75 | 0 |
| [src/server/actions/admin/notifications.ts](../../src/server/actions/admin/notifications.ts) | 18 | 0 |
| [src/server/actions/admin/questions.ts](../../src/server/actions/admin/questions.ts) | 55 | 0 |
| [src/server/actions/admin/shared.ts](../../src/server/actions/admin/shared.ts) | 17 | 0 |
| [src/server/actions/admin/subjects.ts](../../src/server/actions/admin/subjects.ts) | 54 | 0 |
| [src/server/actions/admin/teachers.ts](../../src/server/actions/admin/teachers.ts) | 54 | 0 |
| [src/server/actions/admin/topics.ts](../../src/server/actions/admin/topics.ts) | 54 | 0 |
| [src/server/actions/admin/users.ts](../../src/server/actions/admin/users.ts) | 37 | 0 |
| [src/server/actions/auth.ts](../../src/server/actions/auth.ts) | 134 | 0 |
| [src/server/actions/brainstorm.ts](../../src/server/actions/brainstorm.ts) | 163 | 1 |
| [src/server/actions/courses.ts](../../src/server/actions/courses.ts) | 71 | 0 |
| [src/server/actions/dashboard.ts](../../src/server/actions/dashboard.ts) | 27 | 0 |
| [src/server/actions/flashcards.ts](../../src/server/actions/flashcards.ts) | 153 | 0 |
| [src/server/actions/focus.ts](../../src/server/actions/focus.ts) | 59 | 0 |
| [src/server/actions/gamification.ts](../../src/server/actions/gamification.ts) | 24 | 0 |
| [src/server/actions/profile.ts](../../src/server/actions/profile.ts) | 78 | 0 |
| [src/server/actions/progress.ts](../../src/server/actions/progress.ts) | 33 | 0 |
| [src/server/actions/ranking.ts](../../src/server/actions/ranking.ts) | 31 | 0 |
| [src/server/actions/simulations.ts](../../src/server/actions/simulations.ts) | 205 | 0 |
| [src/server/actions/study-plan.ts](../../src/server/actions/study-plan.ts) | 115 | 0 |
| [src/server/actions/tracking.ts](../../src/server/actions/tracking.ts) | 47 | 0 |

### src/server/audit

3 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [src/server/audit/index.ts](../../src/server/audit/index.ts) | 2 | 0 |
| [src/server/audit/log.ts](../../src/server/audit/log.ts) | 36 | 1 |
| [src/server/audit/with-admin-audit.ts](../../src/server/audit/with-admin-audit.ts) | 78 | 0 |

### src/server/auth

6 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [src/server/auth/config.edge.ts](../../src/server/auth/config.edge.ts) | 53 | 0 |
| [src/server/auth/config.ts](../../src/server/auth/config.ts) | 46 | 0 |
| [src/server/auth/credentials-service.ts](../../src/server/auth/credentials-service.ts) | 50 | 0 |
| [src/server/auth/index.ts](../../src/server/auth/index.ts) | 9 | 0 |
| [src/server/auth/rate-limit.ts](../../src/server/auth/rate-limit.ts) | 101 | 0 |
| [src/server/auth/types.d.ts](../../src/server/auth/types.d.ts) | 26 | 0 |

### src/server/authorization

1 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [src/server/authorization/index.ts](../../src/server/authorization/index.ts) | 51 | 0 |

### src/server/db

1 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [src/server/db/prisma.ts](../../src/server/db/prisma.ts) | 27 | 0 |

### src/server/errors

1 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [src/server/errors/index.ts](../../src/server/errors/index.ts) | 100 | 0 |

### src/server/events

1 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [src/server/events/index.ts](../../src/server/events/index.ts) | 68 | 1 |

### src/server/repositories

115 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [src/server/repositories/contracts/achievement-repository.ts](../../src/server/repositories/contracts/achievement-repository.ts) | 66 | 1 |
| [src/server/repositories/contracts/brainstorm-board-repository.ts](../../src/server/repositories/contracts/brainstorm-board-repository.ts) | 30 | 0 |
| [src/server/repositories/contracts/brainstorm-card-repository.ts](../../src/server/repositories/contracts/brainstorm-card-repository.ts) | 108 | 2 |
| [src/server/repositories/contracts/brainstorm-column-repository.ts](../../src/server/repositories/contracts/brainstorm-column-repository.ts) | 37 | 0 |
| [src/server/repositories/contracts/contest-repository.ts](../../src/server/repositories/contracts/contest-repository.ts) | 49 | 3 |
| [src/server/repositories/contracts/course-repository.ts](../../src/server/repositories/contracts/course-repository.ts) | 91 | 2 |
| [src/server/repositories/contracts/daily-goal-repository.ts](../../src/server/repositories/contracts/daily-goal-repository.ts) | 46 | 0 |
| [src/server/repositories/contracts/enrollment-repository.ts](../../src/server/repositories/contracts/enrollment-repository.ts) | 25 | 0 |
| [src/server/repositories/contracts/flashcard-deck-repository.ts](../../src/server/repositories/contracts/flashcard-deck-repository.ts) | 49 | 0 |
| [src/server/repositories/contracts/flashcard-repository.ts](../../src/server/repositories/contracts/flashcard-repository.ts) | 51 | 0 |
| [src/server/repositories/contracts/flashcard-review-repository.ts](../../src/server/repositories/contracts/flashcard-review-repository.ts) | 54 | 0 |
| [src/server/repositories/contracts/focus-session-repository.ts](../../src/server/repositories/contracts/focus-session-repository.ts) | 82 | 0 |
| [src/server/repositories/contracts/gamification-event-repository.ts](../../src/server/repositories/contracts/gamification-event-repository.ts) | 67 | 0 |
| [src/server/repositories/contracts/index.ts](../../src/server/repositories/contracts/index.ts) | 44 | 0 |
| [src/server/repositories/contracts/lesson-progress-repository.ts](../../src/server/repositories/contracts/lesson-progress-repository.ts) | 49 | 0 |
| [src/server/repositories/contracts/lesson-repository.ts](../../src/server/repositories/contracts/lesson-repository.ts) | 78 | 0 |
| [src/server/repositories/contracts/mock-exam-attempt-repository.ts](../../src/server/repositories/contracts/mock-exam-attempt-repository.ts) | 73 | 0 |
| [src/server/repositories/contracts/mock-exam-repository.ts](../../src/server/repositories/contracts/mock-exam-repository.ts) | 103 | 1 |
| [src/server/repositories/contracts/module-repository.ts](../../src/server/repositories/contracts/module-repository.ts) | 71 | 1 |
| [src/server/repositories/contracts/notification-repository.ts](../../src/server/repositories/contracts/notification-repository.ts) | 46 | 1 |
| [src/server/repositories/contracts/point-transaction-repository.ts](../../src/server/repositories/contracts/point-transaction-repository.ts) | 48 | 0 |
| [src/server/repositories/contracts/profile-repository.ts](../../src/server/repositories/contracts/profile-repository.ts) | 116 | 0 |
| [src/server/repositories/contracts/question-attempt-repository.ts](../../src/server/repositories/contracts/question-attempt-repository.ts) | 44 | 0 |
| [src/server/repositories/contracts/question-favorite-repository.ts](../../src/server/repositories/contracts/question-favorite-repository.ts) | 15 | 0 |
| [src/server/repositories/contracts/question-option-repository.ts](../../src/server/repositories/contracts/question-option-repository.ts) | 44 | 0 |
| [src/server/repositories/contracts/question-repository.ts](../../src/server/repositories/contracts/question-repository.ts) | 88 | 0 |
| [src/server/repositories/contracts/ranking-score-repository.ts](../../src/server/repositories/contracts/ranking-score-repository.ts) | 125 | 0 |
| [src/server/repositories/contracts/shared.ts](../../src/server/repositories/contracts/shared.ts) | 19 | 0 |
| [src/server/repositories/contracts/study-mission-repository.ts](../../src/server/repositories/contracts/study-mission-repository.ts) | 72 | 0 |
| [src/server/repositories/contracts/study-plan-item-repository.ts](../../src/server/repositories/contracts/study-plan-item-repository.ts) | 79 | 0 |
| [src/server/repositories/contracts/study-plan-repository.ts](../../src/server/repositories/contracts/study-plan-repository.ts) | 50 | 0 |
| [src/server/repositories/contracts/study-session-repository.ts](../../src/server/repositories/contracts/study-session-repository.ts) | 61 | 0 |
| [src/server/repositories/contracts/subject-repository.ts](../../src/server/repositories/contracts/subject-repository.ts) | 35 | 1 |
| [src/server/repositories/contracts/teacher-repository.ts](../../src/server/repositories/contracts/teacher-repository.ts) | 48 | 2 |
| [src/server/repositories/contracts/topic-repository.ts](../../src/server/repositories/contracts/topic-repository.ts) | 42 | 1 |
| [src/server/repositories/contracts/user-achievement-repository.ts](../../src/server/repositories/contracts/user-achievement-repository.ts) | 22 | 0 |
| [src/server/repositories/contracts/user-repository.ts](../../src/server/repositories/contracts/user-repository.ts) | 38 | 0 |
| [src/server/repositories/contracts/user-streak-repository.ts](../../src/server/repositories/contracts/user-streak-repository.ts) | 52 | 0 |
| [src/server/repositories/contracts/weekly-goal-repository.ts](../../src/server/repositories/contracts/weekly-goal-repository.ts) | 39 | 0 |
| [src/server/repositories/index.ts](../../src/server/repositories/index.ts) | 256 | 0 |
| [src/server/repositories/mock/achievement-repository.ts](../../src/server/repositories/mock/achievement-repository.ts) | 81 | 0 |
| [src/server/repositories/mock/brainstorm-board-repository.ts](../../src/server/repositories/mock/brainstorm-board-repository.ts) | 47 | 0 |
| [src/server/repositories/mock/brainstorm-card-repository.ts](../../src/server/repositories/mock/brainstorm-card-repository.ts) | 127 | 0 |
| [src/server/repositories/mock/brainstorm-column-repository.ts](../../src/server/repositories/mock/brainstorm-column-repository.ts) | 45 | 0 |
| [src/server/repositories/mock/contest-repository.ts](../../src/server/repositories/mock/contest-repository.ts) | 77 | 0 |
| [src/server/repositories/mock/course-repository.ts](../../src/server/repositories/mock/course-repository.ts) | 98 | 0 |
| [src/server/repositories/mock/daily-goal-repository.ts](../../src/server/repositories/mock/daily-goal-repository.ts) | 55 | 0 |
| [src/server/repositories/mock/enrollment-repository.ts](../../src/server/repositories/mock/enrollment-repository.ts) | 53 | 0 |
| [src/server/repositories/mock/flashcard-deck-repository.ts](../../src/server/repositories/mock/flashcard-deck-repository.ts) | 54 | 0 |
| [src/server/repositories/mock/flashcard-repository.ts](../../src/server/repositories/mock/flashcard-repository.ts) | 57 | 0 |
| [src/server/repositories/mock/flashcard-review-repository.ts](../../src/server/repositories/mock/flashcard-review-repository.ts) | 69 | 0 |
| [src/server/repositories/mock/focus-session-repository.ts](../../src/server/repositories/mock/focus-session-repository.ts) | 76 | 0 |
| [src/server/repositories/mock/gamification-event-repository.ts](../../src/server/repositories/mock/gamification-event-repository.ts) | 62 | 0 |
| [src/server/repositories/mock/lesson-progress-repository.ts](../../src/server/repositories/mock/lesson-progress-repository.ts) | 61 | 0 |
| [src/server/repositories/mock/lesson-repository.ts](../../src/server/repositories/mock/lesson-repository.ts) | 104 | 0 |
| [src/server/repositories/mock/mock-exam-attempt-repository.ts](../../src/server/repositories/mock/mock-exam-attempt-repository.ts) | 108 | 0 |
| [src/server/repositories/mock/mock-exam-repository.ts](../../src/server/repositories/mock/mock-exam-repository.ts) | 109 | 0 |
| [src/server/repositories/mock/mock-store.ts](../../src/server/repositories/mock/mock-store.ts) | 66 | 0 |
| [src/server/repositories/mock/module-repository.ts](../../src/server/repositories/mock/module-repository.ts) | 106 | 0 |
| [src/server/repositories/mock/notification-repository.ts](../../src/server/repositories/mock/notification-repository.ts) | 43 | 0 |
| [src/server/repositories/mock/point-transaction-repository.ts](../../src/server/repositories/mock/point-transaction-repository.ts) | 66 | 0 |
| [src/server/repositories/mock/profile-repository.ts](../../src/server/repositories/mock/profile-repository.ts) | 98 | 0 |
| [src/server/repositories/mock/question-attempt-repository.ts](../../src/server/repositories/mock/question-attempt-repository.ts) | 63 | 0 |
| [src/server/repositories/mock/question-favorite-repository.ts](../../src/server/repositories/mock/question-favorite-repository.ts) | 32 | 0 |
| [src/server/repositories/mock/question-option-repository.ts](../../src/server/repositories/mock/question-option-repository.ts) | 55 | 0 |
| [src/server/repositories/mock/question-repository.ts](../../src/server/repositories/mock/question-repository.ts) | 98 | 0 |
| [src/server/repositories/mock/ranking-score-repository.ts](../../src/server/repositories/mock/ranking-score-repository.ts) | 131 | 0 |
| [src/server/repositories/mock/study-mission-repository.ts](../../src/server/repositories/mock/study-mission-repository.ts) | 43 | 0 |
| [src/server/repositories/mock/study-plan-item-repository.ts](../../src/server/repositories/mock/study-plan-item-repository.ts) | 103 | 0 |
| [src/server/repositories/mock/study-plan-repository.ts](../../src/server/repositories/mock/study-plan-repository.ts) | 76 | 0 |
| [src/server/repositories/mock/study-session-repository.ts](../../src/server/repositories/mock/study-session-repository.ts) | 51 | 0 |
| [src/server/repositories/mock/subject-repository.ts](../../src/server/repositories/mock/subject-repository.ts) | 66 | 0 |
| [src/server/repositories/mock/teacher-repository.ts](../../src/server/repositories/mock/teacher-repository.ts) | 73 | 0 |
| [src/server/repositories/mock/topic-repository.ts](../../src/server/repositories/mock/topic-repository.ts) | 75 | 0 |
| [src/server/repositories/mock/user-achievement-repository.ts](../../src/server/repositories/mock/user-achievement-repository.ts) | 44 | 0 |
| [src/server/repositories/mock/user-repository.ts](../../src/server/repositories/mock/user-repository.ts) | 66 | 0 |
| [src/server/repositories/mock/user-streak-repository.ts](../../src/server/repositories/mock/user-streak-repository.ts) | 42 | 0 |
| [src/server/repositories/mock/weekly-goal-repository.ts](../../src/server/repositories/mock/weekly-goal-repository.ts) | 57 | 0 |
| [src/server/repositories/prisma/achievement-repository.ts](../../src/server/repositories/prisma/achievement-repository.ts) | 45 | 7 |
| [src/server/repositories/prisma/brainstorm-board-repository.ts](../../src/server/repositories/prisma/brainstorm-board-repository.ts) | 27 | 3 |
| [src/server/repositories/prisma/brainstorm-card-repository.ts](../../src/server/repositories/prisma/brainstorm-card-repository.ts) | 57 | 9 |
| [src/server/repositories/prisma/brainstorm-column-repository.ts](../../src/server/repositories/prisma/brainstorm-column-repository.ts) | 27 | 3 |
| [src/server/repositories/prisma/contest-repository.ts](../../src/server/repositories/prisma/contest-repository.ts) | 45 | 7 |
| [src/server/repositories/prisma/course-repository.ts](../../src/server/repositories/prisma/course-repository.ts) | 50 | 8 |
| [src/server/repositories/prisma/daily-goal-repository.ts](../../src/server/repositories/prisma/daily-goal-repository.ts) | 28 | 3 |
| [src/server/repositories/prisma/enrollment-repository.ts](../../src/server/repositories/prisma/enrollment-repository.ts) | 22 | 3 |
| [src/server/repositories/prisma/flashcard-deck-repository.ts](../../src/server/repositories/prisma/flashcard-deck-repository.ts) | 40 | 6 |
| [src/server/repositories/prisma/flashcard-repository.ts](../../src/server/repositories/prisma/flashcard-repository.ts) | 27 | 4 |
| [src/server/repositories/prisma/flashcard-review-repository.ts](../../src/server/repositories/prisma/flashcard-review-repository.ts) | 40 | 5 |
| [src/server/repositories/prisma/focus-session-repository.ts](../../src/server/repositories/prisma/focus-session-repository.ts) | 33 | 4 |
| [src/server/repositories/prisma/gamification-event-repository.ts](../../src/server/repositories/prisma/gamification-event-repository.ts) | 27 | 3 |
| [src/server/repositories/prisma/lesson-progress-repository.ts](../../src/server/repositories/prisma/lesson-progress-repository.ts) | 27 | 3 |
| [src/server/repositories/prisma/lesson-repository.ts](../../src/server/repositories/prisma/lesson-repository.ts) | 47 | 7 |
| [src/server/repositories/prisma/mock-exam-attempt-repository.ts](../../src/server/repositories/prisma/mock-exam-attempt-repository.ts) | 43 | 5 |
| [src/server/repositories/prisma/mock-exam-repository.ts](../../src/server/repositories/prisma/mock-exam-repository.ts) | 48 | 7 |
| [src/server/repositories/prisma/module-repository.ts](../../src/server/repositories/prisma/module-repository.ts) | 47 | 7 |
| [src/server/repositories/prisma/notification-repository.ts](../../src/server/repositories/prisma/notification-repository.ts) | 21 | 2 |
| [src/server/repositories/prisma/point-transaction-repository.ts](../../src/server/repositories/prisma/point-transaction-repository.ts) | 35 | 5 |
| [src/server/repositories/prisma/profile-repository.ts](../../src/server/repositories/prisma/profile-repository.ts) | 49 | 6 |
| [src/server/repositories/prisma/question-attempt-repository.ts](../../src/server/repositories/prisma/question-attempt-repository.ts) | 26 | 3 |
| [src/server/repositories/prisma/question-favorite-repository.ts](../../src/server/repositories/prisma/question-favorite-repository.ts) | 22 | 3 |
| [src/server/repositories/prisma/question-option-repository.ts](../../src/server/repositories/prisma/question-option-repository.ts) | 31 | 4 |
| [src/server/repositories/prisma/question-repository.ts](../../src/server/repositories/prisma/question-repository.ts) | 47 | 7 |
| [src/server/repositories/prisma/ranking-score-repository.ts](../../src/server/repositories/prisma/ranking-score-repository.ts) | 80 | 5 |
| [src/server/repositories/prisma/study-mission-repository.ts](../../src/server/repositories/prisma/study-mission-repository.ts) | 24 | 2 |
| [src/server/repositories/prisma/study-plan-item-repository.ts](../../src/server/repositories/prisma/study-plan-item-repository.ts) | 47 | 7 |
| [src/server/repositories/prisma/study-plan-repository.ts](../../src/server/repositories/prisma/study-plan-repository.ts) | 38 | 5 |
| [src/server/repositories/prisma/study-session-repository.ts](../../src/server/repositories/prisma/study-session-repository.ts) | 32 | 4 |
| [src/server/repositories/prisma/subject-repository.ts](../../src/server/repositories/prisma/subject-repository.ts) | 40 | 6 |
| [src/server/repositories/prisma/teacher-repository.ts](../../src/server/repositories/prisma/teacher-repository.ts) | 40 | 6 |
| [src/server/repositories/prisma/topic-repository.ts](../../src/server/repositories/prisma/topic-repository.ts) | 45 | 7 |
| [src/server/repositories/prisma/user-achievement-repository.ts](../../src/server/repositories/prisma/user-achievement-repository.ts) | 28 | 3 |
| [src/server/repositories/prisma/user-repository.ts](../../src/server/repositories/prisma/user-repository.ts) | 64 | 6 |
| [src/server/repositories/prisma/user-streak-repository.ts](../../src/server/repositories/prisma/user-streak-repository.ts) | 23 | 2 |
| [src/server/repositories/prisma/weekly-goal-repository.ts](../../src/server/repositories/prisma/weekly-goal-repository.ts) | 28 | 3 |

### src/server/services

122 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [src/server/services/admin/achievement-service.ts](../../src/server/services/admin/achievement-service.ts) | 80 | 1 |
| [src/server/services/admin/audit-service.ts](../../src/server/services/admin/audit-service.ts) | 35 | 1 |
| [src/server/services/admin/config-service.ts](../../src/server/services/admin/config-service.ts) | 80 | 1 |
| [src/server/services/admin/config-store.ts](../../src/server/services/admin/config-store.ts) | 53 | 2 |
| [src/server/services/admin/contest-service.ts](../../src/server/services/admin/contest-service.ts) | 73 | 1 |
| [src/server/services/admin/course-service.ts](../../src/server/services/admin/course-service.ts) | 101 | 0 |
| [src/server/services/admin/dashboard-service.ts](../../src/server/services/admin/dashboard-service.ts) | 124 | 6 |
| [src/server/services/admin/lesson-service.ts](../../src/server/services/admin/lesson-service.ts) | 148 | 0 |
| [src/server/services/admin/list-users-service.ts](../../src/server/services/admin/list-users-service.ts) | 26 | 0 |
| [src/server/services/admin/mappers.ts](../../src/server/services/admin/mappers.ts) | 127 | 0 |
| [src/server/services/admin/mock-exam-service.ts](../../src/server/services/admin/mock-exam-service.ts) | 83 | 0 |
| [src/server/services/admin/moderation-service.ts](../../src/server/services/admin/moderation-service.ts) | 40 | 1 |
| [src/server/services/admin/module-service.ts](../../src/server/services/admin/module-service.ts) | 125 | 0 |
| [src/server/services/admin/notification-service.ts](../../src/server/services/admin/notification-service.ts) | 32 | 0 |
| [src/server/services/admin/question-service.ts](../../src/server/services/admin/question-service.ts) | 124 | 0 |
| [src/server/services/admin/roles.ts](../../src/server/services/admin/roles.ts) | 20 | 0 |
| [src/server/services/admin/subject-service.ts](../../src/server/services/admin/subject-service.ts) | 52 | 0 |
| [src/server/services/admin/teacher-service.ts](../../src/server/services/admin/teacher-service.ts) | 64 | 0 |
| [src/server/services/admin/topic-service.ts](../../src/server/services/admin/topic-service.ts) | 63 | 0 |
| [src/server/services/admin/users-service.ts](../../src/server/services/admin/users-service.ts) | 106 | 1 |
| [src/server/services/brainstorm/convert-to-flashcard.ts](../../src/server/services/brainstorm/convert-to-flashcard.ts) | 53 | 1 |
| [src/server/services/brainstorm/convert-to-study-task.ts](../../src/server/services/brainstorm/convert-to-study-task.ts) | 84 | 1 |
| [src/server/services/brainstorm/create-board.ts](../../src/server/services/brainstorm/create-board.ts) | 44 | 0 |
| [src/server/services/brainstorm/create-card.ts](../../src/server/services/brainstorm/create-card.ts) | 73 | 0 |
| [src/server/services/brainstorm/delete-card.ts](../../src/server/services/brainstorm/delete-card.ts) | 31 | 0 |
| [src/server/services/brainstorm/flashcard-draft-store.ts](../../src/server/services/brainstorm/flashcard-draft-store.ts) | 71 | 1 |
| [src/server/services/brainstorm/get-board.ts](../../src/server/services/brainstorm/get-board.ts) | 22 | 0 |
| [src/server/services/brainstorm/index.ts](../../src/server/services/brainstorm/index.ts) | 17 | 0 |
| [src/server/services/brainstorm/list-boards.ts](../../src/server/services/brainstorm/list-boards.ts) | 31 | 0 |
| [src/server/services/brainstorm/mappers.ts](../../src/server/services/brainstorm/mappers.ts) | 106 | 0 |
| [src/server/services/brainstorm/mark-resolved.ts](../../src/server/services/brainstorm/mark-resolved.ts) | 51 | 0 |
| [src/server/services/brainstorm/move-card.ts](../../src/server/services/brainstorm/move-card.ts) | 89 | 0 |
| [src/server/services/brainstorm/shared.ts](../../src/server/services/brainstorm/shared.ts) | 74 | 0 |
| [src/server/services/brainstorm/update-card.ts](../../src/server/services/brainstorm/update-card.ts) | 68 | 0 |
| [src/server/services/courses/course-detail.ts](../../src/server/services/courses/course-detail.ts) | 68 | 0 |
| [src/server/services/courses/enroll.ts](../../src/server/services/courses/enroll.ts) | 31 | 0 |
| [src/server/services/courses/index.ts](../../src/server/services/courses/index.ts) | 12 | 0 |
| [src/server/services/courses/list-courses.ts](../../src/server/services/courses/list-courses.ts) | 31 | 0 |
| [src/server/services/courses/progress.ts](../../src/server/services/courses/progress.ts) | 148 | 0 |
| [src/server/services/courses/resume-point.ts](../../src/server/services/courses/resume-point.ts) | 51 | 0 |
| [src/server/services/courses/shared.ts](../../src/server/services/courses/shared.ts) | 106 | 0 |
| [src/server/services/dashboard-service.ts](../../src/server/services/dashboard-service.ts) | 181 | 3 |
| [src/server/services/flashcards/create-card.ts](../../src/server/services/flashcards/create-card.ts) | 68 | 0 |
| [src/server/services/flashcards/create-deck.ts](../../src/server/services/flashcards/create-deck.ts) | 47 | 0 |
| [src/server/services/flashcards/create-from-errors.ts](../../src/server/services/flashcards/create-from-errors.ts) | 80 | 0 |
| [src/server/services/flashcards/create-from-notes.ts](../../src/server/services/flashcards/create-from-notes.ts) | 69 | 0 |
| [src/server/services/flashcards/favorite-store.ts](../../src/server/services/flashcards/favorite-store.ts) | 59 | 3 |
| [src/server/services/flashcards/get-review-session.ts](../../src/server/services/flashcards/get-review-session.ts) | 63 | 1 |
| [src/server/services/flashcards/index.ts](../../src/server/services/flashcards/index.ts) | 38 | 0 |
| [src/server/services/flashcards/list-decks.ts](../../src/server/services/flashcards/list-decks.ts) | 77 | 0 |
| [src/server/services/flashcards/mappers.ts](../../src/server/services/flashcards/mappers.ts) | 116 | 0 |
| [src/server/services/flashcards/rate-limit.ts](../../src/server/services/flashcards/rate-limit.ts) | 56 | 0 |
| [src/server/services/flashcards/retention-stats.ts](../../src/server/services/flashcards/retention-stats.ts) | 52 | 0 |
| [src/server/services/flashcards/review-card.ts](../../src/server/services/flashcards/review-card.ts) | 127 | 2 |
| [src/server/services/flashcards/review-lock.ts](../../src/server/services/flashcards/review-lock.ts) | 79 | 1 |
| [src/server/services/flashcards/shared.ts](../../src/server/services/flashcards/shared.ts) | 151 | 0 |
| [src/server/services/flashcards/spaced-repetition.ts](../../src/server/services/flashcards/spaced-repetition.ts) | 142 | 0 |
| [src/server/services/flashcards/toggle-favorite.ts](../../src/server/services/flashcards/toggle-favorite.ts) | 38 | 0 |
| [src/server/services/focus/finish-focus-session.ts](../../src/server/services/focus/finish-focus-session.ts) | 163 | 3 |
| [src/server/services/focus/focus-heartbeat-evaluator.ts](../../src/server/services/focus/focus-heartbeat-evaluator.ts) | 96 | 0 |
| [src/server/services/focus/focus-heartbeat.ts](../../src/server/services/focus/focus-heartbeat.ts) | 58 | 0 |
| [src/server/services/focus/focus-lock.ts](../../src/server/services/focus/focus-lock.ts) | 63 | 0 |
| [src/server/services/focus/focus-rate-limit.ts](../../src/server/services/focus/focus-rate-limit.ts) | 37 | 0 |
| [src/server/services/focus/index.ts](../../src/server/services/focus/index.ts) | 22 | 0 |
| [src/server/services/focus/mappers.ts](../../src/server/services/focus/mappers.ts) | 22 | 0 |
| [src/server/services/focus/resolve-mode.ts](../../src/server/services/focus/resolve-mode.ts) | 37 | 0 |
| [src/server/services/focus/start-focus-session.ts](../../src/server/services/focus/start-focus-session.ts) | 82 | 0 |
| [src/server/services/gamification/achievements.ts](../../src/server/services/gamification/achievements.ts) | 203 | 6 |
| [src/server/services/gamification/engine.ts](../../src/server/services/gamification/engine.ts) | 155 | 1 |
| [src/server/services/gamification/events.ts](../../src/server/services/gamification/events.ts) | 87 | 3 |
| [src/server/services/gamification/handlers.ts](../../src/server/services/gamification/handlers.ts) | 180 | 3 |
| [src/server/services/gamification/index.ts](../../src/server/services/gamification/index.ts) | 62 | 0 |
| [src/server/services/gamification/levels.ts](../../src/server/services/gamification/levels.ts) | 137 | 0 |
| [src/server/services/gamification/ranking/formula.ts](../../src/server/services/gamification/ranking/formula.ts) | 108 | 0 |
| [src/server/services/gamification/ranking/index.ts](../../src/server/services/gamification/ranking/index.ts) | 44 | 1 |
| [src/server/services/gamification/ranking/metrics.ts](../../src/server/services/gamification/ranking/metrics.ts) | 172 | 3 |
| [src/server/services/gamification/ranking/read.ts](../../src/server/services/gamification/ranking/read.ts) | 380 | 4 |
| [src/server/services/gamification/ranking/recalculate.ts](../../src/server/services/gamification/ranking/recalculate.ts) | 176 | 1 |
| [src/server/services/gamification/ranking/scope.ts](../../src/server/services/gamification/ranking/scope.ts) | 149 | 0 |
| [src/server/services/gamification/ranking/tiebreak.ts](../../src/server/services/gamification/ranking/tiebreak.ts) | 39 | 0 |
| [src/server/services/gamification/read.ts](../../src/server/services/gamification/read.ts) | 124 | 2 |
| [src/server/services/gamification/register.ts](../../src/server/services/gamification/register.ts) | 62 | 1 |
| [src/server/services/profile/index.ts](../../src/server/services/profile/index.ts) | 15 | 0 |
| [src/server/services/profile/read.ts](../../src/server/services/profile/read.ts) | 177 | 0 |
| [src/server/services/profile/shared.ts](../../src/server/services/profile/shared.ts) | 152 | 0 |
| [src/server/services/profile/update.ts](../../src/server/services/profile/update.ts) | 109 | 0 |
| [src/server/services/simulations/catalog.ts](../../src/server/services/simulations/catalog.ts) | 39 | 0 |
| [src/server/services/simulations/create-attempt.ts](../../src/server/services/simulations/create-attempt.ts) | 38 | 0 |
| [src/server/services/simulations/error-notebook.ts](../../src/server/services/simulations/error-notebook.ts) | 67 | 0 |
| [src/server/services/simulations/favorites.ts](../../src/server/services/simulations/favorites.ts) | 50 | 0 |
| [src/server/services/simulations/get-attempt.ts](../../src/server/services/simulations/get-attempt.ts) | 88 | 0 |
| [src/server/services/simulations/history.ts](../../src/server/services/simulations/history.ts) | 30 | 0 |
| [src/server/services/simulations/index.ts](../../src/server/services/simulations/index.ts) | 22 | 1 |
| [src/server/services/simulations/mappers.ts](../../src/server/services/simulations/mappers.ts) | 278 | 0 |
| [src/server/services/simulations/question-pool.ts](../../src/server/services/simulations/question-pool.ts) | 133 | 0 |
| [src/server/services/simulations/rate-limit.ts](../../src/server/services/simulations/rate-limit.ts) | 57 | 0 |
| [src/server/services/simulations/shuffle.ts](../../src/server/services/simulations/shuffle.ts) | 54 | 0 |
| [src/server/services/simulations/submit-and-finalize.ts](../../src/server/services/simulations/submit-and-finalize.ts) | 201 | 0 |
| [src/server/services/study-plan/allocation.ts](../../src/server/services/study-plan/allocation.ts) | 96 | 0 |
| [src/server/services/study-plan/build-session.ts](../../src/server/services/study-plan/build-session.ts) | 44 | 0 |
| [src/server/services/study-plan/content-resolver.ts](../../src/server/services/study-plan/content-resolver.ts) | 175 | 0 |
| [src/server/services/study-plan/date-utils.ts](../../src/server/services/study-plan/date-utils.ts) | 50 | 0 |
| [src/server/services/study-plan/generate-plan.ts](../../src/server/services/study-plan/generate-plan.ts) | 128 | 2 |
| [src/server/services/study-plan/get-plan.ts](../../src/server/services/study-plan/get-plan.ts) | 46 | 0 |
| [src/server/services/study-plan/index.ts](../../src/server/services/study-plan/index.ts) | 17 | 0 |
| [src/server/services/study-plan/mappers.ts](../../src/server/services/study-plan/mappers.ts) | 145 | 0 |
| [src/server/services/study-plan/plan-generator.ts](../../src/server/services/study-plan/plan-generator.ts) | 146 | 0 |
| [src/server/services/study-plan/reorder-plan-items.ts](../../src/server/services/study-plan/reorder-plan-items.ts) | 68 | 0 |
| [src/server/services/study-plan/session-generator.ts](../../src/server/services/study-plan/session-generator.ts) | 98 | 0 |
| [src/server/services/study-plan/start-mission.ts](../../src/server/services/study-plan/start-mission.ts) | 63 | 0 |
| [src/server/services/study-plan/update-plan-item.ts](../../src/server/services/study-plan/update-plan-item.ts) | 58 | 0 |
| [src/server/services/study-tracking/activity-days.ts](../../src/server/services/study-tracking/activity-days.ts) | 226 | 2 |
| [src/server/services/study-tracking/diagnosis.ts](../../src/server/services/study-tracking/diagnosis.ts) | 225 | 0 |
| [src/server/services/study-tracking/enrollment.ts](../../src/server/services/study-tracking/enrollment.ts) | 21 | 0 |
| [src/server/services/study-tracking/goals.ts](../../src/server/services/study-tracking/goals.ts) | 210 | 4 |
| [src/server/services/study-tracking/heartbeat-evaluator.ts](../../src/server/services/study-tracking/heartbeat-evaluator.ts) | 199 | 0 |
| [src/server/services/study-tracking/index.ts](../../src/server/services/study-tracking/index.ts) | 45 | 0 |
| [src/server/services/study-tracking/lesson-view.ts](../../src/server/services/study-tracking/lesson-view.ts) | 121 | 2 |
| [src/server/services/study-tracking/rate-limit.ts](../../src/server/services/study-tracking/rate-limit.ts) | 37 | 0 |
| [src/server/services/study-tracking/record-heartbeat.ts](../../src/server/services/study-tracking/record-heartbeat.ts) | 298 | 2 |
| [src/server/services/study-tracking/streak.ts](../../src/server/services/study-tracking/streak.ts) | 138 | 2 |
| [src/server/services/study-tracking/tracking-overview.ts](../../src/server/services/study-tracking/tracking-overview.ts) | 403 | 1 |

### src/server/validation

1 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [src/server/validation/index.ts](../../src/server/validation/index.ts) | 26 | 0 |

### src/types

1 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [src/types/index.ts](../../src/types/index.ts) | 19 | 0 |

### tests

107 arquivos.

| Arquivo | Linhas físicas | Marcadores de pendência* |
|---|---:|---:|
| [tests/unit/accuracy-breakdown-chart.test.tsx](../../tests/unit/accuracy-breakdown-chart.test.tsx) | 37 | 0 |
| [tests/unit/achievement-grid.test.tsx](../../tests/unit/achievement-grid.test.tsx) | 43 | 0 |
| [tests/unit/action-result.test.ts](../../tests/unit/action-result.test.ts) | 30 | 0 |
| [tests/unit/admin-action-authorization.test.ts](../../tests/unit/admin-action-authorization.test.ts) | 58 | 0 |
| [tests/unit/admin-audit-service.test.ts](../../tests/unit/admin-audit-service.test.ts) | 56 | 0 |
| [tests/unit/admin-config-service.test.ts](../../tests/unit/admin-config-service.test.ts) | 89 | 0 |
| [tests/unit/admin-content-action-authorization.test.ts](../../tests/unit/admin-content-action-authorization.test.ts) | 93 | 0 |
| [tests/unit/admin-content-service.test.ts](../../tests/unit/admin-content-service.test.ts) | 257 | 0 |
| [tests/unit/admin-dashboard-service.test.ts](../../tests/unit/admin-dashboard-service.test.ts) | 43 | 0 |
| [tests/unit/admin-notification-moderation-service.test.ts](../../tests/unit/admin-notification-moderation-service.test.ts) | 94 | 0 |
| [tests/unit/admin-users-service.test.ts](../../tests/unit/admin-users-service.test.ts) | 163 | 0 |
| [tests/unit/attempt-runner.test.tsx](../../tests/unit/attempt-runner.test.tsx) | 244 | 0 |
| [tests/unit/attempt-terminal-state.test.tsx](../../tests/unit/attempt-terminal-state.test.tsx) | 52 | 0 |
| [tests/unit/authorization.test.ts](../../tests/unit/authorization.test.ts) | 81 | 0 |
| [tests/unit/brainstorm-action-authorization.test.ts](../../tests/unit/brainstorm-action-authorization.test.ts) | 271 | 0 |
| [tests/unit/brainstorm-optimistic-move.test.ts](../../tests/unit/brainstorm-optimistic-move.test.ts) | 123 | 0 |
| [tests/unit/brainstorm-service.test.ts](../../tests/unit/brainstorm-service.test.ts) | 483 | 0 |
| [tests/unit/brainstorm-workspace.test.tsx](../../tests/unit/brainstorm-workspace.test.tsx) | 182 | 0 |
| [tests/unit/card-form-dialog.test.tsx](../../tests/unit/card-form-dialog.test.tsx) | 273 | 0 |
| [tests/unit/consistency-chart.test.tsx](../../tests/unit/consistency-chart.test.tsx) | 16 | 0 |
| [tests/unit/continue-mission-card.test.tsx](../../tests/unit/continue-mission-card.test.tsx) | 30 | 0 |
| [tests/unit/course-card.test.tsx](../../tests/unit/course-card.test.tsx) | 49 | 0 |
| [tests/unit/course-catalog.test.tsx](../../tests/unit/course-catalog.test.tsx) | 56 | 0 |
| [tests/unit/course-progress.test.ts](../../tests/unit/course-progress.test.ts) | 195 | 0 |
| [tests/unit/courses-action-authorization.test.ts](../../tests/unit/courses-action-authorization.test.ts) | 122 | 0 |
| [tests/unit/courses-service.test.ts](../../tests/unit/courses-service.test.ts) | 162 | 0 |
| [tests/unit/credentials-service-repository-boundary.test.ts](../../tests/unit/credentials-service-repository-boundary.test.ts) | 53 | 0 |
| [tests/unit/credentials-service.test.ts](../../tests/unit/credentials-service.test.ts) | 39 | 0 |
| [tests/unit/dashboard-action-authorization.test.ts](../../tests/unit/dashboard-action-authorization.test.ts) | 47 | 0 |
| [tests/unit/dashboard-service.test.ts](../../tests/unit/dashboard-service.test.ts) | 75 | 0 |
| [tests/unit/diagnosis-panel.test.tsx](../../tests/unit/diagnosis-panel.test.tsx) | 41 | 0 |
| [tests/unit/diagnosis.test.ts](../../tests/unit/diagnosis.test.ts) | 187 | 0 |
| [tests/unit/edit-profile-dialog.test.tsx](../../tests/unit/edit-profile-dialog.test.tsx) | 132 | 0 |
| [tests/unit/enroll-button.test.tsx](../../tests/unit/enroll-button.test.tsx) | 62 | 0 |
| [tests/unit/error-notebook-list.test.tsx](../../tests/unit/error-notebook-list.test.tsx) | 75 | 0 |
| [tests/unit/evolution-chart.test.tsx](../../tests/unit/evolution-chart.test.tsx) | 32 | 0 |
| [tests/unit/exam-progress-chart.test.tsx](../../tests/unit/exam-progress-chart.test.tsx) | 25 | 0 |
| [tests/unit/favorite-toggle-button.test.tsx](../../tests/unit/favorite-toggle-button.test.tsx) | 72 | 0 |
| [tests/unit/flashcard-card-form-dialog.test.tsx](../../tests/unit/flashcard-card-form-dialog.test.tsx) | 154 | 0 |
| [tests/unit/flashcard-create-deck-dialog.test.tsx](../../tests/unit/flashcard-create-deck-dialog.test.tsx) | 102 | 0 |
| [tests/unit/flashcard-favorite-toggle-button.test.tsx](../../tests/unit/flashcard-favorite-toggle-button.test.tsx) | 74 | 0 |
| [tests/unit/flashcard-retention-chart.test.tsx](../../tests/unit/flashcard-retention-chart.test.tsx) | 39 | 0 |
| [tests/unit/flashcard-review-session.test.tsx](../../tests/unit/flashcard-review-session.test.tsx) | 214 | 0 |
| [tests/unit/flashcards-action-authorization.test.ts](../../tests/unit/flashcards-action-authorization.test.ts) | 275 | 0 |
| [tests/unit/flashcards-service.test.ts](../../tests/unit/flashcards-service.test.ts) | 399 | 0 |
| [tests/unit/flashcards-workspace.test.tsx](../../tests/unit/flashcards-workspace.test.tsx) | 177 | 0 |
| [tests/unit/focus-action-authorization.test.ts](../../tests/unit/focus-action-authorization.test.ts) | 197 | 0 |
| [tests/unit/focus-heartbeat-evaluator.test.ts](../../tests/unit/focus-heartbeat-evaluator.test.ts) | 150 | 0 |
| [tests/unit/focus-mode-form.test.tsx](../../tests/unit/focus-mode-form.test.tsx) | 154 | 0 |
| [tests/unit/focus-service.test.ts](../../tests/unit/focus-service.test.ts) | 447 | 0 |
| [tests/unit/focus-timer.test.tsx](../../tests/unit/focus-timer.test.tsx) | 254 | 0 |
| [tests/unit/gamification-achievements.test.ts](../../tests/unit/gamification-achievements.test.ts) | 104 | 0 |
| [tests/unit/gamification-engine.test.ts](../../tests/unit/gamification-engine.test.ts) | 172 | 2 |
| [tests/unit/gamification-levels.test.ts](../../tests/unit/gamification-levels.test.ts) | 66 | 0 |
| [tests/unit/gamification-module-course-handlers.test.ts](../../tests/unit/gamification-module-course-handlers.test.ts) | 188 | 0 |
| [tests/unit/gamification-panel.test.tsx](../../tests/unit/gamification-panel.test.tsx) | 36 | 0 |
| [tests/unit/generate-plan-form.test.tsx](../../tests/unit/generate-plan-form.test.tsx) | 121 | 0 |
| [tests/unit/heartbeat-evaluator.test.ts](../../tests/unit/heartbeat-evaluator.test.ts) | 269 | 0 |
| [tests/unit/kanban-board.test.tsx](../../tests/unit/kanban-board.test.tsx) | 280 | 0 |
| [tests/unit/lesson-notes.test.tsx](../../tests/unit/lesson-notes.test.tsx) | 17 | 0 |
| [tests/unit/lesson-player.test.tsx](../../tests/unit/lesson-player.test.tsx) | 247 | 0 |
| [tests/unit/lesson-row.test.tsx](../../tests/unit/lesson-row.test.tsx) | 31 | 0 |
| [tests/unit/level-header.test.tsx](../../tests/unit/level-header.test.tsx) | 51 | 0 |
| [tests/unit/level-track.test.tsx](../../tests/unit/level-track.test.tsx) | 23 | 0 |
| [tests/unit/login-action-authorization.test.ts](../../tests/unit/login-action-authorization.test.ts) | 23 | 0 |
| [tests/unit/login-rate-limit.test.ts](../../tests/unit/login-rate-limit.test.ts) | 75 | 0 |
| [tests/unit/lucide-icon.test.ts](../../tests/unit/lucide-icon.test.ts) | 15 | 0 |
| [tests/unit/mock-exam-builder-form.test.tsx](../../tests/unit/mock-exam-builder-form.test.tsx) | 149 | 0 |
| [tests/unit/parse-input.test.ts](../../tests/unit/parse-input.test.ts) | 28 | 0 |
| [tests/unit/prisma-user-repository-credentials.test.ts](../../tests/unit/prisma-user-repository-credentials.test.ts) | 46 | 0 |
| [tests/unit/privacy-settings-card.test.tsx](../../tests/unit/privacy-settings-card.test.tsx) | 137 | 0 |
| [tests/unit/profile-action-authorization.test.ts](../../tests/unit/profile-action-authorization.test.ts) | 124 | 0 |
| [tests/unit/profile-preview-dialog.test.tsx](../../tests/unit/profile-preview-dialog.test.tsx) | 123 | 0 |
| [tests/unit/profile-service.test.ts](../../tests/unit/profile-service.test.ts) | 382 | 0 |
| [tests/unit/profile-workspace.test.tsx](../../tests/unit/profile-workspace.test.tsx) | 174 | 0 |
| [tests/unit/question-review-list.test.tsx](../../tests/unit/question-review-list.test.tsx) | 84 | 0 |
| [tests/unit/ranking-cron.test.ts](../../tests/unit/ranking-cron.test.ts) | 87 | 0 |
| [tests/unit/ranking-formula.test.ts](../../tests/unit/ranking-formula.test.ts) | 89 | 0 |
| [tests/unit/ranking-page-components.test.tsx](../../tests/unit/ranking-page-components.test.tsx) | 139 | 0 |
| [tests/unit/ranking-read.test.ts](../../tests/unit/ranking-read.test.ts) | 274 | 1 |
| [tests/unit/ranking-recalculate.test.ts](../../tests/unit/ranking-recalculate.test.ts) | 137 | 0 |
| [tests/unit/ranking-scope.test.ts](../../tests/unit/ranking-scope.test.ts) | 108 | 0 |
| [tests/unit/ranking-tiebreak.test.ts](../../tests/unit/ranking-tiebreak.test.ts) | 59 | 0 |
| [tests/unit/reorder-day-items.test.ts](../../tests/unit/reorder-day-items.test.ts) | 93 | 0 |
| [tests/unit/simulations-action-authorization.test.ts](../../tests/unit/simulations-action-authorization.test.ts) | 340 | 0 |
| [tests/unit/simulations-service.test.ts](../../tests/unit/simulations-service.test.ts) | 490 | 0 |
| [tests/unit/spaced-repetition.test.ts](../../tests/unit/spaced-repetition.test.ts) | 148 | 0 |
| [tests/unit/start-catalog-exam-button.test.tsx](../../tests/unit/start-catalog-exam-button.test.tsx) | 56 | 0 |
| [tests/unit/streak-calculation.test.ts](../../tests/unit/streak-calculation.test.ts) | 303 | 0 |
| [tests/unit/study-goals.test.ts](../../tests/unit/study-goals.test.ts) | 183 | 0 |
| [tests/unit/study-hours-chart.test.tsx](../../tests/unit/study-hours-chart.test.tsx) | 32 | 0 |
| [tests/unit/study-plan-action-authorization.test.ts](../../tests/unit/study-plan-action-authorization.test.ts) | 238 | 0 |
| [tests/unit/study-plan-calendar.test.tsx](../../tests/unit/study-plan-calendar.test.tsx) | 223 | 0 |
| [tests/unit/study-plan-generator.test.ts](../../tests/unit/study-plan-generator.test.ts) | 213 | 0 |
| [tests/unit/study-plan-service.test.ts](../../tests/unit/study-plan-service.test.ts) | 262 | 0 |
| [tests/unit/study-session-allocation.test.ts](../../tests/unit/study-session-allocation.test.ts) | 77 | 0 |
| [tests/unit/study-session-builder-form.test.tsx](../../tests/unit/study-session-builder-form.test.tsx) | 202 | 0 |
| [tests/unit/study-session-generator.test.ts](../../tests/unit/study-session-generator.test.ts) | 101 | 0 |
| [tests/unit/study-session-service.test.ts](../../tests/unit/study-session-service.test.ts) | 154 | 0 |
| [tests/unit/study-tracking-service.test.ts](../../tests/unit/study-tracking-service.test.ts) | 388 | 0 |
| [tests/unit/subject-performance-chart.test.tsx](../../tests/unit/subject-performance-chart.test.tsx) | 21 | 0 |
| [tests/unit/time-distribution-chart.test.tsx](../../tests/unit/time-distribution-chart.test.tsx) | 32 | 0 |
| [tests/unit/tracking-action-authorization.test.ts](../../tests/unit/tracking-action-authorization.test.ts) | 87 | 0 |
| [tests/unit/tracking-content-cards.test.tsx](../../tests/unit/tracking-content-cards.test.tsx) | 84 | 0 |
| [tests/unit/tracking-labels.test.ts](../../tests/unit/tracking-labels.test.ts) | 52 | 0 |
| [tests/unit/tracking-overview-service.test.ts](../../tests/unit/tracking-overview-service.test.ts) | 210 | 0 |
| [tests/unit/victory-dialog.test.tsx](../../tests/unit/victory-dialog.test.tsx) | 73 | 0 |

*Marcadores são ocorrências de TODO/FIXME/PENDÊNCIA/not implemented. Podem estar desatualizados; não são uma contagem automática de bugs.
