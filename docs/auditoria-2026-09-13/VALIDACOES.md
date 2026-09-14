# Registro de validações

Base: `b640716c317e3f20cc15fadb6a74188fc9b58794`. Execução local em macOS ARM64, Node 24.19.0 e npm 12.0.2 temporário, usando o lockfile existente. Os comandos abaixo são apresentados pela interface habitual de npm; nesta máquina foram executados pelo runtime disponível e pelo `npm-cli.js` temporário.

| Comando | Resultado | Evidência |
|---|---|---|
| `npm ci` | exit 0; 821 pacotes | [instalação](evidencias/instalacao.log) |
| `npm run lint` | exit 0 | [lint](evidencias/lint.log) |
| `npm run typecheck` | exit 0 | [tipos](evidencias/typecheck.log) |
| `npm run test` | exit 0; 744 testes em 107 arquivos | [testes](evidencias/testes-existentes.log) |
| `npm run build` | exit 0; ambiente mock explícito, segredos efêmeros | [build](evidencias/build-mock.log) |
| `prisma validate` pelo CLI local | exit 0 | [schema](evidencias/prisma-validate.log) |
| `npm audit --json` | exit 1; 24 pacotes sinalizados | [audit](evidencias/npm-audit.json) |
| `npm audit --omit=dev --json` | exit 1; 22 pacotes sinalizados | [audit produção](evidencias/npm-audit-producao.json) |
| `vitest run --config docs/auditoria-2026-09-13/vitest.config.ts` pelo CLI local | exit 0; seis defeitos reproduzidos | [caracterizações](evidencias/reproducoes.log) |
| `python3 docs/auditoria-2026-09-13/smoke-local.py` | 51 registros HTTP; inclui 32 páginas sem parâmetros dinâmicos | [smoke](evidencias/smoke-http.json) |
| `npm run typecheck`, após adicionar scripts da auditoria | exit 0 | [tipos finais](evidencias/typecheck-com-auditoria.log) |

Os seis testes em [reproducoes.test.ts](reproducoes.test.ts) são caracterizações: **passar significa reproduzir o comportamento defeituoso da versão auditada**. Não são regressões que comprovem correções e não integram a suíte habitual em `tests/`. Depois de corrigir o produto, devem ser transformados em expectativas seguras ou substituídos por regressões correspondentes.

O [smoke local](smoke-local.py) só usa `127.0.0.1:3107`, credenciais públicas de demonstração e dados fictícios. Requer build e servidor local previamente iniciados com `DATA_SOURCE=mock` e segredos efêmeros. Não usar contas reais. O resultado sanitizado não contém cookies, tokens CSRF ou conteúdo de páginas. Resposta HTTP 200 não certifica funcionamento de todos os controles visuais.

O [inventário base](evidencias/inventario-base.json) registra hashes dos arquivos analisados. A [busca histórica de segredos](evidencias/segredos-padroes.json) cobre cinco padrões em 976 blobs únicos; resultado vazio não prova ausência de outros segredos.

Não foram executados PostgreSQL real, integração com cobrança/mídia, teste de carga, QA em dispositivos, pentest público ou restauração de backup. Essas verificações compõem os critérios de entrega do cronograma. As evidências descrevem a versão base; não homologam alterações posteriores realizadas por outra tarefa.
