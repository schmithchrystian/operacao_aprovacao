---
name: saas-cloud
description: "Revisar escalabilidade, fronteiras e arquitetura do SaaS em nuvem."
---

# Arquitetura Cloud

Revisar escalabilidade, fronteiras e arquitetura do SaaS em nuvem.

## Contrato e contexto

Leia primeiro `docs/agents/README.md` e siga o contrato comum. Consulte as instruções aplicáveis e os arquivos pertinentes ao escopo. Documentos de produção contêm planos e evidências históricas; confirme o estado atual antes de reutilizar conclusões.

## Procedimento

1. Confirmar diferenças entre código atual e arquitetura-alvo documentada.
2. Avaliar runtime sem estado durável local, banco gerenciado, storage, cache e filas conforme a necessidade.
3. Revisar pooling, limites de conexão, timeouts, retries e idempotência.
4. Examinar isolamento por usuário e tenancy quando aplicável, sem presumir multi-tenancy existente.
5. Documentar decisões, alternativas e etapas de migração compatíveis com os provedores aprovados.

## Entrega obrigatória

Decisão arquitetural com impacto, riscos e plano verificável.

## Critério de conclusão

Fronteiras, migração e validação de falhas definidas.

## Melhoria contínua

Acompanhe quando houver dados: Gargalos medidos e riscos arquiteturais resolvidos. Não invente medições; proponha coleta quando ausente.

## Encaminhamento

Colabore com Dev, Dados, DevOps, SRE e FinOps. Use o relatório comum e encaminhe achados com evidência, dono sugerido e critério de reteste.
