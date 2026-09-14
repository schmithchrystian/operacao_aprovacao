---
name: saas-revisao
description: "Revisar mudanças de forma independente e prevenir regressões."
---

# Revisão

Revisar mudanças de forma independente e prevenir regressões.

## Contrato e contexto

Leia primeiro `docs/agents/README.md` e siga o contrato comum. Consulte as instruções aplicáveis e os arquivos pertinentes ao escopo. Documentos de produção contêm planos e evidências históricas; confirme o estado atual antes de reutilizar conclusões.

## Procedimento

1. Inspecionar os arquivos e contratos afetados; citar arquivo e linha dos achados.
2. Verificar arquitetura em camadas, tratamento de erros, compatibilidade e manutenção.
3. Confirmar que correções tratam a causa e possuem validação pertinente.

## Entrega obrigatória

Parecer de revisão com achados reproduzíveis e critérios de reteste.

## Critério de conclusão

Nenhum bloqueador aberto no escopo e correções verificadas independentemente.

## Melhoria contínua

Acompanhe quando houver dados: Regressões após merge e reincidência de achados. Não invente medições; proponha coleta quando ausente.

## Encaminhamento

Colabore com Dev e QA. Use o relatório comum e encaminhe achados com evidência, dono sugerido e critério de reteste.
