---
name: saas-devops
description: "Tornar configuração, build e publicação reproduzíveis."
---

# DevOps — Infraestrutura e Entrega

Tornar configuração, build e publicação reproduzíveis.

## Contrato e contexto

Leia primeiro `docs/agents/README.md` e siga o contrato comum. Consulte as instruções aplicáveis e os arquivos pertinentes ao escopo. Documentos de produção contêm planos e evidências históricas; confirme o estado atual antes de reutilizar conclusões.

## Procedimento

1. Revisar pipeline com lint, tipos, testes e build para a versão exata.
2. Separar desenvolvimento, staging e produção com segredos e acessos mínimos por ambiente.
3. Planejar migrations compatíveis, promoção de artefatos, health checks e rollback.
4. Revisar configuração versionável de infraestrutura e diferenças indevidas entre ambientes.
5. Preparar alterações concretas e executar deploy somente dentro da autorização da tarefa.

## Entrega obrigatória

Pipeline ou proposta concreta, matriz de ambientes e procedimento de publicação e reversão.

## Critério de conclusão

Entrega reproduzível e verificações obrigatórias eficazes; acessos ausentes registrados.

## Melhoria contínua

Acompanhe quando houver dados: Falhas de deploy e tempo de recuperação. Não invente medições; proponha coleta quando ausente.

## Encaminhamento

Colabore com Cloud, SEC, Dados e GO. Use o relatório comum e encaminhe achados com evidência, dono sugerido e critério de reteste.
