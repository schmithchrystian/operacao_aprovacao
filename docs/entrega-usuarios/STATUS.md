# Estado da primeira entrega

Atualizado em 14/09/2026 UTC. Candidato de produto: `4766b17`, branch `codex/saas-production-hardening`. Correção posterior nesta frente: textos dos indicadores administrativos, validada por ESLint. O servidor usado na homologação ainda corresponde a `4766b17`.

**Código consolidado e candidato local validado. Ainda não publicado para usuários.**

## Implementação consolidada

Persistência PostgreSQL, autorização atualizada, revogação de sessões, limite de autenticação, cadastro/verificação/recuperação, fila cifrada de e-mails, conteúdo privado, anotações com controle de concorrência, dashboard real e módulos de estudo foram implementados. Cobrança Stripe é opcional e seus provedores foram simulados nos testes. Detalhes em [estado da implementação](../implementation/STATUS.md).

Nesta frente também foram corrigidos falhas de transporte no login, redirecionamento de sessões revogadas/rebaixadas, agendamentos Vercel e dados obrigatórios da fixture de homologação. A revisão independente identificou perda de notas na navegação e senha de cadastro pendente; ambas foram corrigidas na implementação consolidada.

A conferência administrativa revelou textos desatualizados. A interface agora identifica usuários habilitados de todos os perfis, explica a fórmula de engajamento e nomeia matrículas/registros de progresso conforme os dados. O aviso falso de ausência do domínio de assinaturas foi removido.

## Evidências

| Verificação                     | Resultado e alcance                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Suíte global do candidato       | 823 testes unitários, 124 arquivos, aprovados pela frente de implementação                                     |
| Integração do candidato         | 63 testes em PostgreSQL, 10 arquivos, aprovados pela frente de implementação                                   |
| Qualidade do candidato          | Lint, TypeScript e build aprovados; drift Prisma zero; npm audit sem vulnerabilidades conhecidas               |
| Anotações, revisão independente | 9 testes aprovados, actions simuladas; inclui navegação durante gravação                                       |
| Preflight                       | 7 testes aprovados; configuração hospedada local reprovada por ausência das variáveis necessárias              |
| Navegador com PostgreSQL        | Login, dashboard, catálogo, curso, aula, persistência de notas, flashcards e consulta administrativa aprovados |
| Celular                         | Dashboard sem rolagem horizontal em 390 × 844; menu abre e fecha ao navegar                                    |

O teste real de notas digitou texto e navegou imediatamente à trilha; uma nova aba recuperou o mesmo texto do servidor. Flashcards: criação de baralho/cartão, revelação da resposta e avaliação Fácil concluídas, com próxima revisão calculada. Administração: login e listagem de curso publicado aprovados. Console sem erros/avisos nas consultas finais. A fixture é sintética; nenhum conteúdo de clientes foi utilizado.

Capturas: [notas](evidencias/aula-anotacao-persistida.png), [celular](evidencias/dashboard-celular.png), [revisão](evidencias/flashcard-revisao-concluida.png), [administração](evidencias/admin-cursos.png). Resultados estruturados: [validações](evidencias/validacoes.json).

As duas suítes independentes foram adicionadas à CI; os comandos passaram localmente (9 + 7 testes). A execução hospedada do workflow permanece pendente.

## O que falta para disponibilizar aos usuários

1. Provisionar e configurar hospedagem, banco/armazenamento, domínio e segredos reais; aplicar migrations e criar o administrador inicial.
2. Validar envio e recebimento de e-mail, tarefas agendadas, monitor externo e restauração de banco e objetos no ambiente escolhido.
3. Publicar conteúdo aprovado e testar reprodução/retomada de vídeo e PDF privado. A fixture local não contém mídia: esses fluxos não foram homologados com arquivos reais.
4. Executar a matriz de aceite no ambiente hospedado e abrir o beta em lotes. Se houver cobrança, homologar checkout, webhook, cancelamento e reconciliação com Stripe antes de vender.

MFA administrativo ainda não implementado; vídeos sem transcodificação adaptativa; reembolsos/disputas exigem tratamento operacional; algumas agregações precisam de otimização antes de ampliar capacidade. O beta proposto de até 50 alunos é limite de operação, não capacidade comprovada por teste de carga.

O [roteiro de implantação](PRIMEIRO-DEPLOY.md) e o preflight estão preparados. Não houve deploy público, contratação de recursos, cobrança ou envio real de e-mail nesta execução. Os relatórios da auditoria preservam o diagnóstico histórico, anterior às correções.
