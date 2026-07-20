# Matriz de Riscos — Produção (Operação Aprovação)

> Produzido pelo subagente `reviewer`. Consolida os riscos dispersos nos 18 documentos de
> `docs/production/` + [`docs/SECURITY.md`](../SECURITY.md) numa matriz única. Complementa o
> [`PRODUCTION_ROADMAP.md`](./PRODUCTION_ROADMAP.md) (fases) e o [`COST_MODEL.md`](./COST_MODEL.md) (custos).
>
> **Escala** — Probabilidade: Baixa / Média / Alta · Impacto: Baixo / Médio / Alto / Crítico ·
> Severidade = combinação (🔴 Crítica · 🟠 Alta · 🟡 Média · 🟢 Baixa). "Dono" é o **agente** responsável
> pela mitigação (papel, não pessoa).

## 1. Matriz consolidada

| # | Risco | Prob. | Impacto | Sev. | Mitigação | Dono | Fonte |
|---|---|---|---|---|---|---|---|
| R1 | **Backdoor de senha `senha123`** — hash lido do mock incondicionalmente; ligar `DATA_SOURCE=prisma` cria backdoor + quebra login real | Alta | Crítico | 🔴 | Bloqueador #1: `findCredentialsByEmail` no repo; import de mock condicional; teste de regressão obrigatório no CI antes de qualquer `prisma` | security, backend | CURRENT_STATE §1(1), AUTH §1 |
| R2 | **Repos Prisma são stubs** — `DATA_SOURCE=prisma` hoje faz toda a app lançar `not implemented` | Alta | Crítico | 🔴 | Implementar os 37 stubs + 3 novos (audit/tokens) por domínio; testes de integração 37/37 | database, backend, gamification, simulations, study-tracking | CURRENT_STATE §1(2), MOCK_MIGRATION §5 |
| R3 | **Falha transacional grava pontuação parcial** — sem `$transaction` real, aula+evento+pontos podem gravar parcialmente; cenário nunca testado em lugar nenhum | Média | Crítico | 🔴 | `$transaction` atômica (Fase 6); teste de rollback forçando erro no meio (cenário §25 #12) | gamification, backend | GO_LIVE §7(5), MOCK_MIGRATION §8 |
| R4 | **Dupla finalização de simulado sob concorrência** — `version` só documentado, testado só em série | Média | Alto | 🟠 | `updateMany WHERE version=?`; teste com `Promise.all` em conexões distintas (≥20x) | simulations, backend | SECURITY F4, GO_LIVE §7(6) |
| R5 | **Idempotência de gamificação depende de `@unique` real** — "checar antes de inserir" não basta em multi-instância | Média | Alto | 🟠 | Confiar nos `@unique` do schema (já presentes); teste de duplo POST concorrente | gamification, database | SECURITY F1, MOCK_MIGRATION §3 |
| R6 | **Estado efêmero em `globalThis`** (rate-limit, locks de flashcard/foco, ledger, ranking) não sobrevive a serverless multi-instância/restart | Alta | Alto | 🟠 | Migrar para KV/Redis preservando interface (Fase 10); repos Prisma eliminam o resto | backend, security | CURRENT_STATE §1(5,6) |
| R7 | **Custo de vídeo imprevisível** — cobrança por minuto armazenado/entregue escala com banda e nº de alunos | Média | Alto | 🟠 | Escolher provider com custo previsível (Cloudflare Stream em escala); URL assinada curta; monitorar minutos entregues; **confirmar preço no painel** | backend | VIDEO §5, COST_MODEL |
| R8 | **Proxy laranja Cloudflare na frente da Vercel** quebra SSL/renovação, duplica cache (vaza sessão), esconde IP de origem | Média | Alto | 🟠 | Começar **DNS-only**; proxy só pós-lançamento, registro a registro, com Cache Bypass/True-Client-IP/SSL Full strict/O2O off, medindo latência | security | CLOUDFLARE §1, DOMAIN §5 |
| R9 | **`next-auth@5.0.0-beta` em produção** — breaking change entre versões beta sem teste de contrato | Média | Alto | 🟠 | Fixar versão exata; acompanhar changelog; revisitar testes de login a cada bump; reavaliar antes do público | backend, security | SECURITY D3, GO_LIVE §8 |
| R10 | **Migration destrutiva em produção** — rollback de código não reverte schema; sem "down migration" | Baixa | Crítico | 🟠 | `migrate deploy` fora do build Vercel, em job de CI com gate humano; migrations **aditivas** (expand/contract); backup `pg_dump` imediatamente antes | database, backend | VERCEL §6, MOCK_MIGRATION §10, BACKUP §7 |
| R11 | **0 testes exercitam Prisma / 0 e2e** — suíte passaria mesmo com bug grave de mapeamento/query | Alta | Alto | 🟠 | Infra de teste de integração puxada para a Fase 5; e2e (Playwright); CI como gate | tester, backend | GO_LIVE §7(1,2) |
| R12 | **Vazamento de PII por flags de privacidade ignoradas** na projeção de ranking/perfil público | Média | Alto | 🟠 | Respeitar `isProfilePublic/showInRanking/showRealName/showCityState` no `PrismaProfileRepository`; teste §25 #9 | security, database | SECURITY P9, CURRENT_STATE §2 |
| R13 | **Restore de backup nunca testado** — RTO/RPO são propostas não validadas; procedimento pode ter passo errado | Média | Crítico | 🟠 | Restore completo em projeto de teste antes do go-live + trimestral; validar suíte contra banco restaurado | database | BACKUP §2.2/§9, GO_LIVE I6 |
| R14 | **Cron não dispara silenciosamente** (sem processo residente, falha é ausência, não erro) | Média | Alto | 🟠 | Vercel Cron + dead-man's-switch (heartbeat/Better Stack); recálculo idempotente | backend, gamification, security | MONITORING §3(10), ROADMAP F17 |
| R15 | **Upload malicioso** (SVG com script, executável renomeado) via `/api/uploads` | Média | Alto | 🟠 | Validar MIME por magic bytes (não extensão); allowlist por categoria; renomear arquivo; bucket privado; antivírus para material de terceiros | backend, security | STORAGE §3, SECURITY R2 |
| R16 | **Revogação de sessão inexistente** — desativar usuário não invalida JWT até 1 dia (`updateAge`) | Média | Médio | 🟡 | `User.tokenVersion` + revalidação no callback `jwt`; `signOut` forçado em ações sensíveis | backend, security | AUTH §5.3 |
| R17 | **Ficar sem admin** — troca do último admin não é transacional (nem no mock) | Baixa | Alto | 🟡 | Verificação transacional antes de rebaixar/desativar; manter ≥ 2 admins em produção | backend, security | MOCK_MIGRATION §8, BACKUP §8 |
| R18 | **Divergência de modelo de token** (reset/verificação) entre AUTH e EMAIL plans → reset escreve num lugar e login lê de outro | Média | Alto | 🟡 | `database` fecha **um** desenho antes da Fase 15; garantir mesmo `UserRepository` para escrita/leitura de senha | database, backend | ROADMAP §3.1 C-1, EMAIL §6 |
| R19 | **Volume de trabalho da Fase 18** (37 repos × testes) estoura cronograma | Alta | Médio | 🟡 | Testar incrementalmente por domínio junto das Fases 5–7, não ao final; coordenação estreita | tester, todos | GO_LIVE §8 |
| R20 | **LGPD sem dono** — obrigações valem desde o 1º usuário real; pacote legal não tem responsável | Média | Alto | 🟡 | Nomear dono negócio/jurídico; política/consentimento/exclusão/retenção/DPO antes do público | security, architect | SECURITY §7, ROADMAP §3.3 G-7 |
| R21 | **Seed/credenciais fake em produção** por engano | Baixa | Crítico | 🟡 | `db:seed` recusa `NODE_ENV=production`; admin só via `bootstrap-admin.ts`; grep de `senha123`/`mockCredentials` inalcançável | database, security | MOCK_MIGRATION §7, GO_LIVE M2/M4 |
| R22 | **Segredo vazado / config Vercel perdida** sem fonte independente de recuperação | Baixa | Alto | 🟡 | Cópia de segredos em cofre separado (1Password/Vault); rotação com smoke test; `.env` fora do git | backend, database | BACKUP §5, GO_LIVE I11 |
| R23 | **Esgotamento do pool de conexões** (Supavisor `:6543`) sob carga — nunca medido | Baixa | Alto | 🟡 | `?pgbouncer=true` obrigatório; teste de sanidade de carga (N req simultâneas) contra pooled real | backend, database | GO_LIVE T6/§7(7) |
| R24 | **E-mail cai em spam** sem SPF/DKIM/DMARC — reset de senha (crítico) não chega | Média | Médio | 🟡 | Subdomínio de envio dedicado; SPF/DKIM/DMARC validados por ferramenta antes do 1º envio real | backend | EMAIL §3, DOMAIN §3(15) |
| R25 | **CSP com `'unsafe-inline'`** em `script-src` (sem nonce) | Baixa | Médio | 🟢 | Endurecer com nonce por requisição (pós-lançamento); restringir `img-src`/`media-src` ao CDN | security | SECURITY C3/X1 |
| R26 | **Node 20 descontinuado na Vercel em 1/out/2026** — deploys passam a falhar | Baixa | Médio | 🟢 | Fixar `engines.node = "22.x"` + painel Vercel na mesma versão | backend | VERCEL §4, GO_LIVE I10 |

## 2. Top 5 riscos (por severidade × probabilidade)

1. **R1 — Backdoor `senha123`** 🔴 — a única falha que cria acesso não autorizado imediato ao virar `prisma`. Bloqueia todo o resto.
2. **R2 — Repos Prisma stub** 🔴 — sem eles, `DATA_SOURCE=prisma` não roda; é o grosso do trabalho.
3. **R3 — Falha transacional grava pontuação parcial** 🔴 — bug de integridade silencioso, **nunca testado em lugar nenhum**; só apareceria em produção.
4. **R11 — 0 testes de Prisma/e2e** 🟠 — nenhuma evidência de que a implementação futura funciona; amplifica R2/R3/R4.
5. **R7 / R8 (empate operacional)** 🟠 — custo de vídeo imprevisível (R7) e proxy Cloudflare mal configurado na frente da Vercel (R8): os dois maiores riscos de infra/custo que podem quebrar orçamento ou disponibilidade.

## 3. Riscos por fase (referência rápida)

- **Antes de ligar `prisma` (🔴):** R1, R2, R3, R4, R5, R10, R21.
- **Antes do beta (🟠):** R6, R7, R9, R11, R12, R13, R14, R15.
- **Antes do público (🟡):** R16, R17, R18, R19, R20, R22, R23, R24.
- **Pós-lançamento (🟢):** R25, R26.
