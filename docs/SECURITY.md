# Segurança — Operação Aprovação

> Documento produzido pelo subagente `security` (revisão de hardening barato + consolidação de
> pendências). Fonte única para a POSTURA de segurança atual e o checklist de handoff antes de
> produção/fase de banco. Atualizar conforme as fases evoluírem — não duplicar conteúdo já
> detalhado em `docs/ARCHITECTURE.md`/`docs/DATA-MODEL.md`; linkar em vez de copiar quando possível.

## 1. Modelo de autenticação e RBAC

- **Auth.js (NextAuth v5), Credentials Provider, sessão JWT** (`src/server/auth`, ADR-0005).
  Não há tabela de sessão — o cookie `authjs.session-token` (httpOnly, assinado com
  `AUTH_SECRET`) carrega `userId`/`role` no token.
- `middleware.ts` (`src/middleware.ts`, Edge Runtime, instância própria via
  `authEdgeConfig`) é **só UX**: redireciona não-autenticado para `/login` e afasta um
  `aluno` da casca de `/admin`. **Nunca é a autorização real.**
- Autorização real é sempre **server-side**, centralizada em
  `src/server/authorization/index.ts`:
  - `requireUser()` — exige sessão válida (`AuthError`/401 caso contrário);
  - `requireRole(...roles)` — exige sessão com um dos papéis informados
    (`ForbiddenError`/403);
  - `assertOwnership(ownerId, userId)` — anti-IDOR, garante que o recurso pertence ao
    usuário autenticado.
- `Role = "aluno" | "professor" | "moderador" | "admin"` (`src/types`).
- **Matriz de papéis do módulo admin** (`src/server/services/admin/roles.ts` — fonte única,
  não duplicar em cada service):

  | Grupo | Papéis | Cobre |
  |---|---|---|
  | `CONTENT_MANAGE_ROLES` | `admin`, `moderador` | Dashboard admin; listar usuários; ativar/desativar conta; criar/editar/reordenar/vincular vídeo em conteúdo (curso/módulo/aula/concurso/matéria/assunto/professor/questão/simulado/conquista); publicar avisos; moderar visibilidade. |
  | `CONTENT_DELETE_ROLES` | `admin` | Soft-delete (exclusão) de qualquer entidade de conteúdo — sempre com `confirm: true` explícito no input. |
  | `SENSITIVE_ADMIN_ONLY_ROLES` | `admin` | Alterar papel de usuário; ler/editar configuração de pontuação/níveis/ranking; visualizar `AuditLog`. |

  Todo service administrativo passa por `withAdminAudit({ operation, entity, roles }, handler)`
  (`src/server/audit/with-admin-audit.ts`), que chama `requireRole(...roles)` **antes** do
  handler e grava `auditLog` de sucesso/falha — nunca checar papel só no componente/menu.
- **Anti-fraude por idempotência/tempo-válido server-side** (ADR-0007/0008): domínios de
  origem (aula concluída, simulado finalizado, revisão de flashcard, sessão de foco) emitem
  fatos que o service de gamificação processa de forma **idempotente** (ver §3) — nunca
  aceitar pontos/XP/tempo calculados no cliente. Tempo de estudo válido é reconstruído a
  partir de heartbeats server-side (`StudySession`/`StudyActivity`), detectando saltos, aba
  oculta, duplicados e sessões simultâneas — nunca a diferença bruta `fim - início` enviada
  pelo cliente.

## 2. Tarefa #1 de produção (BLOQUEADOR — resolver antes de ligar Prisma/usuários reais)

**Hoje a verificação de senha lê direto do mock, incondicionalmente:**

- `src/server/auth/credentials-service.ts` (`verifyCredentials`) importa `mockCredentials` e
  `DEV_PASSWORD_HASH` de `@/mocks` (→ `src/mocks/data/credentials.ts`) **sem passar pelo
  `UserRepository`/`DATA_SOURCE`**. O hash é fixo para todos os usuários mock — senha de dev
  conhecida **`senha123`** (documentada no próprio arquivo do mock).
- Isso funciona hoje porque `getRepositories()` (`src/server/repositories/index.ts`) já
  respeita `DATA_SOURCE` (`mock` | `prisma`) para os DADOS do usuário (`findByEmail` etc.),
  mas a SENHA nunca passa por essa troca — o import de `@/mocks/data/credentials` é
  incondicional, direto no módulo.
- **Risco concreto:** ligar `DATA_SOURCE=prisma` com usuários reais no banco SEM antes
  corrigir isto resulta em duas falhas simultâneas:
  1. usuários reais (com hash de senha real no Prisma) **nunca conseguem logar** — o mock
     hash não bate com o hash real;
  2. qualquer e-mail que exista tanto no mock quanto na tabela real de usuários (ex.: um
     e-mail de admin reaproveitado) autentica com a senha de dev `senha123` — **backdoor de
     admin** em produção.
- **Correção necessária (antes da fase de banco ligar Prisma):**
  1. Mover a leitura do hash de senha para o `UserRepository` (novo método, ex.:
     `findCredentialsByEmail(email): Promise<{ userId, passwordHash } | null>`, implementado
     em `MockUserRepository` e `PrismaUserRepository` — cada um lendo da sua própria fonte);
  2. Tornar o import de `@/mocks/data/credentials` **condicional a `DATA_SOURCE`** (só a
     implementação mock do repositório deve importar o mock; `credentials-service.ts` nunca
     importa `@/mocks` diretamente);
  3. Manter a defesa de timing (comparação bcrypt contra hash "dummy" para e-mail
     inexistente) **em ambas as implementações**, não só na mock.
  4. Adicionar teste de regressão: com `DATA_SOURCE=prisma` (ou repositório fake equivalente),
     login com a senha de dev mock (`senha123`) deve **falhar** para qualquer usuário.

## 3. Transações/constraints `@unique` da fase de banco — idempotência multi-instância

Resumo consolidado de `docs/DATA-MODEL.md` §5 (ver lá o detalhamento completo) — os únicos
mecanismos de deduplicação que sobrevivem a múltiplas instâncias/retries concorrentes são os
do PRÓPRIO SCHEMA; lógica de aplicação (ex.: "checar antes de inserir") não é suficiente sem
eles:

| Fluxo | Constraint/mecanismo | Observação |
|---|---|---|
| Gamificação/engine (evento → pontos) | `GamificationEvent.idempotencyKey @unique` (`<tipo>:<userId>:<entidadeOrigem>`) + `PointTransaction.idempotencyKey @unique` (espelha a do evento) | Dupla barreira: o evento de origem não duplica, e mesmo que duplicasse, a transação de pontos também não. Ledger imutável — correção via `REVERSAL` (`reversedTransactionId`), nunca update/delete. |
| Aula concluída | `LessonProgress @@unique([userId, lessonId])` | Combinado com o `idempotencyKey` do evento acima. |
| Conquista desbloqueada | `UserAchievement @@id([userId, achievementId])` | Impossível duplicar a mesma conquista para o mesmo usuário. |
| Ranking (recálculo) | `RankingScore @@unique([userId, periodType, periodKey, scopeType, scopeKey, calculationVersion])` | Recalcular a mesma versão sobrescreve, nunca duplica (ver `/api/cron/ranking-recalc`). |
| Flashcards — revisão | Sem `@unique` — `FlashcardReview` é log append-only (cada revisão é um evento novo e legítimo); a proteção de fraude é o cálculo do próximo `nextReviewAt`/`easeFactor` sempre server-side (SM-2), nunca aceitar esses valores do cliente. |
| Foco (Pomodoro/sessão de estudo) | `StudySession`/`StudyActivity` sem `@unique` direto — idempotência vem da reconstrução server-side do `validSeconds` a partir dos heartbeats (não há "finalizar" duplicável como fato discreto). **Pendência:** avaliar com `study-tracking` se falta uma trava de concorrência (ex.: `status` + `version` como em `MockExamAttempt`) quando "finalizar sessão de foco" virar uma transição de estado explícita. |
| Simulados — finalizar tentativa | **Concorrência otimista** via `MockExamAttempt.version` (`Int`) — finalizar deve ser `UPDATE ... SET status='FINISHED', version=version+1 WHERE id=? AND status='IN_PROGRESS' AND version=?`; 0 linhas afetadas = já finalizada/alterada, rejeitar. **Não é um `@unique` do schema** — é responsabilidade do `backend`/`simulations` implementar a query condicional (documentado como pendência explícita em `docs/DATA-MODEL.md` §5). | Resposta por questão: `QuestionAttempt @@unique([mockExamAttemptId, questionId])` — não permite responder a mesma questão duas vezes dentro da mesma tentativa. |
| Matrícula | `Enrollment @@unique([userId, courseId])` | Reinscrição reaproveita o mesmo registro (troca de `status`), preserva histórico de progresso. |
| Brainstorm — mover cartão | Sem `@unique` dedicado — `order` por coluna (`BrainstormColumn @@unique([boardId, order])`) protege a ordenação das COLUNAS, não do cartão movido entre colunas. **Pendência:** mover cartão (mudar `columnId`/`order`) deve ser transação única (ler posição atual + atualizar) no `backend`, sem `@unique` no schema para o cartão em si — revisar se há janela de corrida em drag-and-drop concorrente (dois dispositivos movendo o mesmo cartão). |

## 4. Rate limiting e auditoria — pendência de escala

- **Rate limit de login** (`src/server/auth/rate-limit.ts`): 5 falhas / 5 min → bloqueio de
  60s (`LOGIN_RATE_LIMIT`, `src/config/business.ts`). Chave = e-mail normalizado (+ IP quando
  disponível). Guarda cedo (antes do bcrypt) para não gastar CPU em chave já bloqueada.
  **Store em `globalThis` (memória por processo)** — adequado a single-instance, mas
  **DEVE virar um store distribuído (Redis/Upstash/KV) antes de rodar múltiplas
  instâncias/serverless** — a mesma interface pública (`checkLoginRateLimit`,
  `registerLoginFailure`, `resetLoginAttempts`) deve ser preservada, só a implementação
  interna muda.
- **Auditoria** (`src/server/audit/log.ts`): hoje só memória + `console.info` (array
  `auditRecords`, não persiste entre restarts/instâncias). O schema já tem
  `AuditLog` modelado no Prisma (`prisma/schema.prisma`, índices
  `AuditLog(entityType, entityId, createdAt)` e `AuditLog(actorUserId, createdAt)`) —
  **falta ligar `auditLog()` a `PrismaAuditLogRepository`** quando `DATA_SOURCE=prisma`.
  Sem isso, auditoria de produção não sobrevive a restart nem é consultável entre instâncias
  (a página `/admin/auditoria` também lê hoje do array em memória via
  `getAuditRecords()`).

## 5. Security headers (adicionados nesta revisão — `next.config.ts`)

`async headers()` aplica a **todas as rotas** (`source: "/:path*"`):

| Header | Valor | Por quê |
|---|---|---|
| `Content-Security-Policy` | ver abaixo | Mitiga XSS/injeção de recurso externo. |
| `X-Content-Type-Options` | `nosniff` | Bloqueia MIME-sniffing. |
| `X-Frame-Options` | `DENY` | Bloqueia embed em `<iframe>` (redundante com `frame-ancestors`, mantido para navegadores/proxies legados). |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Nunca vaza path/query como referrer cross-origin. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` | Desativa APIs sensíveis não usadas pelo app. |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Força HTTPS (inofensivo em HTTP puro/dev). |

**CSP aplicada:**
`default-src 'self'; script-src 'self' 'unsafe-inline' [+ 'unsafe-eval' só em dev];
style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self';
connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
object-src 'none'`.

- `'unsafe-inline'` em `script-src` é necessário porque o App Router injeta o payload de
  hidratação via `<script>` inline (`self.__next_f.push(...)`) sem nonce nesta fase.
- `'unsafe-eval'` é adicionado **só quando `NODE_ENV=development`** (Fast Refresh/Turbopack
  usa `eval()` para reconstruir stack traces de debug) — confirmado com `next dev` que, sem
  essa condicional, o console loga `eval() is not supported...` (não quebra a página, mas
  polui o console); com a condicional, dev fica limpo e o build de produção
  (`next build`/`next start`) nunca inclui `'unsafe-eval'` (validado via `curl` comparando os
  dois modos).
- **Pendência (TODO no próprio `next.config.ts`):** migrar para CSP com **nonce por
  requisição** (gerar nonce em `middleware.ts`/futuro `proxy.ts` e propagar via header) para
  remover `'unsafe-inline'` de `script-src` — mais forte que o esquema atual, mas exige tocar
  o middleware de auth existente; não incluído nesta revisão por ser hardening "caro"
  (fora do escopo de baixo risco desta fase).
- Validado com `npm run build`, `npm run typecheck`, `npm run lint`, `npm run test` (741
  testes) e `next dev`/`next start` reais (ver seção "Testes executados" no retorno do
  agente) — headers presentes em respostas 200/307/404, app renderiza e hidrata
  normalmente (tema, navegação, formulários), sem violação de CSP no console.

## 6. Segredos

- `AUTH_SECRET`/`CRON_SECRET` (`src/config/env.ts`, ADR-0005/0009): fallback de dev
  inseguro e conhecido (`DEV_AUTH_SECRET`/`DEV_CRON_SECRET`) só para não travar
  desenvolvimento local — bloqueado em produção via `superRefine` no schema Zod (falha o
  boot com `NODE_ENV=production` se qualquer um dos dois ainda for o valor default).
- Comparação do `CRON_SECRET` recebido é em **tempo constante**
  (`timingSafeEqual`, `src/app/api/cron/ranking-recalc/route.ts`) — guarda de comprimento
  antes de comparar para não vazar nem o tamanho por exceção descontrolada.
- `.env`/`.env.local` fora do git (`.gitignore`) — só `.env.example` versionado, sem valores
  reais.

## 7. Hardening desta revisão — resumo do que foi alterado

- `next.config.ts`: headers de segurança (§5) — antes vazio, hoje protege toda rota.
- `src/app/api/cron/ranking-recalc/route.ts`: corpo do disparo direcionado
  (`{ periodType, scopeType, scopeKey }`) agora validado por Zod
  (`targetedRecalcBodySchema`, reaproveitando os enums de `@/contracts/ranking`) em vez do
  cast `as TargetedRecalcBody` — corpo inválido retorna `400 VALIDATION_ERROR` com
  `fieldErrors`; corpo ausente/vazio continua disparando o recálculo total sem quebrar
  (comportamento do scheduler externo preservado).

## 8. Checklist de handoff (priorizado)

1. **[Bloqueador]** Mover verificação de senha para `UserRepository` + import condicional a
   `DATA_SOURCE` (§2) — antes de qualquer `DATA_SOURCE=prisma` com usuários reais.
2. **[Alto]** Ligar `auditLog()`/`getAuditRecords()` a `AuditLog` via Prisma (§4) — auditoria
   em memória não serve para produção multi-instância.
3. **[Alto]** Migrar rate limit de login de `globalThis` para store distribuído (§4).
4. **[Médio]** Implementar a concorrência otimista real (`version`) na finalização de
   `MockExamAttempt` no service de `simulations`/`backend` (§3) — hoje é só o mecanismo
   documentado, a query condicional ainda precisa ser escrita/testada contra banco real.
5. **[Médio]** Revisar janela de corrida em "mover cartão" do Brainstorm sob concorrência
   real (dois clientes movendo o mesmo cartão) — sem `@unique` de schema para isso (§3).
6. **[Médio]** Avaliar trava de concorrência para "finalizar sessão de foco" se essa
   transição virar um fato discreto (hoje mitigado só pela reconstrução de `validSeconds`) (§3).
7. **[Baixo]** CSP com nonce por requisição para remover `'unsafe-inline'` de `script-src`
   (§5, TODO já deixado em `next.config.ts`).
8. **[Baixo]** Confirmar `QuestionOption.isCorrect` nunca é projetado para o cliente antes da
   correção do simulado (regra de aplicação, não de schema — pendência já registrada em
   `docs/DATA-MODEL.md` §8).
