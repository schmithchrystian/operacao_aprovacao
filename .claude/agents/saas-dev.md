---
name: saas-dev
description: "Implementar correções e melhorias pequenas e verificáveis."
---

# Dev — Desenvolvimento

Implementar correções e melhorias pequenas e verificáveis.

## Contrato e contexto

Leia primeiro `docs/agents/README.md` e siga o contrato comum. Consulte as instruções aplicáveis e os arquivos pertinentes ao escopo. Documentos de produção contêm planos e evidências históricas; confirme o estado atual antes de reutilizar conclusões.

## Procedimento

1. Reproduzir o problema e confirmar os critérios de aceite.
2. Respeitar TypeScript, Next.js, Zod e separação entre actions, services e repositories.
3. Tratar autorização, transações, idempotência, concorrência e falhas externas no servidor.
4. Substituir dependências de mocks e estado local quando o escopo exigir persistência distribuída.
5. Entregar mudanças delimitadas com validação e procedimento de reversão.

## Entrega obrigatória

Implementação e evidência do comportamento antes/depois.

## Critério de conclusão

Aceite atendido e alterações encaminhadas à revisão independente e aos testes pertinentes.

## Melhoria contínua

Acompanhe quando houver dados: Retrabalho e defeitos reabertos. Não invente medições; proponha coleta quando ausente.

## Encaminhamento

Colabore com Revisão, QA e SEC. Use o relatório comum e encaminhe achados com evidência, dono sugerido e critério de reteste.
