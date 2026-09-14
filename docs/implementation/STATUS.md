# Estado da implementação

Atualizado em 13/09/2026 (US/Pacific). Base auditada: `b640716c317e3f20cc15fadb6a74188fc9b58794`. Branch: `codex/saas-production-hardening`.

## Entrega local

Os 172 métodos Prisma incompletos foram implementados. Persistência e contratos cobrem conteúdo, matrículas, progresso, simulados, gamificação, estudo, Brainstorm e flashcards. Foram aplicadas dez migrations, de `0000_init` a `0009_fractional_study_time`, em PostgreSQL nativo isolado.

Corrigidos os bloqueadores de autorização atualizada, revogação de sessões, exclusão lógica, limite atômico no provider Credentials, configuração de produção, publicação de conteúdo, privacidade e gravações parciais. Operações de domínio usam unidade transacional, eventos/auditoria duráveis e controle de concorrência compartilhado.

Também entregues: configuração administrativa versionada, ranking atômico com snapshots vazios, conquistas persistentes, notas com CAS/autosave, favoritos/conversão real de flashcards, busca, notificações, trilhas, missões retomáveis e dashboard com dados reais. Tempo de vídeo/foco é agregado por atividade aceita, incluindo frações e virada do dia em São Paulo.

Cadastro, verificação e recuperação usam tokens de uso único, senha vinculada ao pedido confirmado e fila de e-mail cifrada. Cobrança Stripe é configurável, com webhook assinado/idempotente, portal e reconciliação manual. PDFs privados e vídeos MP4 privados têm URLs temporárias emitidas após autorização. Serviços externos foram testados com transportes simulados; não houve cobrança nem envio real.

## Evidências finais

| Verificação | Resultado |
|---|---|
| Unitários | 823 aprovados, 124 arquivos |
| Integração PostgreSQL | 63 aprovados, 10 arquivos |
| ESLint global | Aprovado |
| TypeScript / build Next em modo Prisma staging | Aprovados |
| Diff banco aplicado vs. schema Prisma | Sem diferenças |
| npm audit | 0 vulnerabilidades conhecidas na árvore verificada |
| HTTP no aplicativo compilado | Login direto, revogação, limite compartilhado, readiness, métricas protegidas e CSP aprovados |
| Navegador | Login, catálogo, curso, aula, dashboard real e notas aprovados; navegação imediata aguardou gravação e outra aba recuperou o texto; console sem erros |

Os testes de integração incluem rollback após escritas, concorrência, persistência após reconexão, isolamento por usuário, fila/replay, assinatura de webhook e expiração de matrícula. Testes não equivalem a certificação de segurança nem à homologação dos provedores reais.

## Operação externa ainda pendente

A aplicação não foi publicada em uma conta de nuvem nesta execução. Ainda é necessário configurar domínio, banco/armazenamento gerenciado, remetente de e-mail, chave da fila, scheduler e, para cobrança, Stripe. Depois: validar entrega/checkout com o provedor, monitor externo e restauração real de banco e objetos. O workflow inclui ensaio de dump/restore em banco isolado, mas não foi executado no runner nesta sessão.

Limites registrados: MFA administrativo ainda não implementado; vídeos sem transcodificação adaptativa; reembolsos/disputas não revogam automaticamente assinatura; reconciliação Stripe é manual; algumas agregações carregam listas completas e precisam de otimização antes de ampliar capacidade. O modo pago permanece opcional e não é declarado homologado.

Os relatórios em `docs/agents/execucao-2026-09-13` e `docs/auditoria-2026-09-13` preservam o diagnóstico anterior às correções. Não devem ser usados como estado atual. Consulte [operação](OPERACAO.md) e [entrega controlada](../entrega-usuarios/README.md) para implantação e aceite.
