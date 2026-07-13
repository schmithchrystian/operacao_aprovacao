# Modelo de Dados — Operação Aprovação

> Documento produzido pelo subagente `database` (Fase 3 — schema Prisma). Descreve a
> modelagem em `prisma/schema.prisma`, as decisões de integridade/idempotência e as
> particularidades do Prisma 7 usado neste projeto.
>
> O schema é preparação para integração futura: hoje os repositórios usam
> `DATA_SOURCE=mock` (ADR-0002 em `docs/ARCHITECTURE.md`). Os stubs em
> `src/server/repositories/prisma/**` continuam sem implementação — fora do escopo
> desta fase.

## 1. Prisma 7 — o que mudou e como isso afeta o projeto

A major 7 do Prisma trouxe duas mudanças que impactam diretamente como este projeto usa
a ferramenta (documentado aqui porque diverge do que era usual em Prisma 5/6):

1. **`datasource` não aceita mais `url` no `schema.prisma`.** A connection string
   agora vive em `prisma.config.ts` (`datasource.url`, lido de `DATABASE_URL` via
   `dotenv/config`) — usada pelo CLI (`migrate`, `db pull`, `db seed`, etc.).
2. **O `PrismaClient` gerado (`generator client { provider = "prisma-client" }`) não
   embute mais um engine Rust com conhecimento da URL.** Em runtime, o client exige um
   **driver adapter** — aqui, `@prisma/adapter-pg` (`PrismaPg`), construído a partir de
   `DATABASE_URL`. Isso será relevante quando o agente `backend`/`database` implementar
   o singleton em `src/server/db` para os stubs `PrismaXxxRepository`:

   ```ts
   import { PrismaPg } from "@prisma/adapter-pg";
   import { PrismaClient } from "@/generated/prisma/client";

   const adapter = new PrismaPg(process.env.DATABASE_URL!);
   export const prisma = new PrismaClient({ adapter });
   ```

O client é gerado em `src/generated/prisma/` (path customizado, fora de
`node_modules`) — a pasta é ignorada no `.gitignore` (adicionada automaticamente pelo
`prisma generate`) e deve ser gerada localmente via `npm run db:generate`.

Comandos disponíveis sem banco (adicionados a `package.json#scripts`):

```bash
npm run db:format     # prisma format
npm run db:validate   # prisma validate
npm run db:generate   # prisma generate
npm run db:seed       # tsx prisma/seed.ts (não roda sem DATABASE_URL real)
```

`prisma migrate dev` / `db push` **não foram executados** (exigem conexão real) —
apenas a migration inicial foi gerada via diff estrutural (ver §6).

## 2. Grupos de entidades (44 tabelas)

### Identidade e acesso
`User`, `Profile`, `Role`, `Permission`, `RolePermission`, `UserRole`

- `User.role` (`SystemRole`: `STUDENT | TEACHER | MODERATOR | ADMIN`) é o **fast-path**
  de autorização usado por `requireRole()` (ADR-0006) — sempre disponível sem joins.
- `Role`/`Permission`/`RolePermission`/`UserRole` formam um RBAC **granular e
  administrável** por cima do papel fixo, para permissões específicas (ex.:
  `course:publish`, `question:review`) sem exigir deploy de código.
- `Profile` é 1:1 com `User` e carrega **flags de privacidade** explícitas
  (`isProfilePublic`, `showInRanking`, `showRealName`, `showCityState`) — nenhuma
  exposição de dado pessoal é implícita; a leitura do ranking/perfil público deve
  respeitar essas flags na camada de serviço.

### Concursos, cursos e conteúdo
`Contest`, `Course`, `Module`, `Lesson`, `LessonMaterial`, `LessonProgress`,
`Subject`, `Topic`, `Teacher`, `Enrollment`

- Hierarquia `Contest → Course → Module → Lesson → LessonMaterial`, com `order`
  únicos por pai (`@@unique([courseId, order])`, `@@unique([moduleId, order])`).
- `Lesson.requiresLessonId` (auto-relação `LessonPrerequisite`) modela pré-requisito
  simples entre aulas; regras de liberação mais ricas ficam a cargo do `backend`.
- `Lesson.minCompletionPercent` é opcional e sobrescreve o default global
  `LESSON_COMPLETION_MIN_PERCENT` (0.8, em `src/config/business.ts`) quando uma aula
  específica precisa de outro limiar.
- `Teacher` é uma entidade de **atribuição de conteúdo**, não um papel de acesso: pode
  existir sem `User` vinculado (`userId` nullable) para instrutores exibidos no
  conteúdo sem login na plataforma.
- `Enrollment` é única por `(userId, courseId)` — reinscrição reutiliza o mesmo
  registro trocando `status`, preservando o `LessonProgress` histórico do aluno.

### Acompanhamento de estudos
`StudySession`, `StudyActivity`, `StudyPlan`, `StudyPlanItem`

- `StudySession.validSeconds` **nunca** é a diferença bruta `endedAt - startedAt`
  (CLAUDE.md §14): é reconstruído a partir dos sinais em `StudyActivity`
  (heartbeats de vídeo, ticks de Pomodoro, etc.), cada um com um veredito
  `isValid` do servidor. O schema só guarda o sinal bruto (`payload: Json`) e o
  resultado (`isValid`); a lógica de reconstrução é do agente `study-tracking`.
- `StudyPlanItem` referencia `Subject`/`Topic`/`Lesson` por **FKs opcionais reais**
  (`onDelete: SetNull`), não por IDs soltos: um item de plano pode ou não estar
  atrelado a uma matéria/assunto/aula, e se o conteúdo referenciado for removido o
  vínculo é anulado (o item permanece, apenas perde a associação). Há `@@index` em
  `subjectId`, `topicId` e `lessonId` para as consultas de plano por conteúdo.

### Simulados e questões
`MockExam`, `Question`, `QuestionOption`, `MockExamQuestion`, `MockExamAttempt`,
`QuestionAttempt`, `QuestionFavorite`

- `MockExamQuestion` é a junção N:N entre simulado e questão — a mesma questão pode
  compor vários simulados.
- `QuestionOption.isCorrect` **existe no schema** (necessário para corrigir no
  servidor) mas a camada de aplicação nunca deve projetar esse campo para o cliente
  antes da correção — regra de app, reforçada aqui apenas como comentário no schema
  (CLAUDE.md §18/§25; revisão cabe ao agente `security`).
- `QuestionAttempt.mockExamAttemptId` é **nullable de propósito**: dentro de uma
  tentativa de simulado, é único por `(mockExamAttemptId, questionId)` (não é possível
  responder a mesma questão duas vezes na mesma tentativa); fora de simulado (prática
  avulsa/caderno de erros, `mockExamAttemptId = null`), múltiplas respostas à mesma
  questão são permitidas — e isso funciona porque o Postgres **não** considera duas
  colunas `NULL` iguais para fins de unicidade, então o `@@unique` não bloqueia
  repetição quando o FK é nulo. Este é o único ponto do schema onde o comportamento de
  `NULL` em unique é **desejado**; ver §5 para o caso oposto (`RankingScore`).

### Flashcards
`FlashcardDeck`, `Flashcard`, `FlashcardReview`

- `FlashcardDeck.userId` nullable = baralho do sistema/público; preenchido = baralho
  pessoal do aluno.
- `FlashcardReview` é **append-only** (uma linha por revisão) e guarda os parâmetros
  do algoritmo estilo SM-2 (`easeFactor`, `intervalDays`, `repetition`) — a próxima
  exibição do card é `nextReviewAt` da revisão mais recente. `rating` mapeia
  Errei/Difícil/Médio/Fácil → `AGAIN/HARD/GOOD/EASY`.

### Brainstorm
`BrainstormBoard`, `BrainstormColumn`, `BrainstormCard`

- Colunas iniciais (Ideias, Estudar, Revisar, Dúvidas, Resolvido) são dados de seed,
  não um enum fixo — o quadro é livre para o aluno reorganizar colunas.
- `BrainstormCard.status` (`OPEN | ARCHIVED | CONVERTED`) é independente da coluna:
  representa o ciclo de vida do cartão (ex.: `CONVERTED` quando virou flashcard ou
  item de plano de estudos), enquanto a coluna representa só a posição no quadro.
  `convertedFlashcardId`/`convertedStudyPlanItemId` (ambos `@unique`) registram o
  destino da conversão sem exigir uma tabela de junção extra.

### Gamificação
`Achievement`, `UserAchievement`, `GamificationEvent`, `PointTransaction`,
`RankingScore`, `DailyGoal`, `WeeklyGoal`, `UserStreak`

- **Padrão outbox (ADR-0007):** os domínios de origem (aulas, flashcards, simulados...)
  emitem um `GamificationEvent` com `idempotencyKey` **única**, no formato
  `<origem>-completed:<userId>:<entidadeOrigem>` (ex.:
  `lesson-completed:<userId>:<lessonId>`). Isso é o que impede a mesma aula/flashcard/
  simulado de gerar pontos duas vezes (CLAUDE.md §13/§15/§25), no nível do banco.
- **Ledger imutável:** `PointTransaction` não tem `updatedAt`/`deletedAt` e nenhuma
  linha é atualizada após criada — correções usam uma **nova** linha `REVERSAL`
  referenciando a original via auto-relação `reversedTransactionId`.
  `PointTransaction.idempotencyKey` espelha a do evento de origem como segunda
  barreira (constraint única independente) contra dupla concessão, mesmo que o
  processamento do evento rode mais de uma vez.
- `UserAchievement` é única por `(userId, achievementId)` — impossível desbloquear a
  mesma conquista duas vezes.
- `RankingScore` é única por
  `(userId, periodType, periodKey, scopeType, scopeKey, calculationVersion)` — permite
  recálculo idempotente (mesma versão não duplica linha) e mantém versões antigas para
  auditoria/rollback de fórmula. **Decisão deliberada:** `scopeKey` é uma `String`
  **nunca nula** (default `"global"`), em vez de um `scopeId` nullable. Motivo: no
  Postgres, colunas `NULL` não são consideradas iguais por uma constraint `UNIQUE`, e
  como o escopo "global" (sem concurso/curso/cidade específicos) seria representado
  por um FK nulo, um recálculo periódico duplicaria a linha "global" a cada rodada em
  vez de fazer *upsert* nela. Normalizar o escopo como string não-nula
  (`"global"`, `"contest:<id>"`, `"course:<id>"`, `"city:<nome>"`) elimina esse risco.
- `DailyGoal`/`WeeklyGoal` são únicas por `(userId, date)` / `(userId, weekStart)`.
- `UserStreak` é 1:1 com `User` (a própria `userId` é a chave primária).

### Notificações, assinatura e auditoria
`Notification`, `Subscription`, `AuditLog`

- `AuditLog` é **imutável** (sem `updatedAt`/`deletedAt`, sem update path) e indexado
  por `(entityType, entityId, createdAt)` e `(actorUserId, createdAt)` para consulta
  administrativa.

## 3. Exclusão lógica (`deletedAt`)

Aplicada em entidades de **conteúdo/cadastro** (onde esconder sem apagar histórico
associado importa): `User`, `Profile`, `Contest`, `Course`, `Module`, `Lesson`,
`LessonMaterial`, `Subject`, `Topic`, `Teacher`, `StudyPlan`, `StudyPlanItem`,
`MockExam`, `Question`, `Flashcard`, `FlashcardDeck`, `BrainstormBoard`,
`BrainstormColumn`, `BrainstormCard`, `Achievement`.

**Deliberadamente sem `deletedAt`** (dados de log/histórico/transacionais —
apagar destruiria auditabilidade, e "esconder" não é um conceito que se aplique):
`StudySession`, `StudyActivity`, `MockExamAttempt`, `QuestionAttempt`,
`FlashcardReview`, `GamificationEvent`, `PointTransaction`, `RankingScore`,
`DailyGoal`, `WeeklyGoal`, `UserStreak`, `UserAchievement`, `Notification`,
`AuditLog`, `Enrollment`, `LessonProgress`, junções N:N.

## 4. Índices relevantes (além dos automáticos em FKs)

O Prisma cria índice automaticamente em toda coluna de FK (comportamento padrão desde
a 4.7). Índices explícitos adicionais cobrem padrões de consulta esperados:

- `User(role)`, `User(deletedAt)` — filtragem por papel/ativos.
- `LessonProgress(lessonId, status)` — progresso agregado por aula.
- `Question(subjectId, topicId)`, `Question(board)`, `Question(difficulty)` — filtros
  de banco de questões.
- `MockExamAttempt(userId, status)` — tentativas em andamento por usuário.
- `QuestionAttempt(userId, questionId)` — caderno de erros/histórico.
- `GamificationEvent(userId, createdAt)`, `GamificationEvent(status)` — fila de
  processamento e histórico por usuário.
- `PointTransaction(userId, createdAt)` — extrato de pontos paginado.
- `RankingScore(periodType, periodKey, scopeType, scopeKey, calculationVersion, score)`
  — ordenação direta para montar a tabela de ranking sem sort em memória.
- `Notification(userId, isRead, createdAt)` — contagem/lista de não lidas.
- `AuditLog(entityType, entityId, createdAt)`, `AuditLog(actorUserId, createdAt)`.

## 5. Constraints e unicidade — resumo das garantias do banco

| Regra (CLAUDE.md) | Constraint no schema |
|---|---|
| Aula não conclui/pontua duas vezes | `LessonProgress @@unique([userId, lessonId])` + `GamificationEvent.idempotencyKey @unique` |
| Conquista não duplica | `UserAchievement @@id([userId, achievementId])` |
| Pontuação com histórico imutável/auditável | `PointTransaction` sem update path; `idempotencyKey @unique`; reversão via nova linha |
| Ranking com período e versão | `RankingScore @@unique([userId, periodType, periodKey, scopeType, scopeKey, calculationVersion])` |
| Resposta correta protegida | `QuestionOption.isCorrect` existe, mas é regra de app não projetar antes da correção (fora do escopo do schema) |
| Estados impossíveis evitados sempre que possível | enums fechados para status; `Lesson`/`Module` com `order` único por pai; `Enrollment`/`LessonProgress`/`UserAchievement`/`QuestionFavorite` com unicidade de negócio |

### Convenção de escala dos campos "percent"

Há duas escalas em uso, deliberadamente distintas — atenção ao consumir/gravar:

- **Fração 0–1:** `LessonProgress.watchedPercent` e o default global
  `LESSON_COMPLETION_MIN_PERCENT` (0.8, em `src/config/business.ts`), assim como
  `Lesson.minCompletionPercent`. Ou seja, a conclusão da aula é
  `watchedPercent >= minCompletionPercent ?? LESSON_COMPLETION_MIN_PERCENT`, tudo em
  fração.
- **Percentual 0–100:** `MockExamAttempt.scorePercent` (nota do simulado). O seed
  grava `(correctCount / total) * 100`.

Não misturar as duas escalas ao comparar/exibir.

### Limitação conhecida — finalização dupla de `MockExamAttempt`

A proteção contra finalizar a mesma tentativa duas vezes (CLAUDE.md §18/§25) é feita
por **concorrência otimista**, não por constraint do schema:

- `MockExamAttempt.version` (`Int`, incrementado a cada update) deve ser usado pelo
  `backend`/`simulations` na finalização como
  `UPDATE ... SET status = 'FINISHED', version = version + 1 WHERE id = ? AND status = 'IN_PROGRESS' AND version = ?`
  — se zero linhas forem afetadas, a tentativa já foi finalizada (ou alterada
  concorrentemente) e a operação deve ser rejeitada. Este é o mecanismo real e a
  pendência explícita para o agente `backend`/`simulations` na fase de implementação.

## 6. Migration inicial

Gerada sem conexão com banco (diff estrutural, não `migrate dev`):

```bash
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script \
  > prisma/migrations/0000_init/migration.sql
```

Resultado: `prisma/migrations/0000_init/migration.sql` — **44 tabelas**, **25 índices
únicos**, **65 índices**, **67 chaves estrangeiras**. **Não aplicada** (não há
PostgreSQL disponível neste ambiente). Ao aplicar pela primeira vez em um banco real,
usar `npx prisma migrate resolve --applied 0000_init` (se a migration for aplicada
manualmente) ou `npx prisma migrate deploy` assim que houver conexão configurada em
`prisma.config.ts`/`DATABASE_URL`.

## 7. Seed (`prisma/seed.ts`)

Idempotente (todo registro usa `id` determinístico + `upsert`; junções sem `id`
próprio usam a chave composta gerada pelo Prisma). Não roda nesta fase (sem banco).
Quando houver `DATABASE_URL` real: `npm run db:seed` (ou `npx prisma db seed`, que lê
`migrations.seed` de `prisma.config.ts`).

Conteúdo gerado:

- 1 admin + 2 professores + **10 alunos** (perfis, streaks, assinaturas);
- baseline de `Role`/`Permission`/`RolePermission`/`UserRole`;
- **3 concursos/cursos** (Polícia Militar, Guarda Civil Municipal, Polícia Penal), 2
  módulos por curso;
- **6 matérias**, 2 assuntos cada;
- **20 aulas** (7 + 7 + 6) com 1 material por módulo;
- matrículas (todos os alunos + 2 matrículas extras multi-curso);
- progresso de aula (1 concluída + 1 em andamento por aluno) com `GamificationEvent` +
  `PointTransaction` correspondentes;
- sessões de estudo (aula e **Pomodoro**) com `StudyActivity` e pontuação de Pomodoro;
- plano de estudos com 2 itens por aluno;
- **3 simulados**, **30 questões** (10 por simulado, 4 alternativas cada = 120
  alternativas), tentativas finalizadas com respostas e pontuação de gamificação;
- 2 questões favoritadas;
- **20 flashcards** (6 baralhos por matéria + 2 pessoais) com revisões de exemplo;
- 2 quadros de Brainstorm com colunas padrão e cartões de exemplo;
- **10 conquistas** com alguns desbloqueios e notificações;
- ranking mensal, metas diárias/semanais para os 10 alunos;
- 2 registros de `AuditLog` de exemplo.

Senhas: hash único fixo (`bcrypt.hashSync("dev-seed-only-not-a-real-password", 10)`) —
placeholder de desenvolvimento, **nunca** uma credencial real.

## 8. Pendências para as próximas fases

- Implementar `src/server/db` (singleton `PrismaClient` + `PrismaPg` adapter) e os
  stubs `PrismaXxxRepository` — fora do escopo desta fase (`database` só entrega
  schema/seed/docs).
- Aplicar a migration inicial e rodar o seed assim que houver PostgreSQL disponível.
- Avaliar, com o agente `backend`/`simulations`, o reforço transacional de
  `MockExamAttempt` (concorrência otimista via `version`) descrito em §5.
- Avaliar com o agente `security` a exposição de `QuestionOption.isCorrect` nas
  queries/DTOs (regra de aplicação, não de schema).
