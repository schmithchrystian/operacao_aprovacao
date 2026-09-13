# Lista de Finalizacao para Producao

> Checklist operacional unico para levar a Operacao Aprovacao de `DATA_SOURCE=mock` ao lancamento publico. Este arquivo organiza a execucao; os detalhes tecnicos e criterios completos continuam nas fontes linkadas.
>
> Regra de status: marcar um item somente com evidencia (PR, URL, resultado de teste, configuracao revisada ou ata de decisao). Nenhum item critico pode ser aceito por declaracao.

## 1. Ordem obrigatoria

1. Definir fornecedores, responsaveis e ambientes.
2. Corrigir bloqueadores de autenticacao e persistencia.
3. Implementar e testar a migracao para Postgres por dominio.
4. Validar em development e staging com dados de teste.
5. Completar protecoes SaaS, operacao e LGPD.
6. Fazer beta fechado.
7. Fazer go-live com aprovacoes explicitas.

Nao ativar `DATA_SOURCE=prisma` para usuarios reais enquanto os itens P0 de seguranca e persistencia nao estiverem concluidos.

## 2. Decisoes e contas do responsavel pelo produto

Responsavel: produto/operacao (usuario)

- [ ] Definir nome comercial, registrar titular legal e comprar o dominio principal `.com.br` no Registro.br.
- [ ] Criar a conta/organizacao do GitHub que sera dona do repositorio e conceder acesso minimo ao time tecnico.
- [ ] Criar organizacoes separadas, com MFA obrigatorio, para Vercel, Supabase, Cloudflare, provedor de e-mail, provedor de video, monitoramento e cofre de segredos.
- [ ] Definir provedores, custo estimado e responsavel de faturamento para banco/storage (Supabase).
- [ ] Definir provedores, custo estimado e responsavel de faturamento para hospedagem (Vercel).
- [ ] Definir provedores, custo estimado e responsavel de faturamento para DNS/protecao de borda (Cloudflare).
- [ ] Definir provedores, custo estimado e responsavel de faturamento para e-mail transacional (Resend, Postmark ou SES).
- [ ] Definir provedores, custo estimado e responsavel de faturamento para video protegido (Cloudflare Stream, Mux ou Bunny).
- [ ] Definir provedores, custo estimado e responsavel de faturamento para Redis/KV (Upstash ou Vercel KV).
- [ ] Definir provedores, custo estimado e responsavel de faturamento para erros e monitoramento (Sentry e Better Stack ou equivalente).
- [ ] Definir teto mensal de custo e alertas de faturamento para todos os provedores.
- [ ] Nomear quem aprova deploys de producao, migrations e acesso emergencial aos provedores.
- [ ] Nomear responsavel de negocio/juridico para LGPD, politica de privacidade, termos de uso, base legal, retencao e canal de solicitacoes de titulares.
- [ ] Decidir se o primeiro lancamento sera beta fechado ou publico e definir criterios de convite, suporte e reversao.

## 3. Provisionamento externo

Responsaveis: produto/operacao com apoio de database, backend e security

### 3.1 Supabase/Postgres

- [ ] Criar projetos isolados para `development`, `staging` e `production`; producao nunca compartilha banco, storage ou segredos.
- [ ] Coletar `DATABASE_URL` pooled (porta `6543`, `pgbouncer=true`) e `DIRECT_URL` direta (porta `5432`) de cada ambiente.
- [ ] Habilitar backup/PITR conforme o plano contratado e definir retencao esperada.
- [ ] Criar massa de QA somente em development e staging; proibir seed e dados demo em producao.
- [ ] Planejar uma restauracao em ambiente descartavel antes do beta e registrar o tempo real de recuperacao.

### 3.2 Vercel

- [ ] Importar o repositorio e configurar `main` como Production.
- [ ] Criar ambiente `staging` isolado, preferencialmente Custom Environment; se indisponivel, limitar variaveis Preview a branch `staging`.
- [ ] Configurar versao Node.js `22.x` no projeto e em `package.json`.
- [ ] Cadastrar variaveis por ambiente, cada uma com valor exclusivo: `AUTH_SECRET`, `CRON_SECRET`, `DATABASE_URL`, credenciais de storage, e-mail, video, KV e monitoramento.
- [ ] Guardar uma copia dos segredos de producao em cofre independente da Vercel; testar a recuperacao sem depender do painel.
- [ ] Manter migrations fora do build Vercel; usar job de CI com `DIRECT_URL`, backup previo e aprovacao humana para producao.
- [ ] Configurar Vercel Cron para recalculo de ranking e fechamento diario, com autenticao por `CRON_SECRET`.

### 3.3 Dominio, DNS e e-mail

- [ ] Adicionar o dominio e `www` na Vercel e copiar os registros exatos sugeridos pelo painel.
- [ ] Delegar DNS do Registro.br para Cloudflare e criar os registros de raiz e `www` como DNS-only inicialmente.
- [ ] Definir dominio principal e redirect 301 do alias.
- [ ] Criar `staging.<dominio>` protegido por Cloudflare Access ou Basic Auth e com `noindex`.
- [ ] Validar resolucao DNS, certificado TLS e renovacao automatica para raiz e `www`.
- [ ] Ativar DNSSEC somente depois de DNS e site estaveis.
- [ ] Configurar subdominio de envio, SPF, DKIM e DMARC com o provedor de e-mail; validar entrega antes de usuarios reais.
- [ ] Nao ativar proxy laranja da Cloudflare na frente da Vercel antes do pos-lancamento e de testes de cache, SSL e IP real.

## 4. P0 - Bloqueadores tecnicos antes de usuarios reais

Responsaveis: database, backend, security, tester

- [ ] Criar `src/server/db` com singleton `PrismaClient` e `PrismaPg` para runtime serverless.
- [ ] Validar `DATABASE_URL` e `DIRECT_URL` com Zod quando `DATA_SOURCE=prisma`.
- [ ] Ajustar `prisma.config.ts` para usar `directUrl` nas migrations.
- [ ] Adicionar `prisma generate` ao ciclo de instalacao/build e confirmar geracao limpa em CI e Vercel.
- [ ] Aplicar `0000_init` em development e depois staging; executar `prisma migrate status` sem pendencias.
- [ ] Implementar os 37 repositorios Prisma existentes, por dominio, sem deixar metodos `not implemented`.
- [ ] Criar repositorio persistente para `AuditLog`, que hoje nao existe como contrato/implementacao Prisma.
- [ ] Mover validacao de senha para `UserRepository.findCredentialsByEmail`; `credentials-service` nao pode importar mocks.
- [ ] Garantir que `senha123`, credenciais demo e `seed.ts` sejam inacessiveis em runtime de producao.
- [ ] Criar script manual `bootstrap-admin` que usa segredo externo, nao versiona senha, registra auditoria e impede perda do ultimo admin.
- [ ] Implementar transacao atomica para conclusao de aula, evento de gamificacao e lancamento de pontos.
- [ ] Implementar concorrencia otimista real para finalizar simulado por `status + version`.
- [ ] Mover auditoria, rate limits, locks e estado mutavel de `globalThis` para Postgres e/ou KV distribuido.

## 5. Migracao por dominio e integridade dos dados

Responsaveis: database e donos de dominio

- [ ] Identidade e privacidade: usuarios, perfis, papeis, mapeamento `Role` para `SystemRole` e flags de visibilidade.
- [ ] Conteudo: concursos, cursos, modulos, aulas, professores, materias, assuntos, matriculas e progresso.
- [ ] Estudos: sessoes, atividades/heartbeats, planos, itens, metas, sequencias e modo foco.
- [ ] Simulados: provas, questoes, alternativas, tentativas, respostas e favoritos.
- [ ] Flashcards: baralhos, cards, revisoes append-only e exclusao segura de concorrencia na revisao.
- [ ] Brainstorm: quadros, colunas, cartoes, reordenacao e movimento atomico sob concorrencia.
- [ ] Gamificacao/ranking: eventos, ledger de pontos, conquistas, scores materializados e recalc idempotente.
- [ ] Notificacoes e auditoria persistentes.
- [ ] Conferir em cada repositorio ownership, filtros de soft-delete, ordenacao, transacoes e tratamento de constraints unicas.
- [ ] Executar migration/seed apenas em local, development e staging; nunca executar seed em producao.

## 6. Revisao de seguranca SaaS

Responsavel: security; implementacao pelos donos de cada modulo

### Criticos

- [ ] Eliminar o backdoor atual de senha mock antes de conectar usuarios reais ao Prisma.
- [ ] Confirmar autorizacao server-side em todas as Server Actions, Route Handlers e servicos; componentes e middleware nao sao fonte de autorizacao.
- [ ] Auditar IDOR/multitenancy: toda leitura ou mutacao por ID deve verificar dono, matricula, papel ou escopo administrativo.
- [ ] Provar no Postgres a idempotencia de pontos, aulas, conquistas, ranking e retries de cron.
- [ ] Provar que uma tentativa de simulado nao finaliza duas vezes sob requisicoes concorrentes.
- [ ] Provar que gabarito, `isCorrect` e explicacao protegida nao aparecem antes da correcao.
- [ ] Provar que tempo valido e Pomodoro nao aceitam duracao, pontos ou conclusao enviados pelo cliente.

### Aplicacao e identidade

- [ ] Revisar autenticacao: senha forte, bcrypt com custo unico definido, mensagens anti-enumeracao, hash dummy, lockout distribuido e MFA obrigatorio para contas administrativas dos provedores.
- [ ] Implementar registro, verificacao de e-mail, recuperacao de senha por token de uso unico com TTL, e revogacao de sessao por `tokenVersion`.
- [ ] Testar CSRF nas mutacoes, XSS armazenado/refletido, injecao SQL/NoSQL, open redirect, SSRF e mass assignment; validar toda entrada com Zod.
- [ ] Revisar cookies HTTPS: `httpOnly`, `secure`, `sameSite` adequado, expiracao e rotacao de `AUTH_SECRET` documentada.
- [ ] Avaliar atualizacao ou estrategia de acompanhamento para `next-auth@5` beta antes do publico.

### Dados, arquivos e integracoes

- [ ] Aplicar menor privilegio a banco, GitHub, Vercel, Supabase, Cloudflare e todos os tokens de CI.
- [ ] Implementar uploads server-side: allowlist por tipo, magic bytes, limite de tamanho, nome aleatorio, bucket privado, URL assinada curta e politica para SVG/documentos maliciosos.
- [ ] Proteger videos por matricula ativa e URLs/token de reproducao com expiracao curta.
- [ ] Validar assinatura, idempotencia, replay e logs de todos os webhooks, especialmente pagamento quando existir.
- [ ] Garantir logs sem senha, token, cookie, gabarito, dados pessoais excessivos ou segredos.
- [ ] Executar `npm audit` e SAST/CodeQL em CI; revisar dependencias e licencas antes do go-live.
- [ ] Revisar CSP, CORS, HSTS, headers, `frame-ancestors`, redirects e allowlists de `connect-src`, `img-src`, `media-src` e `frame-src` apos escolher provedores.

### Privacidade e resiliencia

- [ ] Publicar politica de privacidade e termos; registrar versao e consentimento quando aplicavel.
- [ ] Implementar fluxo de exportacao, exclusao/anonimizacao e retencao de dados conforme decisao juridica.
- [ ] Configurar backup, restauracao testada, retencao de logs e procedimento de resposta a incidente.
- [ ] Fazer revisao de seguranca independente antes do beta e um pentest externo antes de escala relevante.

## 7. Qualidade, CI/CD e observabilidade

Responsaveis: tester, backend, database, security

- [ ] Criar GitHub Actions para lint, typecheck, testes unitarios, build, `npm audit` e CodeQL.
- [ ] Configurar branch protection e ao menos uma aprovacao para `staging` e `main`.
- [ ] Criar banco Postgres descartavel no CI e testes de integracao para todos os repositorios Prisma.
- [ ] Criar testes para os 12 cenarios obrigatorios do projeto usando `DATA_SOURCE=prisma`.
- [ ] Criar testes concorrentes repetidos para aula+pontos, simulado e Pomodoro; validar rollback total em falha transacional.
- [ ] Criar E2E com Playwright para login, RBAC, aula, simulado, foco, flashcards, ranking, admin e recuperacao de senha.
- [ ] Criar smoke test pos-deploy para `/`, `/login`, health check e uma escrita autenticada de teste.
- [ ] Criar `/api/health` sem dados sensiveis, validando aplicacao e banco.
- [ ] Integrar Sentry, logs centralizados, uptime externo e alertas para erros, banco, backup, custo e cron nao executado.
- [ ] Ensaiar rollback de deploy Vercel e recuperacao de migration por backup em staging.

## 8. Beta fechado

Responsaveis: produto, support, security, reviewer

- [ ] Confirmar todos os itens P0 e os testes de integracao/E2E essenciais.
- [ ] Confirmar que staging esta protegido, nao indexavel e usa dados de QA.
- [ ] Fazer restore de backup em ambiente isolado e registrar RTO/RPO observado.
- [ ] Convidar grupo pequeno de alunos, definir canal de suporte e processo de triagem de incidentes.
- [ ] Monitorar erros, custos, fraude de tempo/pontos, carga do banco e entrega de e-mails diariamente.
- [ ] Corrigir vulnerabilidades criticas/altas e defeitos de integridade antes de ampliar o acesso.
- [ ] Executar revisao final de arquitetura, seguranca e qualidade com evidencia dos gates.

## 9. Go-live publico

Responsaveis: produto/operacao com sign-off de architect, reviewer e security

- [ ] Confirmar LGPD, termos, suporte e contatos publicos publicados.
- [ ] Confirmar dominio principal, `www`, SSL, DNSSEC, e-mail autenticado e monitoramento ativo.
- [ ] Criar ao menos dois administradores de producao por processo seguro e testar acessos.
- [ ] Fazer backup imediatamente antes da migration de producao.
- [ ] Rodar migration em job aprovado manualmente, nunca no build da Vercel.
- [ ] Ativar `DATA_SOURCE=prisma` somente depois de migracao, testes e smoke test aprovados.
- [ ] Executar smoke test completo em producao e manter plano de rollback disponivel.
- [ ] Acompanhar as primeiras 72 horas com responsavel de plantao, alertas e registro de incidentes.
- [ ] Fazer reuniao de pos-lancamento para revisar metricas, custos, erros, suporte e proxima lista de melhorias.

## 10. Evidencias minimas por gate

| Gate | Evidencia necessaria |
| --- | --- |
| Prisma em development | Migration aplicada, seed idempotente, testes de integracao e login real aprovados. |
| Staging/beta | Todos os P0, auditoria/rate limit persistentes, E2E critico, backup restaurado e ambiente protegido. |
| Producao publica | Beta estavel, LGPD publicada, dominio/e-mail/monitoramento operantes, CI com gate, backup pre-migration e sign-off final. |

## Referencias

- Estado real e bloqueadores: [`CURRENT_STATE.md`](./CURRENT_STATE.md)
- Plano de migracao: [`MOCK_MIGRATION_PLAN.md`](./MOCK_MIGRATION_PLAN.md)
- Gates de release: [`GO_LIVE_CHECKLIST.md`](./GO_LIVE_CHECKLIST.md)
- Roadmap tecnico: [`PRODUCTION_ROADMAP.md`](./PRODUCTION_ROADMAP.md)
- Riscos: [`RISK_MATRIX.md`](./RISK_MATRIX.md)
- Seguranca atual: [`../SECURITY.md`](../SECURITY.md)
