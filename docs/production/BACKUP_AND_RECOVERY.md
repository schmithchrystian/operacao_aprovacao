# Backup e Recuperação (Operação Aprovação)

> Produzido pelo subagente `database`. Assume [`SUPABASE_DECISION.md`](./SUPABASE_DECISION.md)
> (Postgres gerenciado pelo Supabase + Storage) e a matriz de ambientes de
> [`ENVIRONMENTS.md`](./ENVIRONMENTS.md). Documento de planejamento — nenhum backup/restauração foi
> executado por este agente. Valores de plano/preço/limite: **verificar no painel Supabase/Vercel**
> antes do go-live (não fixados aqui).

## 1. Backup do PostgreSQL (Supabase)

Fatos confirmados via documentação oficial Supabase (pesquisa desta fase, ver fontes no rodapé):

- **Daily Backups**: incluídos a partir do plano **Pro** — retenção de **7 dias** no Pro, **14 dias**
  no Team, **até 30 dias** no Enterprise. **Verificar no painel** se o projeto de produção está no
  tier correto e qual a retenção efetiva contratada.
- **PITR (Point-in-Time Recovery)**: disponível como **add-on** nos planos **Pro, Team e
  Enterprise** — restaura para qualquer instante dentro da janela de retenção (7 dias por padrão no
  Pro, ampliável até 28 dias via self-serve; até 30 dias no Enterprise).
- **PITR e Daily Backups são mutuamente exclusivos**: ativar PITR desliga os Daily Backups (PITR já
  oferece granularidade maior). **Decisão para produção: ativar PITR** (ver RPO/RTO §5) assim que o
  projeto estiver no tier que suporta o add-on — **confirmar disponibilidade/custo no painel** antes
  de contar com isso operacionalmente.
- **Free tier**: **verificar no painel** se o projeto de staging/dev usará backup gerenciado do
  Supabase ou só `pg_dump` manual (§3) — não presumir Daily Backups automáticos fora do Pro+.

### 1.1 Retenção proposta por ambiente

| Ambiente | Mecanismo | Retenção alvo | Observação |
|---|---|---|---|
| production | PITR (add-on) | 7-28 dias — **confirmar plano contratado no painel** | Prioridade máxima; sem isso, qualquer incidente de dados é irreversível além do último `pg_dump` manual. |
| staging | Daily Backups (se no tier) ou `pg_dump` manual periódico | Curta (dias) | Não guarda dado real de usuário, só massa de QA — retenção curta é aceitável. |
| development | `pg_dump` manual sob demanda | Efêmera | Recriável via seed a qualquer momento. |
| local | Nenhum (Postgres local descartável) | N/A | Recriável via seed. |

## 2. Restauração — procedimento e teste

### 2.1 Procedimento (via painel Supabase)

1. Acessar o projeto → **Database → Backups** (ou **Point in Time Recovery**, se ativo).
2. Escolher o ponto de restauração (backup diário específico, ou timestamp exato via PITR).
3. Confirmar a restauração — **atenção:** o comportamento padrão do Supabase é restaurar **sobre o
   mesmo projeto** (não cria automaticamente um projeto novo) — planejar uma janela de manutenção
   antes de restaurar em produção, pois o banco fica indisponível durante o processo.
4. Após restaurar, validar integridade: contagem de linhas nas tabelas críticas (`User`,
   `Enrollment`, `PointTransaction`), checar `_prisma_migrations` (histórico de migrations deve
   bater com o esperado), rodar `npx prisma migrate status` para confirmar que nenhuma migration
   ficou pendente/inconsistente.
5. Invalidar sessões ativas se a restauração voltou no tempo o suficiente para reintroduzir
   credenciais/estado desatualizado (ex.: senha trocada após o ponto restaurado voltaria a valer a
   senha antiga) — comunicar usuários afetados conforme necessário.

### 2.2 Teste de restauração (obrigatório antes do go-live e periodicamente depois)

- **Antes do go-live:** executar uma restauração completa em um projeto Supabase de teste (não em
  produção) a partir de um backup/PITR do ambiente de staging, e validar com a suíte de testes
  (`npm run test` com `DATA_SOURCE=prisma` apontando para o banco restaurado) que os dados restaurados
  sustentam a aplicação normalmente.
- **Periodicidade recomendada pós-go-live:** teste de restauração trimestral (mínimo) em ambiente
  isolado — nunca testar restaurando por cima de produção.
- Documentar o tempo real observado (não só o RTO alvo) a cada teste, para recalibrar a meta se
  necessário.

## 3. Exportação manual (`pg_dump`)

Complementar aos backups gerenciados — útil para: (a) portabilidade/fuga de fornecedor, (b) cópia
pontual antes de uma migration arriscada, (c) ambientes sem PITR/Daily Backups (free tier).

```bash
# Contra a connection string DIRETA (porta 5432) do ambiente-alvo.
pg_dump "$DIRECT_URL" --format=custom --file="backup-$(date +%Y%m%d-%H%M%S).dump"

# Restaurar (para um banco novo/vazio, nunca sobre produção sem plano de rollback):
pg_restore --clean --if-exists --dbname="$DIRECT_URL_DESTINO" backup-XXXXXXXX.dump
```

- Rodar manualmente **antes de todo `migrate deploy` em produção** (item já fixado em
  `ENVIRONMENTS.md` §4, checklist de promoção item 5).
- Armazenar o dump fora do próprio Supabase (ex.: bucket separado, storage do CI) — um dump guardado
  só ao lado do banco de origem não protege contra perda da conta/projeto inteiro.
- **Nunca commitar dumps no Git** (dados reais de usuário — LGPD).

## 4. Backup de arquivos (Supabase Storage)

Quando os buckets (materiais de aula, avatares, capas — bloqueador #9 do `CURRENT_STATE.md`, ainda
não implementado) existirem:

- Supabase Storage é backed por object storage (S3-compatível) — replicação/durabilidade é do
  provedor; **verificar no painel** se o backup do Storage está incluso no mesmo mecanismo do banco
  ou se é item separado (frequentemente não coberto pelo PITR do Postgres, que cobre só as tabelas
  de metadados do Storage, não os objetos binários em si — **confirmar no painel/documentação do
  tier contratado**).
- Recomendação: script periódico de sincronização dos buckets para um segundo storage (ex.:
  `rclone`/AWS CLI contra o endpoint S3-compatível do Supabase) como cópia de segurança independente,
  a implementar junto da Fase 12 (Storage) do roadmap — fora do escopo desta fase (schema/banco).

## 5. Recuperação de configuração/segredos

- **Segredos** (`AUTH_SECRET`, `CRON_SECRET`, `DATABASE_URL`/`DIRECT_URL`, futuras chaves de
  storage/e-mail/vídeo) vivem em variáveis de ambiente da Vercel (por ambiente) — **nunca no Git**
  (`.env`/`.env.local` já no `.gitignore`; só `.env.example` versionado sem valores reais,
  `docs/SECURITY.md` §6).
- **Recuperação:** manter uma cópia dos segredos de produção em um **cofre separado** (ex.: gestor de
  segredos da equipe/1Password/Vault) — se a configuração da Vercel for perdida/corrompida, é preciso
  uma fonte independente para recriar as env vars sem depender de "lembrar de cabeça" ou de acesso ao
  painel Supabase para regenerar tudo (regenerar `AUTH_SECRET` invalida todas as sessões ativas —
  aceitável em emergência, mas não trivial).
- Rotação de segredos: ao rotacionar `AUTH_SECRET`/`CRON_SECRET`/chaves do Supabase, atualizar
  primeiro no cofre, depois na Vercel, validar com smoke test, só então revogar o valor antigo (se
  aplicável).

## 6. Rollback de deploy (Vercel)

- A Vercel mantém histórico de deployments — rollback é **"promover" um deployment anterior** para
  produção via painel ou `vercel rollback` (CLI), tipicamente em segundos (não depende de rebuild).
- **Cuidado com acoplamento deploy↔schema:** se o deployment revertido espera um schema de banco
  diferente do atual (ex.: revertendo para antes de uma migration), o rollback de código sozinho não
  basta — precisa também reverter/coexistir com o estado do banco (ver §7). Regra prática: migrations
  **aditivas** (nunca destrutivas nesta fase, conforme `MOCK_MIGRATION_PLAN.md` §10) tornam o rollback
  de deploy seguro isoladamente, pois o schema novo é um superconjunto do antigo.
- Após rollback de deploy, invalidar caches/edge config se relevante e rodar smoke test básico
  (login, dashboard, uma ação de escrita) antes de considerar resolvido.

## 7. Rollback de migration

- Nenhuma migration desta fase é destrutiva (`0000_init` é criação inicial). Para futuras migrations:
  Prisma Migrate não gera "down migrations" automaticamente — o caminho de rollback real é **restaurar
  o backup pré-migration** (§2), não tentar reverter DDL manualmente em produção sob pressão.
  Alternativa mais segura para migrations aditivas simples (ex.: nova coluna nullable): reverter só o
  deploy de código (§6) e deixar a coluna nova sem uso — não é preciso reverter o schema.
- Antes de qualquer `migrate deploy` em produção: `prisma migrate diff` contra o schema atual do banco
  para confirmar exatamente o que vai mudar (checklist já em `ENVIRONMENTS.md` §4, item 1) + backup
  imediatamente antes (§3, `pg_dump`, mais o backup automático do Supabase).

## 8. Recuperação de conta admin

Cenários e respostas:

- **Perda de acesso de todos os admins (senha esquecida, conta desativada por engano):** sem fluxo de
  "esqueci minha senha" implementado ainda (bloqueador do `CURRENT_STATE.md` §1, item 8), a recuperação
  hoje é **operacional/manual**: gerar um novo hash bcrypt localmente
  (`node -e "console.log(require('bcryptjs').hashSync('<nova-senha-temporária>', 10))"`) e atualizar
  via SQL direto no painel Supabase (`UPDATE "User" SET "passwordHash" = '<hash>' WHERE email = '...'`),
  **auditado manualmen­te** (registrar quem fez, quando, por quê — fora do `AuditLog` automático já que
  é uma operação fora da aplicação). Tratar como procedimento de emergência, não como rotina.
- **Admin único fica inativo/sem papel admin (bug ou erro operacional):** mesma via manual acima —
  reativar/promover via SQL direto, já que a proteção "último admin não pode ser rebaixado" só existe
  na camada de aplicação (`MOCK_MIGRATION_PLAN.md` §8) e não impede uma alteração direta no banco.
- **Prevenção:** manter **pelo menos dois** admins ativos em produção a qualquer momento (nunca operar
  com um único admin) — reduz a chance de precisar do procedimento de emergência acima.
- **Após qualquer recuperação manual de admin:** forçar rotação da senha recém-definida no próximo
  login (funcionalidade a implementar — registrar como pendência) e revisar `AuditLog`/logs de acesso
  do período do incidente.

## 9. RPO e RTO iniciais (propostos para o MVP)

| Ambiente | RPO (perda máxima de dados aceitável) | RTO (tempo máximo de indisponibilidade aceitável) | Como é alcançado |
|---|---|---|---|
| **production** | **≤ 5 minutos** (com PITR ativo) — sem PITR, cai para o intervalo entre `pg_dump` manuais (não aceitável como estado permanente) | **≤ 4 horas** para restauração completa a partir de backup/PITR (tempo de restauração real do Supabase varia por tamanho de banco — **validar no teste de restauração**, §2.2, e recalibrar) | PITR (add-on Pro+) como mecanismo primário; `pg_dump` adicional pré-migration como segunda camada; rollback de deploy Vercel em minutos para incidentes só de código. |
| **staging** | ≤ 24 horas (Daily Backup, se disponível no tier) | ≤ 8 horas | Ambiente não crítico — sem usuários reais; prioridade é reduzir tempo de bloqueio da equipe, não dados. |
| **development** | Sem RPO formal (dado recriável via seed) | ≤ 1 hora (recriar via `migrate deploy` + `db:seed`) | Ambiente descartável por natureza. |
| **local** | N/A | N/A | Recriável a qualquer momento. |

**Justificativa do RPO/RTO de produção para um MVP** (produto ainda sem SLA contratual, poucos
usuários iniciais esperados): 5 minutos de RPO é alcançável com PITR sem custo operacional adicional
relevante; 4 horas de RTO é conservador o suficiente para cobrir o tempo real de restauração de um
banco pequeno/médio mais o tempo de validação manual (§2.1, passo 4) — **deve ser revisto para baixo
(RTO menor) conforme a base de usuários crescer e a criticidade aumentar**, e formalizado em um SLA
interno assim que o produto tiver uso real. Estes números são uma proposta inicial do agente
`database`, não um compromisso já validado operacionalmente — o primeiro teste de restauração (§2.2)
deve confirmar ou ajustar o RTO antes do go-live.

## Fontes consultadas (fatos de plano/pooling — julho de 2026)

- [Point in Time Recovery is now available for Pro projects — Supabase Blog](https://supabase.com/blog/postgres-point-in-time-recovery)
- [Manage Point-in-Time Recovery usage — Supabase Docs](https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery)
- [Database Backups — Supabase Docs](https://supabase.com/docs/guides/platform/backups)
- [Connect to your database — Supabase Docs](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Prisma — Supabase Docs](https://supabase.com/docs/guides/database/prisma)

> Preços, limites exatos de plano e disponibilidade de PITR/Daily Backups por tier **devem ser
> reconfirmados no painel Supabase do projeto real** antes do go-live — a pesquisa acima reflete a
> documentação pública no momento desta fase, não uma cotação do projeto específico.
