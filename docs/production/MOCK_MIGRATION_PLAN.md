# Plano de Migração Mock → Prisma/Supabase (Operação Aprovação)

> Produzido pelo subagente `database`. Assume a decisão de [`SUPABASE_DECISION.md`](./SUPABASE_DECISION.md)
> (Opção A: Supabase Postgres + Storage, Auth.js v5 mantido). Documento de **planejamento** —
> nenhum comando abaixo foi executado; este agente não roda migrations nem cria recursos externos.
> Mapeia para as Fases 2-9 do [`ROADMAP_SKELETON.md`](./ROADMAP_SKELETON.md).

## 1. Projetos Supabase por ambiente

Um projeto Supabase **separado** por ambiente (`ENVIRONMENTS.md` §1, regra inegociável: produção
nunca compartilha banco/storage/segredos):

| Ambiente | Projeto Supabase | Observação |
|---|---|---|
| local | Postgres local **ou** branch/projeto Supabase pessoal do dev | `DATA_SOURCE=mock` continua sendo o modo padrão local; só sobe Postgres para validar a migração Prisma. |
| development | Projeto Supabase **dev** dedicado | Primeiro ambiente com Prisma real. |
| staging | Projeto Supabase **staging** dedicado | Espelho de produção em configuração; nunca público/indexável. |
| production | Projeto Supabase **production** dedicado | Único com dados reais; sem seed. |

Cada projeto fornece, no painel (Settings → Database):
- Connection string **pooled** (Supavisor, porta `6543`) → `DATABASE_URL`.
- Connection string **direta** (porta `5432`) → `DIRECT_URL`.
- Uma **service role key** e URL do projeto (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) para o
  Supabase Storage (fora do escopo deste doc, mas a criação do projeto já habilita ambos).

## 2. Connection strings — pooled vs. direta

Fato técnico já confirmado em `TARGET_ARCHITECTURE.md` §4 e validado nesta pesquisa (docs oficiais
Supabase/Prisma):

- **`DATABASE_URL`** (runtime, usada pelo `PrismaClient`/`@prisma/adapter-pg`): Supavisor em **modo
  transação**, porta **`6543`**, com **`?pgbouncer=true`** — necessário porque esse modo não suporta
  prepared statements, e a flag desliga esse recurso no Prisma. Usada pela aplicação serverless
  (Vercel Functions).
- **`DIRECT_URL`** (CLI, usada por `prisma migrate`/`prisma db seed`): conexão **direta**, porta
  **`5432`** — o pooler de transação não suporta o motor de migrations (DDL exige conexão
  persistente/sessão longa).

### 2.1 Ajuste necessário no `prisma.config.ts`

Hoje (`prisma.config.ts:13-15`) só existe `datasource.url`. Prisma 7 aceita `directUrl` no mesmo
bloco (equivalente ao `directUrl` que em versões anteriores ia no `schema.prisma`):

```ts
datasource: {
  url: process.env["DATABASE_URL"],
  directUrl: process.env["DIRECT_URL"],
},
```

O `schema.prisma` (`datasource db { provider = "postgresql" }`, linha 14-16) não precisa mudar —
em Prisma 7 a URL/`directUrl` vivem na config, não no schema (comentário já presente no topo do
arquivo).

## 3. Constraints `@unique`/índices necessárias para idempotência — já presentes no schema

**Achado importante:** o schema (`prisma/schema.prisma`, 44 models) e a migration `0000_init`
(`prisma/migrations/0000_init/migration.sql`, 1201 linhas) **já contêm todas as constraints de
idempotência descritas em `docs/SECURITY.md` §3 e `docs/DATA-MODEL.md` §5** — não há alteração de
schema pendente para este item. Lista verificada (schema ↔ migration):

| Model | Constraint | Linha (schema) | Presente na migration `0000_init`? |
|---|---|---|---|
| `GamificationEvent` | `idempotencyKey @unique` | 956 | Sim |
| `PointTransaction` | `idempotencyKey @unique` | 984 | Sim |
| `PointTransaction` | `gamificationEventId @unique` | 983 | Sim |
| `PointTransaction` | `reversedTransactionId @unique` | 989 | Sim |
| `LessonProgress` | `@@unique([userId, lessonId])` | 464 | Sim (`LessonProgress_userId_lessonId_key`) |
| `UserAchievement` | `@@id([userId, achievementId])` | 944 | Sim (chave primária composta) |
| `Enrollment` | `@@unique([userId, courseId])` | 542 | Sim |
| `QuestionAttempt` | `@@unique([mockExamAttemptId, questionId])` | 768 | Sim |
| `QuestionFavorite` | `@@id([userId, questionId])` | 782 | Sim |
| `RankingScore` | `@@unique([userId, periodType, periodKey, scopeType, scopeKey, calculationVersion])` | 1022 | Sim |
| `DailyGoal` | `@@unique([userId, date])` | 1040 | Sim |
| `WeeklyGoal` | `@@unique([userId, weekStart])` | 1057 | Sim |
| `Module` | `@@unique([courseId, order])` | 392 | Sim |
| `Lesson` | `@@unique([moduleId, order])` | 425 | Sim |
| `Topic` | `@@unique([subjectId, slug])` | 501 | Sim |
| `BrainstormColumn` | `@@unique([boardId, order])` | 885 | Sim |
| `MockExamQuestion` | `@@id([mockExamId, questionId])` | 715 | Sim |
| `RolePermission` | `@@id([roleId, permissionId])` | 316 | Sim |
| `UserRole` | `@@id([userId, roleId])` | 328 | Sim |
| `Teacher` | `userId @unique` | 510 | Sim |
| `Profile` | `userId @unique` | 258 | Sim |
| `User` | `email @unique` | 213 | Sim |

**Sem `@unique` por desenho (não é lacuna, é intencional — confirmar com `security`/`simulations`/`backend` antes de mudar):**
- `MockExamAttempt` — idempotência de finalização é **concorrência otimista via `version` (Int)**, não
  um `@unique` (uma tentativa pode existir só uma vez ativa por natureza do fluxo; a proteção é contra
  finalizar a MESMA tentativa duas vezes, resolvida por `UPDATE ... WHERE status='IN_PROGRESS' AND
  version=?` — pendência de implementação no service, não no schema).
- `FlashcardReview` — log append-only intencional (cada revisão é um evento novo legítimo).
- `StudySession`/`StudyActivity` — idempotência vem da reconstrução server-side de `validSeconds`, não
  de constraint de schema.
- `BrainstormCard` (mover entre colunas) — sem `@unique` dedicado; mitigação é transação na
  aplicação (ler posição atual + atualizar), pendência já registrada em `docs/SECURITY.md` §3.

**Conclusão:** nenhuma migration adicional de schema é necessária para idempotência antes de ligar
Prisma. O trabalho pendente nesses três últimos itens é em **código de serviço** (transações/queries
condicionais), não em DDL.

## 4. Ordem de execução

1. **Provisionar projetos Supabase** (dev → staging → production, um de cada vez), coletar
   `DATABASE_URL`/`DIRECT_URL` de cada um (Fase 2 do roadmap).
2. **Ajustar `prisma.config.ts`** para incluir `directUrl` (§2.1 acima).
3. **Ampliar `src/config/env.ts`** (Zod) com `DATABASE_URL` e `DIRECT_URL` (hoje só lidas fora do
   schema Zod — `CURRENT_STATE.md` §3). Adicionar validação: obrigatórias quando `DATA_SOURCE=prisma`.
4. **Criar `src/server/db`** — `PrismaClient` singleton com `PrismaPg` (driver adapter), guardado em
   `globalThis` no padrão anti-hot-reload (mesmo padrão já usado pelos stores mock, `mock-store.ts`,
   mas para uma única instância de cliente, não estado mutável). Nenhum outro arquivo fora de
   `server/repositories/prisma/**` e `server/db` pode importar `@prisma/client`/`src/generated/prisma`
   (regra já fixada em `TARGET_ARCHITECTURE.md` §6).
5. **`npm run db:generate`** (gera `src/generated/prisma/`) contra o schema já existente — primeira
   vez neste ambiente com uma `DATABASE_URL` real.
6. **`npx prisma migrate deploy`** (usa `DIRECT_URL`) — aplica `0000_init` pela primeira vez em
   dev, depois staging, depois production (nunca pular ambiente; produção sempre por último e com
   backup prévio — ver `BACKUP_AND_RECOVERY.md`).
7. **Seed — apenas fora de produção**: `npm run db:seed` em local/development/staging. **Nunca em
   production** (regra dura de `ENVIRONMENTS.md` §1/§2 — o `seed.ts` já documenta isso na própria
   docstring, linha 9-11, e usa hash placeholder idêntico para todos os usuários, inadequado para
   produção).
8. **Criar admin inicial de produção** via script de bootstrap dedicado (§7 abaixo) — **não** via
   `seed.ts` (que é só para dev/staging).
9. **Implementar os 37 `PrismaXxxRepository`** (hoje stubs — `throw new Error("not implemented")`)
   agrupados por domínio (§5 abaixo), em paralelo por agente de domínio conforme
   `ROADMAP_SKELETON.md` Fases 5-7.
10. **Bloqueador #1 — migrar login mock → `UserRepository`** (§6 abaixo) — **obrigatório antes**
    de qualquer ambiente com `DATA_SOURCE=prisma` e usuários reais (`ENVIRONMENTS.md` checklist item 6).
11. **Auditoria persistida** — `PrismaAuditLogRepository` + ligar `auditLog()`/`getAuditRecords()`
    (Fase 9).
12. **Transações críticas** — envolver conclusão de aula + evento de gamificação + pontos numa
    `$transaction`; finalização de simulado com concorrência otimista `version`; troca de
    último-admin em transação (§8 abaixo).
13. **Rodar a suíte de testes com `DATA_SOURCE=prisma`** contra um banco de teste (§9 abaixo).
14. **Trocar `DATA_SOURCE=mock` → `prisma`** por ambiente, começando por development.

## 5. Os 37 `PrismaXxxRepository` a implementar, agrupados por domínio

Localização: `src/server/repositories/prisma/*.ts` (todos hoje são stubs — cada método faz
`throw new Error("not implemented: ...")`, ex.: `user-repository.ts:12-33`). Contrato de cada um
já definido em `src/server/repositories/contracts/*.ts`; implementação mock funcional equivalente
em `src/server/repositories/mock/*.ts` serve de referência de comportamento esperado.

| Domínio | Arquivos (`src/server/repositories/prisma/`) | Agente |
|---|---|---|
| Identidade/Acesso | `user-repository.ts`, `profile-repository.ts` | database, security (bloqueador #1) |
| Concursos/Cursos/Conteúdo | `contest-repository.ts`, `course-repository.ts`, `module-repository.ts`, `lesson-repository.ts`, `subject-repository.ts`, `topic-repository.ts`, `teacher-repository.ts`, `enrollment-repository.ts`, `lesson-progress-repository.ts` | database, backend |
| Acompanhamento de estudos | `study-session-repository.ts`, `study-plan-repository.ts`, `study-plan-item-repository.ts`, `study-mission-repository.ts`, `user-streak-repository.ts`, `daily-goal-repository.ts`, `weekly-goal-repository.ts`, `focus-session-repository.ts` | study-tracking, database |
| Simulados/Questões | `mock-exam-repository.ts`, `question-repository.ts`, `question-option-repository.ts`, `mock-exam-attempt-repository.ts`, `question-attempt-repository.ts`, `question-favorite-repository.ts` | simulations, database |
| Flashcards | `flashcard-deck-repository.ts`, `flashcard-repository.ts`, `flashcard-review-repository.ts` | backend, database |
| Brainstorm | `brainstorm-board-repository.ts`, `brainstorm-column-repository.ts`, `brainstorm-card-repository.ts` | backend, database |
| Gamificação/Ranking | `gamification-event-repository.ts`, `point-transaction-repository.ts`, `user-achievement-repository.ts`, `ranking-score-repository.ts`, `achievement-repository.ts` | gamification, database |
| Notificações | `notification-repository.ts` | backend, database |

Atenção específica (já registrada em `CURRENT_STATE.md` §2):
- `PrismaUserRepository`: mapear `Role` (domínio, pt-BR: `aluno|professor|moderador|admin`) ↔
  `SystemRole` (Prisma: `STUDENT|TEACHER|MODERATOR|ADMIN`) — conversão bidirecional explícita.
- `PrismaProfileRepository`: respeitar as flags de privacidade (`isProfilePublic`, `showInRanking`,
  `showRealName`, `showCityState`) na projeção — nunca vazar dado pessoal em queries de ranking/perfil
  público.
- `PrismaMockExamAttemptRepository`: método de finalização deve implementar a query condicional de
  concorrência otimista (§8).
- `PrismaGamificationEventRepository`/`PrismaPointTransactionRepository`: confiar nas constraints
  `@unique` (§3) — nunca "checar antes de inserir" como único mecanismo.

## 6. Bloqueador #1 — mover leitura de senha para `UserRepository`

Hoje `src/server/auth/credentials-service.ts:2` importa `mockCredentials`/`DEV_PASSWORD_HASH` de
`@/mocks` (→ `src/mocks/data/credentials.ts`) **incondicionalmente**, ignorando `DATA_SOURCE`.
Correção (já especificada em `docs/SECURITY.md` §2, aqui detalhada para execução):

1. **Novo método na interface `UserRepository`** (`src/server/repositories/contracts/user-repository.ts`):
   ```ts
   findCredentialsByEmail(email: string): Promise<{ userId: string; passwordHash: string } | null>;
   ```
2. **`MockUserRepository`** (`src/server/repositories/mock/user-repository.ts`): implementar lendo de
   `mockCredentials`/`DEV_PASSWORD_HASH` (import continua existindo, mas só aqui dentro do repo mock).
3. **`PrismaUserRepository`** (`src/server/repositories/prisma/user-repository.ts`): implementar com
   `prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } })`.
4. **`credentials-service.ts`**: parar de importar `@/mocks` diretamente; chamar
   `getRepositories().users.findCredentialsByEmail(normalizedEmail)`. Manter a defesa de timing
   (bcrypt contra hash "dummy" quando `null`) — usar um hash dummy **próprio de `credentials-service`**
   (não mais o `DEV_PASSWORD_HASH` do mock), para que a defesa funcione também com `DATA_SOURCE=prisma`.
5. **Teste de regressão** (novo, em `tests/unit/`): com um repositório fake equivalente a
   `DATA_SOURCE=prisma`, login com a senha de dev mock `senha123` deve **falhar** para qualquer
   usuário — cobre exatamente o cenário de backdoor descrito em `docs/SECURITY.md` §2.

**Sem isso, nenhum ambiente pode ir para `DATA_SOURCE=prisma` com usuários reais** — regra dura já
fixada em `ENVIRONMENTS.md` checklist item 6.

## 7. Criar admin inicial de forma segura (produção)

**Nunca** usar `seed.ts` para produção (hash placeholder documentado, mesmo hash para todos os
usuários). Criar um script de bootstrap dedicado, ex. `scripts/bootstrap-admin.ts` (fora do
`prisma/seed.ts`), com estas propriedades:

- **Senha nunca versionada.** Lida de variável de ambiente (`BOOTSTRAP_ADMIN_PASSWORD`) ou de prompt
  interativo de CLI (nunca hardcoded, nunca em `.env.example` com valor real).
- **E-mail/nome também via env/CLI** (`BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`) — nada fixo no
  script.
- **Hash com bcrypt** (mesma lib já usada, `bcryptjs`, custo ≥ 10 rounds — igual ao resto do sistema).
- **Idempotente e seguro para re-execução:** se já existir um usuário com `role=ADMIN`, o script deve
  recusar criar um segundo automaticamente (evita múltiplos admins acidentais) — exigir uma flag
  explícita (`--force`) para criar admin adicional.
- **Auditoria:** gravar um `AuditLog` (`action: "admin.bootstrap_created"`) no momento da criação.
- **Nunca comitar a senha usada** — o operador deve trocá-la após o primeiro login (ou já forçar
  `emailVerified`/necessidade de troca, se essa funcionalidade existir — hoje não há "forçar troca de
  senha no primeiro login", registrar como pendência de produto separada).
- Rodar **uma única vez**, manualmente, contra o projeto Supabase de produção — nunca em pipeline
  automático sem confirmação humana.

## 8. Transações necessárias

| Fluxo | Mecanismo | Onde |
|---|---|---|
| Conclusão de aula → evento de gamificação → pontos | `prisma.$transaction([...])` (ou `$transaction(async (tx) => ...)`) envolvendo `LessonProgress.update` + `GamificationEvent.create` + `PointTransaction.create` — nunca em três chamadas separadas (evita estado parcial se o processo cair no meio). | `PrismaLessonProgressRepository`/service de gamificação (Fase 6-7). |
| Finalização de simulado (concorrência otimista) | `UPDATE "MockExamAttempt" SET status='FINISHED', version=version+1, ... WHERE id=$1 AND status='IN_PROGRESS' AND version=$2` via `prisma.mockExamAttempt.updateMany({ where: { id, status: "IN_PROGRESS", version }, data: {...} })` — checar `count === 0` para rejeitar (já finalizada/alterada por outra requisição). | `PrismaMockExamAttemptRepository` (Fase 11, agente `simulations`). |
| Troca de papel do último admin | Antes de rebaixar/desativar um `admin`, contar admins ativos **dentro da mesma transação** (`SELECT ... FOR UPDATE` ou `prisma.$transaction` com verificação antes do `update`) — rejeitar se resultaria em zero admins ativos. Hoje não implementado (nem em mock); registrar como requisito novo do service de admin. | Service de admin (`server/services/admin/users-service.ts`), agente `backend`/`security`. |

## 9. Testes de validação

1. `npm run db:generate` sem erros contra o schema atual.
2. `npx prisma migrate deploy` aplica `0000_init` sem erro num banco de teste limpo (Supabase branch
   de teste, ou Postgres local descartável).
3. `npm run db:seed` roda sem erro e é **idempotente** (rodar duas vezes seguidas não duplica nem
   falha) — já garantido pelo padrão `upsert` do `seed.ts`, mas validar na prática pós-migração.
4. **Rodar a suíte de testes (741 testes Vitest) com `DATA_SOURCE=prisma`** contra esse banco de
   teste — hoje 100% mocks-first; este é o primeiro exercício real dos `PrismaXxxRepository`.
   Requer: banco de teste populado (seed) e `DATABASE_URL`/`DIRECT_URL` apontando para ele nas
   variáveis de ambiente de teste (`vitest` config/`.env.test`).
5. Teste de regressão do bloqueador #1 (§6, item 5) passando.
6. Teste manual (ou de integração) de: login real, conclusão de aula com evento+pontos em
   transação, finalização de simulado com duas requisições concorrentes (validar que só uma
   "vence"), criação de admin via script de bootstrap.
7. `npm run lint && npm run typecheck && npm run build` verdes com `DATA_SOURCE=prisma` configurado.

## 10. Plano de rollback

Nenhuma migration proposta aqui é destrutiva — `0000_init` é a migration inicial (criação de
schema), sem `DROP`/alteração de dados existentes. Ainda assim:

- **Rollback de migration:** antes de `migrate deploy` em qualquer ambiente com dados (staging com
  massa de QA, production), tirar backup (ver `BACKUP_AND_RECOVERY.md`). Se `migrate deploy` falhar
  no meio, Prisma Migrate marca a migration como falha no histórico (`_prisma_migrations`) — resolver
  com `prisma migrate resolve` **após** entender a causa, nunca re-rodar às cegas. Para reverter de
  fato, restaurar o backup pré-migration (Prisma não gera "down migrations" automaticamente).
- **Rollback de `DATA_SOURCE`:** por ser uma env var, reverter `prisma` → `mock` é imediato (redeploy
  com a env revertida) — usar como circuit-breaker se algo crítico for descoberto após o cutover,
  mas isso **não desfaz** gravações já feitas no Postgres real (o mock não lê do banco).
- **Rollback do bloqueador #1:** se o novo `verifyCredentials` apresentar regressão, reverter o
  commit que o alterou (Git) restaura o comportamento anterior — mas isso reintroduz o backdoor
  `senha123`, então só aceitável como ação de emergência extremamente curta, nunca como estado
  estável.
- **Rollback do admin bootstrap:** se o admin criado for inválido, editar via SQL direto
  (`UPDATE "User" SET role='STUDENT' WHERE id=...`) só deve ser feito manualmente e auditado — não
  criar um script de "desfazer bootstrap" automatizado (superfície de risco desnecessária).
- Nunca propor `DROP TABLE`/`DROP COLUMN` sem (a) plano de impacto explícito nos dados existentes e
  (b) backup validado imediatamente antes — nenhuma migration deste tipo está no escopo desta fase.
