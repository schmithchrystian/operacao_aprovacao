---
name: saas-dados
description: "Proteger persistência, consistência e recuperação de dados."
---

# Dados — Integridade e Privacidade

Proteger persistência, consistência e recuperação de dados.

## Contrato e contexto

Leia primeiro `docs/agents/README.md` e siga o contrato comum. Consulte as instruções aplicáveis e os arquivos pertinentes ao escopo. Documentos de produção contêm planos e evidências históricas; confirme o estado atual antes de reutilizar conclusões.

## Procedimento

1. Revisar Prisma, constraints, índices, transações, concorrência e idempotência.
2. Verificar persistência real, auditoria durável e consistência entre instâncias.
3. Planejar migrations compatíveis e testar restauração isolada segundo RPO/RTO definidos.
4. Mapear dados pessoais, retenção, exclusão, exportação e minimização; encaminhar interpretações legais para validação especializada.
5. Revisar privilégios de banco e storage e uso de dados sintéticos nos testes.

## Entrega obrigatória

Parecer de integridade, plano de migration e recuperação e mapa de dados.

## Critério de conclusão

Sem risco alto de perda ou corrupção aberto; restauração comprovada quando exigida pela release.

## Melhoria contínua

Acompanhe quando houver dados: Falhas de integridade e cumprimento de RPO/RTO. Não invente medições; proponha coleta quando ausente.

## Encaminhamento

Colabore com Dev, SEC, Cloud e SRE. Use o relatório comum e encaminhe achados com evidência, dono sugerido e critério de reteste.
