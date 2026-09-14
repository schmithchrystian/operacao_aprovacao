# Cobrança opcional — Stripe

Implementação local disponível; nenhuma conta Stripe foi configurada nem houve cobrança real nesta execução. O transporte externo foi substituído por respostas sintéticas nos testes, com PostgreSQL nativo real para persistência, concorrência e autorização.

## Ativação

- Definir `DATA_SOURCE=prisma`, `APP_URL` canônica HTTPS, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` e `STRIPE_PRICE_ID` nos segredos do ambiente. Aplicar todas as migrations, incluindo `0010_admin_mfa` (estado de conciliação em Subscription) e `0011_billing_checkout_reconciliation`.
- O preço precisa existir no provedor: assinatura mensal, trimestral ou anual. Nenhum valor, produto ou contrato é criado automaticamente.
- `BILLING_REQUIRED=false` preserva acesso gratuito. Ativar `true` somente quando o fluxo de compra, suporte e condições comerciais estiverem homologados; o servidor passa a exigir assinatura ACTIVE/TRIALING não expirada nas fronteiras de curso/aula.
- Registrar `POST /api/billing/webhook` para `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed` e `customer.subscription.created/updated/deleted`, `charge.refunded`, `refund.created/updated` e `charge.dispute.created/updated/closed/funds_reinstated`. Assinar usando o segredo desse endpoint, não o segredo de uma sessão Stripe CLI diferente.
- A REST API usa explicitamente `2025-03-31.basil`; os períodos são lidos de cada item de assinatura. Configurar o endpoint com essa versão e validar os fixtures de homologação ao atualizar. [Mudança oficial dos períodos](https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end).
- Configurar o Customer Portal no Stripe com opções comerciais permitidas (pagamentos, cancelamento e alterações). A página `/assinatura` abre o portal para o cliente vinculado ao usuário autenticado. [Portal oficial](https://docs.stripe.com/api/customer_portal/sessions/create).

## Controles implementados

Checkout recebe preço e proprietário exclusivamente do servidor; a chave de idempotência e a URL expirada são persistidas por usuário. Retentar após falha de rede reaproveita a mesma chave. Formulários não aceitam valor, plano, cliente ou ID de usuário. O owner é propagado em `subscription_data.metadata`, conforme [documentação de metadata](https://docs.stripe.com/metadata).

Webhook verifica HMAC SHA256 sobre os bytes UTF-8 originais, comparação constante, assinatura v1 e timestamp com tolerância de 300 segundos; corpo limitado a 1 MiB. [Assinaturas e corpo original](https://docs.stripe.com/webhooks/signature), [entrega e verificação](https://docs.stripe.com/webhooks).

O processamento trava a assinatura no PostgreSQL, consulta seu estado canônico no provedor e grava assinatura+receipt na mesma transação. Evento repetido não cria receipt duplicado; evento antigo não reabre acesso com estado antigo. Ausência do preço configurado, inadimplência, cancelamento e expiração não liberam acesso. Metadata não pode transferir uma assinatura existente entre usuários. [Consulta canônica](https://docs.stripe.com/api/subscriptions/retrieve).

O retorno do checkout não é prova de pagamento. O botão **Atualizar situação do pagamento** permite reconciliar a própria assinatura com a API, inclusive recuperando seu ID a partir do checkout persistido quando um webhook não chegou. Checkout, portal e reconciliação possuem limite por usuário no PostgreSQL.

## Evidência e pendências operacionais

`tests/integration/billing-postgres.test.ts` usa apenas dados sintéticos e limpa suas próprias linhas. Cobre assinatura alterada/fora de prazo, checkout proprietário/idempotente, webhook concorrente, mudança de proprietário recusada, evento fora de ordem, preço não elegível, portal e reconciliação.

Antes de ativar para clientes: executar Stripe test mode de ponta a ponta, confirmar moeda e recorrência, configurar portal/endpoint, validar entrega/retry e observar logs/alertas de respostas 503. Estabelecer política de reembolso, disputa, recontratação após cancelamento e suporte; o código não cancela automaticamente uma assinatura ao receber um reembolso. O portal expõe somente as opções efetivamente configuradas no provedor. A varredura periódica abaixo complementa o retry de webhook e a conciliação por usuário; não substitui homologação no provedor.

## Conciliação agendada

`GET /api/cron/billing` exige `Authorization: Bearer <CRON_SECRET>` com comparação constante. O `vercel.json` agenda a cada 15 minutos; precisa de plano que suporte essa frequência. O worker seleciona até **5 assinaturas e 5 checkouts sem assinatura local** por execução. Assim recupera também o primeiro webhook perdido. Usa claim CAS em `reconciledAt`, ordenação dos mais antigos e intervalo mínimo de 15 minutos; duas invocações concorrentes não processam a mesma seleção. Tentativas com falha também giram na fila, sem alterar o bloqueio ou confirmar recebimento de evento.

Cada chamada Stripe tem timeout de até 8 segundos, cada assinatura tem orçamento de 15 segundos e o lote de 40 segundos, dentro da rota de 60 segundos. A resposta contém contagens `attempted`, `reconciled`, `failed`, sem e-mail, IDs ou segredos. Uma falha parcial retorna HTTP 503 para monitoramento. Conciliação de checkout sem assinatura significa que a sessão foi consultada; não significa pagamento aprovado.

Capacidade máxima teórica: 480 assinaturas e 480 checkouts por dia, menor sob latência/falhas. A frequência não promete que toda conta seja revisada a cada 15 minutos: o atraso cresce com a fila. Monitorar duração, contagem de falhas e a idade da tentativa mais antiga (`reconciledAt`, nulos primeiro), dimensionando frequência/lote antes de ampliar a base. `reconciledAt` registra **tentativa**, não sucesso; os receipts confirmam sincronizações concluídas. Não há recuperação de conta sem checkout persistido nem metadata de proprietário válida.

## Política local de acesso por pagamento

`Subscription.status` continua refletindo o estado canônico da assinatura. O novo campo `accessBlockedReason` controla separadamente o direito de acesso; o código **não cancela a assinatura externa nem emite estornos**.

- Na fatura atual da assinatura, reembolsos com status `succeeded` que devolvem todo o valor pago bloqueiam (`FULL_REFUND`). Reembolso parcial, pendente, falho ou cancelado não é considerado devolução integral confirmada. Pagamentos compartilhados entre faturas atribuem o reembolso proporcionalmente.
- Disputa `needs_response`, `under_review` ou `lost` de pagamento da fatura atual bloqueia (`DISPUTE`). Uma disputa ganha (`won`) ou aviso encerrado não mantém o bloqueio; avisos preventivos não são tratados como perda de pagamento. A próxima sincronização consulta os objetos atuais para decidir, em vez de confiar na ordem do evento.
- Fatura paga e integralmente coberta por crédito/valor zero não é tratada como estorno. Dados ausentes, fatura ainda não paga, métodos fora do fluxo PaymentIntent ou listas com mais de 10 entradas entram em `PAYMENT_REVIEW_REQUIRED`; não aprovam acesso por falta de evidência. Falhas de transporte não removem bloqueios existentes.
- A política se aplica à **fatura mais recente**, não ao histórico inteiro: renovação válida pode restabelecer acesso. Disputas ou devoluções de períodos anteriores exigem tratamento de suporte, sem revogar automaticamente um novo período pago. Trialing continua elegível sem pagamento; bloqueios de pagamento são avaliados quando ativa.
- Checkout adicional é recusado enquanto existir assinatura ACTIVE/TRIALING/PAST_DUE, inclusive bloqueada por risco, para evitar cobrar uma segunda assinatura como solução para uma disputa. Usar portal/suporte para regularização.

As relações charge → PaymentIntent → InvoicePayment → Invoice → Subscription são obtidas da API canônica. Fontes oficiais: [Invoice Payments](https://docs.stripe.com/api/invoice-payment/list), [Charge](https://docs.stripe.com/api/charges/object), [Refund](https://docs.stripe.com/api/refunds/object), [Disputes](https://docs.stripe.com/api/disputes/object). Essa política de produto deve constar nas condições de contratação e ser homologada em modo de teste antes de ativar a cobrança.

Evidência adicional: `tests/unit/billing-payment-risk.test.ts`, `billing-reconciliation.test.ts`, `billing-cron.test.ts` e integração PostgreSQL verificam políticas, autorização cron, concorrência, recuperação de checkout, falha parcial, reembolso integral, disputa e recuperação. Nenhum teste realiza chamadas Stripe reais.
