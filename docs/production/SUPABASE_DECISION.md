# Decisão de Banco de Dados — Supabase (Operação Aprovação)

> Produzido pelo subagente `database`. Complementa [`TARGET_ARCHITECTURE.md`](./TARGET_ARCHITECTURE.md)
> (que já recomenda a stack-alvo em alto nível) e [`CURRENT_STATE.md`](./CURRENT_STATE.md) (auditoria
> verificada). Este documento aprofunda a decisão de **banco de dados gerenciado** com os critérios
> pedidos e formaliza a recomendação para a fase de migração (`MOCK_MIGRATION_PLAN.md`).
>
> **Confirmado no código antes de decidir:** a autenticação atual **já é Auth.js v5 (NextAuth),
> Credentials + JWT** (`src/server/auth/`, `docs/SECURITY.md` §1) — RBAC pt-BR próprio
> (`aluno|professor|moderador|admin`), autorização server-side (`requireUser`/`requireRole`/
> `assertOwnership`), rate-limit, auditoria de admin e 741 testes assumem esse modelo. Portanto
> esta decisão **não parte do zero em auth** — qualquer opção que envolva trocar para Supabase Auth
> (GoTrue) é retrabalho, não ganho.

## 1. Opções avaliadas

| Opção | Descrição |
|---|---|
| **A** | Supabase **só como Postgres gerenciado** (+ Supabase Storage para arquivos) — Prisma via `@prisma/adapter-pg`, **Auth.js v5 mantido** (identidade/senha no próprio Postgres, tabela `User`). |
| **B** | Supabase **Postgres + Auth (GoTrue) + Storage** — trocar Auth.js por Supabase Auth; Prisma passaria a operar sobre o schema `auth.users` do Supabase (ou sincronizar com uma tabela própria). |
| **C** | Postgres em **outro provedor gerenciado** (ex.: Neon, RDS, Railway) + Auth.js mantido + storage externo (ex.: Cloudflare R2/S3). |

## 2. Tabela comparativa

| Critério | A — Supabase Postgres+Storage, Auth.js mantido | B — Supabase completo (Auth GoTrue) | C — Outro Postgres + Auth.js + storage externo |
|---|---|---|---|
| **Esforço de migração** | Baixo — só implementar os `PrismaXxxRepository` (já planejado) e mover leitura de senha para `UserRepository` (bloqueador #1, já especificado). Nenhuma mudança na camada de auth. | **Alto** — reescrever login/registro/RBAC sobre GoTrue, migrar 741 testes de auth/autorização, reconciliar `role` pt-BR com claims do Supabase Auth, mover 44 models para conviver com `auth.users`. | Baixo/Médio — mesmo trabalho de repositórios do A, mas sem Storage integrado (precisa escolher/objetar outro provider de arquivos) e sem console único banco+storage. |
| **Segurança** | Igual ao hoje (auth já endurecida) + isolamento de rede/backup gerenciado pelo Supabase. | Ganha MFA/OAuth "de fábrica", mas introduz nova superfície (GoTrue) e duplica onde a identidade "mora" (perde a garantia de que o `role` nunca vem de fora do nosso `UserRepository`). | Igual ao A na app; depende do provedor escolhido para criptografia em repouso/rede — variável, precisa avaliar caso a caso. |
| **Compatibilidade com código atual** | **Total** — Prisma + Postgres puro, é exatamente o que o schema (44 models) já pressupõe. | Baixa — schema/seed assumem `User.passwordHash` própria; teria que remodelar identidade. | Total — mesma compatibilidade do A (Postgres puro). |
| **Custo inicial** | Free tier cobre dev/staging pequenos; Pro para produção — **verificar valores no painel Supabase**. | Igual ao A + custo de reescrita (tempo de engenharia), não só infra. | Variável por provedor — **verificar no painel do provedor escolhido**; geralmente comparável ao Supabase Free/Pro. |
| **Escalabilidade** | Boa — Postgres gerenciado + pooler Supavisor pensado para serverless (Vercel Functions). | Igual ao A no banco; GoTrue escala independente, mas não é gargalo hoje. | Depende do provedor; Neon/RDS também têm pooling serverless equivalente. |
| **Dependência de fornecedor (lock-in)** | Baixa-média — só Postgres padrão + Storage (S3-compatível); troca de provedor de banco é um `pg_dump`/restore, não uma reescrita de auth. | **Alta** — identidade amarrada ao GoTrue; sair do Supabase exige migrar contas/sessões, não só dados. | Baixa — Postgres padrão; storage já é escolhido à parte (fácil trocar). |
| **Facilidade operacional** | Alta — um painel único para banco + storage + backups + logs. | Alta (mesmo painel), mas soma a complexidade operacional de gerenciar dois sistemas de identidade (Auth.js local + GoTrue) se algo não migrar 100%. | Média — painel do banco separado do painel/console do storage; mais um fornecedor para monitorar. |
| **Recuperação de senha** | Implementar via `EmailProvider` (Resend/Postmark/SES) chamando um fluxo próprio (token em `User`/tabela dedicada) — trabalho já prático hoje mesmo sem Supabase Auth. | GoTrue já tem o fluxo pronto (magic link/reset), mas exige que o usuário exista em `auth.users` — acopla ao Supabase. | Igual ao A — implementação própria via `EmailProvider`. |
| **Auth social (OAuth)** | Pode ser adicionado depois via provedores do próprio Auth.js (Google/GitHub etc.) sem trocar a fundação. | Pronto "de fábrica" no GoTrue. | Igual ao A (Auth.js suporta OAuth nativamente). |
| **Row Level Security (RLS)** | Disponível no Postgres do Supabase; **decisão abaixo** (§3) — não ativar agora, app já autoriza no server. | RLS é o modelo "nativo" esperado quando se usa Supabase Auth (JWT do GoTrue alimenta `auth.uid()` nas políticas) — faria mais sentido em B, mas não é o caminho escolhido. | RLS não é nativo/automático fora do Supabase (a maioria dos provedores oferece RLS do Postgres puro, mas sem a integração de JWT/`auth.uid()`). |
| **Prisma** | Suporte oficial e documentado (driver adapter `@prisma/adapter-pg`, pooling Supavisor). | Mesmo suporte técnico, mas convivendo com o schema `auth` do GoTrue (Prisma normalmente não gerencia esse schema). | Suporte oficial equivalente (Prisma é agnóstico de provedor Postgres). |
| **Ambientes separados** | Fácil — 1 projeto Supabase por ambiente (dev/staging/prod), princípio já fixado em `ENVIRONMENTS.md`. | Igual ao A, mas replicaria também a configuração de GoTrue (templates de e-mail, redirect URLs) por ambiente. | Fácil — 1 banco/branch por ambiente no provedor escolhido. |
| **Backups** | Backups automáticos + PITR conforme plano (ver `BACKUP_AND_RECOVERY.md`) — **verificar tier no painel**. | Igual ao A para o banco; GoTrue não tem "backup" próprio relevante (dados vivem no mesmo Postgres). | Depende do provedor — a maioria dos gerenciados oferece backup diário; PITR nem sempre incluso no tier básico. |
| **Observabilidade** | Painel Supabase (logs de query, uso de conexões, advisors) + Vercel; suficiente para o estágio do produto. | Igual ao A + logs de auth do GoTrue (não usados). | Depende do provedor — pode exigir ferramenta externa (ex.: Datadog) mais cedo. |

## 3. Recomendação: **Opção A**

**Supabase como Postgres gerenciado + Storage; Auth.js v5 mantido.** Já é, essencialmente, a
recomendação do `architect` em `TARGET_ARCHITECTURE.md` §1/§3 — este documento a formaliza sob os
critérios pedidos e não encontrou motivo para divergir.

**Por quê, em ordem de peso:**

1. **Trocar de auth agora é retrabalho sem ganho proporcional.** Auth.js v5 já está implementado e
   endurecido (Credentials + JWT, RBAC server-side, rate-limit, timing-defense, `isActive`, matriz
   de papéis admin, auditoria, 741 testes). Migrar para Supabase Auth reescreveria essa camada
   inteira e ainda deixaria pendente o mesmo trabalho de repositórios Prisma — não acelera a saída
   do modo mock, atrasa.
2. **A única dívida real de auth é pontual e já mapeada:** o hash de senha é lido direto do mock
   (bloqueador #1, `docs/SECURITY.md` §2) — a correção é mover para `UserRepository`, não trocar de
   provedor de identidade.
3. **Menor lock-in.** Com a Opção A, "sair do Supabase" no futuro é uma migração de Postgres
   (`pg_dump`/restore para outro gerenciado) — não uma migração de contas de usuário. Com a Opção B,
   a identidade fica amarrada ao GoTrue.
4. **Compatibilidade total com o que já existe:** 44 models, seed idempotente e migration
   `0000_init` já pressupõem um Postgres "puro" acessado via Prisma — exatamente o que a Opção A
   entrega, sem remodelagem de schema.
5. **Storage resolvido no mesmo fornecedor** sem acoplar identidade a ele — usa-se Supabase Storage
   para materiais/avatares/capas (bloqueador #9 do `CURRENT_STATE.md`) independentemente de como a
   auth funciona.

Auth social e MFA (vantagem de B) **não são um requisito hoje** e podem ser adicionados depois via
provedores OAuth do próprio Auth.js, sem revisitar esta decisão.

## 4. Prisma + Row Level Security (RLS) — como coexistem e por que não ativar agora

**Fato técnico:** o Prisma, via `@prisma/adapter-pg`, conecta ao Postgres usando **uma única
connection string privilegiada** (`DATABASE_URL`/`DIRECT_URL`) — tipicamente o usuário `postgres`
(ou um role de aplicação com permissão plena sobre as tabelas). No Supabase, esse role tem
privilégios equivalentes a *bypass* de RLS (RLS por padrão não se aplica a superusuário/dono da
tabela, e roles com o atributo `BYPASSRLS` também ignoram as políticas). **Na prática, ativar RLS
nas tabelas hoje não mudaria nada para o Prisma** — ele continuaria enxergando todas as linhas,
porque a autorização inteira já acontece **na aplicação** (`requireUser`/`requireRole`/
`assertOwnership`, `src/server/authorization/index.ts`), nunca delegada ao Postgres.

**Trade-off de tornar RLS uma defesa em profundidade real:**

- Exigiria criar um **role de banco dedicado sem `BYPASSRLS`** para a conexão de runtime (distinto
  do role de migrations, que precisa de privilégio pleno para DDL).
- Exigiria políticas RLS que leiam um identificador de usuário de **variável de sessão** (ex.:
  `current_setting('app.current_user_id')`), setada via `SET LOCAL` **a cada transação** — o que
  não combina bem com o pooling em modo transação do Supavisor (`:6543`, `pgbouncer=true`) usado
  pelo runtime serverless, pois cada transação do pool pode ser servida por uma conexão física
  diferente, exigindo disciplina extra para sempre setar a variável antes de cada query.
- Duplicaria a lógica de autorização (regra pt-BR de papéis, `assertOwnership`, matriz de admin) em
  dois lugares — SQL e TypeScript — aumentando a chance de divergência entre os dois, não reduzindo
  risco.

**Decisão:** **não ativar RLS nesta fase.** A autorização server-side já cobre o caso de uso (single
ponto de entrada — a própria API/Server Actions da aplicação; não há acesso de terceiros direto ao
Postgres via `anon`/`authenticated` key do Supabase, já que não estamos usando o client-side SDK do
Supabase para consultas). **Reavaliar como item de hardening (P3)** somente se, no futuro, algum
canal de acesso direto ao Postgres for introduzido (ex.: Supabase client JS no browser, APIs REST
autogeradas do PostgREST) — nesse cenário RLS deixaria de ser opcional e passaria a ser a única
barreira real contra IDOR fora da aplicação Next.js.

## 5. Consequência prática para os próximos documentos

- `MOCK_MIGRATION_PLAN.md` assume Opção A: um projeto Supabase por ambiente, `DATABASE_URL` pooled
  (`:6543`, `pgbouncer=true`) + `DIRECT_URL` direta (`:5432`), Prisma com `directUrl`, Storage do
  Supabase para uploads, Auth.js inalterado (só a fonte do hash de senha migra do mock para o
  `UserRepository`).
- `BACKUP_AND_RECOVERY.md` assume backups/PITR do Supabase (Postgres) como mecanismo primário, sem
  depender de nenhuma peça do GoTrue.
