# Security Checklist — Produção (Operação Aprovação)

> Produzido pelo subagente `security`. Revisão de produção para tirar a app do modo mock e
> habilitar usuários reais. Fonte de verdade do **checklist de bloqueadores** priorizado em 4
> níveis. Complementa (não duplica) [`docs/SECURITY.md`](../SECURITY.md) — a POSTURA atual e o
> detalhamento do bloqueador #1 e da consolidação de idempotência/transações estão lá; aqui é o
> checklist acionável de release. Referências de código verificadas em julho/2026.
>
> **Níveis:** 🔴 **Bloqueador** (não ligar `DATA_SOURCE=prisma` / usuários reais sem isto) ·
> 🟠 **Obrigatório antes do beta** (staging/QA com contas reais restritas) ·
> 🟡 **Obrigatório antes da produção** (público) · 🟢 **Melhoria posterior**.

---

## 0. Resumo — bloqueadores por nível

| Nível | Qtd | Itens |
|---|---|---|
| 🔴 Bloqueador | **4** | B1 senha via mock · B2 repos Prisma stub + singleton DB · B3 migration não aplicada / segredos de prod · B4 idempotência/concorrência real (gamificação, simulado) |
| 🟠 Antes do beta | **9** | auditoria persistente · rate-limit distribuído · recuperação/registro de senha (e-mail) · projeção `isCorrect` · flags de privacidade nas queries · staging protegido/noindex · CSRF Server Actions · uploads (se habilitados) · verificação de conta |
| 🟡 Antes da produção | **10** | LGPD (política/consentimento/exclusão/retenção/DPO) · WAF/rate-limit de borda · HSTS preload real · logs sem PII/segredos · backup + restore testado · CI com gate de segurança · varredura de dependências · headers e cookies em HTTPS real · anti-fraude de tempo/pontos validado contra banco · webhooks de pagamento (quando houver) |
| 🟢 Melhoria posterior | **8** | CSP com nonce · MFA/OAuth · rotação automatizada de segredos · SIapenas-app no subdomínio · anomalia de ranking · pentest externo · bug bounty · DLP/retention automatizada |

---

## 1. Autenticação

| # | Item | Nível | Estado / Ação |
|---|---|---|---|
| A1 | **Senha lida direto do mock (`senha123`), incondicional** — backdoor em prod + login real quebrado. Mover para `UserRepository.findCredentialsByEmail`, import de `@/mocks` condicional a `DATA_SOURCE`, timing-defense em ambas impl, teste de regressão. | 🔴 | **Bloqueador #1** — `src/server/auth/credentials-service.ts:2,20,26`. Detalhe em `docs/SECURITY.md` §2. |
| A2 | `AUTH_SECRET`/`CRON_SECRET` fortes e exclusivos por ambiente; boot em `production` já falha com default de dev (`env.ts` superRefine). Gerar via `openssl rand -base64 32`. | 🔴 | Mecânica pronta (`src/config/env.ts:33-48`); falta **provisionar os valores** no painel Vercel por ambiente. |
| A3 | Sessão JWT (`authjs.session-token`, httpOnly, assinado). `role` nunca vem do cliente (`loginSchema` descarta extras; role vem do repo). | ✅ | Verificado — `verifyCredentials` obtém role do repositório. Manter. |
| A4 | Conta desativada (`isActive=false`) nunca autentica, com resposta idêntica a credencial inválida (não revela existência). | ✅ | `credentials-service.ts:43`. Manter. |
| A5 | **Fluxo de recuperação de senha** (esqueci minha senha) — não existe; exige provider de e-mail + token de reset de uso único, expirável, armazenado com hash. | 🟠 | Não existe página/action; só `/login`. Depende de e-mail transacional. |
| A6 | **Registro/verificação de e-mail** (`emailVerified` já no schema) — fluxo de cadastro público + verificação por token. Definir se cadastro é público ou só por convite/admin. | 🟠 | Campo existe (`User.emailVerified`); fluxo não. |
| A7 | Política de senha forte no cadastro/reset (comprimento mínimo, bloquear senhas vazadas — ex. verificação k-anonymity HIBP opcional). | 🟡 | A definir junto com A5/A6. |
| A8 | **MFA/2FA** e OAuth social/magic link. Auth.js v5 suporta adicionar depois sem trocar fundação. | 🟢 | Pós-lançamento. |

## 2. Autorização e IDOR

| # | Item | Nível | Estado / Ação |
|---|---|---|---|
| Z1 | Autorização server-side centralizada (`requireUser`/`requireRole`/`assertOwnership`) — nunca confiar em middleware/UI. | ✅ | `src/server/authorization/index.ts`. Middleware é só UX. Manter. |
| Z2 | **Anti-IDOR:** todo recurso pertencente a usuário passa por `assertOwnership(ownerId, session.userId)` — auditar cada action/route que recebe `id` do cliente (progresso, foco, flashcards, brainstorm, simulados, perfil, notificações). | 🟠 | Padrão existe; exigir **cobertura verificada** ao implementar cada `PrismaRepository` (queries filtram por `userId`, não só por `id`). |
| Z3 | Matriz de papéis única (`admin/roles.ts`) via `withAdminAudit({roles})` chamando `requireRole` **antes** do handler. | ✅ | Manter; nunca checar papel só no menu/componente. |
| Z4 | `Role ↔ SystemRole` (pt-BR ↔ enum Prisma) mapeado só no `PrismaUserRepository` — não vazar enum do banco para a app. | 🟠 | Ao implementar repo Prisma. |
| Z5 | Rotas admin isoladas: `middleware` afasta aluno da casca; `admin/layout.tsx` faz `requireRole` real. | ✅ | Manter. |

## 3. CSRF, XSS, injeção

| # | Item | Nível | Estado / Ação |
|---|---|---|---|
| C1 | **CSRF em Server Actions** — Next.js valida Origin/Host para Server Actions por padrão; confirmar que `allowedOrigins`/`serverActions` não foram afrouxados e que o domínio de produção está correto. Cookies `SameSite=Lax` (default Auth.js). | 🟠 | Verificar `next.config.ts` (hoje sem override — bom) e cookie config ao publicar domínio. |
| C2 | **XSS** — React escapa por padrão; auditar qualquer `dangerouslySetInnerHTML` e conteúdo rico (bio, notas, brainstorm) → sanitizar server-side. | 🟠 | Grep por `dangerouslySetInnerHTML` antes do beta; sanitizar campos livres. |
| C3 | **CSP** aplicada a todas as rotas (`next.config.ts`); `'unsafe-inline'` em `script-src` ainda presente. | ✅→🟢 | Postura atual OK; endurecer com nonce depois (X1). |
| C4 | **Injeção SQL** — Prisma parametriza; proibir `$queryRawUnsafe`/interpolação de string. Toda entrada validada por Zod nos contratos. | 🟡 | Regra de lint/review ao implementar repos Prisma. |
| C5 | Validação de entrada por Zod em toda action/route (`src/contracts/*`, `ActionResult<T>`). Corpo de cron já validado por Zod. | ✅ | Manter; sem cast `as` de JSON bruto. |

## 4. RLS, uploads, URLs assinadas

| # | Item | Nível | Estado / Ação |
|---|---|---|---|
| R1 | **RLS do Supabase** — a app acessa o Postgres via Prisma com credencial de serviço (não via GoTrue/anon key). Autorização é **na aplicação**, não RLS. Se buckets de Storage forem acessados por chave anon do cliente, **habilitar RLS/policies nos buckets**; caso contrário manter todo acesso server-side. | 🟠 | Decisão de arquitetura ao introduzir Storage. Preferir acesso server-side + URL assinada. |
| R2 | **Uploads** (`/api/uploads` previsto, inexistente) — se habilitados: validar MIME real (magic bytes, não extensão), limite de tamanho, renomear arquivo (não usar nome do cliente), bucket privado, varredura antivírus opcional, nunca servir de origem executável. | 🟠 (se habilitado no beta) | Não existe ainda; bloquear feature até checklist cumprido. |
| R3 | **URLs assinadas** para vídeo (provider) e materiais/avatares (Storage) — expiração curta, sem URL pública permanente para conteúdo pago; token por usuário quando possível. | 🟡 | Depende de provider de vídeo/Storage (decisão `backend`). |
| R4 | `img-src` da CSP hoje permite `https:` amplo — restringir ao domínio do provider de imagem/CDN quando definido. | 🟢 | Endurecer CSP após escolher CDN. |

## 5. Anti-fraude (pontos/XP/ranking/tempo/aulas/simulados/respostas)

| # | Item | Nível | Estado / Ação |
|---|---|---|---|
| F1 | **Idempotência de gamificação** — `GamificationEvent.idempotencyKey @unique` + `PointTransaction.idempotencyKey @unique`; ledger imutável (correção via `REVERSAL`). Depende dos `@unique` **do schema**, não de "checar antes de inserir". | 🔴 | Ao implementar repos Prisma + transações reais. `docs/SECURITY.md` §3. |
| F2 | **Tempo de estudo válido** reconstruído server-side de heartbeats (`StudySession`/`StudyActivity`) — nunca `fim−início` do cliente; detecta saltos/aba oculta/duplicados/sessões simultâneas. | 🔴 (persistência) | Lógica existe no mock; exige persistência real dos sinais (`/api/progress/heartbeat`, `/api/focus/heartbeat`). |
| F3 | **Conclusão de aula** — `LessonProgress @@unique([userId, lessonId])` + limiar ≥ 80% configurável server-side. | 🔴 | Constraint no schema; garantir na impl Prisma. |
| F4 | **Simulado — finalização** via concorrência otimista (`MockExamAttempt.version`): `UPDATE ... WHERE status='IN_PROGRESS' AND version=?`; 0 linhas = rejeitar. Hoje só documentado. | 🔴 | Escrever/testar a query condicional contra banco (`docs/SECURITY.md` §3 item 4). |
| F5 | **Respostas corretas nunca vazam** — `QuestionOption.isCorrect` jamais projetado ao cliente antes da correção server-side; `QuestionAttempt @@unique([mockExamAttemptId, questionId])`. | 🟠 | Regra de projeção — auditar DTOs ao implementar repos de simulados. |
| F6 | **Flashcards SM-2** — `nextReviewAt`/`easeFactor` sempre calculados server-side; `FlashcardReview` append-only. | 🟠 | Nunca aceitar do cliente. |
| F7 | **Ranking** — `RankingScore @@unique([...calculationVersion])`; recálculo idempotente via cron protegido. | 🟠 | Manter idempotência ao migrar. |
| F8 | Detecção de **anomalia** de pontuação/tempo (picos improváveis, múltiplas contas) — alerta, não bloqueio automático. | 🟢 | Pós-lançamento (ver `MONITORING_PLAN.md`). |

## 6. Rate limiting, cookies, headers, segredos

| # | Item | Nível | Estado / Ação |
|---|---|---|---|
| L1 | **Rate limit de login** — hoje em `globalThis` (por processo). Migrar para store distribuído (Upstash/KV) preservando a interface pública de `rate-limit.ts`. | 🟠 | `src/server/auth/rate-limit.ts`. Serverless multi-instância não compartilha memória. |
| L2 | **Rate limit de borda** (WAF/Cloudflare) em `/login`, `/api/*`, reset de senha — complementa L1. | 🟡 | Ver `CLOUDFLARE_PLAN.md`. |
| L3 | Cookies de sessão: `httpOnly`, `Secure` (HTTPS), `SameSite=Lax`, prefixo `__Secure-`/`__Host-` quando aplicável em prod. | 🟡 | Confirmar em HTTPS real; Auth.js define `Secure` automaticamente em prod. |
| L4 | Security headers (CSP, HSTS, X-CTO, X-Frame, Referrer, Permissions-Policy) aplicados a todas as rotas. | ✅ | `next.config.ts`. Manter. |
| L5 | **HSTS `preload`** — só submeter à lista de preload **após** confirmar HTTPS em raiz + todos os subdomínios (a diretiva já está no header; submissão à lista é passo separado e difícil de reverter). | 🟡 | Não submeter preload antes de validar todos os subdomínios. |
| L6 | Segredos fora do git (`.gitignore`), só `.env.example` versionado; comparação de `CRON_SECRET` em tempo constante. | ✅ | Manter. Rotação de segredos → 🟢. |
| L7 | Cron `/api/cron/*` protegido por `CRON_SECRET` (Bearer/x-cron-secret), timing-safe. | ✅ | Manter; Vercel Cron injeta o header. |

## 7. Logs, dados pessoais, LGPD, auditoria

| # | Item | Nível | Estado / Ação |
|---|---|---|---|
| P1 | **Auditoria persistente** — hoje só memória + `console.info`; ligar `auditLog()`/`getAuditRecords()` ao `AuditLog` via `PrismaAuditLogRepository`. Log imutável (sem update/delete). | 🟠 | Schema pronto (`AuditLog`, índices). `docs/SECURITY.md` §4. |
| P2 | **Logs sem PII/segredos** — nunca logar senha, hash, token, `AUTH_SECRET`, corpo de request com dado pessoal. Mascarar e-mail em logs de erro. | 🟡 | Regra de review + config do agregador (ver `MONITORING_PLAN.md`). |
| P3 | **LGPD — política de privacidade** publicada (coleta, finalidade, base legal, compartilhamento, retenção). | 🟡 | Documento legal + página pública. |
| P4 | **LGPD — consentimento** explícito no cadastro (aceite de termos + política); registrar timestamp/versão do aceite. | 🟡 | Adicionar ao fluxo de registro (A6). |
| P5 | **LGPD — minimização** — coletar só o necessário. Campos pessoais atuais: `name`, `email`, `phone`, `birthDate`, `city`, `state`, `bio`, `avatarUrl`. Justificar cada um; tornar opcionais os não essenciais. | 🟡 | `Profile` no schema. |
| P6 | **LGPD — direito de exclusão / portabilidade** — fluxo de exclusão de conta (soft-delete `deletedAt` já existe) + rotina de anonimização/hard-delete respeitando retenção legal; exportação de dados do titular. | 🟡 | `User.deletedAt`/`Profile.deletedAt` existem; falta fluxo + anonimização. |
| P7 | **LGPD — retenção** — política de retenção por tipo de dado (auditoria, logs, dados de conta inativa) + expurgo automatizado. | 🟡 (política) / 🟢 (automação) | Definir em `ENVIRONMENTS.md` (linha "retenção — verificar"). |
| P8 | **LGPD — DPO/contato** — encarregado (DPO) nomeado e canal de contato publicado; fluxo de atendimento a titular e a ANPD. | 🟡 | Definição organizacional + página de contato. |
| P9 | **Flags de privacidade respeitadas nas queries** — `isProfilePublic`, `showInRanking`, `showRealName`, `showCityState` devem filtrar a projeção em ranking/perfil público. Risco de exposição se ignoradas na impl Prisma. | 🟠 | `Profile` flags existem; garantir na projeção do `PrismaProfileRepository`/ranking. |
| P10 | `AuditLog` captura `ipAddress`/`userAgent` — tratar como dado pessoal (retenção + acesso restrito a admin). | 🟡 | Já modelado; aplicar retenção. |

## 8. Dependências, CI, webhooks, backup

| # | Item | Nível | Estado / Ação |
|---|---|---|---|
| D1 | **Backup + restore testado** do Postgres de produção antes de qualquer `migrate deploy`; restore ensaiado (não só backup existir). | 🟡 | `ENVIRONMENTS.md` §4 item 5. |
| D2 | **CI/CD** com gate: `lint`/`typecheck`/`test`/`build` + `migrate deploy` + varredura de dependências. Nenhum workflow hoje. | 🟡 | Sem `.github/workflows`. |
| D3 | **Varredura de dependências** — `npm audit` / Dependabot / Renovate no CI; atenção a `next-auth@5.0.0-beta` (beta em produção — fixar versão e acompanhar avisos). | 🟡 | Fixar versões; revisar beta antes do público. |
| D4 | **Webhooks** (pagamento futuro — `/api/webhooks/subscriptions` previsto, inexistente) — validar assinatura HMAC do provider, idempotência por `externalId`, timing-safe, sem confiar em dados do corpo sem verificar. | 🟡 (quando pagamento entrar) / 🟢 (hoje) | `Subscription` modelado; sem service/webhook. |
| D5 | `next build`/`typecheck`/`lint`/`test` (741 testes) verdes localmente. | ✅ | Manter no CI. |

## 9. Melhorias posteriores (🟢)

- X1 **CSP com nonce por requisição** (gerar em middleware, remover `'unsafe-inline'` de `script-src`) — TODO já em `next.config.ts`.
- X2 MFA/2FA e OAuth social/magic link (Auth.js).
- X3 Rotação automatizada de segredos.
- X4 App em subdomínio `app.` dedicado (ver `DOMAIN_AND_DNS.md` — recomendação é raiz por ora).
- X5 Detecção automatizada de anomalia de ranking/pontos.
- X6 Pentest externo + programa de bug bounty.
- X7 Expurgo/anonimização automatizada (LGPD retention).
- X8 Restringir `img-src` da CSP ao CDN definido.

---

## 10. Ordem de execução recomendada

1. 🔴 **B1–B4** (senha via repo, repos Prisma + `src/server/db`, migration aplicada + segredos de prod, idempotência/concorrência real) — **pré-requisito de qualquer ambiente `DATA_SOURCE=prisma`**.
2. 🟠 Antes do beta restrito (staging): auditoria persistente, rate-limit distribuído, recuperação/registro de senha, projeção `isCorrect`, flags de privacidade, staging protegido+noindex, CSRF/XSS auditados.
3. 🟡 Antes do público: pacote LGPD, WAF/rate-limit de borda, logs sem PII, backup+restore testado, CI com gate, varredura de dependências, cookies/headers em HTTPS real.
4. 🟢 Contínuo pós-lançamento.
