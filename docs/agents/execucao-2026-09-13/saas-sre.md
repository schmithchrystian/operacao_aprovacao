# saas-sre — confiabilidade e recuperação

Rodada local de 2026-09-13. HEAD `b640716c317e3f20cc15fadb6a74188fc9b58794`, checkout compartilhado em alteração. Objetivo: examinar sinais operacionais e recuperação. Resultado: **alterações necessárias**.

| ID / severidade | Evidência e impacto | Reprodução / proposta | Dono / aceite |
|---|---|---|---|
| SRE-01 / alta | `src/server/audit/log.ts:18` mantém array; `:21` apenas adiciona e `:23` escreve no console. Não existe persistência/retensão garantida pelo código. Reinício elimina consulta local e crescimento não possui limite. | Gerar eventos sintéticos e reiniciar processo em staging; enviar auditoria a armazenamento durável, com política de retenção e acesso mínimo. | Dados + SEC; evento consultável depois de reinício e entrega verificável, sem segredos. |
| SRE-02 / alta | `docs/production/MONITORING_PLAN.md:14` propõe captura de erros; package.json não inclui SDK proposto e inventário de src não encontrou instrumentation/health. Não comprova ausência de monitor externo, apenas ausência de evidência local. | Falha sintética em staging deve gerar sinal e alerta acionável; implementar readiness mínima e correlação estruturada. | SRE + Dev; alerta chega ao responsável e contém release/correlationId, sem dados sensíveis. |
| SRE-03 / alta | `docs/production/BACKUP_AND_RECOVERY.md:5` declara planejamento sem restore; `:52` exige ensaio. Recuperabilidade não demonstrada. | Restaurar backup de staging em destino isolado, nunca sobre produção nesta rodada. | Dados + SRE; integridade, login e fluxos críticos passam; RPO/RTO medidos e aceitos. |
| SRE-04 / média | `src/app/api/cron/ranking-recalc/route.ts:12` depende de scheduler externo. Não há agendamento versionado encontrado. Endpoint presente não comprova execução periódica. | Registrar execução, duração, resultado e último sucesso; testar atraso/falha sintéticos. | DevOps + SRE; scheduler configurado e alerta de ausência de execução exercitado. |

## Plano de observabilidade

Coletar disponibilidade de login/leitura/gravação, taxa de erro por operação, latência p50/p95/p99, utilização e espera do pool, retries, idade da outbox e último sucesso do cron. Associar release e correlationId; remover tokens, senhas e payloads pessoais. Separar falha de validação esperada de indisponibilidade. Monitor externo precisa falhar independentemente da plataforma.

Proposta para negociação: disponibilidade mensal de fluxos críticos de 99,9%, p95 de gravação abaixo de 1 s e alerta de cron após duas janelas sem sucesso. São metas propostas, sem aprovação ou medições atuais; adequar aos requisitos, custo e cadência real. Alertas devem acionar runbook e responsável, com supressão de duplicatas.

## Runbooks para staging

1. Banco indisponível: confirmar erro e pool, interromper retries agressivos, retornar erro recuperável sem sucesso falso, restaurar conectividade e verificar ausência de gravações duplicadas.
2. Release com regressão: identificar SHA afetado, comparar erro/latência, reverter promoção para artefato compatível, executar smoke e preservar evidências.
3. Recuperação de dados: escolher ponto e destino isolado; restaurar banco e objetos separadamente; validar migrations, contagens, relacionamentos, sessões e acesso; registrar perda de dados e duração observadas.
4. Cache/cron falho: aplicar política de falha aprovada para operação sensível, verificar último sucesso, recuperar serviço, reprocessar com idempotência e verificar resultado.

Validações executadas: inspeção estática de auditoria, eventos, cron, dependências e planos. Não executados: ensaio de falhas, restore, alertas ou carga; ambiente operacional não fornecido. Nenhum resultado de disponibilidade/MTTR foi inventado. Arquivo criado: este relatório. Pendências e próximos responsáveis constam na tabela. Prevenção: ensaios periódicos em staging com evidência, proprietário e reteste após correção.
