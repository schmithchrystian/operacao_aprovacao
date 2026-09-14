# saas-qa — rodada delimitada de revisão

Agente: Testes / QA. Data: 13/09/2026, US/Pacific.

Objetivo e escopo: verificar evidências de qualidade e reproduzir falhas locais sem interferir na tarefa ativa “Plataforma - Revisao ao Deploy”. Lidos o contrato comum, o perfil saas-qa, CLAUDE.md e as caracterizações da auditoria existente.

Versão e ambiente: checkout main, referência lida diretamente em `.git/refs/heads/main`: `b640716c317e3f20cc15fadb6a74188fc9b58794`. Há trabalho paralelo; esta referência identifica a base, não um snapshot imutável de arquivos não commitados. macOS, Vitest 4.1.10, mocks locais. Git do sistema não disponível por ausência de developer tools; não usado para modificar estado.

## Validações e procedência

- Executado nesta rodada: `/Users/chrystian/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run --config docs/auditoria-2026-09-13/vitest.config.ts --maxWorkers=1`.
- Resultado às 17:55:00: exit 0; 1 arquivo, 6 testes, 545 ms. **As seis expectativas demonstram defeitos. Não são seis regressões corrigidas.** A configuração normal inclui apenas `tests/**/*.test.{ts,tsx}`; essas caracterizações ficam fora dos 744 testes.
- Reutilizado, sem reexecutar: `/tmp/study-tests.log` registra 744 testes em 107 arquivos aprovados. `/tmp/study-lint.log` e `/tmp/study-types.log` não apresentam diagnósticos; o relatório da outra auditoria informa exit 0. Os logs sozinhos não preservam exit code. `/tmp/study-build.log` contém resumo de build concluído; a auditoria identifica `DATA_SOURCE=mock` e exit 0.
- Inspeção direta confirmou autorização baseada no papel da sessão, escritas sequenciais na finalização, vídeo fictício, override desligado do motor e projeção de métricas sem flags de privacidade.

## Matriz requisito → cenário → resultado

| Requisito | Cenário/evidência | Resultado efetivo e limite |
|---|---|---|
| Revogar privilégios | S02: desativar/rebaixar admin depois de emitir sessão | Defeito reproduzido: requireRole aceita admin antigo. Alto: preserva poder administrativo. |
| Não expor conteúdo não publicado | S06: curso DRAFT consultado por slug | Defeito reproduzido. Médio: catálogo oculto não protege acesso direto. |
| Reproduzir mídia cadastrada | F01: salvar URL e ler DTO da aula | Defeito reproduzido: retorna domínio fictício. Médio: aula real inviável. |
| Aplicar regras administrativas | F03: recompensa configurada para 12345 | Defeito reproduzido: motor mantém recompensa anterior. Médio: administração sem efeito. |
| Privacidade em ranking | S05: outro usuário lê horas/desempenho com flags desligadas | Defeito reproduzido: 42 horas, 12 aulas e 87% expostos. Alto: preferência de privacidade violada. |
| Finalização recuperável | S07: falha no salvamento da resposta seguida de retry | Defeito reproduzido: FINISHED parcial e retry negado. Alto: perda de integridade. |
| Login e autorização comuns | Suíte existente: authorization, login-action-authorization e actions por domínio | 744 testes globais aprovados; escopo unitário/mock não certifica provider HTTP ou revogação. |
| Progresso e prevenção de fraude | heartbeat-evaluator e serviços de sessões na suíte existente | Cobertura local existente; não prova consistência após cold start ou entre instâncias. |
| Pontuação idempotente | gamification-engine e simulations-service na suíte existente | Cobertura local não substitui transação no Postgres, nem ausência de duplicidade após falha/replay. |
| Persistência cloud | Contagem de fontes Prisma | 172 ocorrências de métodos not implemented; integração real não demonstrada. |

## Reteste obrigatório

Dev deve inverter as expectativas das seis caracterizações e adicionar regressões à suíte normal após corrigir: negar sessão revogada; negar curso DRAFT; entregar mídia real autorizada; aplicar nova configuração versionada; omitir/anular métricas privadas no servidor; manter tentativa recuperável ou concluir tudo atomicamente. Não simplesmente excluir as caracterizações para deixar tudo verde.

SEC revisa revogação/privacidade/publicação; Dados valida transações; QA executa falhas após cada escrita, retries e dois processos contra PostgreSQL isolado. Reproduzir callback HTTP e limites por instância pertence ao reteste de autenticação: o resultado HTTP anterior foi somente lido, não repetido nesta rodada.

Validações não executadas: PostgreSQL real, migrations, E2E navegador, carga, múltiplas instâncias, recuperação de backup, pagamento e mídia de fornecedor. Não há ambiente integrado disponibilizado nesta rodada; evitar duplicar build e instalação no checkout em uso. Não se mediu cobertura percentual de linhas, estabilidade histórica ou taxa de regressões.

Decisão e resultado: **alterações necessárias**. Rodada de QA encerrada, aprovação de produção não concedida. Próximos responsáveis: Dev, SEC e Dados, com aceite comportamental acima; GO deve considerar os defeitos altos abertos.

Arquivos criados: somente este relatório pelo papel QA. Nenhuma alteração em produto/testes/reproduções. Melhoria preventiva: gates separados para unitários, integração Postgres e E2E; guardar comando, versão, ambiente, exit code e artefatos em cada execução, distinguindo caracterização de defeito e prova de correção.

## Atualização — regressões e integração após implementação

A primeira rodada acima reproduzia defeitos. Após autorização de correção foram adicionadas regressões na suíte normal em `tests/unit/saas-domain-regressions.test.ts`, `ranking-cloud-source.test.ts`, `ranking-snapshot-atomicity.test.ts`, `lesson-notes-service.test.ts`, `navigation-services.test.ts` e `study-mission-lifecycle.test.ts`, além dos testes de interface de notas/notificações.

Verificações finais deste agente: ranking/domínio 32 testes aprovados; notas/navegação/missões 24 aprovados; integração PostgreSQL `tests/integration/notes-notifications-postgres.test.ts` 4 aprovados. A integração cria somente fixtures com UUID, confirma reconexão, competição CAS, ownership, snapshot vazio sem retorno à versão antiga e rollback, depois remove seus próprios registros. Nenhum truncamento ou acesso a produção.

A suíte completa executada antes das últimas ampliações passou 765 testes em 110 arquivos; a revisão global final e build ficam com o coordenador. Atualizar fixtures de identidade criou usuários correspondentes às sessões sintéticas, mantendo a autorização real e seus testes de revogação. As caracterizações antigas continuam sendo evidência histórica, não provas de correção.

O escopo está pronto para consolidação, sem certificação de serviços externos, carga, restauração de produção ou deploy. Os registros anteriores permanecem como histórico da evolução da rodada.
