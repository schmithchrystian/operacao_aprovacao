# Plano de E-mail Transacional — Operação Aprovação

> Produzido pelo subagente `backend` (cluster infra de mídia). Complementa
> [`CURRENT_STATE.md`](./CURRENT_STATE.md) (bloqueador #8 — sem e-mail, sem registro/recuperação
> de senha), [`TARGET_ARCHITECTURE.md`](./TARGET_ARCHITECTURE.md) (§5 — candidatos a provedor) e
> [`ENVIRONMENTS.md`](./ENVIRONMENTS.md) (e-mail em sandbox fora de produção). Só
> análise/planejamento — nenhum domínio, DNS, template ou credencial foi criado nesta fase.

## 0. Contexto verificado no código

- `package.json` não tem **nenhuma** dependência de e-mail hoje (confirma bloqueador #8).
- `User.emailVerified: DateTime?` já existe no schema (`prisma/schema.prisma:216`) — campo pronto, mas nada o preenche hoje (sem fluxo de verificação).
- **Não existe model de token de verificação/reset** no schema (`grep` por `VerificationToken`/`PasswordReset` não retornou nada) — é uma peça de dados nova, a modelar (provavelmente pelo agente `database`) antes deste plano poder ser implementado.
- `src/app/(auth)/` só tem `login/` — **sem página de registro nem de recuperação de senha**, confirmando o bloqueador #8 do `CURRENT_STATE.md`.
- Auth.js v5 (Credentials + JWT) é **mantido** (`TARGET_ARCHITECTURE.md` §3) — o e-mail entra como peça complementar (envio de link/token), não como provedor de identidade.
- Bloqueador #1 (senha lida direto do mock) é **P0 dura** e roadmap-anterior a este plano — registro/recuperação de senha (Fase 15) depende do bloqueador #1 já estar resolvido, porque ambos escrevem/leem `UserRepository.findCredentialsByEmail`.

## 1. Provedor recomendado: Resend

**Recomendação: Resend.** Justificativa comparativa:

| Critério | Resend | Postmark | AWS SES | SendGrid |
|---|---|---|---|---|
| Integração com Next.js/Vercel | Melhor do grupo — mesma empresa por trás do `react-email`, SDK oficial (`resend`) pensado para Server Actions/Route Handlers, templates em **React** (reaproveita componentes/design system do próprio produto) | Boa (API simples), sem integração nativa de templates em React | Baixo nível — API robusta mas exige mais código de integração (assinatura de request, retry, etc.) | Boa API, mas histórico de complexidade de configuração maior que Resend/Postmark |
| DX para templates transacionais | **Alta** — `react-email` permite prévia local do template como componente React | Templates próprios (Handlebars-like), sem reuso de componentes React | Sem sistema de template — texto/HTML puro | Templates próprios (Dynamic Templates), UI própria |
| Deliverability para transacional | Boa reputação para volume baixo/médio (o perfil deste produto no MVP/crescimento) | Historicamente forte especificamente em transacional (reputação dedicada) | Excelente em escala, mas exige mais configuração de reputação/warmup manual | Boa, mas reputação mais heterogênea (compartilha infra com envio de marketing em massa) |
| Custo | Free tier + preço competitivo por volume; **verificar no painel Resend** | Similar, **verificar no painel Postmark** | Mais barato em volume alto, mas com curva de operação maior | **Verificar no painel SendGrid** |
| Sandbox/teste sem enviar de verdade | Sim (modo teste + inbox de desenvolvimento) | Sim (test mode) | Não nativo (precisa simular endereço `success@simulator.amazonses.com`) | Sim (sandbox mode) |
| Complexidade operacional | **Baixa** (API + domínio verificado, pronto) | Baixa | Alta (IAM, SES sandbox por padrão até liberar produção, verificação de domínio manual) | Média |

Resend ganha por alinhamento direto com a stack (Next.js/Vercel/React) e menor fricção operacional para o volume esperado deste produto (educacional, não é uma plataforma de e-mail em massa). Se no futuro o volume crescer muito (dezenas/centenas de milhares de e-mails/dia) ou custo em escala virar o critério dominante, reavaliar AWS SES nesse momento — não é uma decisão a travar agora.

## 2. E-mails a planejar

| E-mail | Gatilho | Conteúdo essencial | Observação de segurança |
|---|---|---|---|
| **Verificação de e-mail** | Registro de nova conta (Fase 15, ainda não implementada) | Link com token de uso único → marca `User.emailVerified` | Token de vida curta (ex.: 24h), uso único, invalidado após consumo. |
| **Recuperação de senha** | Aluno solicita "esqueci minha senha" | Link com token de uso único → tela de nova senha | Token de vida **curta** (15-60 min), uso único; **nunca revelar se o e-mail existe ou não** na resposta da UI (evita enumeração de contas); invalidar todos os tokens antigos do usuário ao emitir um novo. |
| **Boas-vindas** | Após verificação de e-mail concluída (ou registro, a decidir) | Orientação de primeiros passos | Sem dado sensível; pode ser best-effort (falha de envio não deve bloquear o fluxo de registro). |
| **Confirmação de matrícula** | `enroll()` (`src/server/services/courses/enroll.ts`) concluído com sucesso | Curso, data, próximos passos | Best-effort (não bloquear a matrícula em si se o e-mail falhar — matrícula já é idempotente e teve sucesso antes do envio). |
| **Alerta de segurança** | Ex.: troca de senha, novo login de dispositivo/IP incomum, papel/role alterado por admin | "Foi você?" + link de suporte | Não incluir a senha nova/antiga nem token de sessão no corpo do e-mail. |
| **Notificações** (gerais) | Eventos do produto que hoje só existem in-app (`NotificationRepository`, `CURRENT_STATE.md` linha "Notifications") | Resumo do evento + link para o app | Deve respeitar preferências do usuário (opt-out) desde o início — ver rate limit/unsubscribe abaixo. |
| **Cobrança (futura)** | Assinatura/pagamento (`Subscription`, ainda sem service/webhook — Fase 16) | Fatura, falha de cobrança, renovação | Fora do escopo imediato; mesma infraestrutura de `EmailProvider` é reaproveitada quando a Fase 16 for implementada. |

## 3. Configuração de domínio e autenticação de e-mail

- **Subdomínio de envio dedicado**: usar `send.<dominio>` (ou `mail.<dominio>`) em vez do domínio raiz — isola a reputação de envio transacional da reputação do domínio principal (site/produto), prática recomendada pelo próprio Resend/Postmark.
- **SPF**: registro `TXT` no subdomínio de envio autorizando os servidores do provedor a enviar em nome dele (o provedor fornece o valor exato no momento da verificação de domínio — não inventar aqui).
- **DKIM**: registros `CNAME`/`TXT` fornecidos pelo provedor (chave pública de assinatura) — sem isso, e-mail cai em spam com muito mais frequência em caixas Gmail/Outlook.
- **DMARC**: registro `TXT` em `_dmarc.<dominio>` com política inicial recomendada `p=quarantine` (ou `p=none` só durante a fase de validação inicial, evoluindo para `quarantine`/`reject` depois de confirmar que SPF/DKIM estão alinhados e não há falso positivo) + endereço de agregação de relatórios (`rua=`) para monitorar abuso/spoofing do domínio.
- Verificação de domínio é feita **uma vez por ambiente que enviar e-mail de verdade** — em `local`/dev normal não deveria precisar (ver sandbox abaixo).

## 4. Ambiente de testes (sandbox fora de produção)

Alinhado com `ENVIRONMENTS.md` §2 (linha "E-mail" — "console/log" em local, "sandbox" em dev/staging, "real" só em produção):

- **local**: nenhum envio real — logar o conteúdo do e-mail (assunto + link/token) no console/servidor, ou usar o modo de teste do Resend (se disponível offline) apenas para não travar o fluxo de desenvolvimento.
- **development/staging**: modo sandbox do provedor OU lista fechada de endereços internos de QA — **nunca** disparar para um e-mail de terceiro real a partir desses ambientes (`ENVIRONMENTS.md` §1, princípio 5: "nunca disparar e-mail real para endereços de terceiros a partir de dev/staging").
- **production**: envio real, domínio verificado (SPF/DKIM/DMARC ativos), segredos (`API key` do provedor) exclusivos de produção.

## 5. Proteção contra envio indevido

- **Rate limit** por endpoint sensível: "esqueci minha senha" e "reenviar verificação" precisam de limite por e-mail/IP (mesmo padrão já usado em `src/server/auth/rate-limit.ts` para login — reaproveitar a mesma estratégia, hoje em `globalThis`, migrando para KV/Redis distribuído junto da Fase 10 do roadmap) — sem isso, esses endpoints viram vetor de spam/enumeração/DoS de caixa de entrada de terceiros.
- **Templates centralizados**: um único ponto de composição de e-mail (ex.: `src/server/email/templates/*` com `react-email`) — nunca strings HTML montadas ad-hoc em múltiplos lugares do código, para manter consistência e evitar injeção de conteúdo não sanitizado no corpo do e-mail.
- **Unsubscribe** onde aplicável: e-mails de **notificação/produto** (não transacionais de segurança) devem ter link de descadastro (`List-Unsubscribe` header + link no corpo) — verificação de e-mail, recuperação de senha e alertas de segurança **não** levam unsubscribe (são obrigatórios/de segurança, não marketing).
- **Nunca expor se um e-mail existe ou não** nas respostas de "esqueci minha senha"/"reenviar verificação" — sempre responder com a mesma mensagem genérica de sucesso, independente de o e-mail estar cadastrado (mesma lógica de timing-defense já aplicada ao login, `credentials-service.ts`).

## 6. Integração com o plano de autenticação (tokens de verificação/reset)

Este plano depende de uma peça de dados que **ainda não existe** no schema: uma tabela de tokens de uso único (nome sugerido `VerificationToken` ou `PasswordResetToken`, a definir pelo agente `database`) com, no mínimo: `userId`/`email`, `tokenHash` (nunca armazenar o token em texto plano — mesmo padrão de `passwordHash`), `purpose` (`EMAIL_VERIFICATION` | `PASSWORD_RESET`), `expiresAt`, `usedAt`. Fluxo:

1. Aluno solicita ação (registro → verificação; "esqueci senha" → reset).
2. Service gera um token aleatório (alta entropia, ex.: `crypto.randomBytes`), grava **o hash** do token na tabela nova com `expiresAt` curto, e chama `EmailProvider.send(...)` com o link contendo o token **em texto plano** (só ele sai por e-mail; o banco guarda só o hash — mesmo princípio de "não armazenar o segredo em claro" da senha).
3. Aluno clica no link → Route Handler/Server Action recebe o token, faz hash e compara contra a tabela, checa `expiresAt`/`usedAt`, e só então executa a ação (marcar `emailVerified` ou permitir definir nova senha via `UserRepository`).
4. Token é marcado como usado (ou apagado) imediatamente após sucesso — nunca reutilizável.
5. Isso depende do bloqueador #1 (`CURRENT_STATE.md`) estar resolvido primeiro: a troca de senha via este fluxo precisa gravar o novo hash através do **mesmo** `UserRepository.findCredentialsByEmail`/atualização que a correção do bloqueador #1 introduz — caso contrário, o reset de senha escreveria num lugar e o login continuaria lendo de outro (repetindo o mesmo bug do bloqueador #1 por um caminho novo).

## 7. Variáveis de ambiente necessárias (a somar ao `env.ts`, não implementado nesta fase)

| Variável | Propósito |
|---|---|
| `EMAIL_API_KEY` | Chave da API do Resend (por ambiente; sandbox em dev/staging, real em produção) |
| `EMAIL_FROM` | Remetente (ex.: `Operação Aprovação <no-reply@send.dominio.com>`) — subdomínio dedicado |
| `EMAIL_MODE` (sugestão) | `console` (local) \| `sandbox` (dev/staging) \| `live` (produção) — chaveia a implementação de `EmailProvider` sem depender só da presença/ausência de API key |

Preços/limites de envio por plano: **verificar no painel Resend** (Billing/Usage) antes de assumir volume mensal de e-mails transacionais + notificações.

## 8. Riscos e pendências

- Model de token de verificação/reset não existe no schema — bloqueia a implementação deste plano até o agente `database` desenhá-lo.
- Registro de conta e recuperação de senha (páginas + actions) não existem em `src/app/(auth)/` — são a Fase 15 do roadmap, e dependem do bloqueador #1 (senha via `UserRepository`) já resolvido (Fase 8).
- Preferências de notificação por e-mail (opt-out granular) ainda não modeladas — hoje `NotificationRepository` é só in-app; decisão de quais notificações viram e-mail por padrão vs. opt-in é pendência de produto, não só de infraestrutura.
- Nenhum código, domínio ou credencial foi criado nesta fase: `EmailProvider`, templates e DNS ficam para a Fase 14 do roadmap (`docs/production/ROADMAP_SKELETON.md`).
