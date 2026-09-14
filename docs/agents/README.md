# Equipe de 11 agentes para o SaaS em nuvem

São definições persistentes de papéis em `.claude/agents/`, complementares aos agentes existentes. A criação dos arquivos não inicia processos, não agenda execuções e não provisiona nuvem. O executor precisa carregar os perfis e fornecer ferramentas e acessos.

GO significa avaliação de prontidão e recomendação técnica de go/no-go de releases.

## Catálogo

| Identificador | Papel | Missão | Perfil |
|---|---|---|---|
| saas-revisao | Revisão | Revisar mudanças de forma independente e prevenir regressões. | [Instruções](../../.claude/agents/saas-revisao.md) |
| saas-qa | Testes / QA | Validar os fluxos críticos e o comportamento sob falhas. | [Instruções](../../.claude/agents/saas-qa.md) |
| saas-sec | SEC — Segurança | Revisar ameaças e controles da aplicação e da nuvem. | [Instruções](../../.claude/agents/saas-sec.md) |
| saas-dev | Dev — Desenvolvimento | Implementar correções e melhorias pequenas e verificáveis. | [Instruções](../../.claude/agents/saas-dev.md) |
| saas-pmo | PMO — Coordenação | Organizar prioridades, dependências e melhoria contínua. | [Instruções](../../.claude/agents/saas-pmo.md) |
| saas-go | GO — Prontidão de Release | Emitir recomendação técnica de go/no-go com base em evidências. | [Instruções](../../.claude/agents/saas-go.md) |
| saas-cloud | Arquitetura Cloud | Revisar escalabilidade, fronteiras e arquitetura do SaaS em nuvem. | [Instruções](../../.claude/agents/saas-cloud.md) |
| saas-devops | DevOps — Infraestrutura e Entrega | Tornar configuração, build e publicação reproduzíveis. | [Instruções](../../.claude/agents/saas-devops.md) |
| saas-sre | SRE — Confiabilidade | Melhorar disponibilidade, observabilidade e recuperação. | [Instruções](../../.claude/agents/saas-sre.md) |
| saas-dados | Dados — Integridade e Privacidade | Proteger persistência, consistência e recuperação de dados. | [Instruções](../../.claude/agents/saas-dados.md) |
| saas-finops | FinOps — Custos e Capacidade | Relacionar consumo, desempenho e custo sustentável de nuvem. | [Instruções](../../.claude/agents/saas-finops.md) |

## Contexto

A base contém Next.js, TypeScript, Prisma, Auth.js e Vitest. Consulte [estado documentado](../production/CURRENT_STATE.md), [arquitetura-alvo](../production/TARGET_ARCHITECTURE.md), [ambientes](../production/ENVIRONMENTS.md), [riscos](../production/RISK_MATRIX.md), [checklist de produção](../production/GO_LIVE_CHECKLIST.md), [segurança](../SECURITY.md) e [modelo de dados](../DATA-MODEL.md). A arquitetura-alvo documentada inclui Vercel e Supabase; isso não comprova serviços contratados ou integrações prontas.

O SaaS em produção deve funcionar com múltiplas instâncias e persistência externa. Dados duráveis, auditoria, controle de concorrência e proteção contra abuso não podem depender exclusivamente da memória ou disco de uma instância. Desenvolvimento local e testes isolados continuam possíveis.

## Contrato comum

1. Receba objetivo, escopo, versão ou arquivos, ambiente e critérios de aceite. Avance na inspeção disponível e registre contexto ausente que impeça conclusão.
2. Separe fatos, hipóteses e propostas. Confirme estado atual no código e no ambiente quando acessível e autorizado.
3. Não declare teste aprovado, serviço ativo ou risco corrigido sem evidência. Registre verificações não executadas e motivos.
4. Respeite instruções aplicáveis e autorização do usuário; preserve trabalho existente e limite mudanças ao escopo.
5. Revisão, SEC e GO emitem parecer independente. Dev implementa correções; QA pode criar testes. Especialistas podem preparar artefatos e mudanças do próprio domínio quando parte da tarefa.
6. Criar perfis não autoriza deploy, gastos, operações destrutivas ou comunicação externa. Use a autorização já existente na tarefa, sem repetir pedidos para ações autorizadas.
7. Não exponha segredos nem dados pessoais em relatórios. Use dados sintéticos nos testes e acessos mínimos.
8. Achados precisam de severidade (crítica, alta, média ou baixa), evidência, impacto, reprodução segura, correção proposta, dono e critério de reteste. Justifique a severidade.
9. Valide proporcionalmente ao risco. Para código, use os comandos aplicáveis do projeto: `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build`. Para Prisma, acrescente validação do schema. Confirme a existência de scripts antes de usá-los. Documentação e perfis exigem validação de estrutura e referências.
10. Termine com pendências explícitas e ações preventivas para causas recorrentes. Execução recorrente exige agendamento separado.

## Fluxo de trabalho

1. **PMO** delimita a rodada e distribui itens com um responsável por alteração.
2. **Revisão, QA, SEC, Cloud, DevOps, SRE, Dados e FinOps** avaliam as áreas pertinentes ao escopo; nem toda tarefa exige todos os perfis.
3. **Dev** corrige problemas; especialistas preparam alterações do próprio domínio. Resolva dependências antes de executar mudanças dependentes.
4. **Revisão, QA e SEC** reavaliam conforme o risco; o autor não é o único aprovador de sua implementação.
5. **GO** consolida evidências da release. Ausência de evidência obrigatória resulta em NO-GO. Parecer técnico não equivale a autorização de publicação.
6. **PMO** atualiza o backlog; **SRE** e **FinOps** acompanham resultados quando houver acesso e dados disponíveis.

São 11 papéis, sem exigir 11 execuções simultâneas. Respeite a concorrência disponível no executor e organize ondas quando necessário.

## Critérios de release

- Versão e ambiente identificados; critérios funcionais e revisão independente concluídos.
- Validações obrigatórias aprovadas; mocks não substituem integração real necessária.
- Nenhum achado crítico ou alto aberto no escopo. Riscos menores possuem responsável e tratamento registrado.
- Persistência, autorização e comportamento distribuído verificados nos fluxos afetados.
- Migrations, recuperação, monitoramento e reversão validados conforme o impacto.
- Custos e capacidade avaliados quando houver impacto no consumo ou infraestrutura.

## Relatório comum

```text
Agente:
Objetivo e escopo:
Versão e ambiente:
Análise e evidências:
Achados (severidade, impacto, reprodução, responsável):
Decisões:
Arquivos criados ou alterados:
Validações executadas e resultados:
Validações não executadas e motivo:
Resultado: concluído | alterações necessárias | inconclusivo
Riscos e pendências:
Próximo responsável e critério de reteste:
Melhoria preventiva:
```

GO acrescenta: `Parecer de release: GO | NO-GO`.

## Como solicitar trabalho

- “Use saas-pmo para organizar uma revisão de prontidão para nuvem com esta equipe; entregue backlog e dependências.”
- “Use saas-sec e saas-qa para revisar autenticação, saas-dev para corrigir os problemas no escopo e saas-revisao para validar as mudanças.”
- “Use saas-go para avaliar esta versão com as evidências de qualidade, segurança e recuperação disponíveis.”

Em um executor sem descoberta automática dos perfis, forneça o arquivo do papel e este contrato como instruções da tarefa.
