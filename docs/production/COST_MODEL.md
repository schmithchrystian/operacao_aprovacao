# Modelo de Custos — Produção (Operação Aprovação)

> Produzido pelo subagente `reviewer`. Estrutura de custos mensais por componente da stack-alvo
> (`TARGET_ARCHITECTURE.md`). Complementa [`PRODUCTION_ROADMAP.md`](./PRODUCTION_ROADMAP.md) e
> [`RISK_MATRIX.md`](./RISK_MATRIX.md).
>
> ## ⚠️ Regra deste documento
> **Nenhum preço é fixado aqui.** Preços de nuvem mudam com frequência, variam por região/moeda e por
> negociação de plano. Toda célula de valor está como **"a verificar"** com o **painel/página exata** a
> consultar. Preencher só depois de confirmar no painel do projeto real, no momento da contratação.
> As faixas de usuários (50 / 500 / 5.000) indicam **qual plano tende a ser necessário** e **quais
> componentes começam a escalar**, não quanto custam.

---

## 1. Componentes e onde verificar o preço

| Componente | Papel na stack | Onde verificar o preço (painel/página exata) |
|---|---|---|
| **Vercel** | Hosting Next.js, Functions serverless, Vercel Cron, Analytics/Speed Insights, log retention | Vercel → **Settings → Billing** e **vercel.com/pricing** (Hobby vs Pro vs Enterprise); uso em **Usage** (Functions, Bandwidth, Edge Requests, Image Optimization) |
| **Supabase (Postgres)** | Banco gerenciado, pooling Supavisor, PITR/backups | Supabase → projeto → **Settings → Billing / Usage**; **supabase.com/pricing** (Free/Pro/Team); add-on PITR em **Database → Backups** |
| **Supabase Storage** | Buckets (avatares, capas, materiais, certificados) | Supabase → **Storage → Usage** e a mesma página de **Billing** (GB armazenado + GB de egress) |
| **Domínio (Registro.br)** | Registro do `.com.br` (anual, não mensal) | **registro.br** → preço do domínio `.com.br` (tarifa anual publicada); renovação no painel do Registro.br |
| **Cloudflare** | DNS autoritativo, DNSSEC, Turnstile (grátis), Access (staging), WAF/proxy (pós) | **cloudflare.com/plans**; DNS é gratuito no plano Free; Turnstile em **Turnstile** (grátis até limite — verificar); Access/Zero Trust em **Zero Trust → Billing**; WAF em plano pago |
| **Streaming de vídeo** | Hospedagem/streaming protegido (provider a decidir) | **Cloudflare Stream** (dash.cloudflare.com → Stream → pricing) · **Mux** (dashboard.mux.com → Billing / mux.com/pricing) · **Bunny Stream** (bunny.net/pricing) — por minuto **armazenado** + por minuto/GB **entregue** |
| **E-mail transacional** | Verificação, reset de senha, notificações (Resend recomendado) | **Resend** (resend.com/pricing → Billing/Usage) · alternativas: Postmark, AWS SES, SendGrid — por **e-mails/mês** |
| **KV/Redis** | Rate-limit + locks distribuídos (Upstash/Vercel KV) | **Upstash** (console.upstash.com → Billing / upstash.com/pricing) ou **Vercel KV** (Vercel → Storage → KV) — por **comandos/requisições** + armazenamento |
| **Monitoramento** | Erros/performance (Sentry), uptime/status/on-call (Better Stack) | **Sentry** (sentry.io → Settings → Billing / sentry.io/pricing) por **eventos/mês** · **Better Stack** (betterstack.com/pricing) por **monitores/checks** · alternativa grátis: Uptime Kuma self-host |
| **Backups** | PITR (produção) / Daily Backups (staging) / `pg_dump` | Incluído/add-on no **Supabase Billing** (ver componente Postgres); custo de armazenar o `pg_dump` externo no storage do CI/bucket separado — verificar no provedor desse storage |
| **Turnstile / anti-abuso** | CAPTCHA no login/registro/reset | **Cloudflare → Turnstile** (gratuito até um volume — verificar limite atual) |
| **CI/CD (GitHub Actions)** | Pipeline, testes de integração (Postgres efêmero) | **GitHub → Settings → Billing → Actions** (minutos/mês; repositório privado consome minutos do plano); **github.com/pricing** |

---

## 2. Drivers de custo — o que faz a conta subir

| Driver | Componentes afetados | Nota |
|---|---|---|
| **Banda / egress** | Vercel (Bandwidth), Supabase Storage (egress), vídeo (minutos entregues), Cloudflare (se proxy) | O maior driver de vídeo educacional; cresce com nº de alunos × minutos assistidos. |
| **Minutos de vídeo** | Provider de vídeo (armazenado **e** entregue) | Armazenado cresce com o catálogo; entregue cresce com audiência. **Verificar as duas dimensões.** |
| **Armazenamento** | Supabase (DB size + Storage), backups | PDFs/materiais grandes por curso e histórico de auditoria (`AuditLog`) crescem o DB. |
| **Usuários ativos** | Supabase (conexões/consultas), Vercel (Functions), KV (comandos), e-mail | Cada aluno ativo gera consultas, invocações de função e e-mails. |
| **E-mails/mês** | Provider de e-mail | Verificação + reset + notificações; picos em campanhas/onboarding. |
| **Funções serverless (invocações + duração)** | Vercel Functions | Heartbeats de vídeo/foco (`/api/progress`, `/api/focus`) são chamados **repetidamente por sessão** — driver silencioso. |
| **Consultas ao banco** | Supabase (compute/IO), pool Supavisor | N+1 mal implementado nos repos Prisma multiplica custo — vigiar com `pg_stat_statements`. |
| **Logs / eventos de erro** | Sentry (eventos), Vercel (retenção de log), log drain | Spike de erros = spike de eventos Sentry; retenção longa custa mais. |
| **Comandos KV/Redis** | Upstash/Vercel KV | Rate-limit checa a cada login/heartbeat; escala com tráfego. |
| **Minutos de CI** | GitHub Actions | Subir Postgres efêmero a cada push (vs só no merge) multiplica minutos — decisão de `CI_CD.md` §3. |

**Heurística de sensibilidade:** para este produto (vídeo-aula + gamificação), os custos que mais
escalam com o sucesso são, em ordem: **(1) vídeo entregue**, **(2) banda/egress Vercel+Storage**,
**(3) invocações de Functions por heartbeat**, **(4) e-mails**. Banco e KV crescem de forma mais suave.

---

## 3. Custo por cenário — qual plano/atenção por faixa de usuários

> Células de **valor** ficam em branco de propósito — preencher com o painel indicado na §1.
> "Plano provável" é orientação, não cotação.

### 3a. Até 50 usuários (MVP / beta fechado)

| Componente | Plano provável | Valor mensal | Driver dominante nesta faixa |
|---|---|---|---|
| Vercel | Hobby ou Pro (Pro se precisar de Custom Environments p/ staging isolado — `VERCEL_DEPLOYMENT` §1) | a verificar | Fixo do plano; uso irrisório |
| Supabase Postgres | Pro (necessário para Daily Backups/PITR — `BACKUP_AND_RECOVERY` §1) | a verificar | Fixo do plano |
| Supabase Storage | Incluído no Pro (verificar franquia) | a verificar | Armazenamento baixo |
| Domínio Registro.br | Tarifa anual `.com.br` | a verificar (anual) | Fixo |
| Cloudflare | Free (DNS+DNSSEC+Turnstile) | a verificar (grátis provável) | Zero se sem proxy |
| Vídeo | Bunny Stream ou YouTube não-listado (ver ressalva `VIDEO` §2) | a verificar | Catálogo pequeno; audiência baixa |
| E-mail | Resend Free tier | a verificar | Poucos e-mails |
| KV/Redis | Upstash Free / pode continuar `globalThis` em dev | a verificar | Baixo |
| Monitoramento | Sentry Free + Better Stack Free/Uptime Kuma | a verificar | Poucos eventos |
| Backups | Incluído no Supabase Pro | a verificar | — |
| CI (GitHub Actions) | Free tier (repo privado tem franquia) | a verificar | Poucos minutos |

**Foco desta faixa:** custo é quase todo **fixo de plano** (Vercel Pro + Supabase Pro). Uso variável é
desprezível. Objetivo é validar produto, não otimizar custo.

### 3b. Até 500 usuários (lançamento / crescimento inicial)

| Componente | Plano provável | Valor mensal | Driver dominante nesta faixa |
|---|---|---|---|
| Vercel | Pro | a verificar | Bandwidth + invocações de Functions (heartbeats) começam a contar |
| Supabase Postgres | Pro (vigiar conexões/compute) | a verificar | Consultas por usuário ativo |
| Supabase Storage | Pro + possível excedente | a verificar | Egress de materiais/avatares |
| Domínio | Anual | a verificar | Fixo |
| Cloudflare | Free; avaliar Access p/ staging | a verificar | Access se usado |
| **Vídeo** | Bunny Stream ou Cloudflare Stream (proteção real) | a verificar | **Minutos entregues — começa a ser o maior item variável** |
| E-mail | Resend pago (acima do Free) | a verificar | Verificação + reset + notificações |
| KV/Redis | Upstash pago | a verificar | Comandos por heartbeat/login |
| Monitoramento | Sentry pago (acima da franquia de eventos) + Better Stack | a verificar | Eventos de erro |
| Backups | Supabase Pro + `pg_dump` externo | a verificar | Armazenamento do dump |
| CI | GitHub Actions (possível excedente de minutos) | a verificar | Testes de integração no merge |

**Foco desta faixa:** o custo começa a ter **componente variável relevante** — sobretudo **vídeo** e
**bandwidth**. Monitorar minutos entregues do provider de vídeo e egress do Storage semanalmente.

### 3c. Até 5.000 usuários (produção estável / escala)

| Componente | Plano provável | Valor mensal | Driver dominante nesta faixa |
|---|---|---|---|
| Vercel | Pro (avaliar Enterprise se Functions/Bandwidth altos) | a verificar | Functions (heartbeats em massa) + Bandwidth |
| Supabase Postgres | Pro/Team (compute add-on / mais conexões) | a verificar | Consultas concorrentes; tamanho do DB (auditoria) |
| Supabase Storage | Team + excedente de egress | a verificar | Egress de materiais em volume |
| Domínio | Anual | a verificar | Fixo |
| Cloudflare | Free → avaliar **pago** se ligar WAF/proxy/rate-limit de borda | a verificar | WAF/Rate limiting se proxy ligado |
| **Vídeo** | Cloudflare Stream (custo previsível em escala) ou Mux (se analytics crítico) | a verificar | **Maior item da conta — minutos entregues em escala** |
| E-mail | Resend pago (tier alto) ou reavaliar AWS SES | a verificar | Volume de e-mails/notificações |
| KV/Redis | Upstash pago (tier alto) | a verificar | Comandos em volume |
| Monitoramento | Sentry (tier maior de eventos) + Better Stack + possível log drain | a verificar | Eventos + retenção de log |
| Backups | Supabase PITR (janela maior) + dump externo | a verificar | Janela de retenção |
| CI | GitHub Actions (minutos consideráveis) | a verificar | Frequência de pipeline |

**Foco desta faixa:** **vídeo domina** a conta; decisão Cloudflare Stream vs Mux vira sobretudo
**custo em escala vs. profundidade de analytics** (`VIDEO` §2). Avaliar proxy/WAF Cloudflare (custo +
risco operacional — R8) e possível migração de e-mail para SES por custo de volume.

---

## 4. Recomendações de controle de custo

1. **Confirmar todos os "a verificar" no painel real** antes de comprometer orçamento — especialmente
   as **duas dimensões de vídeo** (armazenado + entregue) e o **egress** de Vercel/Storage.
2. **Isolar ambientes também no custo:** dev/staging em Free tier onde possível; só produção em plano pago
   com PITR — evita pagar 3× pelo mesmo add-on.
3. **Vigiar os drivers variáveis semanalmente** (minutos de vídeo, bandwidth, eventos Sentry) via os
   alertas de `MONITORING_PLAN.md` (#4 uso elevado, #8 storage perto do limite) — o custo de vídeo é o
   que mais surpreende.
4. **CI:** rodar testes de integração (Postgres efêmero) **só no merge**, não em todo PR (`CI_CD.md` §3),
   para não estourar minutos do GitHub Actions.
5. **Reavaliar provider de vídeo com dados reais de uso** (não travar Mux vs Cloudflare agora) — a decisão
   certa muda conforme audiência × necessidade de analytics.
