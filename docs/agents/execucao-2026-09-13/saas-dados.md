# saas-dados — integridade e recuperação

> Atualização após autorização de implementação: este agente implementou os repositórios Prisma de User, Question, QuestionOption, MockExam, MockExamAttempt, QuestionAttempt, QuestionFavorite, GamificationEvent, PointTransaction, UserAchievement e RankingScore. Os achados abaixo são o retrato **anterior** às correções. A contagem histórica de stubs não descreve a árvore atual.

Evidência posterior: 21 testes reais PostgreSQL passaram em três arquivos de integração (`auth-postgres`, `simulations-gamification-postgres`, `billing-postgres`). Incluem CAS concorrente, rollback do serviço de finalização após respostas/ledger/outbox, replay único, expiração persistente, histórico imutável após início da prova, versões de ranking e recibos transacionais de cobrança. No teste de cobrança somente o transporte Stripe é sintético. Foram corrigidas corridas reais observadas em upserts Prisma emulados usando inserção com conflito ignorado e leitura por chave única; o ledger não é reescrito no replay. A configuração/migrations e o core transacional foram implementados em cooperação com os demais agentes. Restauração de backups e serviços de nuvem contratados não foram verificados por este agente.

## Parecer inicial preservado

Agente: saas-dados. Data: 13/09/2026, US/Pacific. Base: `b640716c317e3f20cc15fadb6a74188fc9b58794`, checkout compartilhado. Escopo: persistência, atomicidade, privacidade e plano de recuperação. Resultado: **alterações necessárias; integridade de produção não aprovada**.

## Achados

| ID / severidade / prioridade | Evidência e impacto | Tratamento, dono e reteste |
|---|---|---|
| F00 / alta / P0 | Busca atual encontrou **172** ocorrências de `not implemented` em repositórios Prisma. Exemplo: `src/server/repositories/prisma/user-repository.ts:21`. Trocar `DATA_SOURCE` não completa persistência. | Dev/Dados: implementar contratos dos fluxos habilitados com PostgreSQL. Reteste: escrever, reiniciar processo e ler de segunda instância, com isolamento entre usuários. |
| S07 / alta / P0 | `src/server/services/simulations/submit-and-finalize.ts:141` finaliza antes das respostas em `:158`. Falha posterior deixa tentativa finalizada e retry recusado. `src/server/services/gamification/engine.ts:90` e `:104` também separam evento e ledger. | Dev/Dados: transação de estado/respostas/evento e outbox durável, consumidor idempotente. Reteste: falha em cada escrita, replay e concorrência em PostgreSQL, sem estado parcial ou pontos duplicados. |
| S08 / alta para operação distribuída / P0 | `src/server/events/index.ts:36` mantém processados em Map; `src/server/audit/log.ts:18` mantém auditoria em array. Reinício perde deduplicação e histórico local. | Dados/SRE: persistir outbox/auditoria com timestamp, correlação, retenção e tentativas. Reteste: interromper processo durante consumo e recuperar em outra instância sem perder evento nem duplicar efeito. |
| F09 / alta no fluxo de privacidade / P1 | `prisma/schema.prisma:268` contém quatro flags, mas não `showStudyHours` e `showPerformance`; ranking expõe métricas em `src/server/services/gamification/ranking/read.ts:187`. | Dados/Dev: migration aditiva e política de defaults conservadora, seguida de leitura/escrita real e projeção consistente. Reteste: preferências sobrevivem reinício e migração e são respeitadas por terceiros. |

A alta severidade decorre de perda de estado durável, corrupção parcial ou exposição de preferências no fluxo destinado a dados reais. Constraints úteis já existem: progresso único por usuário/aula (`prisma/schema.prisma:464`), matrícula única (`:542`) e respostas por tentativa/questão (`:768`). Constraints isoladas não substituem a transação do agregado.

## Plano de migration e recuperação proposto

1. Inventariar divergências contrato/schema por fluxo habilitado; decidir unidades, estados e campos persistidos. Começar por identidade e um caminho de curso/progresso completo.
2. Criar migrations aditivas com defaults seguros e índices/constraints; testar banco vazio e cópia sintética representativa. Fazer backfill validado antes de tornar campos obrigatórios.
3. Introduzir unidade transacional compartilhada e outbox; implantar compatibilidade de leitura antes de remover estruturas antigas. Não foi aplicada migration nesta rodada.
4. Definir RPO/RTO pelo negócio com SRE, política de retenção e destinos independentes para banco e objetos. Os valores não foram fornecidos; não inventar SLA.
5. Restaurar backup em ambiente isolado, medir tempo e perda de dados, validar contagens, constraints e fluxos de login/progresso/simulado. Registrar evidência e repetir periodicamente. Acesso a backups/conta de nuvem não foi disponibilizado.

## Mapa de dados para validação operacional

| Dados | Fontes | Tratamento a definir/confirmar |
|---|---|---|
| Identidade, hash de senha e contato | User; Profile (`prisma/schema.prisma:210`, `:256`) | Privilégio mínimo, exclusão/desativação e exportação; hash jamais no DTO público. |
| Preferências e localização | Profile (`:256`) | Persistir todas as flags; aplicar projeção consistente; retenção por finalidade. |
| Atividade, respostas e desempenho | StudySession (`:553`), MockExamAttempt (`:724`), QuestionAttempt (`:752`) | Ownership, prazo de retenção e integridade transacional. |
| Recompensas e auditoria | GamificationEvent (`:952`), PointTransaction (`:980`), AuditLog (`:1113`) | Histórico íntegro, trilha de alteração e política de retenção. |
| Cobrança | Subscription (`:1092`) | Confirmar provedor e unicidade por provedor; `externalId` está apenas indexado em `:1108`. |

Mapa é técnico e não comprova adequação jurídica, políticas aplicadas ou serviços externos existentes.

## Validações e encerramento

Reexecutadas as 6 caracterizações existentes: **6/6, exit 0**; a falha injetada ao salvar respostas reproduziu finalização parcial. Contagem de stubs e inspeção do schema/código executadas. Não executados banco real, migration, restore, concorrência entre processos ou teste de privilégios: não há ambiente de banco designado para esta rodada. Schema não foi alterado; validação sintática não substituiria esses testes.

Conclusões antigas corrigidas: existe cliente compartilhado em `src/server/db/prisma.ts:23`, e existe consulta real de credenciais em `src/server/repositories/prisma/user-repository.ts:29`; isso não significa 37 repositórios funcionais. Arquivo criado: este parecer. Prevenção: testes de contrato reais por repositório, falhas transacionais e exercícios de restauração com RPO/RTO medidos. Próximos responsáveis: Dados/Dev/SRE; aceite condicionado aos retestes acima.
