# saas-sec — parecer da rodada

> Atualização da implementação: após o parecer inicial abaixo, o usuário autorizou correções. S02/S03/S09 foram implementados no checkout da branch `codex/saas-production-hardening`: autorização relê identidade atual; Prisma filtra exclusão lógica; formulário usa apenas o provider; orçamento atômico PostgreSQL é consumido antes de bcrypt e compartilhado pelo callback. O parecer abaixo documenta o estado anterior dessas três falhas, e não deve ser lido como status atual delas. Outros achados continuam sujeitos à consolidação da equipe.

## Evidências após implementação

- 9 arquivos / **48 testes unitários aprovados**, incluindo bloqueio/rebaixamento com sessão anterior, usuário inexistente, consulta Prisma sem hash público, callback concorrente e exatamente um bcrypt pelo formulário.
- PostgreSQL nativo 18 isolado, em loopback: **3 testes de integração aprovados** em `tests/integration/auth-postgres.test.ts`. Vinte reservas simultâneas aceitaram exatamente cinco; bloqueio persistiu após reconexão; pedidos negados não estenderam prazo; expiração reiniciou contador; janela antiga não cancelou lock ativo; consultas reais respeitaram exclusão e estado atual.
- Teste real revelou diferença entre relógio SQL e representação UTC de `DateTime`; corrigida com `clock_timestamp() AT TIME ZONE 'UTC'` no UPSERT.
- Política deliberada: orçamento por conta, hash SHA256 normalizado, inclui tentativas bem-sucedidas e não é zerado em sucesso. Isso evita reabertura concorrente do orçamento. Não usa headers de IP não confiáveis. Contenção global/por origem confiável e limpeza periódica de registros expirados permanecem operação complementar a consolidar.
- Testes usam identificadores aleatórios e removem apenas suas próprias linhas; não houve conexão a produção, deploy ou teste multi-host. A tabela/migration é de responsabilidade do agente Cloud; revisão e suíte global ficam com o coordenador/QA.

## Parecer inicial preservado

Agente: saas-sec. Data: 13/09/2026, US/Pacific. Base: `b640716c317e3f20cc15fadb6a74188fc9b58794`, checkout compartilhado. Objetivo: confirmar bloqueadores de segurança para SaaS em nuvem, sem mudanças no produto. Resultado: **alterações necessárias; segurança não aprovada**.

## Achados confirmados

| ID anterior / severidade / prioridade | Evidência atual e impacto | Reprodução segura e tratamento |
|---|---|---|
| S02 / alta / P0 | `src/server/authorization/index.ts:15` e `:22` aceitam papel da sessão sem consultar estado atual do usuário. Um administrador rebaixado ou bloqueado conserva acesso com sessão anterior. | Caracterização existente reexecutada: bloqueio/rebaixamento não impede `requireRole`. Dev deve consultar estado atual e implementar revogação. Reteste: cookie emitido antes da mudança deve perder acesso imediatamente conforme política definida. |
| S03 / alta / P0 | `src/server/auth/config.ts:30` chama verificação diretamente; limite está em `src/server/actions/auth.ts:62`; `src/server/auth/credentials-service.ts:20` não limita. O callback não usa a proteção do formulário. | Confirmado por fluxo estático; HTTP da auditoria anterior não repetido nesta rodada. Dev/SEC: centralizar limite e auditoria na fronteira compartilhada; QA deve testar callback direto, múltiplas instâncias e bloqueio após falhas. |
| S04 / alta condicional à implantação / P0 | `src/config/env.ts:18` permite default mock em produção; `:39` e `:46` só negam segredos default. Possibilita implantação demonstrativa com contas demo e estado volátil. | Inspeção do schema/configuração. DevOps/Dev: negar mock em produção real e separar demo. Reteste: produção com `DATA_SOURCE` ausente ou mock deve falhar antes de atender requisições. |
| S05 / alta / P1 | `src/server/services/gamification/ranking/read.ts:97` não inclui flags de horas/desempenho; `:187` entrega os valores. Preferências de privacidade ficam sem efeito nessa superfície. | Caracterização reexecutada com dados sintéticos confirmou exposição. Dev/Dados: política única de projeção e flags persistidas. Reteste: perfil público com horas/desempenho ocultos não revela esses campos a terceiros. |
| S09 / média / P1 | `src/server/repositories/prisma/user-repository.ts:33` filtra somente e-mail; não seleciona `deletedAt`; credenciais verificam apenas `isActive` em `src/server/auth/credentials-service.ts:40`. | Condicional: conta excluída logicamente ainda ativa pode autenticar; não testado em PostgreSQL. Dev: negar exclusão na consulta. Reteste com usuário sintético `deletedAt != null` e `isActive=true`. |

Severidade alta decorre de privilégio administrativo persistente, ausência de contenção de abuso, exposição de preferências explícitas ou implantação acidental insegura. Não foi demonstrada exploração crítica nesta rodada.

## Validação e limites

Reexecutado `node node_modules/vitest/vitest.mjs run --config docs/auditoria-2026-09-13/vitest.config.ts`: **6 testes aprovados em 1 arquivo, exit 0**. São caracterizações que confirmam defeitos, não evidência de correção. Inspecionados os fluxos e linhas acima. Sem produção, pentest externo, novas consultas de advisories ou auditoria npm; contagens de dependências do relatório anterior não são nova validação. Lint/typecheck/build completos ficam com QA nesta rodada; nenhum código alterado por este perfil.

Defesas preservadas: senha é comparada com bcrypt; `isActive=false` impede novo login; ownership e papéis possuem guardas no servidor. Correção de conclusão antiga: autenticação **não usa sempre mock**; consulta passa pelo repositório e há consulta Prisma real em `user-repository.ts:29`. Essa correção não resolve revogação de sessões existentes.

Arquivo criado: este parecer. Próximos responsáveis: Dev, DevOps e QA conforme tabela; GO deve manter bloqueio enquanto P0/altos aplicáveis estiverem abertos. Prevenção: testes de autenticação na mesma fronteira de todos os caminhos, matriz de privacidade por DTO e regressões com cookie anterior a alterações administrativas.
