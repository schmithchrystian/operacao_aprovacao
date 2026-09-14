# Estado da implementação

Atualizado em 14/09/2026 (US/Pacific). Base auditada: `b640716c317e3f20cc15fadb6a74188fc9b58794`. Branch: `codex/saas-production-hardening`.

## Entrega local

Os 172 métodos Prisma incompletos foram implementados. Persistência e contratos cobrem conteúdo, matrículas, progresso, simulados, gamificação, estudo, Brainstorm e flashcards. Foram aplicadas doze migrations, de `0000_init` a `0011_billing_checkout_reconciliation`, em PostgreSQL nativo isolado.

Corrigidos os bloqueadores de autorização atualizada, revogação de sessões, exclusão lógica, limite atômico no provider Credentials, configuração de produção, publicação de conteúdo, privacidade e gravações parciais. Operações de domínio usam unidade transacional, eventos/auditoria duráveis e controle de concorrência compartilhado.

Também entregues: configuração administrativa versionada, ranking atômico com snapshots vazios, conquistas persistentes, notas com CAS/autosave, favoritos/conversão real de flashcards, busca, notificações, trilhas, missões retomáveis e dashboard com dados reais. Tempo de vídeo/foco é agregado por atividade aceita, incluindo frações e virada do dia em São Paulo.

Cadastro, verificação e recuperação usam tokens de uso único, senha vinculada ao pedido confirmado e fila de e-mail cifrada. Cobrança Stripe é configurável, com webhook assinado/idempotente, portal e reconciliação manual/agendada, além de tratamento de renovação, reembolso integral e disputa. MFA administrativo foi entregue e é exigido pela configuração de produção. PDFs privados e vídeos MP4 privados têm URLs temporárias emitidas após autorização. Serviços externos foram testados com transportes simulados; não houve cobrança nem envio real.

## Evidências finais

| Verificação                                    | Resultado                                                                                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unitários                                      | 872 aprovados, 129 arquivos                                                                                                                           |
| Integração PostgreSQL                          | 75 aprovados, 11 arquivos (origem e banco restaurado)                                                                                                 |
| ESLint global                                  | Aprovado                                                                                                                                              |
| TypeScript / build Next em modo Prisma staging | Aprovados                                                                                                                                             |
| Diff banco aplicado vs. schema Prisma          | Sem diferenças                                                                                                                                        |
| npm audit                                      | 0 vulnerabilidades conhecidas na árvore verificada                                                                                                    |
| HTTP no aplicativo compilado                   | Login direto, revogação, limite compartilhado, readiness, métricas protegidas, CSP e MFA aprovados                                                    |
| Backup/restauração local                       | 60 tabelas, 273 registros; hashes e contagens iguais ao snapshot; suíte de integração executada sobre o destino                                       |
| Navegador (rodada de 13/09)                    | Login, catálogo, curso, aula, dashboard real e notas aprovados; navegação imediata aguardou gravação e outra aba recuperou o texto; console sem erros |

Os testes de integração incluem rollback após escritas, concorrência, persistência após reconexão, isolamento por usuário, fila/replay, assinatura de webhook e expiração de matrícula. Testes não equivalem a certificação de segurança nem à homologação dos provedores reais.

## Operação externa ainda pendente

A aplicação não foi publicada em uma conta de nuvem nesta execução. Ainda é necessário configurar domínio, banco/armazenamento gerenciado, remetente de e-mail, chave da fila, scheduler e, para cobrança, Stripe. Depois: validar entrega/checkout com o provedor, monitor externo e restauração real de banco e objetos. O workflow inclui ensaio de dump/restore em banco isolado, mas não foi executado no runner nesta sessão.

Limites registrados: troca de dispositivo MFA sob política obrigatória exige operação assistida; vídeos sem transcodificação adaptativa; a política de risco controla acesso sem cancelar/estornar a assinatura externa; conciliação por lotes exige dimensionamento; algumas agregações carregam listas completas e precisam de otimização antes de ampliar capacidade. O modo pago permanece opcional e não é declarado homologado.

Os relatórios em `docs/agents/execucao-2026-09-13` e `docs/auditoria-2026-09-13` preservam o diagnóstico anterior às correções. Não devem ser usados como estado atual. Consulte [operação](OPERACAO.md) e [entrega controlada](../entrega-usuarios/README.md) para implantação e aceite.

A [revalidação de 14/09](REVALIDACAO-2026-09-14.md) detalha as mudanças e os resultados desta continuação.
