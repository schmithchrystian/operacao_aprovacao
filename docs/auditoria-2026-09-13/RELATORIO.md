# Auditoria técnica e prontidão do SaaS

**Projeto:** Operação Aprovação · **Data:** 13/09/2026, US/Pacific (14/09 UTC).  
**Base analisada:** `b640716c317e3f20cc15fadb6a74188fc9b58794`, branch `main`.  
**Veredito:** aplicação demonstrável com boa base de interface e regras; **não pronta para operação comercial com dados reais**.

O principal trabalho restante é implementar persistência e completar os fluxos de produto. Trocar uma variável de ambiente ou contratar hospedagem não resolve isso. Existem 37 classes Prisma, mas **172 métodos ainda lançam `not implemented`**. Apenas a consulta de credenciais do usuário tem implementação real nesse conjunto.

O [cronograma](CRONOGRAMA.md) organiza a conclusão; [infraestrutura e custos](CUSTOS.md) fundamenta a proposta econômica. A lista completa dos arquivos e métodos pendentes está em [INVENTARIO.md](INVENTARIO.md). Os resultados brutos estão em `evidencias/`.

## 1. Escopo e método

- Inventário e varredura de todos os **750 arquivos versionados**: código, contratos, repositórios, componentes, rotas, configuração, schema, migration, seed, documentação, testes e assets. São 90.748 linhas físicas, incluindo 13.542 do lockfile; tamanho não representa maturidade ou percentual de conclusão.
- Revisão aprofundada dos caminhos de autenticação/autorização, administração, persistência, publicação de conteúdo, aulas, tempo de estudo, simulados, gamificação, ranking e privacidade; rastreamento das integrações entre os demais módulos.
- Leitura dos planos existentes confrontada com o código atual, sem aceitar comentários de “implementado” ou testes em mock como prova de funcionamento em Postgres.
- Instalação pelo lockfile, geração do Prisma Client, lint, TypeScript, testes, build e validação de schema efetivamente executados.
- Smoke HTTP sobre build de produção **local**, com dados fictícios e `DATA_SOURCE=mock`; seis caracterizações executáveis de defeitos, além da reprodução HTTP do login.
- Auditoria npm completa e sem dependências de desenvolvimento; consulta aos avisos dos mantenedores e páginas oficiais de preços.
- Busca por cinco padrões comuns de credenciais em **976 blobs de texto únicos nos 21 commits** do histórico disponível. Sem correspondências para esses padrões. Isso não equivale a provar ausência de todos os tipos de segredo.

Esta é uma revisão de repositório e execução local. Não houve pentest de um serviço público, homologação de fornecedores, avaliação visual em dispositivos reais, carga real ou teste contra PostgreSQL. Não foram inspecionadas configurações de contas de nuvem, produção, DNS, branch rules ou backups externos. Ausência desses recursos no código significa **não demonstrados pelo repositório**, não inexistência em alguma conta externa.

A auditoria principal foi conduzida nesta tarefa, sem subagentes. As descrições de responsabilidades de arquitetura, segurança, testes e revisão em `.claude/agents/` serviram de checklist. Uma tarefa separada, autorizada pelo usuário, produziu [pareceres complementares de 11 perfis](../agents/execucao-2026-09-13/README.md), que corroboram o bloqueio de produção. QA e Revisão reexecutaram as mesmas seis caracterizações; isso não representa doze defeitos distintos nem comprovação de correção. Não houve implementação de funcionalidades nem alteração de entidades, migrations ou endpoints nesta auditoria. A revisão humana e os testes operacionais previstos no cronograma continuam pendentes.

## 2. Validações realizadas

| Verificação | Resultado observado | O que comprova / limite |
|---|---|---|
| Instalação pelo lockfile | 821 pacotes instalados; client Prisma 7.8.0 gerado | Instalação reproduzível neste ambiente; npm 12 bloqueou alguns scripts transitivos por sua política padrão, mas os comandos abaixo funcionaram |
| `npm run lint` | Aprovado, exit 0 | Regras configuradas de lint |
| `npm run typecheck` | Aprovado, exit 0 | Tipos válidos; stubs tipados também passam |
| `npm run test` | **744 testes, 107 arquivos, aprovados** | Suíte existente predominantemente baseada em mocks; nenhum teste real de banco/E2E |
| `npm run build` | Aprovado, exit 0 | Build com modo mock e segredos efêmeros; aviso de depreciação de `middleware.ts` |
| `prisma validate` | Aprovado | Schema sintaticamente válido; não aplica migration nem comprova compatibilidade com contratos |
| Caracterizações da auditoria | **6/6 reproduziram defeitos** | JWT antigo, rascunho exposto, vídeo ignorado, configuração sem efeito, privacidade do ranking, finalização parcial |
| Smoke HTTP | Login e páginas principais respondem no build local | Responder 200 não prova que todos os botões ou serviços persistam dados |
| Callback de login | 8 falhas seguidas e autenticação válida posterior, sem lockout | Caminho direto não aplica o limite do formulário |
| `npm audit` | **24 pacotes sinalizados: 3 críticos, 13 altos, 8 moderados** | Contagem de pacotes na árvore, não 24 vulnerabilidades independentes exploradas |
| `npm audit --omit=dev` | **22: 3 críticos, 13 altos, 6 moderados** | A árvore classificada como produção ainda carrega ferramentas/transitivas; exige análise de alcançabilidade |
| Busca de segredos | 0 correspondências nos cinco padrões | Tokens GitHub, chaves AWS, chaves privadas, chaves live e URLs Postgres com senha; busca por padrões, não scanner exaustivo |

Ambiente usado: macOS ARM64, Node 24.19.0, npm 12.0.2 temporário, versões do lockfile preservadas. O projeto não fixa `engines` nem versão do gerenciador. O cronograma inclui padronizar runtime e instalação em CI. Não foi executado `npm audit fix --force`: a sugestão automática inclui mudança de major do Prisma e precisa de avaliação.

## 3. Segurança e integridade — problemas primeiro

**Prioridade:** P0 bloqueia ambiente com dados reais; P1 bloqueia lançamento do fluxo afetado; P2 é melhoria posterior ou de defesa adicional. A severidade indica impacto; a prioridade indica ordem de execução.

### S01 — Dependências com avisos críticos e altos · P0

**Evidência:** `package.json:30` (`next:16.2.10`), lockfile e `evidencias/npm-audit*.json`. `next`, `next-auth` e `@auth/core` aparecem classificados como críticos. Há também problemas em transitivas de imagem, HTTP e ferramentas.

**Aplicabilidade:** Next App Router e Server Actions são usados pelo produto, tornando os avisos de indisponibilidade dessas superfícies relevantes. RCE de imagem depende de entrada AVIF chegar ao otimizador; exploração não foi demonstrada nesta auditoria. O aviso específico de Windows não descreve este host Mac nem uma implantação Linux. Os avisos OAuth/e-mail do Auth.js não devem ser apresentados como invasão comprovada do login Credentials, pois tais providers não estão configurados. A guarda central exige `user.id` e `role`, mitigando o caso de checar apenas a existência do objeto de sessão.

**Correção:** atualizar Next e seu ESLint compatível, Auth.js/core e transitivas afetadas; reexecutar a matriz de testes e auditar a árvore final. O audit sugere Next 16.3.5 na data da consulta; a versão mínima de um único advisory não cobre necessariamente todos os avisos. Separar dependências de CLI como `shadcn` do runtime se não forem usadas por ele. Avaliar Prisma sem aceitar downgrade automático para 6.x.

Fontes: [Next/AVIF](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), [Next/Server Actions](https://github.com/vercel/next.js/security/advisories/GHSA-m99w-x7hq-7vfj), [Auth.js/objeto de erro](https://github.com/nextauthjs/next-auth/security/advisories/GHSA-8fpg-xm3f-6cx3), [Auth.js/OAuth](https://github.com/nextauthjs/next-auth/security/advisories/GHSA-x445-f3h2-j279).

### S02 — Bloqueio e rebaixamento não revogam acesso existente · Alto · P0

**Evidência:** `src/server/authorization/index.ts:15`, `src/server/auth/config.edge.ts:26,41`. A autorização usa o papel do JWT sem consultar `isActive`, `deletedAt` ou a versão de sessão atual. A expiração configurada é de sete dias; renovação por atividade não é mecanismo de revogação.

**Cenário reproduzido:** usuário salvo como inativo e rebaixado para aluno continua passando `requireRole("admin")` com uma sessão administrativa anterior. Não é falsificação de JWT: é privilégio antigo permanecendo válido.

**Correção:** validar usuário atual na fronteira do servidor; implementar revogação por `sessionVersion` ou sessões persistentes, invalidar em bloqueio, troca de senha e papel. Cache curto só com estratégia explícita de invalidação. Testar conta desativada com cookie emitido antes da mudança.

### S03 — Callback Credentials contorna rate limiting e auditoria do formulário · Alto · P0

**Evidência:** `src/server/auth/config.ts:24` chama `verifyCredentials` diretamente; o controle está apenas em `src/server/actions/auth.ts:58`. A rota `/api/auth/[...nextauth]` expõe o provider.

**Cenário reproduzido por HTTP:** após obter CSRF válido, oito senhas erradas no callback retornam falha de credenciais, mas não lockout; a nona chamada com senha demo correta autentica. Não foi contornada proteção CSRF, e não há afirmação de autenticação com senha incorreta.

**Correção:** limite e auditoria na fronteira compartilhada de autenticação, inclusive provider. Contadores atômicos com TTL, por conta e por origem confiável; não confiar cegamente no primeiro IP de `x-forwarded-for` fora de um proxy que o sobrescreva. Eliminar a dupla verificação bcrypt no login de formulário. CAPTCHA é complemento, não substituto.

### S04 — Produção aceita modo mock e credenciais demonstrativas · Alto, condicional à implantação · P0

**Evidência:** `src/config/env.ts:18` mantém `mock` como default inclusive com `NODE_ENV=production`; apenas os segredos default são rejeitados. O build e o smoke de produção local funcionaram com mocks. O repositório mock fornece contas conhecidas de demonstração.

**Impacto:** publicar com segredos novos, mas esquecer `DATA_SOURCE`, deixa acesso administrativo demo e dados voláteis disponíveis. Isso **não** é o antigo bug de senha mock incondicional no modo Prisma: esse foi corrigido.

**Correção:** falhar explicitamente em produção quando `DATA_SOURCE !== "prisma"`; separar demo em ambiente isolado e protegido. Impedir seed demo em produção por guarda verificável, não somente comentário.

### S05 — Ranking ignora duas preferências de privacidade · Alto · P1

**Evidência:** `src/server/services/gamification/ranking/read.ts:99,134,187`. A identidade do ranking não carrega `showStudyHours`/`showPerformance` e o DTO sempre inclui horas, aulas e aproveitamento. O perfil público aplica máscaras, o ranking não.

**Reprodução:** perfil público que permite aparecer no ranking, mas oculta atividade/desempenho, continua mostrando 42 horas, 12 aulas e 87% de aproveitamento a outro usuário. `showInRanking=false` e perfil fechado são respeitados, o que reduz o alcance do problema.

**Correção:** política de privacidade única para todas as projeções; campos ocultos devem sair nulos/omitidos do servidor, com ajuste dos contratos e da UI. Persistir as duas flags ausentes no schema. Separar ocultar nome de anonimato completo: avatar e identificador estável ainda podem permitir associação.

### S06 — Curso não publicado continua acessível por slug · Médio · P1

**Evidência:** `src/server/repositories/mock/course-repository.ts:21,25` não filtra publicação/exclusão; `src/server/services/courses/course-detail.ts:21` não recompõe essa guarda. As listas aplicam filtro, a leitura individual não.

**Reprodução:** tornar `course-1` DRAFT não impede o aluno de obter o DTO por slug. A matrícula por ID também só verifica existência (`courses/enroll.ts:19`).

**Correção:** leitura específica para catálogo/aluno, incluindo status e exclusão de toda a hierarquia; leitura administrativa distinta. Matrícula, acesso a aula e heartbeat devem aplicar a mesma regra. Testar DRAFT, ARCHIVED e soft-delete de curso, módulo, aula e questão.

### S07 — Finalização pode gravar estado parcial irrecuperável · Alto · P0

**Evidência:** `simulations/submit-and-finalize.ts:141` finaliza antes de salvar respostas (`:158`) e emitir pontos. `gamification/engine.ts:90,104` também faz escritas separadas. Aulas, metas e foco apresentam fronteiras semelhantes.

**Reprodução:** falha injetada no primeiro salvamento de resposta deixa a tentativa `FINISHED`; repetir a submissão é recusado como já finalizada. CAS impede um segundo vencedor, mas não desfaz falha posterior.

**Correção:** transação única para mudança de estado, respostas e registro durável do evento; consumidor idempotente com retry. Escrita de evento e pontos deve ser atômica ou usar outbox realmente persistente. Testar falha após cada etapa, replay e concorrência com dois processos/Postgres, além do cenário em mock.

### S08 — Locks, auditoria e eventos só existem no processo · Alto em múltiplas instâncias · P0

**Evidência:** `server/auth/rate-limit.ts:27`, `services/flashcards/review-lock.ts`, `services/focus/focus-lock.ts`, `server/events/index.ts:36`, `server/audit/log.ts:18`. Configurações, favoritos de flashcard e rascunhos também usam stores locais.

**Impacto:** cold start/restart perde estado; duas instâncias não compartilham exclusão mútua ou limites; auditoria some e arrays crescem sem retenção. O log não registra data no `AuditEntry`; nem toda tentativa negada chega à auditoria, pois `withAdminAudit` autoriza antes do seu `try`.

**Correção:** transações/row locks para integridade no Postgres; Redis/KV apenas onde necessário para abuso/cache; outbox persistente com status, tentativas e fila de falhas; auditoria com timestamp, correlação, retenção e registro seguro das negações. Não usar log de auditoria como banco de configuração.

### S09 — Soft-delete não é considerado na consulta real de credenciais · Médio · P1

**Evidência:** `src/server/repositories/prisma/user-repository.ts:32` consulta e-mail sem predicado `deletedAt: null` e nem seleciona esse campo. `verifyCredentials` só considera senha e `isActive`.

**Cenário condicionado aos dados:** uma conta logicamente excluída, mas com `isActive=true`, pode autenticar. Não reproduzido contra Postgres; confirmado o predicado ausente.

**Correção:** filtrar exclusão e atividade na consulta de identidade, manter resposta genérica e testar em banco real. Normalização de e-mail também deve ser garantida na escrita/índice, não só no login.

### S10 — Bootstrap e segredos carecem de guardas operacionais · Médio/alto por configuração · P0

**Evidência:** `prisma/seed.ts:49,60` usa senha fixa demo sem negar produção, lê `DATABASE_URL` mesmo quando o CLI usa `DIRECT_URL`; `.env.example` citado no código não existe. `src/config/env.ts:29,36` aceita segredos de um caractere se diferentes do default.

**Correção:** separar seed de QA de `bootstrap-admin` seguro, exigir ambiente explicitamente permitido no seed, fornecer template sem segredos, gerar segredos criptográficos, exigir comprimento mínimo adequado e documentar rotação. Proteger criação/remoção do último admin em transação: hoje a contagem e a mudança de papel são operações separadas.

### Defesas existentes a preservar

Há validação Zod nas fronteiras, autorização server-side nas actions/serviços administrativos, checagens de ownership nos fluxos pessoais, gabarito separado do DTO da tentativa, matrícula exigida para aula/heartbeat, comparação constante do segredo de cron e mensagens genéricas de login. Os testes existentes cobrem esses comportamentos no modo mock. A busca nos fontes não encontrou uso de `dangerouslySetInnerHTML`, `eval` de aplicação ou queries SQL inseguras; não é prova de ausência de XSS/SQLi em toda situação.

## 4. Pendências funcionais e de arquitetura

| ID | Prioridade | Problema observado | Entrega necessária |
|---|---|---|---|
| F00 | P0 | 172 métodos em 37 classes Prisma incompletos | Implementação por domínio, contratos testados em Postgres e transações compartilhadas |
| F01 | P1 | `lesson-view.ts:89,91` sempre retorna materiais vazios e URL fictícia; ignora vídeo cadastrado | Provider de vídeo, estado de processamento, URL/token curto, material privado e integração do player |
| F02 | P1 | `lesson-notes.tsx:20` só usa estado React | Anotações persistentes por aluno/aula, autosave, feedback e recuperação de conflito |
| F03 | P1 | Configuração admin muda apenas override em memória; motores leem constantes | Configuração persistente/versionada, aplicada a novos eventos e recálculos sem alterar histórico silenciosamente |
| F04 | P1 | Ranking enumera participantes mock; metas/ausência de prova usam dados fictícios; horas não são filtradas por janela | Fontes reais para candidatos e métricas, períodos/timezone consistentes, snapshots de cálculo e remoção de linhas obsoletas |
| F05 | P1 | Melhores notas e contagem de provas acima da meta são sempre zero; conquistas vêm de `ACHIEVEMENTS` estático enquanto admin mantém outro catálogo | Uma fonte de regras/conquistas, agregados reais, testes de conquistas após simulado e edição administrativa |
| F06 | P1 | Não há cadastro, verificação de e-mail, recuperação de senha, convite ou MFA administrativo de aplicação | Ciclo de identidade completo, tokens de uso único com hash/TTL e envio transacional |
| F07 | P1 | Assinatura existe só no schema; contador admin fixo em zero; matrícula é gratuita por simples chamada | Catálogo de planos, checkout, webhook assinado/idempotente, direitos de acesso, renovação/cancelamento/reembolso e reconciliação |
| F08 | P1 | Sem upload real, bucket privado e biblioteca de materiais | Upload validado, chaves aleatórias, limites, URLs temporárias, limpeza e cópia independente dos arquivos |
| F09 | P1 | Contratos mais ricos que schema/migration | Migration de reconciliação antes de escrever os repositórios restantes |
| F10 | P1 | Brainstorm cria rascunho local em vez de Flashcard real; favorito não persistido | Converter diretamente e atomicamente; fonte única para anotações; favorito por usuário/card com chave única |
| F11 | P1 | `/trilha` é placeholder; busca global e sino não estão conectados | Entregar navegação/trilha, pesquisa paginada e notificações com estado lido/não lido |
| F12 | P1/P2 | Missão só inicia; não há update/finish no contrato. Modo foco só cobre um ciclo; funcionalidades “Em breve” | Fechar a jornada de missão e estado retomável; ciclos adicionais de foco podem ficar na versão posterior |
| F13 | P1 | Calendário usa UTC e atribui duração toda ao último heartbeat; fontes de tempo concentram vídeo | Dias civis consistentes em `America/Sao_Paulo` inicialmente; dividir atividade por dia e integrar foco/outros estudos |
| F14 | P2 | Configuração do Next tem CSP sem nonce e sem domínios de mídia/frame externos | CSP testada com o provider; HTTPS; remover `unsafe-inline` de scripts com abordagem compatível após atualizar Next |

### Reconciliação de dados indispensável

Os **44 models** e a migration inicial não modelam diretamente todo o estado usado pela UI. Uma geração de client bem-sucedida não resolve essa diferença.

| Área | Divergência verificada | Decisão recomendada |
|---|---|---|
| Module | Contrato exige `slug`/`subjectId`; model não os possui | Colunas e FK explícitas; unicidade de slug no curso |
| Course | Contrato tem dificuldade, carga, cor e nomes derivados; schema não armazena todos | Separar dados derivados dos persistidos; não preencher campos reais com constantes demo |
| Lesson | Schema usa segundos e percentual específico; contrato usa minutos e fluxo usa limiar global | Segundos como unidade canônica, campo opcional de regra exposto e validado |
| StudySession/Focus/Mission | Contratos têm cobertura, última posição, heartbeat, modo, alvo e blocos; schema guarda sessão genérica + activity JSON | Agregado persistente tipado, versão, atividades duráveis e índices; evitar recompor todo histórico em cada heartbeat |
| MockExam/Attempt | Contrato inclui `isPersonal`, limite por tentativa; prova/alternativas mutáveis são relidas na correção | Tipo/owner e snapshot ou versão imutável da prova; prazo persistido e fila de expiração |
| Profile | Flags `showStudyHours` e `showPerformance` faltam no schema | Persistir antes da migração para não perder preferências |
| Flashcards/Brainstorm | Favoritos e rascunhos locais; `convertedFlashcardId` pode apontar a ID de rascunho | FK a Flashcard real, origem única e criação transacional |
| SaaS | Sem tokens de recuperação/verificação, revogação, business config, nota de aula ou inbox/outbox durável | Models explícitos com constraints, retenção e índices |
| Pagamento | `Subscription.externalId` é só indexado; faltam IDs únicos de eventos e produtos/direitos | Unicidade por provedor/evento/assinatura, inbox idempotente e modelo de entitlement |

Não recomendo multitenancy/white-label nesta primeira entrega: o código modela uma escola com vários alunos, não várias empresas isoladas. O SaaS inicial pode operar assim. Vender a plataforma para escolas distintas requer `Organization`, memberships, isolamento de dados/storage/cobrança e testes adicionais; isso está separado como expansão, não implicitamente resolvido por RBAC.

## 5. Estado por módulo e fases pendentes

| Módulo | O que já existe | O que impede considerar entregue |
|---|---|---|
| Arquitetura/base | Next App Router, TS estrito, DTOs, services/repositories | Imports de mocks fora da persistência; fronteira transacional ausente |
| Identidade | Credentials, bcrypt, JWT, login/logout, roles | S02/S03/S04/S09; ciclo de contas e MFA |
| Layout | Tema, navegação, responsividade por CSS, estados de erro/loading | Validação visual/mobile/teclado e ligações sem ação |
| Dashboard | Agregações e gráficos sobre repos | Métricas dependem de mock; consultas amplas e efeitos de escrita nas leituras |
| Cursos/aulas | Catálogo, detalhes, CRUD, matrícula, progresso | Repositórios, publicação, acesso pago, vídeo/material/anotação |
| Simulados | Montagem, tentativa, correção, histórico, erros/favoritos | S07, Postgres, persistir respostas parciais e snapshot da prova |
| Plano/missão | Geração, calendário, reordenação, início | Persistência, conclusão/retomada da missão e links para conteúdos efetivos |
| Acompanhamento | Heartbeats, limiar, metas, sequência, diagnóstico | Atividade durável, timezone, concorrência e agregados de todos os modos |
| Brainstorm | CRUD de quadros/cartões e movimento | Transação de reordenação e conversões reais |
| Flashcards | SM-2, baralhos e revisão | Locks reais, favoritos e origens persistentes, política de pontos para autoavaliação |
| Foco | Timer, validação de atividade, finalização | Estado compartilhado/durável, integração das horas e recuperação de sessão |
| Gamificação | Regras, ledger mock, handlers e idempotência em memória | Outbox/atomicidade, catálogo único de conquistas e antifraude global |
| Ranking | Fórmula, desempate, cron protegido e leitura | S05, participantes reais, tempo por período, versões/snapshots e paginação |
| Perfil | Edição, prévia pública e flags | Repositório, persistir flags e uniformizar máscaras |
| Admin | CRUD de conteúdos/usuários e proteção por papel | Efeito real das configurações, auditoria, integridade e publicação em árvore |
| Notificações | Contrato/repo e broadcast administrativo | Sino não consome dados; falta entrega/e-mail e leitura persistente |
| Comercial | Model Subscription | Jornada de compra e provisionamento inteiramente pendentes |
| Operação | 26 documentos de projeto/produção | Pipeline, banco de teste, monitoramento, restore, staging e deploy não demonstrados |

As fases históricas de frontend/domínio foram desenvolvidas **no contexto mock**. Não devem ser marcadas novamente como “100% concluídas para produção”. A migração precisa fechar um caminho completo por vez, com teste real do fluxo de ponta a ponta.

## 6. Melhorias de desempenho, custo e qualidade

1. **Reduzir consultas por heartbeat.** `recordHeartbeat` calcula o curso antes/depois, busca progresso e sessões; `courses/shared.ts` lista módulos e faz uma consulta por módulo. No banco isso vira N+1 repetido a cada dez segundos. Atualizar apenas a sessão/aula e agregados necessários; recálculo completo em transição de conclusão ou job.
2. **Paginar e agregar no banco.** Ranking carrega toda a versão e resolve usuário por usuário; dashboards, listas admin e progresso leem históricos inteiros. Criar queries paginadas, agregados por período e limites de payload.
3. **Criar testes Postgres desde a primeira implementação**, executados nos PRs dos fluxos críticos. Adiar integração até o fim é risco de retrabalho maior que economia de minutos de CI.
4. **Logs estruturados e erros observáveis.** Vários `catch` devolvem erro genérico sem registrar causa/correlação. Manter mensagem segura ao usuário, mas registrar diagnóstico interno sanitizado com alerta.
5. **Qualidade de UX:** salvar resposta durante simulado, retomar após refresh, proteger anotações contra perda, feedback de upload/processamento, tratamento de erro do vídeo e estados vazios reais. Validar teclado, leitor de tela, contraste e mobile antes do beta.
6. **Evitar trabalho sem retorno imediato:** não trocar stack, não reescrever tudo em microserviços, não introduzir multitenancy, IA, app nativo ou gamificação adicional antes de fechar o núcleo.
7. **Antifraude proporcional:** heartbeat verifica plausibilidade, não comprova que uma pessoa está estudando. Revisão de cards autoavaliados não equivale a prova corrigida. Definir limites globais de recompensa, dados usados no ranking e detecção de padrões; não prometer prevenção absoluta de fraude.
8. **Pré-requisitos e provas:** impedir ciclos/self-reference de aulas e preservar snapshots de questões/alternativas nas tentativas. Uma edição administrativa não deve mudar retroativamente a prova de quem já começou.
9. **Operação de dados:** backup de Postgres não substitui backup de vídeo, arquivos e segredos. Restore real, retenção e recuperação de conta admin fazem parte da entrega.

## 7. Correções necessárias na documentação anterior

| Declaração anterior | Constatação atual |
|---|---|
| Senha validada diretamente do mock em qualquer modo | Corrigido em `b640716`; consulta agora passa por `UserRepository.findCredentialsByEmail` |
| Não há singleton Prisma | Existe em `src/server/db/prisma.ts`; inicialização tardia na consulta de credenciais |
| `DATABASE_URL` não validada | Validada quando `DATA_SOURCE=prisma`; `DIRECT_URL` é configuração do CLI |
| Client não é gerado | `postinstall` executa geração; validado nesta auditoria |
| Todos os métodos Prisma são stubs | Uma consulta real de credenciais; **172 métodos ainda incompletos** |
| 741 testes/105 arquivos | **744/107**, executados no commit analisado |
| Pipeline/backup/hosting descritos como plano | Continuam planos; documento de configuração não é configuração implantada |
| Vercel Hobby como possibilidade de MVP comercial | Não usar para esse fim: plano destinado a uso pessoal não comercial, conforme página oficial |
| 50 alunos implicam custo variável irrelevante | Não necessariamente: horas assistidas podem dominar a conta desde o beta |

Este relatório é o retrato do commit identificado. Os documentos anteriores permanecem como histórico e referência de desenho; a execução deve partir deste inventário e do novo cronograma.

## 8. Critério para liberação

A versão só pode receber clientes pagantes após: persistência dos módulos habilitados, correção dos achados P0/altos aplicáveis, autorização por estado atual e direitos comerciais, pagamento reconciliável, mídia protegida, ciclo de contas funcional, privacidade coerente, CI com integração/E2E, monitoramento e restauração demonstrada.

Para dados pessoais, incluir registro das operações, aviso de privacidade/termos aprovados pelo responsável do negócio, canal de solicitações, exportação/exclusão com retenção definida e procedimento de incidentes. Essas são entregas operacionais a validar, não certificação jurídica emitida por esta revisão. Referência oficial: [ANPD — orientações para agentes de pequeno porte](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022).

Não há percentual de conclusão confiável dedutível de linhas, número de telas ou testes aprovados. A medida proposta é **quantos critérios de aceite por fluxo foram demonstrados em staging com Postgres**.
