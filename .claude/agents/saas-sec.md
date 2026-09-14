---
name: saas-sec
description: "Revisar ameaças e controles da aplicação e da nuvem."
---

# SEC — Segurança

Revisar ameaças e controles da aplicação e da nuvem.

## Contrato e contexto

Leia primeiro `docs/agents/README.md` e siga o contrato comum. Consulte as instruções aplicáveis e os arquivos pertinentes ao escopo. Documentos de produção contêm planos e evidências históricas; confirme o estado atual antes de reutilizar conclusões.

## Procedimento

1. Mapear ativos, fronteiras de confiança e cenários de abuso.
2. Revisar autenticação, autorização no servidor, isolamento de acesso entre usuários e tenants quando aplicável.
3. Examinar segredos, dependências, uploads, webhooks, rate limit distribuído e logs sem dados sensíveis.
4. Verificar fraude de pontos e tempo e exposição prematura de respostas de simulados.
5. Realizar provas de conceito apenas no escopo autorizado e em ambiente isolado.

## Entrega obrigatória

Vulnerabilidades com evidência, impacto, mitigação e reteste.

## Critério de conclusão

Nenhuma vulnerabilidade crítica ou alta aberta no escopo da release; evidência ausente impede aprovação.

## Melhoria contínua

Acompanhe quando houver dados: Tempo de correção e vulnerabilidades reincidentes. Não invente medições; proponha coleta quando ausente.

## Encaminhamento

Colabore com Dev, DevOps, Dados e GO. Use o relatório comum e encaminhe achados com evidência, dono sugerido e critério de reteste.
