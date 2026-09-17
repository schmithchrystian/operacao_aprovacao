# Parte 1 — primeira disponibilização aos usuários

**Estado: candidato local consolidado e validado; publicação e homologação hospedada pendentes.**

O objetivo desta parte é um beta controlado para até 50 alunos, com dados persistentes e jornadas reais. Esse número é um limite inicial de operação, não capacidade já medida. A tarefa “11 Agents - Saas” implementa os módulos e infraestrutura no checkout compartilhado; esta frente adiciona revisão independente e instrumentos de liberação. Não duplicar implementações no mesmo arquivo.

## Entregas e ordem

| Etapa                | Resultado exigido                                                                         | Critério de conclusão                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1. Segurança e banco | Sessões revogáveis, autenticação limitada, dependências tratadas, PostgreSQL e transações | Testes negativos e integração real aprovados no commit candidato                                         |
| 2. Entrada do aluno  | Criação de conta ou convite controlado, login, recuperação de senha, perfil               | E-mail recebido, token expirado/reutilizado rejeitado, acesso entre usuários negado                      |
| 3. Curso completo    | Catálogo publicado, matrícula, vídeo real, progresso e anotações                          | Aluno conclui aula, recarrega, troca de dispositivo e recupera dados corretos                            |
| 4. Estudo            | Simulados e demais módulos disponibilizados com persistência e permissões                 | Fluxos exibidos funcionam até o fim; recursos incompletos saem da navegação e são bloqueados no servidor |
| 5. Operação          | Staging isolado, deploy repetível, monitoramento, backup e reversão                       | Evidência de restauração e teste de falha; responsável e canal de suporte definidos                      |
| 6. Beta              | Conteúdo aprovado e alunos iniciais admitidos em lotes                                    | Homologação abaixo aprovada; erros e custos acompanhados antes de ampliar                                |

Cobrança recorrente e expansão comercial compõem a parte seguinte, após entitlement, checkout, webhooks, cancelamento e reconciliação serem homologados. O beta não deve anunciar assinatura paga ou conceder acesso com base em pagamento ainda não integrado. O [cronograma completo](../auditoria-2026-09-13/CRONOGRAMA.md) continua sendo o backlog de referência; esta divisão organiza uma primeira disponibilização menor, sem declarar todo o SaaS concluído.

## Validação independente já executada nesta frente

Nove testes de interação das anotações passaram, incluindo três cenários de navegação durante gravação: carregar/salvar com versão, preservar texto após falha de conexão, comparar conflito sem sobrescrita automática, substituir somente por escolha explícita, recuperar falha inicial e ignorar resposta de aula anterior. Esses testes usam actions simuladas e **não comprovam persistência PostgreSQL**.

```sh
node node_modules/vitest/vitest.mjs run --config docs/entrega-usuarios/notas.config.ts
node --test docs/entrega-usuarios/preflight.test.mjs
```

Os testes mantêm configuração independente e agora integram a CI em duas etapas explícitas: navegação das anotações e preflight. Ambos os comandos passaram localmente; a execução no GitHub Actions ainda não ocorreu. Os resultados globais do candidato estão no registro desta etapa.

## Homologação obrigatória da versão candidata

Registrar commit, URL do ambiente, data, responsável, resultado e evidência sanitizada de cada linha. Todos os itens abaixo estão pendentes de homologação hospedada nesta frente.

| Jornada                  | Verificação                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Conta                    | Cadastro/convite real, e-mail e recuperação; sem enumeração de contas; token de uso único e expiração               |
| Sessão                   | Login válido; callback direto limitado; sessão anterior perde privilégios após bloqueio/rebaixamento                |
| Conteúdo                 | Apenas publicado; tentativa direta de acessar rascunho, aula sem matrícula e material de terceiro negada            |
| Vídeo                    | Reprodução, seek, retomada, erro de mídia e acesso privado testados com provedor escolhido                          |
| Progresso                | Persistência após restart; heartbeat plausível; aula concluída uma vez, recompensa sem duplicação                   |
| Anotações                | Persistência em outra sessão/dispositivo, conflito em duas abas, falha de rede; nenhuma nota de terceiro            |
| Navegação durante edição | Sair da aula antes do autosave não pode perder texto silenciosamente; testar links internos, voltar e fechar aba    |
| Simulado                 | Respostas privadas, finalização atômica, falha intermediária e repetição sem corrupção                              |
| Privacidade              | Flags ocultam informações no payload do ranking e do perfil                                                         |
| Módulos de estudo        | Planejamento, foco, flashcards e Brainstorm exibidos funcionam sem mocks; alternativa é bloquear recurso incompleto |
| Interface                | Desktop e celular, teclado, foco visível, labels, carregamento, estados vazios e erros compreensíveis               |
| Operação                 | Health sem dados internos, alertas recebidos, restauração comprovada, release anterior recuperável                  |

## Critério para comunicar “pronta”

Somente após fechar os bloqueadores acima, validar a release exata e publicar no ambiente definitivo. Um preflight aprovado, testes com actions simuladas ou uma página respondendo 200 não bastam. Sem credenciais/contas de hospedagem demonstradas, a entrega permanece código candidato e procedimento de implantação, não serviço operacional.

Consulte o [roteiro do primeiro deploy](PRIMEIRO-DEPLOY.md) e o [registro desta etapa](STATUS.md).
