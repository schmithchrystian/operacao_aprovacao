# Monitoramento e Observabilidade — Produção (Operação Aprovação)

> Produzido pelo subagente `security`. Cobre erros, logs, disponibilidade, desempenho, banco,
> consultas lentas, falhas de login, falhas de pagamento (futuro), storage, vídeo, filas e
> tarefas agendadas para a stack Vercel + Supabase + Prisma + Auth.js (ver
> `TARGET_ARCHITECTURE.md`). Preços/limites de plano: **verificar nos painéis** — não fixados aqui.

---

## 1. Stack recomendada

| Camada | Ferramenta | Papel |
|---|---|---|
| **Erros + performance (front e back)** | **Sentry** (`@sentry/nextjs`) | Captura exceções de Server Components/Actions/Route Handlers e do cliente; traces de performance; release health; source maps. Núcleo da observabilidade de aplicação. |
| **Logs de plataforma / runtime** | **Vercel Logs + Vercel Analytics** | Logs de funções serverless e do build; Web Analytics (Core Web Vitals) e Speed Insights. Nativo, zero setup extra. |
| **Banco / queries lentas** | **Supabase Logs + Reports** (Postgres logs, `pg_stat_statements`) | Consultas lentas, conexões, erros de banco, uso de disco. Nativo do Supabase. |
| **Uptime externo + status page + alertas** | **Better Stack (Uptime)** | Checagem externa de disponibilidade (fora da Vercel — pega queda que o log interno não vê), página de `status.`, roteamento de alertas (e-mail/Slack/telefone). |
| **Alternativa self-host de uptime** | **Uptime Kuma** | Opção gratuita self-hosted se não usar Better Stack; menos recursos de alerta/on-call, exige hospedar (não na Vercel — senão cai junto). |

**Racional:** Sentry (aplicação) + nativos da Vercel/Supabase (plataforma/banco) + um checador
**externo** de uptime cobrem todas as camadas sem duplicação. Better Stack é o recomendado para
uptime+status+on-call; Uptime Kuma é o fallback econômico. Evitar empilhar ferramentas que se
sobrepõem (ex.: não é preciso um APM terceiro além do Sentry no MVP).

## 2. Cobertura por área

| Área a monitorar | Ferramenta | Sinal |
|---|---|---|
| Erros de **frontend** | Sentry (browser SDK) | Exceções JS, erros de hidratação, CSP violations (report-uri opcional). |
| Erros de **backend** | Sentry (server SDK) + Vercel Logs | Exceções em Actions/Routes, stack traces, `ActionResult` de erro. |
| **Logs** | Vercel Logs (app) + Supabase Logs (DB) | Centralizar via Logpush/drain se volume exigir. |
| **Disponibilidade** | Better Stack (externo) | HTTP 200 na raiz e em endpoint de health; da perspectiva do usuário. |
| **Desempenho** | Vercel Speed Insights + Sentry traces | Core Web Vitals, TTFB, duração de funções. |
| **Banco** | Supabase Reports | Conexões (pooler Supavisor), CPU/IO, tamanho. |
| **Consultas lentas** | Supabase `pg_stat_statements` / slow query log | Queries acima de limiar; N+1 ao implementar repos Prisma. |
| **Falhas de login** | `AuditLog` (app) + alerta de anomalia | Picos de falha, rate-limit disparando, `login.unauthorized`. |
| **Falhas de pagamento** (futuro) | Sentry + log do webhook `/api/webhooks/subscriptions` | Webhook rejeitado, assinatura inválida, cobrança falha. |
| **Uso de storage** | Supabase Storage metrics | Tamanho do bucket vs. limite do plano. |
| **Consumo de vídeo** | Dashboard do provider (Mux/Cloudflare/Bunny) | Minutos entregues, banda, erros de streaming. |
| **Filas / outbox** | Log de aplicação + métrica custom | Backlog de eventos de gamificação não processados (outbox). |
| **Tarefas agendadas** (cron) | Vercel Cron logs + heartbeat/dead-man's-switch | `/api/cron/ranking-recalc` executou e retornou 200 na janela esperada. |

## 3. Alertas mínimos (MVP)

Cada alerta com dono, canal (e-mail + Slack; on-call por telefone para os críticos) e severidade.

| # | Alerta | Gatilho | Severidade | Fonte |
|---|---|---|---|---|
| 1 | **App indisponível** | Checagem externa falha 2x seguidas | Crítico (on-call) | Better Stack |
| 2 | **Taxa de 5xx elevada** | 5xx acima de limiar em janela curta | Crítico | Vercel Logs / Sentry |
| 3 | **Falha de banco** | Erro de conexão Postgres / pooler esgotado / DB down | Crítico (on-call) | Supabase + Sentry |
| 4 | **Uso elevado** | CPU/conexões do DB ou execução de funções perto do limite do plano | Alto | Supabase / Vercel |
| 5 | **Migration falhou** | `migrate deploy` com erro no CI/deploy | Crítico | CI/CD |
| 6 | **Autenticação anormal** | Pico de falhas de login / rate-limit disparando muito (força bruta / credential stuffing) | Alto | `AuditLog` + alerta |
| 7 | **Aumento de erros** | Nova issue ou spike de erros no Sentry acima do baseline | Alto | Sentry |
| 8 | **Storage perto do limite** | Bucket Supabase > ~80% do plano | Alto | Supabase |
| 9 | **Falha de envio de e-mail** | Provider retorna erro / bounce rate alto (reset de senha crítico) | Alto | Provider + Sentry |
| 10 | **Cron não executou** | `/api/cron/ranking-recalc` não rodou/retornou 200 na janela (dead-man's-switch) | Alto | Better Stack heartbeat |
| 11 | **Certificado perto de expirar** | TLS < ~14 dias para expirar (segurança extra à renovação automática da Vercel) | Médio | Better Stack |

## 4. Pós-lançamento (🟢)

- **Anomalia de anti-fraude** — picos improváveis de pontos/XP/tempo de estudo, múltiplas contas do
  mesmo IP (liga ao `SECURITY_CHECKLIST` F8). Alerta, não bloqueio automático.
- **Dashboards de negócio** — DAU/retenção/conclusão de aulas (separar de observabilidade técnica).
- **Log drain centralizado** (Logpush → Better Stack/observability) se o volume superar os nativos.
- **Distributed tracing** ponta a ponta (Sentry Tracing / OpenTelemetry) para latência de Actions → DB.
- **Alertas de LGPD/retenção** — jobs de expurgo/anonimização executando conforme política.

## 5. Notas de implementação

- **PII em logs:** nunca logar senha/hash/token/`AUTH_SECRET`; mascarar e-mail e dados de `Profile`
  (`phone`, `birthDate`, `city`) — configurar `beforeSend` do Sentry para scrubbing (`SECURITY_CHECKLIST` P2).
- **Health endpoint:** criar uma rota leve (ex.: `/api/health`) que cheque app + conectividade com o
  banco (sem expor detalhes) para o checador externo — não reusar rota autenticada.
- **Ambientes:** separar projetos/DSN do Sentry e checagens por ambiente (`ENVIRONMENTS.md`); alertas
  de produção não devem disparar por ruído de staging/dev.
- **Cron dead-man's-switch:** como não há processo residente, o risco é o cron **não** disparar —
  monitorar ausência de execução (heartbeat), não só falha.
