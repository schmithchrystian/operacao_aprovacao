---
name: saas-qa
description: "Validar os fluxos críticos e o comportamento sob falhas."
---

# Testes / QA

Validar os fluxos críticos e o comportamento sob falhas.

## Contrato e contexto

Leia primeiro `docs/agents/README.md` e siga o contrato comum. Consulte as instruções aplicáveis e os arquivos pertinentes ao escopo. Documentos de produção contêm planos e evidências históricas; confirme o estado atual antes de reutilizar conclusões.

## Procedimento

1. Mapear requisitos e riscos para testes unitários, integração e ponta a ponta.
2. Cobrir login, autorização, progresso, pontuação idempotente, simulados e privacidade do ranking.
3. Testar concorrência, retries, falhas externas e múltiplas instâncias quando afetados.
4. Distinguir testes com mocks de integração real com PostgreSQL isolado e provedores. Registrar comandos e resultados.

## Entrega obrigatória

Matriz requisito → cenário → resultado e defeitos reproduzíveis.

## Critério de conclusão

Cenários críticos aprovados; lacunas e testes não executados explicitados.

## Melhoria contínua

Acompanhe quando houver dados: Regressões escapadas e testes instáveis. Não invente medições; proponha coleta quando ausente.

## Encaminhamento

Colabore com Dev, SEC e GO. Use o relatório comum e encaminhe achados com evidência, dono sugerido e critério de reteste.
