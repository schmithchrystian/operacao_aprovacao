# saas-cloud — revisão de arquitetura

Rodada local de 2026-09-13. Base HEAD `b640716c317e3f20cc15fadb6a74188fc9b58794`, com checkout compartilhado e alterações concorrentes. Escopo: arquitetura do SaaS em nuvem. Resultado: **alterações necessárias**. Nenhuma infraestrutura foi consultada ou provisionada.

## Evidências e achados

| ID / severidade | Evidência e impacto | Reprodução segura / correção | Dono / aceite |
|---|---|---|---|
| CLOUD-01 / alta | `src/server/repositories/prisma/user-repository.ts:21` e `:26` lançam `not implemented`. A existência de Prisma e da migration não garante persistência funcional. | Inspecionar esses métodos; implementar os contratos Prisma efetivamente utilizados antes de ativar usuários reais. | Dados + Dev; login, leitura e escrita contra PostgreSQL real, com estado preservado após reinício. |
| CLOUD-02 / alta | `src/server/auth/rate-limit.ts:27`, `src/server/services/focus/focus-lock.ts:29` e `src/server/services/flashcards/review-lock.ts:34` usam memória do processo. Escala horizontal fragmenta proteção e exclusão mútua. | Em staging, enviar a mesma chave a dois processos; implementar limites atômicos compartilhados e invariantes transacionais no banco. | SEC + Dev; limite agregado entre instâncias e ausência de duplicação sob requisições simultâneas/retry. |
| CLOUD-03 / alta | `src/server/events/index.ts:34` e `:68` implementam outbox apenas em memória; `src/server/services/admin/config-store.ts:26` mantém configuração local. Reinício perde estado e deduplicação. | Exercitar reinício entre gravação e consumo em ambiente sintético; outbox transacional com chave única, consumidores idempotentes e configuração durável. | Dados + Dev; replay/reinício não perde evento nem duplica efeito; configuração uniforme em dois processos. |
| CLOUD-04 / média | `src/server/db/prisma.ts:19` fornece só connectionString ao adapter. Não há limites de pool/timeout explícitos nesse ponto. `prisma.config.ts:15` já distingue DIRECT_URL, corrigindo parte do plano antigo. | Medir limite efetivo de conexões sob carga; não copiar parâmetros de docs antigos sem verificar compatibilidade Prisma 7/adapter. | Cloud + SRE; limite por instância × pico de instâncias cabe no orçamento do pool; timeout e saturação possuem comportamento definido. |

Ressalva sobre CLOUD-01: `findCredentialsByEmail` está implementado em `src/server/repositories/prisma/user-repository.ts:29`; os métodos `findById`/`findByEmail` citados continuam stubs. Não se afirma ausência completa de implementação Prisma ou de consulta de credenciais.

## Decisão proposta e plano

Manter Next.js → contratos/actions → serviços → repositórios. Vercel e Supabase continuam arquitetura-alvo documentada, sem evidência de contratação. PostgreSQL é autoridade de dados; object storage externo guarda binários; cache distribuído guarda somente estado apropriado a expiração. Provedores de vídeo/e-mail ficam atrás de interfaces. Não presumir tenancy organizacional: validar isolamento por usuário nos contratos existentes; desenhar tenantId somente se produto exigir organizações.

Sequência verificável: implementar repositórios e testes reais; migrar locks/limites/outbox/configuração; dimensionar conexões; testar duas instâncias com reinícios, indisponibilidade de banco/cache e retries; só então encaminhar a GO. Falha de cache deve ter política explícita por operação sensível; retry de escrita exige idempotência, limite e backoff.

Validação executada: leitura do catálogo, perfis, CLAUDE.md, código e planos; conferência das referências acima. Não executados: carga, integração PostgreSQL, falhas distribuídas e acesso a provedores, sem ambientes fornecidos nesta rodada. Nenhuma alteração de produto. Arquivo criado: este relatório.

Pendências: evidência de provedores, limites contratados e implantação. Próximos responsáveis: Dados/Dev/SEC, com critérios da tabela. Prevenção: teste de contrato para cada repositório e teste recorrente de reinício/múltiplos processos no pipeline.
