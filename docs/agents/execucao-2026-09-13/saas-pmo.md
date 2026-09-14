# PMO — rodada de execução dos 11 perfis

Data: 13/09/2026 (US/Pacific). Base: b640716c317e3f20cc15fadb6a74188fc9b58794, checkout compartilhado com alterações documentais não commitadas. Ambiente: revisão local de prontidão para SaaS em nuvem.

## Objetivo e coordenação

Executar os 11 papéis em conjunto com a auditoria ativa da tarefa **Plataforma - Revisao ao Deploy**, preservando seus arquivos. Três subagentes trabalham paralelamente; cada um executa os perfis atribuídos com relatórios individuais. PMO e GO são conduzidos pelo agente principal. Não são 11 processos simultâneos.

| Frente | Perfis | Responsabilidade exclusiva de escrita |
|---|---|---|
| Segurança e dados | SEC, Dados, Revisão | saas-sec.md, saas-dados.md, saas-revisao.md nesta pasta |
| Qualidade e desenvolvimento | QA, Dev | saas-qa.md, saas-dev.md nesta pasta |
| Operação de nuvem | Cloud, DevOps, SRE, FinOps | saas-cloud.md, saas-devops.md, saas-sre.md, saas-finops.md nesta pasta |
| Coordenação | PMO, GO | saas-pmo.md, saas-go.md e README.md nesta pasta |

A tarefa existente foi notificada da divisão. Não há implementação concorrente no produto nesta rodada: o escopo é revisão complementar e plano concreto de melhorias. Builds e reinstalações não serão duplicados; resultados existentes são evidência herdada identificada, sem alegação de reexecução.

## Backlog inicial e dependências

Os itens abaixo vêm da auditoria em andamento e devem ser confrontados com os pareceres especializados desta rodada.

| Prioridade | Item | Responsável | Dependência | Aceite verificável |
|---|---|---|---|---|
| P0 | Revogar privilégios de sessões após bloqueio/rebaixamento | Dev + SEC | política de identidade | cookie anterior perde acesso privilegiado após mudança |
| P0 | Rate limit no caminho compartilhado de autenticação | Dev + SEC | armazenamento distribuído | callback direto e formulário aplicam limite atômico |
| P0 | Impedir ativação acidental de mocks na produção comercial | Dev + DevOps | política de ambientes | implantação comercial falha sem persistência real configurada |
| P0 | Tratar dependências com avisos aplicáveis | Dev + SEC | triagem de alcance | árvore final auditada e regressões pertinentes aprovadas |
| P0 | Reconciliar contratos/schema e implementar persistência | Dados + Dev | decisão de schema | fluxo vertical funciona em PostgreSQL real sem stubs |
| P0 | Garantir atomicidade de finalização e pontuação | Dados + Dev | fronteira transacional | falha intermediária não deixa estado parcial; retry não duplica |
| P1 | Respeitar privacidade e publicação de conteúdo | Dev + SEC | critérios de acesso | testes negativos comprovam ocultação e acesso negado |
| P1 | Ligar vídeo, materiais e ciclo de identidade | Dev + Cloud | interfaces/provedores aprovados | jornadas reais em staging com falhas cobertas |
| P1 | CI, observabilidade, backup e recuperação | DevOps + SRE + Dados | persistência e ambiente staging | pipeline obrigatório, alertas e restauração comprovados |
| P1 | Medir consumo e definir limites de custo | FinOps + Cloud | métricas e plano comercial | premissas, orçamento e alertas rastreáveis |

## Critérios de coordenação

Cada item possui dono e critério de aceite; especialistas devem refinar dependências. Não há prazo inventado nem promessa de nuvem operacional nesta rodada. O parecer de GO depende das evidências, não da quantidade de perfis executados.

## Validação e limites

Conferidos checkout, perfis, tarefa concorrente e relatório da auditoria local. Nenhum acesso a contas de nuvem demonstrado, nenhum deploy ou teste de banco real executado pelo PMO. O estado dos relatórios é consolidado no README desta pasta ao término.

Melhoria preventiva: manter backlog único de achados com evidência e critério de reteste, separando reprodução de defeito de comprovação de correção.
