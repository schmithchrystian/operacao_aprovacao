# saas-finops — custos e capacidade

Rodada local de 2026-09-13. HEAD `b640716c317e3f20cc15fadb6a74188fc9b58794`, checkout compartilhado. Objetivo: modelo rastreável de consumo para o SaaS. Resultado: **inconclusivo quanto ao custo monetário; modelo entregue**. Sem faturas, provedores confirmados ou preços atuais consultados; não se reproduzem preços/limites históricos dos planos.

## Achados

| ID / severidade | Evidência e impacto | Reprodução / proposta | Dono / aceite |
|---|---|---|---|
| FIN-01 / média | `docs/production/COST_MODEL.md:58` deixa valores para preencher; não foram fornecidas faturas/volumes. Sem orçamento quantificado, crescimento não tem custo previsível. | Preencher modelo abaixo a partir do uso e tabela oficial vigente por provedor, registrando data e unidade. | FinOps + PMO; estimativa por cenário reconciliada com fatura e orçamento aprovado. |
| FIN-02 / média | `src/components/lessons/lesson-player.tsx:26` envia heartbeat a cada 10 s; `src/config/business.ts:423` define 15 s para foco; `src/components/focus/focus-timer.tsx:208` agenda envios. Uso recorrente cresce com minutos ativos. | Medir duração, queries e bytes de cada heartbeat em staging; avaliar agrupamento preservando precisão/idempotência. | Dev + SRE; antes/depois com custo estimado, p95 e testes de progresso sem regressão. |

## Modelo parametrizado

Definir U = usuários ativos mensais; V = minutos de vídeo por usuário/mês; F = minutos de foco por usuário/mês; A = outras requisições por usuário/mês. Baseline de chamadas: `H_video = U × V × 60/10`, `H_foco = U × F × 60/15`, `R = H_video + H_foco + U × A`. Somar retries e outras chamadas reais; pausas e regras do cliente podem reduzir envios. Isto é cenário, não telemetria.

Premissa ilustrativa: V=600, F=300, A=200; sem retries. Manter variáveis diferentes para produto real.

| U | Heartbeats vídeo | Heartbeats foco | R mensal |
|---:|---:|---:|---:|
| 100 | 360.000 | 120.000 | 500.000 |
| 1.000 | 3.600.000 | 1.200.000 | 5.000.000 |
| 10.000 | 36.000.000 | 12.000.000 | 50.000.000 |

Para cada provedor i, `C_i = preço_fixo_i + tarifa_i(uso_i, franquia_i, faixas_i)`. Não usar preço linear único quando a contratação cobra faixas, CPU/memória ou duração. `C_total = soma(C_i)` e `custo_por_ativo = C_total/U`, somente U>0. Acrescentar impostos/câmbio quando aplicáveis, sem misturar moedas.

| Componente | Unidade a medir / precificar |
|---|---|
| Runtime | requisições, CPU/tempo, memória-tempo e banda |
| PostgreSQL/pool | compute, armazenamento, I/O e conexões concorrentes |
| Objetos | GB-mês, operações, egress e cópia de recuperação |
| Vídeo | minutos armazenados/entregues ou GB, conforme contrato |
| E-mail | mensagens por finalidade e retries |
| Cache | comandos por requisição, armazenamento e banda |
| Observabilidade | eventos, bytes/dia, retenção e amostragem |
| CI | builds/mês × minutos, armazenamento de artefatos |
| Fixos | domínio amortizado, assentos, recuperação/backups e suporte |

Capacidade: pico de heartbeats ≈ `usuários simultâneos em vídeo/10 + usuários simultâneos em foco/15` requisições/s, acrescido de outros fluxos e rajadas sincronizadas. Medir queries por chamada e concorrência do pool antes de contratar expansão.

Prioridades propostas: medir consumo por rota primeiro; corrigir queries repetidas e dimensionar pool; avaliar cache e agrupamento de heartbeats com QA; ajustar retenção/amostragem de telemetria mantendo auditoria e recuperação exigidas. Não reduzir controles de segurança ou backups para economizar. Alertas sugeridos em 50%, 80% e 100% do orçamento e desvio da projeção mensal; valores dependem de aprovação do orçamento pelo PMO.

Validações executadas: cadências conferidas no código e aritmética dos cenários revisada. Não executadas: cotação, consulta a billing, benchmark ou comprovação de economia, por ausência de configuração/telemetria e escopo local. Fontes do modelo: arquivos citados e premissas explícitas, sem fontes comerciais atuais. Arquivo criado: este relatório. Próximo responsável: PMO/FinOps; preencher unidades/preços com data, medir uma janela representativa e comparar estimativa versus consumo. Prevenção: revisão mensal de custo por ativo e alertas de tendência.
