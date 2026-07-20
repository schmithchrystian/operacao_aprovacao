# Roadmap de Produção — Consolidado (Operação Aprovação)

> Produzido pelo subagente `reviewer` como **consolidação final** da análise de produção.
> Reúne o [`ROADMAP_SKELETON.md`](./ROADMAP_SKELETON.md) (espinha do `architect`) num cronograma
> técnico completo e cruza os 18 documentos de `docs/production/` + [`docs/SECURITY.md`](../SECURITY.md)
> + [`CLAUDE.md`](../../CLAUDE.md). **Nenhum código ou infra foi alterado nesta fase — é planejamento.**
>
> Complementos deste documento: [`COST_MODEL.md`](./COST_MODEL.md) (custos por componente/cenário)
> e [`RISK_MATRIX.md`](./RISK_MATRIX.md) (matriz de riscos consolidada). As seções
> [§3 Consistência](#3-consistência-contradições-sobreposições-e-lacunas) e
> [§4 Consolidação de domínio](#4-consolidação-de-domínio-coberto-vs-pendente) são a revisão crítica
> pedida ao `reviewer`.
>
> **Todas as estimativas são aproximadas** (faixas em dias de trabalho efetivo), assumem execução em
> paralelo por agente de domínio onde indicado, e **não incluem** tempo de decisão de negócio (LGPD
> legal, escolha de provedores pagos) nem janelas de espera de propagação (DNS, verificação de e-mail).

---

## 1. Cronograma técnico completo — 20 fases (auditoria → produção)

| Fase | Objetivo | Atividades | Agentes | Dependências | Riscos | Critério de aceite | Estimativa (aprox.) |
|---|---|---|---|---|---|---|---|
| **1. Auditoria do estado atual** | Fotografar o que existe e o que bloqueia produção | Verificar código (não presumir UI pronta); mapear bloqueadores, módulos, env vars; produzir CURRENT_STATE/TARGET/ENVIRONMENTS | architect | — | Auditoria superficial esconder bloqueador | Docs de auditoria revisados; 12 bloqueadores e 21 módulos mapeados | **Concluída** |
| **2. Provisionar Supabase + Vercel** | Ter projeto por ambiente e strings de conexão | Criar projeto Supabase dev/staging/prod (isolados); coletar `DATABASE_URL` pooled (`:6543`, `pgbouncer=true`) e `DIRECT_URL` (`:5432`); importar repo na Vercel; mapear branches→ambientes | database, architect | 1 | Compartilhar banco/segredo entre ambientes (viola `ENVIRONMENTS.md`) | 3 projetos Supabase isolados; strings coletadas; projeto Vercel conectado ao GitHub | 1–2 dias |
| **3. `src/server/db` + Prisma Client** | Ligar o cliente Prisma com pooling serverless | Criar singleton `PrismaClient` + `PrismaPg` (adapter) guardado em `globalThis`; ajustar `prisma.config.ts` (`directUrl`); ampliar `env.ts` (Zod) com `DATABASE_URL`/`DIRECT_URL` obrigatórias quando `DATA_SOURCE=prisma`; `postinstall: prisma generate` | database, backend | 2 | Esgotar conexões sem `pgbouncer=true`; import de Prisma fora da camada permitida | `db:generate` sem erro; regra de import respeitada; `env.ts` valida DB | 1–2 dias |
| **4. Aplicar migration + seed (não-prod)** | Schema real em dev/staging | `prisma migrate deploy` (`0000_init`) em dev→staging; `db:seed` (só fora de prod); validar idempotência do seed | database | 3 | Rodar seed em produção por engano; migration falhar no meio (`_prisma_migrations`) | `migrate status` limpo em dev/staging; seed idempotente | 0,5–1 dia |
| **5. Repos Prisma — conteúdo** | Persistência real de identidade/cursos | Implementar `Prisma*Repository` de Users/Profiles/Contest/Course/Module/Lesson/Subject/Topic/Teacher/Enrollment/LessonProgress (~11); mapear `Role↔SystemRole`; respeitar flags de privacidade na projeção | database, backend, security | 4 | Vazar PII (flags ignoradas); mapeamento de enum errado; IDOR (query por `id` sem `userId`) | 11 repos implementados; teste de integração básico por repo | 4–7 dias |
| **6. Repos Prisma — gamificação/ranking** | Pontos/XP/ranking idempotentes | Implementar GamificationEvent/PointTransaction/UserAchievement/RankingScore/Achievement; confiar nos `@unique` do schema; transação aula→evento→pontos | gamification, backend, database | 4 | "Checar antes de inserir" em vez de `@unique`; estado parcial sem `$transaction` | 5 repos + transação atômica; idempotência provada por teste | 3–5 dias |
| **7. Repos Prisma — estudo/simulados/flashcards/brainstorm** | Demais domínios persistidos | Implementar os ~21 repos restantes (StudySession/Plan/Item/Mission, streaks, metas, FocusSession, MockExam/Question/Option/Attempt/QuestionAttempt/Favorite, Flashcard*, Brainstorm*, Notification) | study-tracking, simulations, backend, database | 4 | Anti-fraude de tempo depende de persistência real dos heartbeats; corrida ao mover card | 21 repos implementados; testes de integração por domínio | 6–10 dias |
| **8. 🔴 Bloqueador #1 — senha via `UserRepository`** | Fechar backdoor `senha123` + login real | `findCredentialsByEmail` na interface; mock lê do `@/mocks` só no repo mock; Prisma lê `user.passwordHash`; `credentials-service` para de importar mock; hash dummy próprio; teste de regressão | security, backend | 5 | Reintroduzir backdoor; timing-attack se defesa quebrar | Teste de regressão (senha mock não autentica fora de `DATA_SOURCE=mock`) verde; testes de login atuais mantidos | 1–2 dias |
| **9. Auditoria persistente** | Trilha de auditoria real | Criar `PrismaAuditLogRepository` (novo — não existe stub); `auditLog()`/`getAuditRecords()` → banco; log imutável | security, backend, database | 5 | Auditoria some em restart/multi-instância (estado atual) | Ações de admin gravam `AuditLog` no Postgres; leitura de `/admin/auditoria` vem do banco | 1–2 dias |
| **10. Rate-limit/locks distribuídos** | Estado efêmero sobrevive a multi-instância | Migrar `globalThis` → KV/Redis (Upstash/Vercel KV) **preservando a interface pública** de `rate-limit.ts`; escopos por chave (login/register/pwreset) | backend, security | 3 | Rate-limit ineficaz em serverless (memória por processo); custo/latência do KV | Rate-limit de login compartilhado entre instâncias; locks de flashcard/foco distribuídos | 2–3 dias |
| **11. Concorrência otimista de simulados** | Impedir dupla finalização | `updateMany({ where:{ id, status:'IN_PROGRESS', version }})`; `count===0` = rejeitar; projeção sem `isCorrect` | simulations, backend | 7 | Finalização dupla sob concorrência; gabarito vazar antes da correção | Teste de 2 requisições concorrentes: só 1 vence; `isCorrect` nunca no DTO pré-correção | 1–2 dias |
| **12. Storage (Supabase) + uploads** | Materiais/avatares/capas | Criar 4 buckets por ambiente (`avatars`, `course-covers`, `lesson-materials`, `certificates`); rota `/api/uploads` (validação server-side: auth, role, MIME por magic bytes, tamanho, URL assinada); env `SUPABASE_*` | backend, database, security | 5 | Upload de executável/SVG (XSS); URL pública permanente de conteúdo pago; campos `Course.coverImageUrl`/`Certificate` inexistentes no schema | Buckets criados; upload valida MIME real; leitura por URL assinada de curta duração | 3–5 dias |
| **13. Provider de vídeo** | Streaming protegido por matrícula | Escolher provider (Cloudflare Stream/Mux/Bunny); interface `VideoProvider.signPlaybackUrl`; substituir `videoUrl` sintético por token assinado emitido após `requireUser`+`assertOwnership`+`assertActiveEnrollment`+status; CSP `media-src`/`frame-src` | backend, study-tracking, security | 5 | Custo de banda/minutos imprevisível; URL de vídeo baixável; CSP quebrar player | Aluno matriculado recebe token válido; não-matriculado 403; token expira e não é reusável | 4–6 dias |
| **14. E-mail transacional** | Envio real (base de reset/verificação) | Interface `EmailProvider` + `ConsoleEmailProvider` (dev) + real (Resend recomendado); templates `react-email`; env `EMAIL_*`; DNS SPF/DKIM/DMARC no subdomínio de envio | backend | 8 | E-mail cair em spam sem DKIM; disparo real de dev/staging; naming de env divergente (`EMAIL_MODE` vs `EMAIL_PROVIDER`) | E-mail enviado em prod (sandbox fora); SPF/DKIM/DMARC validados | 2–4 dias |
| **15. Registro + recuperação de senha** | Fluxos de conta hoje ausentes | Modelos de token (uso único, hash SHA-256, TTL, `usedAt`); `User.tokenVersion`; páginas/actions de registro/recuperar/redefinir/verificar; anti-enumeração; política de senha; Turnstile adaptativo; revogação de sessão por `tokenVersion` | backend, frontend, security | 14 | Divergência de modelo de token entre AUTH e EMAIL plans; enumeração de contas; reset escrever em lugar diferente do login (repetir bloqueador #1) | Registro cria `aluno`; reset com token válido troca senha e revoga JWT; token expirado/usado rejeitado com msg genérica | 3–5 dias |
| **16. Assinaturas/pagamento** | Cobrança (P3 — adiável) | Definir provider; `SubscriptionRepository`+service+webhook `/api/webhooks/subscriptions` (HMAC, idempotência por `externalId`, timing-safe) | backend, architect, database | 5 | Webhook forjado; cobrança duplicada; **não é bloqueador de lançamento** | Assinatura persiste; webhook valida assinatura e é idempotente | 5–8 dias |
| **17. Cron em produção** | Ranking/fechamento diário sem processo residente | Vercel Cron para `/api/cron/ranking-recalc` e daily-close; `CRON_SECRET` por ambiente; dead-man's-switch (heartbeat) | backend, gamification | 6 | Cron **não disparar** silenciosamente (falha é ausência, não erro); recálculo não-idempotente | Cron roda na janela e retorna 200; recálculo idempotente (`@unique calculationVersion`) | 1–2 dias |
| **18. CI/CD + testes de integração** | Pipeline com gates + primeiro teste real do Prisma | `.github/workflows/ci.yml` (lint/typecheck/test/build/`npm audit`/CodeQL); testes de integração contra Postgres real (37 repos); job de migration isolado (nunca no build Vercel); gate de aprovação `production`; e2e (Playwright); smoke tests | tester, backend | 5 | **Maior risco de cronograma** (37 repos × teste); 0 testes de Prisma/e2e hoje; custo de infra de teste | CI bloqueia merge; integração 37/37; e2e dos fluxos críticos verde; smoke automatizado | 5–8 dias |
| **19. Hardening de segurança + LGPD** | Fechar itens 🟡 de release público | CSP com nonce (remover `unsafe-inline`); revisão IDOR/exposição; logs sem PII (`beforeSend` Sentry); WAF/rate-limit de borda; HSTS preload; LGPD (política, consentimento, exclusão/anonimização, retenção, DPO) | security, architect | 8–15 | LGPD legal depende de decisão organizacional (fora de engenharia); preload de HSTS é difícil reverter | Bloco 🟡 do `SECURITY_CHECKLIST` §0 cumprido; LGPD publicada | 4–7 dias (+ prazo legal) |
| **20. Go-live produção** | Cutover para usuários reais | Backup pré-migration; `migrate deploy` prod; segredos fortes por ambiente; `DATA_SOURCE=prisma`; admin via `bootstrap-admin.ts`; smoke; monitoramento ativo | reviewer, architect, security | todas | Rollback de código não reverte schema; RTO/RPO não validados até 1º restore | 35 gates do `GO_LIVE_CHECKLIST` verdes; sign-off `reviewer`+`architect`+`security` | 1–2 dias (após buffer de beta) |

**Notas de ordenação (herdadas + reforçadas):**
- Fase 8 é **P0 dura**: nenhum ambiente com `DATA_SOURCE=prisma` + usuários reais antes dela (`ENVIRONMENTS.md` checklist item 6).
- Fases 5–7 correm **em paralelo por domínio**; Fase 6 (transação/idempotência) e Fase 11 (version) são o núcleo anti-fraude.
- Fase 16 (pagamento) é **P3 e adiável** — está numerada em 16 por herança do skeleton, mas **não pertence ao caminho crítico**; poderia vir depois do go-live.
- **Ver [§3](#3-consistência-contradições-sobreposições-e-lacunas) sobre a posição de CI/CD (18) em relação às fases que dependem dele.**

---

## 2. Três versões do cronograma

As três versões são **incrementais**: cada uma inclui a anterior. O corte entre elas segue os níveis
🔴/🟠/🟡 do `SECURITY_CHECKLIST.md` §0 e do `GO_LIVE_CHECKLIST.md` §0 (12 gates 🔴, 12 🟠, 11 🟡).

### 2a. MVP técnico mínimo — "usuários reais com segurança"

Caminho crítico para ter **usuários reais logando com segurança**, sem ainda entregar todo o produto.

**ENTRA (obrigatório):**
- Fases **2, 3, 4** — Supabase/Vercel provisionados, `src/server/db`, migration aplicada (dev→staging→prod).
- Fases **5, 6, 7** — os 37 `PrismaXxxRepository` implementados (senão `DATA_SOURCE=prisma` quebra tudo).
- Fase **8** — 🔴 bloqueador #1 (senha via `UserRepository`). **Inegociável.**
- Fase **11** — concorrência otimista de simulados (🔴 B4) + Fase 6 idempotência de gamificação (🔴 B4).
- Fase **20 (parcial)** — deploy Vercel, domínio na raiz + `www`, SSL, segredos fortes por ambiente, admin via bootstrap, `DATA_SOURCE=prisma`.
- **Segurança-bloqueadores:** os 4 🔴 do `SECURITY_CHECKLIST` (B1–B4); Cloudflare **só como DNS/DNSSEC** (proxy laranja desligado); staging protegido + `noindex`.
- **Testes mínimos:** teste de regressão do bloqueador #1 (T7) + `lint/typecheck/build` verdes com `DATA_SOURCE=prisma` (T8).

**Pode ser ADIADO sem impedir o lançamento do MVP:**
- Vídeo real (Fase 13) — usar placeholder/ponte temporária se conteúdo não for sensível (ver ressalva em `VIDEO_HOSTING_DECISION` §2).
- Storage/uploads (Fase 12) — se avatar/material não forem essenciais no dia 1.
- Assinaturas/pagamento (Fase 16), notificações por e-mail não-transacional, MFA/OAuth.
- WAF/proxy Cloudflare, HSTS preload, observabilidade fina, LGPD completa (mas **aviso**: registro público de usuários reais já atrai obrigações de LGPD — ver §3).

> ⚠️ **Tensão de escopo:** recuperação de senha (Fase 15) depende de e-mail (Fase 14). Um MVP sem
> "esqueci minha senha" é tecnicamente possível, mas a recuperação de conta vira **procedimento manual
> via SQL** (`BACKUP_AND_RECOVERY.md` §8). Aceitável só com pouquíssimos usuários e ≥ 2 admins.

### 2b. Beta fechado — "staging/QA com contas reais restritas"

Tudo do MVP **mais** (todos os 🔴 + todos os 🟠 — 24 gates do `GO_LIVE_CHECKLIST`):

**ENTRA:**
- Fase **9** — auditoria persistente (`PrismaAuditLogRepository`).
- Fase **10** — rate-limit/locks distribuídos (KV/Redis).
- Fases **14 + 15** — e-mail transacional + registro/recuperação/verificação de senha.
- Fases **12 + 13** — storage e provider de vídeo com URL assinada (conteúdo protegido de verdade).
- **Segurança 🟠:** projeção sem `isCorrect`, flags de privacidade nas queries, CSRF/XSS auditados, uploads validados, verificação de conta.
- **Testes:** integração 37/37 repos (T2), 12 cenários §25 contra Prisma (T3), e2e smoke (T4), concorrência/transação real (T5), anti-fraude contra banco (T11).
- **Infra:** DNS/SSL validados, monitoramento + alertas (Sentry, Better Stack, dead-man do cron), backups configurados, Node fixado em 22.x.
- **CI/CD** com gates de merge (Fase 18, parcial).

**Pode ser ADIADO:**
- LGPD completa (política/DPO/anonimização automatizada), WAF/proxy Cloudflare, HSTS preload, pentest, pagamento, detecção automatizada de anomalia.

### 2c. Produção estável — "público, LGPD completo, escala"

Tudo do beta **mais** (todos os 🟡 — 35 gates):

**ENTRA:**
- **LGPD completa:** política de privacidade publicada, consentimento no cadastro (timestamp/versão), fluxo de exclusão + anonimização, política de retenção, DPO nomeado.
- **Borda:** avaliar WAF/rate-limit de borda e proxy laranja Cloudflare **na frente da Vercel** — só após validar SSL/latência (Cache Bypass, True-Client-IP, SSL Full strict, O2O off); começa **desligado**.
- **Observabilidade fina:** distributed tracing, log drain centralizado, dashboards de negócio.
- **Resiliência:** restore de backup **testado** (não só configurado), RTO/RPO validados, rollback de deploy e de migration ensaiados, cofre de segredos separado.
- **Segurança contínua:** CSP com nonce, varredura de dependências no CI, HSTS preload submetido, cookies/headers em HTTPS real.
- Fase **16** (pagamento) quando o modelo de negócio exigir.

**Pode ser ADIADO (melhoria contínua 🟢):**
- MFA/2FA, OAuth social/magic link, rotação automatizada de segredos, app em subdomínio `app.`, pentest externo/bug bounty, expurgo/anonimização automatizada, detecção de anomalia de ranking.

---

## 3. Consistência — contradições, sobreposições e lacunas

Revisão cruzada dos 18 documentos + `docs/SECURITY.md` + `CLAUDE.md`. Achados ordenados por impacto.

### 3.1 Contradições / divergências a reconciliar

| # | Achado | Docs em conflito | Recomendação |
|---|---|---|---|
| C-1 | **Modelo de token de reset/verificação diverge.** `AUTHENTICATION_PLAN` §2 propõe **dois modelos** separados (`PasswordResetToken` + `EmailVerificationToken`). `EMAIL_PLAN` §6 propõe **um único** modelo (`VerificationToken`/`PasswordResetToken`) com campo `purpose` (`EMAIL_VERIFICATION`\|`PASSWORD_RESET`). | AUTHENTICATION_PLAN §2 vs EMAIL_PLAN §6 | `database` decide **um** desenho antes da Fase 15. Recomendação: modelo único com `purpose` (menos tabelas, mesma segurança) — mas é decisão do dono do schema. |
| C-2 | **Custo do bcrypt diverge (10 vs 12).** `AUTHENTICATION_PLAN` §4 recomenda **custo 12** em produção. `MOCK_MIGRATION_PLAN` §7 (bootstrap admin) diz **"≥ 10, igual ao resto"**. `BACKUP_AND_RECOVERY` §8 (recuperação manual) usa `hashSync(..., 10)`. | AUTH §4 vs MOCK_MIGRATION §7 vs BACKUP §8 | Fixar **um** valor em `business.ts` (`PASSWORD_POLICY.bcryptCost`) e usar em TODOS os caminhos (registro, reset, bootstrap, recuperação manual). Se 12 for o alvo, atualizar os outros dois docs. |
| C-3 | **Contagem de repositórios inconsistente (34 vs 37).** `CURRENT_STATE` §0/§ e `TARGET_ARCHITECTURE` §2 dizem **"~34"**; `MOCK_MIGRATION_PLAN` §5 e `GO_LIVE_CHECKLIST` T2 dizem **37**. **Verificado por leitura do diretório: são 37 stubs.** Além disso, `PrismaAuditLogRepository` (Fase 9) e os 2 repos de token (Fase 15) **não existem** e serão criados → total real a implementar ≈ **40**. | CURRENT_STATE / TARGET vs MOCK_MIGRATION / código | Corrigir "~34" → **37 stubs existentes + ~3 novos = ~40**. Impacta a estimativa da Fase 18 (testes de integração). |
| C-4 | **TTL do token de reset:** `EMAIL_PLAN` §2 diz "15–60 min"; `AUTHENTICATION_PLAN` §3.3 fixa "1h". | EMAIL §2 vs AUTH §3.3 | Alinhar num valor único em `PASSWORD_RESET.tokenTtlMs`. Divergência pequena, mas evita confusão de implementação. |
| C-5 | **Nome da env var de seleção de e-mail:** `EMAIL_PLAN` §7 sugere `EMAIL_MODE` (`console`\|`sandbox`\|`live`); `VERCEL_DEPLOYMENT` §12 lista `EMAIL_PROVIDER`. | EMAIL §7 vs VERCEL §12 | Escolher um nome ao ampliar `env.ts` (Fase 14). Idem `VIDEO_PROVIDER` — consistente, mas confirmar o par chave/segredo. |

### 3.2 Sobreposições (não são erros, mas exigem "dono único")

| # | Sobreposição | Docs | Nota |
|---|---|---|---|
| O-1 | **RLS aparece com dois sentidos.** `SUPABASE_DECISION` §4 decide **não** ativar RLS nas tabelas (autorização é server-side). `STORAGE_PLAN` §1 cita "políticas via RLS no nível do bucket". `SECURITY_CHECKLIST` R1 condiciona RLS de bucket ao uso de chave anon. | SUPABASE §4 / STORAGE §1 / SECURITY R1 | **Não é contradição** (RLS de tabela ≠ RLS de bucket de Storage), mas o leitor pode confundir. Deixar explícito: RLS de **tabela** = não; RLS de **bucket** = só se algum acesso client-side existir (preferir tudo server-side + URL assinada). |
| O-2 | **Redirect `www`→raiz e headers/HSTS** podem ser configurados na Vercel **ou** na Cloudflare. | CLOUDFLARE_PLAN §2/§6, DOMAIN_AND_DNS §3, VERCEL §12 | Regra já correta nos docs: **um lugar só** (headers/CSP/HSTS só no `next.config.ts`; redirect num único ponto). Reforçar no go-live. |
| O-3 | **Rate-limit em 3 camadas** (app `rate-limit.ts`, Turnstile, borda Cloudflare) descrito em AUTH §6, CLOUDFLARE §2, SECURITY L1/L2. | AUTH / CLOUDFLARE / SECURITY | Coerente e complementar; só garantir que a migração para KV (Fase 10) preserve a interface pública. |

### 3.3 Lacunas (algo citado sem dono/definição, ou fora de ordem de dependência)

| # | Lacuna | Onde | Impacto |
|---|---|---|---|
| G-1 | **CI/CD (Fase 18) está numerado depois de fases que na prática dependem dele.** As Fases 5–7/8/11 precisam de testes de integração contra Postgres para serem consideradas "prontas" — mas o pipeline que roda esses testes é a Fase 18. | ROADMAP_SKELETON, CI_CD, GO_LIVE §7 | **Recomendação forte:** puxar a **infra de teste de integração** (`.env.test`, container Postgres, `test:integration`) para **junto da Fase 5** (não esperar a 18), testando cada domínio incrementalmente. GO_LIVE §8 já sinaliza isso como maior risco de cronograma. |
| G-2 | **Campos de schema faltando para Storage.** `Course.coverImageUrl` e um model `Certificate` **não existem** no schema (`STORAGE_PLAN` §0/§6) — mas os buckets `course-covers` e `certificates` os pressupõem. | STORAGE_PLAN §6 | `database` precisa decidir/adicionar esses campos antes da Fase 12, ou os buckets ficam sem uso. |
| G-3 | **`AuditLog` sem repositório/contrato.** Não há stub `audit-log-repository` (verificado). A Fase 9 cria do zero (contrato + mock + prisma). | CURRENT_STATE §1 (bloq. 4), código | Já previsto, mas some da contagem de "37 repos" — é trabalho **adicional**. |
| G-4 | **Revogação de sessão é uma lacuna nova encontrada pelo `backend`.** JWT não revalida `isActive`/`role` a cada request; desativar usuário não invalida token até `updateAge` (1 dia). Correção via `User.tokenVersion` proposta, mas **não estava** no skeleton. | AUTHENTICATION_PLAN §5.3 | Incluir na Fase 15 (já mapeado). É requisito de segurança real, não opcional se admin desativa contas. |
| G-5 | **Troca do último admin em transação é requisito NOVO** (não existe nem no mock). | MOCK_MIGRATION_PLAN §8, BACKUP §8 | Adicionar ao service de admin na Fase 5/9. Sem isso, é possível ficar com **zero admins** por erro. |
| G-6 | **Turnstile não aparece no `SECURITY_CHECKLIST` numerado**, embora esteja em AUTH §6, CLOUDFLARE §2 (MVP-opcional) e VERCEL §12 (env vars). | SECURITY_CHECKLIST | Lacuna de rastreabilidade: adicionar Turnstile como item explícito do checklist de auth. |
| G-7 | **LGPD ainda depende de decisão organizacional** (DPO, base legal, política publicada) — engenharia cobre exclusão/anonimização/retenção técnica, mas o pacote legal não tem dono nomeado nos docs. | SECURITY_CHECKLIST §7, GO_LIVE §6.2 | Registrar responsável de negócio/jurídico; é gate 🟡 de produção pública e **começa a valer assim que houver usuários reais**, não só "na escala". |
| G-8 | **`next-auth@5.0.0-beta` em produção.** Beta fixado, sem teste de contrato entre versões. | SECURITY_CHECKLIST D3, GO_LIVE §8 | Fixar versão exata; acompanhar changelog; revisitar antes do público. Aceito como risco consciente. |

---

## 4. Consolidação de domínio — coberto vs pendente

Confirmação de que as necessidades de **transação/idempotência/anti-fraude** dos domínios
(frontend/gamification/simulations/study-tracking) estão cobertas pelo `MOCK_MIGRATION_PLAN` +
`SECURITY_CHECKLIST`. Legenda: **Plano OK** = especificado corretamente; **Impl. pendente** = ainda é
stub/mock; **Teste pendente** = não há teste que prove em execução real.

| Necessidade de domínio | Mecanismo especificado | Cobertura no plano | Estado real |
|---|---|---|---|
| **Conclusão de aula + evento + pontos numa transação** | `$transaction([LessonProgress.update, GamificationEvent.create, PointTransaction.create])` | `MOCK_MIGRATION_PLAN` §8; `SECURITY_CHECKLIST` F1/F3; `CLAUDE.md` §25 #12 | **Plano OK.** Impl. pendente (Fase 6). **Teste pendente e crítico** — cenário #12 (falha transacional → rollback total) **nunca foi exercitado nem em mock nem em real** (GO_LIVE §7 lacuna #5). Maior risco silencioso de integridade. |
| **Finalização de simulado com `version` (concorrência otimista)** | `updateMany WHERE status='IN_PROGRESS' AND version=?`; `count===0` rejeita. **Intencionalmente sem `@unique`** | `MOCK_MIGRATION_PLAN` §3/§8; `SECURITY_CHECKLIST` F4; `CLAUDE.md` §25 #11 | **Plano OK.** Impl. pendente (Fase 11). **Teste de concorrência real pendente** — só há teste sequencial; precisa `Promise.all` com conexões distintas (GO_LIVE §7 lacuna #6). |
| **Anti-farm de flashcard/foco (lock → row-lock no banco)** | Locks hoje em `globalThis`; alvo "locks distribuídos **ou** transação"; SM-2/`nextReviewAt` server-side; `FlashcardReview` append-only | `MOCK_MIGRATION_PLAN` §3; `SECURITY_CHECKLIST` F6; Fase 10 | **Plano parcial.** O mecanismo exato de row-lock ("`SELECT ... FOR UPDATE`" vs transação vs KV lock) **não está detalhado** — o doc diz "ou transação" sem fechar. **Lacuna a detalhar** pelo `backend`/domínio antes da Fase 7/10. |
| **Ranking normalizado + privacidade** | `RankingScore @@unique([...calculationVersion])`; recálculo idempotente via cron; flags `showInRanking`/`showRealName` na projeção | `MOCK_MIGRATION_PLAN` §3/§5; `SECURITY_CHECKLIST` F7/P9; `CLAUDE.md` §25 #9 | **Plano OK.** Impl. pendente (Fases 6/17). Projeção com flags é ponto de atenção do `PrismaProfileRepository` (Fase 5). Teste #9 contra Prisma pendente. |
| **Tempo válido de estudo (reconstrução server-side)** | `validSeconds` reconstruído de heartbeats (não `fim−início`); detecta saltos/aba oculta/duplicados/sessões simultâneas | `CURRENT_STATE` §2; `SECURITY_CHECKLIST` F2; `CLAUDE.md` §25 #7 | **Plano OK, lógica já existe no mock.** Depende de **persistência real** dos sinais (`StudySession`/`StudyActivity`) — Fase 7. Teste anti-fraude contra banco pendente (T11). |
| **Conclusão de aula ≥ 80% server-side** | `LessonProgress @@unique([userId,lessonId])` + limiar configurável | `SECURITY_CHECKLIST` F3; `CLAUDE.md` §25 #1/#2 | **Plano OK.** Impl. pendente (Fase 5/7). |
| **Respostas corretas nunca vazam** | `QuestionOption.isCorrect` fora do DTO pré-correção; `QuestionAttempt @@unique` | `SECURITY_CHECKLIST` F5; `CLAUDE.md` §25 #5 | **Plano OK.** Auditar projeção do `PrismaQuestionOptionRepository` (Fase 7/11). |

**Veredito da consolidação de domínio:** as necessidades estão **corretamente cobertas no nível de
plano** por `MOCK_MIGRATION_PLAN` + `SECURITY_CHECKLIST` — os `@unique` de idempotência **já estão no
schema/migration** (verificado em `MOCK_MIGRATION_PLAN` §3, nada pendente de DDL). O que falta é
**execução**: (1) implementar os repositórios/transações; (2) **detalhar o row-lock de flashcard/foco**
(única lacuna de desenho); (3) **escrever os testes que provam** idempotência/transação/concorrência
contra banco real — hoje **0%** dessa cobertura existe. Nada está "pronto" além do plano e do schema; o
código de domínio real e sua verificação estão **todos pendentes**.

---

## 5. Veredito final da análise

**A análise está pronta para o usuário decidir seguir.** Os 18 documentos formam um plano de produção
coerente, verificado no código e honesto sobre o que é plano vs. implementação. Pontos de decisão que
o usuário precisa fechar **antes de começar a execução**:

1. **Reconciliar as 5 divergências de §3.1** (modelo de token, custo bcrypt, contagem de repos, TTL,
   nome de env) — são pequenas, mas fixam premissas de implementação.
2. **Puxar a infra de teste de integração para a Fase 5** (não esperar a 18) — maior risco de cronograma.
3. **Escolher provedores pagos** (vídeo, e-mail) e **confirmar preços nos painéis** (ver `COST_MODEL.md`).
4. **Nomear dono do pacote LGPD** (legal/negócio) — vale desde o primeiro usuário real, não só na escala.
5. **Aceitar conscientemente** os riscos residuais: `next-auth` beta, recuperação de senha manual no MVP,
   RTO/RPO não validados até o 1º restore.

Nenhum bloqueador impede **planejar e começar pela Fase 2**. O único ponto inegociável de sequência
continua sendo: **Fase 8 (senha via `UserRepository`) antes de qualquer ambiente com `DATA_SOURCE=prisma`
e usuários reais.**
