# saas-revisao — revisão independente da evidência

> Atualização: a autorização posterior incluiu implementação. Este mesmo agente passou a ser autor de correções de identidade, repositórios e cobrança; essas alterações exigem revisão final por outro agente. O parecer inicial abaixo se refere à base histórica, e não é aprovação independente das próprias alterações.

Na revisão do core de autoria do coordenador, testes reais do serviço `submitAndFinalize` confirmaram rollback após CAS/resposta/ledger/outbox, retry concorrente com um vencedor e expiração persistida apesar de conflito. Audit metadata sensível não foi persistida. Foram encontrados e corrigidos `PersistentEventBus.upsert` emulado sujeito a corrida e ausência de auditoria quando `requireRole` negava uma operação antes do `try`. Auditoria de nonce: proxy substitui headers fornecidos pelo cliente, injeta nonce em request/response e ThemeProvider; validação de navegador permanece com o coordenador. Foi encaminhado ao QA o achado de projeção de Profile público de User excluído/desativado no ranking. A consolidação posterior executou 21 testes PostgreSQL com sucesso; homologação externa não foi realizada.

## Parecer inicial preservado

Agente: saas-revisao. Data: 13/09/2026, US/Pacific. Base: `b640716c317e3f20cc15fadb6a74188fc9b58794`. Escopo: conferir a auditoria já em andamento contra código atual e reexecutar suas caracterizações. Nenhuma correção de produto foi proposta como implementada. Resultado: **alterações necessárias; entrega para produção não aprovada**.

## Bloqueadores confirmados primeiro

- **Alta / P0 — sessão privilegiada antiga:** `src/server/authorization/index.ts:22` conserva role da sessão. A caracterização S02 confirmou que usuário bloqueado/rebaixado continua autorizado. Dono Dev/SEC; reteste com cookie anterior à mudança e estado atual no servidor.
- **Alta / P0 — finalização parcial:** `src/server/services/simulations/submit-and-finalize.ts:141` altera estado antes de `:158`. S07 confirmou falha sem retry recuperável. Dono Dev/Dados; transação e reteste por falha em cada etapa e concorrência real.
- **Alta / P0 — persistência incompleta:** 172 ocorrências de `not implemented` nas classes Prisma, confirmadas por busca. `src/server/repositories/prisma/user-repository.ts:21` é um exemplo. Dono Dev/Dados; testes de contratos em PostgreSQL e sobrevivência a restart.
- **Alta / P1 — privacidade inconsistente:** `src/server/services/gamification/ranking/read.ts:187` expõe métricas apesar das flags; S05 reproduzido. Dono Dev/Dados; reteste de todas as projeções públicas e persistência das preferências.
- **Média / P1 — publicação ignorada na leitura específica:** S06 confirmou acesso a curso DRAFT; `src/server/repositories/mock/course-repository.ts:25` e `src/server/services/courses/course-detail.ts:21`. Dono Dev; retestar DRAFT/ARCHIVED/excluído por slug, matrícula e aula com guarda comum.

A severidade corresponde a privilégios indevidos, perda/corrupção de estado e privacidade; não é preferência de estilo. Os relatórios saas-sec e saas-dados detalham os mesmos itens e não devem virar duplicatas no backlog.

## Evidências realmente reexecutadas

Comando: `node node_modules/vitest/vitest.mjs run --config docs/auditoria-2026-09-13/vitest.config.ts`, usando o Node 24 disponibilizado pelo runtime local. Resultado: **1 arquivo, 6 testes aprovados, exit 0; duração 610 ms**.

| Caracterização | Resultado atual |
|---|---|
| S02: conta bloqueada/rebaixada com sessão anterior | Defeito reproduzido |
| S06: curso em rascunho por slug | Defeito reproduzido |
| F01: vídeo cadastrado ignorado pelo DTO | Defeito reproduzido |
| F03: configuração administrativa sem efeito na recompensa | Defeito reproduzido |
| S05: privacidade de horas/desempenho no ranking | Defeito reproduzido |
| S07: falha de escrita deixa tentativa finalizada | Defeito reproduzido |

Esses testes foram escritos pela auditoria anterior e reexecutados independentemente nesta rodada; os arquivos e o código-alvo foram inspecionados. Aprovação das caracterizações significa confirmação do comportamento defeituoso, e não seis correções aprovadas. Nenhuma integração com PostgreSQL foi demonstrada.

## Conclusões históricas que não devem voltar ao backlog

| Afirmação antiga | Constatação atual |
|---|---|
| Autenticação sempre compara credenciais mock | Incorreta: `src/server/auth/credentials-service.ts:22` usa repositório; `src/server/repositories/prisma/user-repository.ts:29` possui consulta real. |
| Não existe cliente Prisma compartilhado | Incorreta: `src/server/db/prisma.ts:23`. |
| URL de banco não é validada | Incorreta: `src/config/env.ts:53` exige URL no modo Prisma. Isso não testa conexão. |
| Todos os métodos Prisma são stubs | Incorreta: há consulta real de credenciais; os 172 métodos restantes encontrados continuam incompletos. |
| Testes mock aprovados comprovam produção | Incorreta: stubs tipados e falhas de transação real podem coexistir com suíte verde. |

Limitações: árvore compartilhada com outra tarefa; parecer é retrato do conteúdo observado, não revisão de release congelada. Lint/typecheck/build/suíte completa são responsabilidade QA nesta rodada e não foram repetidos aqui. Contagens de advisories npm e testes completos do relatório antigo não foram tratadas como verificações novas. Sem deploy, nuvem, produção, restauração ou inspeção de segredos.

Arquivo criado: este parecer. Decisão: preservar a auditoria existente, consolidar os IDs em um backlog e exigir evidência após cada correção. Próximos responsáveis: Dev/QA/SEC/Dados; GO recebe bloqueadores abertos. Prevenção: fixar commit da release, converter caracterizações em testes de comportamento esperado após corrigir a causa e vincular cada requisito de produção a evidência de staging.
