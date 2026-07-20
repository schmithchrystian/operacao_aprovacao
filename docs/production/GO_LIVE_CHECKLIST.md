# Go-Live Checklist — Operação Aprovação

> Produzido pelo subagente `tester`. Consolida, em formato acionável, os critérios de prontidão
> já especificados por `architect` ([`CURRENT_STATE.md`](./CURRENT_STATE.md),
> [`TARGET_ARCHITECTURE.md`](./TARGET_ARCHITECTURE.md), [`ENVIRONMENTS.md`](./ENVIRONMENTS.md),
> [`ROADMAP_SKELETON.md`](./ROADMAP_SKELETON.md)), `database`
> ([`SUPABASE_DECISION.md`](./SUPABASE_DECISION.md), [`MOCK_MIGRATION_PLAN.md`](./MOCK_MIGRATION_PLAN.md),
> [`BACKUP_AND_RECOVERY.md`](./BACKUP_AND_RECOVERY.md)), `backend`
> ([`AUTHENTICATION_PLAN.md`](./AUTHENTICATION_PLAN.md), [`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md),
> [`CI_CD.md`](./CI_CD.md), [`VIDEO_HOSTING_DECISION.md`](./VIDEO_HOSTING_DECISION.md),
> [`STORAGE_PLAN.md`](./STORAGE_PLAN.md), [`EMAIL_PLAN.md`](./EMAIL_PLAN.md)) e `security`
> ([`SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md), [`CLOUDFLARE_PLAN.md`](./CLOUDFLARE_PLAN.md),
> [`DOMAIN_AND_DNS.md`](./DOMAIN_AND_DNS.md), [`MONITORING_PLAN.md`](./MONITORING_PLAN.md)). Também
> reflete `CLAUDE.md` §25 (12 cenários de teste obrigatórios) e o estado real do código verificado
> nesta fase (741 testes Vitest — 105 arquivos, `tests/unit/**` — 100% mocks-first; nenhum teste
> hoje exercita `PrismaXxxRepository`; sem harness de e2e; sem `.env.test`; sem CI).
>
> **Documento de planejamento — nenhum teste foi criado, nenhuma migration rodou, nenhum código foi
> alterado nesta fase.** É o checklist a executar, não uma auditoria de algo já feito.
>
> **Níveis:** 🔴 **Bloqueador** (não ligar `DATA_SOURCE=prisma`/produção sem isto) ·
> 🟠 **Beta fechado** (staging com contas reais restritas) · 🟡 **Produção** (público) ·
> 🟢 **Melhoria posterior**.

---

## 0. Resumo — gates por categoria

| Categoria | Gates 🔴 | Gates 🟠 | Gates 🟡 | Total |
|---|---|---|---|---|
| 1. Testes e QA | 5 | 4 | 2 | 11 |
| 2. Migração & dados | 3 | 1 | 1 | 5 |
| 3. Segurança (gate) | 2 | 1 | 1 | 4 |
| 4. Infra & operação | 1 | 4 | 6 | 11 |
| 5. Deploy | 1 | 2 | 1 | 4 |
| **Total** | **12** | **12** | **11** | **35** |

Beta fechado = todos os 🔴 + todos os 🟠 (24 gates). Produção = todos os anteriores + todos os 🟡
(35 gates).

---

## 1. Testes e QA

| # | Item | Nível | Critério de aprovação objetivo |
|---|---|---|---|
| T1 | **Suíte unitária (741 testes) verde** | 🔴 | `npm run test` sai com código 0, 0 falhas, 0 skip não justificado. Rodar contra `DATA_SOURCE=mock` (modo atual) como baseline antes de qualquer mudança de infra. |
| T2 | **Testes de integração contra Postgres REAL** (novos — hoje inexistentes) | 🔴 | Nova suíte (`tests/integration/**` ou `npm run test:integration`) que instancia cada `PrismaXxxRepository` contra um Postgres real (container `postgres:16` no CI, ou branch Supabase de teste) — não os stubs, não os mocks. Critério: para cada um dos 37 repositórios listados em `MOCK_MIGRATION_PLAN.md` §5, pelo menos 1 teste de CRUD básico + 1 teste da constraint/comportamento crítico do domínio (ex.: `@unique`, cascade, mapeamento de enum). 100% dos 37 repositórios com pelo menos 1 teste — hoje: **0/37**. |
| T3 | **Re-executar os 12 cenários §25 com `DATA_SOURCE=prisma`** contra banco de teste | 🔴 | Ver lista completa na tabela T3.1 abaixo. Cada cenário deve ter uma versão que roda com `getRepositories()` resolvendo para as implementações Prisma (banco de teste populado via seed), não só a versão mock existente. Hoje: **0/12 rodam contra Prisma** — só existem (parcialmente) contra mock. |
| T4 | **E2E smoke dos fluxos críticos** | 🔴 | Ver lista completa em §1.1. Harness de e2e (Playwright recomendado — nenhum instalado hoje, `package.json` não tem `@playwright/test` nem `test:e2e` real apesar de `CLAUDE.md` §26 já prever o comando) contra um ambiente com `DATA_SOURCE=prisma` real (staging ou banco de teste local). |
| T5 | **Teste de idempotência/transação sob concorrência contra banco real** | 🔴 | 3 cenários mínimos, cada um disparando 2+ requisições simultâneas contra o **mesmo** recurso e verificando que só uma tem efeito: (a) `LessonProgress` + evento de gamificação + pontos (mesma aula, duplo POST de heartbeat/conclusão) — só 1 `GamificationEvent`/`PointTransaction` gravado (`idempotencyKey` `@unique` barra o segundo); (b) finalização de `MockExamAttempt` (2 requisições concorrentes de finalizar a mesma tentativa) — só 1 `UPDATE` afeta linha (`version` otimista), a segunda recebe rejeição explícita; (c) finalização de sessão de foco/Pomodoro concorrente — mesmo princípio. Critério: rodar cada cenário ≥ 20x (variância de timing) sem duplicar efeito nenhuma vez. |
| T6 | **Sanidade de carga (não perf completo)** | 🟠 | (a) Pool de conexões: N requisições simultâneas (ex.: 50) contra rotas que usam Prisma não esgotam o pool Supavisor nem geram erro de conexão — validar com `DATABASE_URL` pooled (`:6543`, `pgbouncer=true`) real, não só local. (b) Cron idempotente: disparar `/api/cron/ranking-recalc` 2x em sequência rápida (simulando retry/double-trigger do agendador) e confirmar que o resultado final é o mesmo que 1 execução (sem duplicar `RankingScore` — já coberto pela constraint `@unique([...calculationVersion])`, mas validar na prática). |
| T7 | Teste de regressão do **bloqueador #1** (senha mock não autentica fora de `DATA_SOURCE=mock`) | 🔴 | Já especificado em `AUTHENTICATION_PLAN.md` §1.3 — `tests/unit/credentials-service-prisma-regression.test.ts`. Critério: deve **falhar** no código atual (comprova o bug) e **passar** após a correção do bloqueador #1. Gate obrigatório no CI antes de qualquer ambiente ligar `DATA_SOURCE=prisma`. |
| T8 | `npm run lint && npm run typecheck && npm run build` verdes com `DATA_SOURCE=prisma` configurado | 🔴 | Já listado em `MOCK_MIGRATION_PLAN.md` §9 item 7 — repetir aqui como gate de release, não só de migração de banco. |
| T9 | Teste de **RLS** — decisão de não ativar (ver `SUPABASE_DECISION.md` §4) validada na prática | 🟠 | Como RLS **não** será ativado nesta fase, o teste correspondente é negativo: confirmar que nenhuma tabela sensível é acessada via client-side SDK do Supabase (`@supabase/supabase-js` só usado, se usado, para Storage server-side) — grep por import do SDK Supabase fora de `src/server/**` deve retornar vazio. Reavaliar como gate positivo (políticas RLS testadas) só se algum canal de acesso direto ao Postgres for introduzido no futuro. |
| T10 | Teste manual/scriptado de **restauração de backup** sustenta a suíte | 🟡 | Após restaurar um backup/PITR de teste (`BACKUP_AND_RECOVERY.md` §2.2), rodar `npm run test` com `DATA_SOURCE=prisma` apontando para o banco restaurado — suíte deve passar sem ajuste manual de dados. |
| T11 | Cobertura de **anti-fraude** validada contra banco real (não só mock) | 🟠 | Heartbeat de vídeo/foco: reproduzir os cenários de "salto de posição", "aba oculta", "sessões simultâneas" hoje testados contra `MockStudySessionRepository`/`globalThis` (`CURRENT_STATE.md` linha "Tempo válido de estudo") também contra a implementação Prisma — mesmo resultado esperado. |

### 1.1 — E2E smoke: fluxos críticos (T4, detalhado)

| Fluxo | Critério de aprovação |
|---|---|
| Login real | Usuário com hash real (via `UserRepository`, não mock) faz login e chega ao dashboard; credencial errada é rejeitada; conta `isActive=false` não autentica. |
| Concluir aula válida (≥ 80% server-side) | Reproduzir heartbeats simulando ≥ 80% assistido → aula marca concluída e gera evento de gamificação + pontos uma única vez. Reproduzir < 80% → aula não conclui. |
| Responder simulado (correção + sem gabarito antecipado) | Resposta é aceita, corrigida **server-side**; inspecionar a resposta HTTP/DTO antes da correção final e confirmar que `isCorrect`/gabarito nunca aparece antes do momento de correção. |
| Pomodoro validado | Sessão de foco só pontua com atividade real detectada (heartbeat de foco); sessão sem atividade não gera pontos. |
| Revisar flashcard | Revisão grava `FlashcardReview` (append-only) e recalcula `nextReviewAt`/`easeFactor` **no servidor** (nunca aceitar do cliente). |
| Ranking | Usuário com `showInRanking=false` não aparece no ranking; usuário com `showRealName=false` não expõe nome real na projeção. |
| Fluxo admin (RBAC) | Usuário `aluno` recebe 403/redirect ao tentar acessar `/admin/*` ou uma Server Action de admin; usuário `admin` consegue completar uma ação administrativa (ex.: alterar papel de outro usuário) e a ação aparece no `AuditLog`. |
| Registro/recuperação de senha | **Depende da Fase 15 (ainda não implementada)** — quando existir: registro cria conta `aluno`, dispara e-mail de verificação; recuperação de senha com token válido troca a senha e revoga `tokenVersion`; token expirado/usado é rejeitado com mensagem genérica. |

### 1.2 — T3 detalhado: os 12 cenários de `CLAUDE.md` §25 contra `DATA_SOURCE=prisma`

| # | Cenário (`CLAUDE.md` §25) | Hoje (mock) | Rodar também contra Prisma |
|---|---|---|---|
| 1 | Aula abaixo de 80% não concluir | Existe (`heartbeat-evaluator.test.ts` e afins) | Sim — mesmo teste, repositório real |
| 2 | Aula válida concluir | Existe | Sim |
| 3 | Mesma aula não gerar pontos duas vezes | Existe (parcial, via mock/`globalThis`) | Sim — **este é o teste que mais depende do `@unique` real do Postgres, não de checagem em memória** |
| 4 | Usuário comum não acessar administração | Existe (`admin-action-authorization.test.ts`) | Sim (autorização é a mesma, mas repositório de usuário/role muda) |
| 5 | Resposta correta não ser exposta | Existe (`simulations-service.test.ts`) | Sim — crítico validar a projeção do `PrismaQuestionOptionRepository` |
| 6 | Manipulação de pontos ser rejeitada | Existe (`gamification-engine.test.ts`) | Sim |
| 7 | Manipulação de tempo ser rejeitada | Existe (`heartbeat-evaluator.test.ts`) | Sim |
| 8 | Pomodoro sem atividade não pontuar | Existe (`focus-heartbeat-evaluator.test.ts`) | Sim |
| 9 | Ranking respeitar privacidade | Existe (`ranking-scope.test.ts` e afins) | Sim — crítico validar `PrismaProfileRepository`/projeção de ranking |
| 10 | Flashcard calcular próxima revisão | Existe (`spaced-repetition.test.ts`) | Sim |
| 11 | Simulado não finalizar duas vezes | Existe (documentado, não testado sob concorrência real) | Sim — **crítico**, é exatamente o teste de concorrência otimista (`version`) que só faz sentido contra banco real |
| 12 | Falha transacional não gerar pontuação parcial | **Não existe hoje** (não há `$transaction` real para testar — mock não tem transação) | Sim — **novo teste**: forçar erro no meio de uma transação (`LessonProgress` + `GamificationEvent` + `PointTransaction`) e confirmar rollback completo (nenhuma das três tabelas grava parcialmente) |

---

## 2. Migração & dados

| # | Item | Nível | Critério de aprovação objetivo |
|---|---|---|---|
| M1 | Migration `0000_init` aplicada e verificada **por ambiente** | 🔴 | `npx prisma migrate deploy` sai 0 em dev, staging e production (nesta ordem, nunca pular); `npx prisma migrate status` sem pendências em cada um. |
| M2 | Seed demo **só fora de produção** | 🔴 | `npm run db:seed` roda em local/development/staging; script recusa rodar (ou nem é invocado) se `NODE_ENV=production`/ambiente for `production` — validar que não há caminho de execução acidental do seed contra o projeto Supabase de produção. |
| M3 | **Admin de produção criado de forma segura** (bootstrap por env, sem senha versionada) | 🔴 | Script `scripts/bootstrap-admin.ts` (especificado em `MOCK_MIGRATION_PLAN.md` §7) executado manualmente uma vez contra produção: senha só via `BOOTSTRAP_ADMIN_PASSWORD` (env/prompt, nunca hardcoded), idempotente (recusa segundo admin sem `--force`), grava `AuditLog`. Nenhuma senha de admin aparece em nenhum commit/log. |
| M4 | Nenhum dado mock/credencial fixa em produção | 🟠 | Grep/checagem manual: `DEV_MOCK_PASSWORD`/`senha123`/`mockCredentials` não alcançáveis em runtime de produção (import condicional a `DATA_SOURCE`, resolvido pelo bloqueador #1); nenhuma linha do `seed.ts` executada contra o projeto de produção. |
| M5 | `pg_dump`/backup imediatamente antes de qualquer `migrate deploy` em produção | 🟡 | Dump gerado e armazenado fora do projeto Supabase de origem (`BACKUP_AND_RECOVERY.md` §3) antes do primeiro `migrate deploy` de produção e de toda migration subsequente. |

---

## 3. Segurança (gate)

| # | Item | Nível | Critério de aprovação objetivo |
|---|---|---|---|
| S1 | Os **4 bloqueadores 🔴** de `SECURITY_CHECKLIST.md` §0 resolvidos (B1 senha via mock, B2 repos Prisma stub + singleton DB, B3 migration/segredos de prod, B4 idempotência/concorrência real) | 🔴 | Cada um com evidência: B1 → T7 passando; B2 → T2 passando (37/37 repositórios); B3 → M1 passando + `AUTH_SECRET`/`CRON_SECRET` fortes provisionados por ambiente (não default); B4 → T5 passando. |
| S2 | Bloco **"obrigatório antes do beta"** de `SECURITY_CHECKLIST.md` §0 (9 itens) cumprido | 🟠 | Auditoria persistente, rate-limit distribuído, recuperação/registro de senha, projeção `isCorrect`, flags de privacidade nas queries, staging protegido+`noindex`, CSRF/XSS auditados, uploads (se habilitados), verificação de conta — cada um com o "Estado/Ação" da tabela original marcado como concluído. |
| S3 | **Senha via `UserRepository`** (regressão do bloqueador #1 passando) | 🔴 | Duplicado de T7 — listado aqui também porque é o gate de segurança mais crítico do release; **nenhum ambiente liga `DATA_SOURCE=prisma` com usuários reais sem este item verde** (`ENVIRONMENTS.md` §4 item 6). |
| S4 | Bloco **"obrigatório antes da produção"** de `SECURITY_CHECKLIST.md` §0 (10 itens) cumprido | 🟡 | LGPD (política/consentimento/exclusão/retenção/DPO), WAF/rate-limit de borda, HSTS preload real, logs sem PII/segredos, backup+restore testado (= T10/D-gate abaixo), CI com gate de segurança, varredura de dependências, cookies/headers em HTTPS real, anti-fraude validado contra banco (= T5/T11), webhooks de pagamento (se aplicável). |

---

## 4. Infra & operação

| # | Item | Nível | Critério de aprovação objetivo |
|---|---|---|---|
| I1 | Env vars setadas **por ambiente** (Dev/Preview/Prod) sem segredos no repo | 🔴 | Cada variável da tabela `VERCEL_DEPLOYMENT.md` §12 cadastrada com o escopo correto na Vercel; `.env.example` só com placeholders; nenhum valor real commitado (`git log -p -- .env.example` sem segredo real em nenhum momento do histórico). |
| I2 | DNS/SSL no ar e validados | 🟠 | Os 15 passos de `DOMAIN_AND_DNS.md` §3 concluídos; certificado válido na raiz e `www`; `staging.` resolvendo e protegido (Cloudflare Access ou Basic Auth + `noindex`). |
| I3 | E-mail com SPF/DKIM/DMARC verificados | 🟠 | Domínio de envio (`send.<dominio>`) verificado no provedor (Resend); SPF/DKIM/DMARC publicados e validados por uma ferramenta de checagem de DNS de e-mail (ex.: mail-tester ou equivalente) antes do primeiro envio real de produção. |
| I4 | Storage buckets/políticas criados | 🟠 | 4 buckets de `STORAGE_PLAN.md` §2 (`avatars`, `course-covers`, `lesson-materials`, `certificates`) existentes por ambiente, com visibilidade correta (público/privado) e nomes por ambiente (`SUPABASE_STORAGE_BUCKET_*`). |
| I5 | Provider de vídeo com **URL assinada testada** (acesso só matriculado) | 🟡 | Teste manual/e2e: aluno matriculado recebe token de reprodução válido; aluno **não** matriculado (ou matrícula `cancelled`) recebe 403 sem token; token expira dentro do tempo configurado (não reaproveitável após expiração) — fluxo completo de `VIDEO_HOSTING_DECISION.md` §3. |
| I6 | **Backups configurados + restore testado** | 🔴 | PITR (produção) ou Daily Backup (staging) ativo conforme `BACKUP_AND_RECOVERY.md` §1.1; **e** uma restauração completa executada em projeto de teste com sucesso (§2.2) — não basta o backup existir, o restore precisa ter sido exercitado ao menos uma vez antes do go-live. Duplicado como gate de infra porque, sem isso, nenhum RTO/RPO da §9 daquele documento é confiável. |
| I7 | **Monitoramento + alertas mínimos ativos** (incl. dead-man do cron) | 🟡 | Os 11 alertas de `MONITORING_PLAN.md` §3 configurados e testados (disparar cada um artificialmente ao menos uma vez em staging, confirmar que a notificação chega ao canal certo) — com destaque para o alerta #10 (cron não executou / dead-man's-switch do `ranking-recalc`), que é o único jeito de detectar um cron **silenciosamente parado** (sem processo residente, a falha é ausência, não erro). |
| I8 | **Staging protegido + `noindex`** | 🟠 | `X-Robots-Tag: noindex` presente no response de `staging.<dominio>`; acesso anônimo bloqueado (Cloudflare Access ou Basic Auth) — confirmar com requisição não-autenticada real, não só configuração lida. |
| I9 | Health endpoint dedicado para checagem externa | 🟡 | `/api/health` (ainda não existe — `MONITORING_PLAN.md` §5) responde 200 checando app + conectividade de banco, sem expor detalhe sensível, e é o alvo real do checador externo (Better Stack/Uptime Kuma), não uma rota autenticada. |
| I10 | Node.js fixado em versão suportada | 🟡 | `package.json` com `"engines": {"node": "22.x"}` (`VERCEL_DEPLOYMENT.md` §4) e painel Vercel na mesma versão — evita a descontinuação do Node 20 anunciada para 1/out/2026. |
| I11 | Segredos com cópia em cofre separado (fora da Vercel) | 🟡 | Cópia de `AUTH_SECRET`/`CRON_SECRET`/`DATABASE_URL`/`DIRECT_URL`/chaves de storage-e-mail-vídeo de produção existe num gestor de segredos da equipe (`BACKUP_AND_RECOVERY.md` §5) — testar que a recuperação a partir do cofre é possível sem depender só do painel Vercel/Supabase. |

---

## 5. Deploy

| # | Item | Nível | Critério de aprovação objetivo |
|---|---|---|---|
| D1 | **Pipeline CI/CD com gates ativos** | 🔴 | Workflow real (`.github/workflows/ci.yml`, hoje inexistente) implementando `CI_CD.md` §2-§6: lint/typecheck/test/build/`npm audit`/CodeQL bloqueando merge; testes de integração (T2) bloqueando promoção a produção; gate de aprovação humana (`GitHub Environment "production"`) antes do job de migration/deploy de produção. |
| D2 | **Rollback de deploy** ensaiado | 🟠 | Executar `vercel rollback` (ou "Instant Rollback" no painel) uma vez em staging e confirmar que o tráfego volta ao deployment anterior em segundos, sem rebuild — não presumir que funciona, testar na prática ao menos uma vez antes do go-live de produção. |
| D3 | **Rollback de migration** ensaiado | 🟠 | Simular uma migration aditiva simples em staging, aplicar, depois restaurar o backup pré-migration (M5/§7 de `BACKUP_AND_RECOVERY.md`) e confirmar que a aplicação volta a funcionar contra o schema restaurado — valida que o procedimento documentado (não existe "down migration" automática) funciona operacionalmente, não só no papel. |
| D4 | **Smoke test pós-deploy automatizado** | 🔴 | Script (`scripts/smoke-tests.sh` ou equivalente, referenciado em `CI_CD.md` §6 mas não implementado) rodando após todo deploy de staging/produção: `/`, `/login`, `/api/health` respondem 200; uma ação de escrita simples (ex.: login de conta de teste) funciona. Falha aciona rollback automático em produção (`CI_CD.md` §3). |

---

## 6. Quadro de sign-off

Cada linha é um gate agregador (não 1:1 com as tabelas acima — agrupa por responsável). Marcar
status conforme execução real, não intenção.

### 6.1 Beta fechado (staging, contas reais restritas — todos os 🔴 + 🟠)

| Gate | Responsável (agente) | Status |
|---|---|---|
| Bloqueadores B1-B4 resolvidos (senha, repos Prisma, migration/segredos, idempotência) | security, backend, database | ⬜ Pendente |
| 37 `PrismaXxxRepository` implementados + testes de integração (T2) | database, backend, gamification, simulations, study-tracking | ⬜ Pendente |
| 12 cenários §25 rodando contra `DATA_SOURCE=prisma` (T3) | tester | ⬜ Pendente |
| E2E smoke dos fluxos críticos (T4) implementado e verde | tester | ⬜ Pendente |
| Concorrência/transação testada contra banco real (T5) | tester, backend | ⬜ Pendente |
| Migration aplicada em dev+staging, seed funcionando (M1, M2) | database | ⬜ Pendente |
| Auditoria persistente + rate-limit distribuído (S2 parcial) | security, backend | ⬜ Pendente |
| Registro/recuperação de senha implementados (Fase 15) | backend, frontend, security | ⬜ Pendente |
| Staging protegido + `noindex` (I8) | security | ⬜ Pendente |
| CI com gates de merge ativos (D1 parcial — lint/typecheck/test/build/audit) | tester, backend | ⬜ Pendente |
| Backup configurado (não necessariamente restore testado ainda) | database | ⬜ Pendente |

### 6.2 Produção (público — todos os anteriores + todos os 🟡)

| Gate | Responsável (agente) | Status |
|---|---|---|
| Todos os gates de Beta fechado (§6.1) mantidos verdes | todos | ⬜ Pendente |
| Pacote LGPD (política, consentimento, exclusão, retenção, DPO) | security, architect | ⬜ Pendente |
| Backup + **restore testado** (T10, I6) | database | ⬜ Pendente |
| WAF/rate-limit de borda + HSTS preload validado | security | ⬜ Pendente |
| Provider de vídeo com URL assinada testada em produção (I5) | backend | ⬜ Pendente |
| E-mail com SPF/DKIM/DMARC verificados (I3) | backend | ⬜ Pendente |
| Monitoramento + 11 alertas ativos e testados (I7) | security | ⬜ Pendente |
| CI/CD completo com gate de aprovação humana em produção (D1) | tester, backend | ⬜ Pendente |
| Rollback de deploy e de migration ensaiados (D2, D3) | tester, database | ⬜ Pendente |
| Smoke test pós-deploy automatizado (D4) | tester | ⬜ Pendente |
| Node.js fixado, segredos em cofre separado (I10, I11) | backend, database | ⬜ Pendente |
| Sign-off final: `reviewer` + `architect` + `security` confirmam todos os gates acima | reviewer, architect, security | ⬜ Pendente |

---

## 7. Lacunas de teste identificadas (avaliação crítica dos planos existentes)

Os documentos de `architect`/`database`/`backend`/`security` cobrem bem a arquitetura-alvo e os
bloqueadores de segurança, mas **nenhum deles fecha o ciclo de verificação em execução real** —
todos assumem que "implementar o repositório" e "escrever a query certa" bastam; não há, hoje,
nenhuma peça que prove isso rodando. Lacunas concretas:

1. **Nenhum teste hoje exercita `PrismaXxxRepository` real.** Os 741 testes Vitest são 100%
   contra `MockXxxRepository`/`globalThis`. Os stubs Prisma (`throw new Error("not implemented")`)
   nunca são chamados por nenhum teste — a suíte passaria inalterada mesmo que a implementação
   Prisma futura tivesse um bug grave de mapeamento de dados ou uma query errada. **Maior lacuna
   do projeto.** (T2 acima cobre; hoje 0% de cobertura.)
2. **Falta harness de e2e por completo.** Nenhuma dependência de Playwright/Cypress no
   `package.json`; `CLAUDE.md` §26 já prevê `npm run test:e2e` mas o script não existe. Sem e2e,
   os 12 cenários de §25 e os fluxos críticos (login real, RBAC, vídeo assinado) só são validados
   por teste unitário com repositório mock — que por definição não pode provar comportamento
   contra um servidor rodando de verdade, HTTP real, cookies reais, Server Actions reais.
3. **Sem `.env.test`/config de teste de integração.** `vitest.config.ts` não tem nenhuma noção de
   ambiente "integração" (`DATABASE_URL`/`DIRECT_URL` de teste, setup/teardown de schema) — para
   os testes de integração (T2) existirem, é preciso criar esse arquivo de config e a infra de
   provisionar um Postgres efêmero (container ou branch Supabase de teste) no CI.
4. **Teste de RLS: não aplicável por decisão, mas o "não aplicável" nunca foi verificado.**
   `SUPABASE_DECISION.md` §4 decide corretamente não ativar RLS porque a autorização é 100%
   server-side — mas essa premissa (nenhum canal client-side acessa o Postgres/Storage direto)
   nunca foi testada automaticamente; um `grep` de import do SDK client-side do Supabase fora de
   `src/server/**` deveria ser um teste/lint de CI, não uma suposição (T9 acima cobre).
5. **Falha transacional sem teste algum hoje** (cenário #12 de §25). Faz sentido — o mock não tem
   transação real para falhar no meio — mas isso significa que o comportamento mais crítico de
   integridade de dados (rollback atômico de aula+gamificação+pontos) **nunca foi exercitado em
   lugar nenhum do código**, nem mock nem real. É o item de maior risco silencioso: sem esse teste,
   um bug de "gravou pontos mas não gravou o evento" só apareceria em produção.
6. **Concorrência de simulado só documentada, nunca testada sob carga concorrente real.** O padrão
   `UPDATE ... WHERE status='IN_PROGRESS' AND version=?` está correto no papel
   (`MOCK_MIGRATION_PLAN.md` §8), mas nenhum teste dispara duas requisições **de fato simultâneas**
   contra o mesmo `MockExamAttempt` — um teste sequencial (chamar a função duas vezes em sequência
   no mesmo processo) não prova a mesma coisa que duas conexões de banco concorrentes disputando a
   mesma linha (T5 acima cobre; recomendação: usar `Promise.all` disparando contra conexões Prisma
   distintas, não reaproveitar o mesmo client em série).
7. **Sanidade de pool de conexões nunca medida.** O uso de Supavisor em modo transação
   (`pgbouncer=true`) é citado três vezes nos planos (`TARGET_ARCHITECTURE.md` §4,
   `MOCK_MIGRATION_PLAN.md` §2, `SUPABASE_DECISION.md`) como "fato técnico confirmado" na
   documentação — mas nenhum teste deste projeto especificamente valida que N requisições
   simultâneas da aplicação não esgotam o pool nem geram erro de "too many connections" (T6).
8. **CI/CD inteiro é papel, não implementação.** `CI_CD.md` traz um esqueleto ilustrativo de
   workflow explicitamente marcado como "não implementação" — sem ele, nada das lacunas 1-7 acima
   roda automaticamente a cada PR; ficam sendo testes manuais esporádicos, o que não escala e não
   é confiável como gate de release (D1).
9. **Restore de backup nunca exercitado.** `BACKUP_AND_RECOVERY.md` §2.2 já marca isso como
   "obrigatório antes do go-live" — reforçado aqui porque é comum esse item ficar "quase feito"
   (backup configurado, restore nunca tentado) até o primeiro incidente real, quando já é tarde
   para descobrir que o procedimento documentado tem um passo errado.
10. **Sem teste de regressão automatizado para o próprio bloqueador #1** rodando hoje — o teste
    está **especificado** em `AUTHENTICATION_PLAN.md` §1.3 mas o arquivo
    `tests/unit/credentials-service-prisma-regression.test.ts` **não existe** no repositório
    (confirmado por leitura do diretório `tests/unit/`) — é a lacuna de teste mais urgente porque é
    também o bloqueador de segurança mais crítico do projeto.

---

## 8. Riscos e pendências

- **Volume de trabalho de T2 é o maior risco de cronograma:** 37 repositórios × pelo menos 1 teste
  de integração cada é um esforço não-trivial, e depende das Fases 5-7 (implementação dos próprios
  repositórios) estarem concluídas antes — este checklist não pode ser cumprido isoladamente pelo
  `tester`, precisa de coordenação estreita com `database`/`backend`/`gamification`/`simulations`/
  `study-tracking` conforme cada domínio for implementado (testar incrementalmente por domínio, não
  esperar os 37 de uma vez).
- **Nenhum framework de e2e escolhido ainda.** Este documento recomenda Playwright (integração
  nativa com Next.js App Router, suporte a testar Server Actions/cookies httpOnly) mas essa é uma
  recomendação do `tester`, não uma decisão já validada com o time — confirmar antes de investir na
  Fase 18.
- **Dependência circular de fases:** T4 (e2e de registro/recuperação de senha) só é executável
  depois da Fase 15 (que depende da Fase 14, e-mail, que depende da Fase 8, bloqueador #1) —
  qualquer atraso nessas fases anteriores atrasa também a cobertura de teste correspondente; o
  checklist não pode "testar" um fluxo que ainda não existe.
- **`next-auth@5.0.0-beta.31` em produção** (já sinalizado em `SECURITY_CHECKLIST.md` D3) — testes
  de login/sessão devem ser revisitados a cada atualização do pacote beta, risco de breaking change
  entre versões beta não é coberto automaticamente por nenhum teste de contrato de versão.
- **Custo de infraestrutura de teste (T2/T5/T6) não estimado** — subir Postgres efêmero no CI a cada
  push (ou só no merge, conforme `CI_CD.md` §3) tem custo de tempo de pipeline e, se usar branch
  Supabase de teste em vez de container local, custo financeiro adicional — decisão de qual caminho
  usar cabe a `backend`/`database`, não travada aqui.
- **RTO/RPO de `BACKUP_AND_RECOVERY.md` §9 são propostas não validadas** — o primeiro teste de
  restauração (T10/I6) é o que confirma ou corrige esses números; não tratar os valores atuais como
  compromisso até esse teste rodar.
