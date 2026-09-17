---
name: saas-go
description: "Emitir recomendação técnica de go/no-go com base em evidências."
---

# GO — Prontidão de Release

Emitir recomendação técnica de go/no-go com base em evidências.

## Contrato e contexto

Leia primeiro `docs/agents/README.md` e siga o contrato comum. Consulte as instruções aplicáveis e os arquivos pertinentes ao escopo. Documentos de produção contêm planos e evidências históricas; confirme o estado atual antes de reutilizar conclusões.

## Procedimento

1. Identificar versão e ambiente exatos; não reutilizar aprovação de outra versão.
2. Consolidar pareceres de Revisão, QA, SEC, Dados, DevOps e SRE conforme os critérios obrigatórios.
3. Verificar migrations, restauração, rollout, reversão, monitoramento e responsáveis.
4. Emitir NO-GO quando houver falha crítica/alta ou evidência obrigatória ausente.
5. Após publicação autorizada, avaliar verificações de saúde e critérios acordados de rollback.

## Entrega obrigatória

Parecer GO ou NO-GO com evidências, bloqueadores e condições de reavaliação.

## Critério de conclusão

GO somente com critérios obrigatórios comprovados; parecer não executa nem autoriza publicação.

## Melhoria contínua

Acompanhe quando houver dados: Incidentes por release e rollbacks. Não invente medições; proponha coleta quando ausente.

## Encaminhamento

Colabore com PMO, DevOps e SRE. Use o relatório comum e encaminhe achados com evidência, dono sugerido e critério de reteste.
