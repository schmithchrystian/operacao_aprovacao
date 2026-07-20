# Ambientes — Operação Aprovação

> Produzido pelo subagente `architect`. Matriz dos 4 ambientes (local, development,
> staging, production). Complementa [`CURRENT_STATE.md`](./CURRENT_STATE.md) e
> [`TARGET_ARCHITECTURE.md`](./TARGET_ARCHITECTURE.md). Regra inegociável:
> **produção NUNCA compartilha banco, storage ou segredos com dev/staging.**

## 1. Princípios

1. **Isolamento de banco por ambiente** — cada ambiente aponta para um **projeto/branch Supabase separado**. Produção não compartilha instância com nada.
2. **Dados fake só fora de produção** — o `seed.ts` (demo: 10 alunos, `senha123`, etc.) roda em local/development/staging. **Produção nunca recebe dados de seed/demo.**
3. **Staging não é público** — protegido contra acesso anônimo e indexação (Cloudflare Access **ou** Basic Auth + `X-Robots-Tag: noindex`), para não vazar conteúdo/ranking nem competir com produção em buscadores.
4. **Segredos por ambiente** — `AUTH_SECRET`/`CRON_SECRET` distintos e fortes em cada ambiente; o boot em `production` já falha se forem os defaults de dev (`env.ts` superRefine).
5. **E-mail e vídeo em sandbox fora de produção** — nunca disparar e-mail real para endereços de terceiros a partir de dev/staging.

## 2. Matriz de ambientes

| Dimensão | **local** | **development** | **staging** | **production** |
|---|---|---|---|---|
| Propósito | Dev na máquina | Ambiente compartilhado de integração | Pré-produção / QA / homologação | Usuários reais |
| `DATA_SOURCE` | `mock` (default) ou `prisma` p/ testar | `prisma` | `prisma` | `prisma` |
| `NODE_ENV` | `development` | `development`/`production`* | `production` | `production` |
| Banco | Postgres local **ou** Supabase branch pessoal | Supabase projeto/branch **dev** | Supabase projeto/branch **staging** | Supabase projeto **production dedicado** |
| Conexão | `DATABASE_URL` local; `DIRECT_URL` local | pooled `:6543 pgbouncer=true` + `DIRECT_URL :5432` | idem, projeto staging | idem, projeto production |
| Storage | Supabase Storage bucket local/dev ou emulado | bucket **dev** | bucket **staging** | bucket **production** |
| Autenticação | Auth.js + seed (`senha123`) | Auth.js + seed | Auth.js + contas de QA | Auth.js + **contas reais**; senha via `UserRepository` |
| Domínio | `localhost:3000` | `dev.<dominio>` (interno) | `staging.<dominio>` (protegido) | `<dominio>` público |
| Acesso | máquina do dev | time de dev | **restrito** (Cloudflare Access/Basic Auth) + `noindex` | público |
| E-mail | **console/log** (sem envio real) | provider em **sandbox** | provider em **sandbox** / endereços internos | provider **real** |
| Vídeo | placeholder/URL de teste | assets de teste do provider | assets de teste/staging | biblioteca **real** |
| Dados permitidos | seed demo | seed demo | seed demo + massa de QA | **sem dados fake** — só reais |
| Segredos | defaults de dev OK | segredos dedicados (não defaults) | segredos dedicados | **segredos fortes exclusivos**; rotacionáveis |
| Cron (`/api/cron/*`) | disparo manual | manual/agendado | Vercel Cron (staging) | Vercel Cron (prod) |
| Rate-limit/locks | `globalThis` (mock) | KV/Redis (dev) | KV/Redis (staging) | KV/Redis (prod) |
| Migrations | `migrate dev` livre | `migrate deploy` via CI | `migrate deploy` via CI | `migrate deploy` via CI, com backup antes |
| Logs | console | agregados (nível dev) | agregados | agregados + retenção + alertas |
| Retenção | efêmera | curta | curta/média | **definida por política** (auditoria/LGPD — verificar) |

\* `development` na Vercel usa `NODE_ENV=production` no build por padrão; a distinção "ambiente dev" é feita por env vars/branch, não só por `NODE_ENV`.

## 3. Observações por ambiente

- **local:** único ambiente onde `DATA_SOURCE=mock` é o modo normal (sem exigir Postgres). Ao validar a migração Prisma localmente, subir um Postgres local (ou branch Supabase pessoal) e rodar `db:generate` → `migrate dev` → `db:seed`.
- **development:** primeiro ambiente com Prisma real; alvo para exercitar os `PrismaXxxRepository` e os testes de integração no CI.
- **staging:** espelho de produção em configuração (mesmos providers, modo sandbox). Serve para validar migrations destrutivas e o fluxo de recuperação de senha/vídeo antes de produção. **Nunca indexável, nunca público.**
- **production:** único ambiente com contas e conteúdo reais. Sem seed. Migrations aplicadas via `migrate deploy` com backup prévio. Segredos exclusivos e rotacionáveis. Cron e KV dedicados.

## 4. Checklist de promoção (dev → staging → production)

1. Migration aplicada e revisada (`migrate diff` limpo) no ambiente anterior.
2. `lint`/`typecheck`/`test`/`build` verdes no CI.
3. Testes de integração contra Postgres do ambiente anterior passando.
4. Segredos do ambiente-alvo configurados (não defaults).
5. Backup do banco de produção antes de qualquer `migrate deploy` em produção.
6. Bloqueador #1 (senha via `UserRepository`) resolvido **antes** de qualquer ambiente com `DATA_SOURCE=prisma` e usuários reais.
