# Cobrança opcional — Stripe

Implementação local disponível; nenhuma conta Stripe foi configurada nem houve cobrança real nesta execução. O transporte externo foi substituído por respostas sintéticas nos testes, com PostgreSQL nativo real para persistência, concorrência e autorização.

## Ativação

- Definir `DATA_SOURCE=prisma`, `APP_URL` canônica HTTPS, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` e `STRIPE_PRICE_ID` nos segredos do ambiente. Aplicar migrations até `0005_billing_idempotency`.
- O preço precisa existir no provedor: assinatura mensal, trimestral ou anual. Nenhum valor, produto ou contrato é criado automaticamente.
- `BILLING_REQUIRED=false` preserva acesso gratuito. Ativar `true` somente quando o fluxo de compra, suporte e condições comerciais estiverem homologados; o servidor passa a exigir assinatura ACTIVE/TRIALING não expirada nas fronteiras de curso/aula.
- Registrar `POST /api/billing/webhook` para `checkout.session.completed` e `customer.subscription.created/updated/deleted`. Assinar usando o segredo desse endpoint, não o segredo de uma sessão Stripe CLI diferente.
- A REST API usa explicitamente `2025-03-31.basil`; os períodos são lidos de cada item de assinatura. Configurar o endpoint com essa versão e validar os fixtures de homologação ao atualizar. [Mudança oficial dos períodos](https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end).
- Configurar o Customer Portal no Stripe com opções comerciais permitidas (pagamentos, cancelamento e alterações). A página `/assinatura` abre o portal para o cliente vinculado ao usuário autenticado. [Portal oficial](https://docs.stripe.com/api/customer_portal/sessions/create).

## Controles implementados

Checkout recebe preço e proprietário exclusivamente do servidor; a chave de idempotência e a URL expirada são persistidas por usuário. Retentar após falha de rede reaproveita a mesma chave. Formulários não aceitam valor, plano, cliente ou ID de usuário. O owner é propagado em `subscription_data.metadata`, conforme [documentação de metadata](https://docs.stripe.com/metadata).

Webhook verifica HMAC SHA256 sobre os bytes UTF-8 originais, comparação constante, assinatura v1 e timestamp com tolerância de 300 segundos; corpo limitado a 1 MiB. [Assinaturas e corpo original](https://docs.stripe.com/webhooks/signature), [entrega e verificação](https://docs.stripe.com/webhooks).

O processamento trava a assinatura no PostgreSQL, consulta seu estado canônico no provedor e grava assinatura+receipt na mesma transação. Evento repetido não cria receipt duplicado; evento antigo não reabre acesso com estado antigo. Ausência do preço configurado, inadimplência, cancelamento e expiração não liberam acesso. Metadata não pode transferir uma assinatura existente entre usuários. [Consulta canônica](https://docs.stripe.com/api/subscriptions/retrieve).

O retorno do checkout não é prova de pagamento. O botão **Atualizar situação do pagamento** permite reconciliar a própria assinatura com a API, inclusive recuperando seu ID a partir do checkout persistido quando um webhook não chegou. Checkout, portal e reconciliação possuem limite por usuário no PostgreSQL.

## Evidência e pendências operacionais

`tests/integration/billing-postgres.test.ts` usa apenas dados sintéticos e limpa suas próprias linhas. Cobre assinatura alterada/fora de prazo, checkout proprietário/idempotente, webhook concorrente, mudança de proprietário recusada, evento fora de ordem, preço não elegível, portal e reconciliação.

Antes de ativar para clientes: executar Stripe test mode de ponta a ponta, confirmar moeda e recorrência, configurar portal/endpoint, validar entrega/retry e observar logs/alertas de respostas 503. Estabelecer política de reembolso, disputa, recontratação após cancelamento e suporte; o código não cancela automaticamente uma assinatura ao receber um reembolso. O portal expõe somente as opções efetivamente configuradas no provedor. Ainda não existe varredura agendada de reconciliação de todas as contas; há reconciliação autenticada por usuário e retry de webhook.
