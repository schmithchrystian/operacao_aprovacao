# Esqueleto do Roadmap de Produção — 20 fases (auditoria → produção)

> Espinha proposta pelo subagente `architect`. O `reviewer` consolida em
> `PRODUCTION_ROADMAP.md` (detalhando tarefas, critérios de aceite e agentes por fase).
> Ordem pensada para desbloquear o mínimo antes de ligar Prisma e subir usuários reais.

| Fase | Nome | Foco | Agentes | Depende de |
|---|---|---|---|---|
| 1 | Auditoria do estado atual | Este pacote (CURRENT_STATE/TARGET/ENVIRONMENTS) | architect | — |
| 2 | Provisionar Supabase + Vercel | Projetos por ambiente, pooling `DATABASE_URL`/`DIRECT_URL` | database, architect | 1 |
| 3 | `src/server/db` + Prisma Client | Singleton `PrismaClient` + `PrismaPg`; `db:generate` | database, backend | 2 |
| 4 | Aplicar migration + seed (não-prod) | `migrate deploy` + seed em dev/staging | database | 3 |
| 5 | Implementar `PrismaXxxRepository` (conteúdo) | Users/Profiles/Courses/Modules/Lessons/Subjects/etc. | database, backend | 4 |
| 6 | Implementar repos (gamificação/ranking) | Eventos/pontos/ranking idempotentes | gamification, backend, database | 4 |
| 7 | Implementar repos (estudo/simulados/flashcards/brainstorm) | Demais domínios | study-tracking, simulations, backend | 4 |
| 8 | **Bloqueador #1 — senha via UserRepository** | `findCredentialsByEmail` + import condicional + teste regressão | security, backend | 5 |
| 9 | Auditoria persistente | `PrismaAuditLogRepository`; `auditLog()` → banco | security, backend, database | 5 |
| 10 | Rate-limit/locks distribuídos | `globalThis` → KV/Redis (mesma interface) | backend, security | 3 |
| 11 | Concorrência otimista de simulados | `version` na finalização de `MockExamAttempt` | simulations, backend | 7 |
| 12 | Storage (Supabase) + uploads | Materiais/avatares/capas + `/api/uploads` | backend, database | 5 |
| 13 | Provider de vídeo | Escolha + `VideoProvider` + signed URLs + heartbeat real | backend, study-tracking | 5 |
| 14 | E-mail transacional | `EmailProvider` (recuperação de senha, verificação) | backend | 8 |
| 15 | Registro + recuperação de senha | Páginas/actions ausentes hoje | backend, frontend, security | 14 |
| 16 | Assinaturas/pagamento | Repo/service/webhook `Subscription` | backend, architect, database | 5 |
| 17 | Cron em produção | Vercel Cron (ranking-recalc/daily-close) | backend, gamification | 6 |
| 18 | CI/CD + testes de integração | Pipeline + testes contra Postgres + e2e | tester | 5 |
| 19 | Hardening de segurança | CSP com nonce, revisão IDOR/exposição, LGPD/retenção | security | 8-15 |
| 20 | Go-live produção | Cutover: `DATA_SOURCE=prisma`, segredos, backup, smoke | reviewer, architect, security | todas |

**Notas de ordenação:** Fase 8 (senha) é **P0 dura** — nenhum ambiente com `DATA_SOURCE=prisma` + usuários reais antes dela. Fases 5-7 podem correr em paralelo por domínio. Fase 20 só após bloqueadores P0/P1 fechados.
