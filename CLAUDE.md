# Operação Aprovação

Plataforma de cursos preparatórios para concursos da área de segurança pública, com acompanhamento de estudos, simulados, flashcards, planejamento, gamificação e ranking.

O projeto utiliza subagentes especializados do Claude Code para dividir responsabilidades e reduzir conflitos durante o desenvolvimento.

---

# 1. Objetivo do projeto

Criar uma plataforma web moderna para hospedagem e acompanhamento de cursos preparatórios voltados inicialmente a:

* Polícia Militar;
* Guarda Civil Municipal;
* Polícia Penal;
* Bombeiro Militar;
* outros concursos relacionados à segurança pública.

A plataforma deve oferecer:

* cursos em vídeo;
* trilhas de aprendizado;
* progresso por aula, módulo e curso;
* simulados;
* flashcards;
* acompanhamento de estudos;
* plano de estudos;
* modo foco;
* Pomodoro;
* Brainstorm;
* ranking;
* pontos;
* XP;
* níveis;
* conquistas;
* administração de conteúdo.

Cada aula concluída deve ser tratada como uma **vitória** dentro da experiência da plataforma.

---

# 2. Stack principal

Utilizar:

* Next.js com App Router;
* TypeScript;
* Tailwind CSS;
* Shadcn UI;
* Lucide Icons;
* Prisma ORM;
* PostgreSQL;
* Auth.js ou NextAuth;
* React Hook Form;
* Zod;
* Recharts.

O projeto deve funcionar em:

* desktop;
* tablet;
* celular.

Dark mode deve ser o padrão.

Light mode deve ser opcional.

---

# 3. Agentes disponíveis

Os agentes estão localizados em:

```text
.claude/agents/
```

Agentes disponíveis:

* `architect`
* `frontend`
* `backend`
* `database`
* `gamification`
* `simulations`
* `study-tracking`
* `security`
* `tester`
* `reviewer`

Antes de iniciar qualquer tarefa relevante, leia os arquivos dos agentes envolvidos.

Não concentre toda a implementação no agente principal.

---

# 4. Responsabilidade dos agentes

## architect

Responsável por:

* arquitetura;
* divisão de domínios;
* estrutura de pastas;
* contratos entre módulos;
* padrões técnicos;
* dependências;
* fluxo de dados;
* decisões estruturais;
* análise de impacto;
* documentação arquitetural.

Deve ser utilizado antes de:

* criar novos módulos;
* alterar arquitetura;
* adicionar dependências centrais;
* modificar autenticação;
* modificar comunicação entre domínios;
* realizar mudanças estruturais.

Não deve implementar páginas completas quando a responsabilidade puder ser delegada.

---

## frontend

Responsável por:

* páginas;
* layouts;
* componentes;
* formulários;
* dashboards;
* gráficos;
* navegação;
* responsividade;
* acessibilidade;
* estados de loading;
* estados vazios;
* feedback visual;
* integração com APIs.

Não deve implementar regras críticas de negócio.

Não deve calcular pontuação, ranking, progresso válido ou tempo de estudo como fonte definitiva.

---

## backend

Responsável por:

* APIs;
* Route Handlers;
* Server Actions;
* serviços;
* regras de negócio;
* autenticação;
* autorização;
* validação;
* transações;
* idempotência;
* auditoria;
* integração com o banco.

Toda entrada externa deve ser validada com Zod ou mecanismo equivalente.

Não confiar em dados críticos enviados pelo cliente.

---

## database

Responsável por:

* schema Prisma;
* migrations;
* seeds;
* índices;
* constraints;
* relacionamentos;
* integridade referencial;
* desempenho;
* consultas;
* exclusão lógica;
* auditoria;
* compatibilidade de migrations.

Antes de alterar uma entidade existente, deve analisar:

1. relacionamentos;
2. compatibilidade;
3. migration necessária;
4. impacto em dados existentes;
5. possibilidade de rollback;
6. índices;
7. constraints.

---

## gamification

Responsável por:

* pontos;
* XP;
* níveis;
* conquistas;
* sequências;
* metas;
* eventos de gamificação;
* histórico de pontuação;
* cálculo de ranking;
* prevenção de duplicidade;
* prevenção de fraude.

Toda recompensa deve ser:

* calculada no backend;
* idempotente;
* auditável;
* associada a um evento;
* impossível de ser recebida duas vezes pelo mesmo evento.

---

## simulations

Responsável por:

* questões;
* alternativas;
* simulados;
* tentativas;
* correção;
* desempenho;
* caderno de erros;
* questões favoritas;
* filtros;
* tempo de prova;
* histórico.

A resposta correta nunca deve ser exposta ao cliente antes da correção.

---

## study-tracking

Responsável por:

* sessões de estudo;
* progresso de aulas;
* tempo válido;
* Pomodoro;
* metas;
* sequência;
* calendário;
* plano de estudos;
* relatórios;
* diagnóstico de preparação.

O tempo válido não pode ser calculado apenas pela diferença entre início e fim.

Deve considerar sinais reais de atividade.

---

## security

Responsável pela revisão de:

* autenticação;
* autorização;
* RBAC;
* IDOR;
* CSRF;
* XSS;
* injeções;
* uploads;
* exposição de dados;
* manipulação de pontos;
* fraude de tempo;
* respostas de simulados;
* rate limiting;
* sessões;
* segredos;
* logs;
* dados pessoais;
* dependências.

O agente de segurança não deve alterar arquivos diretamente, salvo instrução específica no arquivo do próprio agente.

Achados devem ser classificados como:

* crítico;
* alto;
* médio;
* baixo.

---

## tester

Responsável por:

* testes unitários;
* testes de integração;
* testes de APIs;
* testes de componentes;
* testes end-to-end;
* testes de segurança;
* testes de autorização;
* testes de idempotência;
* testes de regressão.

Deve executar os testes e reportar falhas reais.

Não considerar uma funcionalidade concluída apenas porque o código compila.

---

## reviewer

Responsável pela revisão final de:

* arquitetura;
* organização;
* legibilidade;
* tipagem;
* duplicação;
* segurança;
* desempenho;
* tratamento de erros;
* testes;
* acessibilidade;
* regressões.

Deve apresentar os problemas primeiro, ordenados por severidade.

Não deve aprovar uma entrega com erros críticos ou altos pendentes.

---

# 5. Fluxo obrigatório de desenvolvimento

Para funcionalidades novas, utilizar preferencialmente o seguinte fluxo:

1. `architect`
2. `database`, quando houver impacto em dados
3. agente responsável pelo domínio
4. `backend`
5. `frontend`
6. `tester`
7. `security`
8. `reviewer`
9. consolidação pelo agente principal

Exemplo para implementar o ranking:

1. `architect` define arquitetura e contratos;
2. `database` define entidades e índices;
3. `gamification` define fórmula e regras;
4. `study-tracking` define métricas de tempo e constância;
5. `simulations` define métricas de desempenho;
6. `backend` implementa cálculo e endpoints;
7. `frontend` implementa a interface;
8. `tester` cria os testes;
9. `security` revisa fraude e exposição;
10. `reviewer` realiza a revisão final.

Quando um agente não for necessário, registrar isso no relatório.

---

# 6. Forma de trabalho

Antes de editar arquivos:

1. analisar o código existente;
2. localizar implementações relacionadas;
3. identificar dependências;
4. avaliar impacto;
5. evitar duplicação;
6. definir o menor conjunto de alterações necessário.

Cada agente deve atuar somente dentro do seu escopo.

Não alterar arquivos não relacionados à tarefa.

Não sobrescrever alterações de outros agentes sem analisar o conteúdo existente.

---

# 7. Estrutura recomendada

A estrutura pode ser ajustada pelo agente `architect`.

Referência inicial:

```text
src/
├── app/
│   ├── (auth)/
│   ├── (student)/
│   ├── admin/
│   └── api/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── charts/
│   └── shared/
├── features/
│   ├── auth/
│   ├── users/
│   ├── courses/
│   ├── lessons/
│   ├── progress/
│   ├── simulations/
│   ├── flashcards/
│   ├── brainstorm/
│   ├── study-plan/
│   ├── study-tracking/
│   ├── gamification/
│   ├── ranking/
│   ├── achievements/
│   ├── notifications/
│   └── admin/
├── server/
│   ├── services/
│   ├── repositories/
│   ├── actions/
│   ├── authorization/
│   └── validation/
├── lib/
├── hooks/
├── types/
├── mocks/
└── config/

prisma/
├── schema.prisma
├── migrations/
└── seed.ts

tests/
├── unit/
├── integration/
└── e2e/
```

---

# 8. Organização por domínio

Cada domínio deve manter, quando aplicável:

```text
features/<dominio>/
├── components/
├── actions/
├── services/
├── schemas/
├── hooks/
├── types/
├── constants/
├── tests/
└── index.ts
```

Evitar arquivos gigantes.

Separar:

* apresentação;
* estado;
* validação;
* acesso a dados;
* regras de negócio;
* autorização;
* persistência.

---

# 9. Padrões de código

## TypeScript

* manter `strict` habilitado;
* não utilizar `any` sem justificativa;
* preferir tipos explícitos em contratos públicos;
* evitar casts desnecessários;
* evitar duplicação de tipos;
* gerar tipos a partir do Prisma quando apropriado;
* manter tipos de entrada separados dos tipos persistidos.

---

## Componentes

* criar componentes pequenos e reutilizáveis;
* evitar lógica de domínio dentro de componentes visuais;
* evitar componentes com responsabilidades múltiplas;
* utilizar Server Components quando adequado;
* utilizar Client Components somente quando houver necessidade real;
* não marcar páginas inteiras com `"use client"` sem necessidade.

---

## Validação

Toda entrada deve ser validada.

Utilizar Zod para:

* formulários;
* parâmetros de rota;
* query strings;
* payloads;
* variáveis de ambiente;
* respostas externas quando necessário.

Não confiar na validação feita somente no frontend.

---

## Tratamento de erros

* utilizar erros de domínio;
* não expor stack trace ao usuário;
* registrar erros técnicos;
* retornar mensagens seguras;
* tratar falhas de banco;
* tratar falhas de autenticação;
* tratar falhas de autorização;
* evitar capturas genéricas sem tratamento.

---

## Logs

Os logs devem informar:

* operação;
* usuário, quando aplicável;
* entidade;
* resultado;
* identificador de correlação;
* erro técnico.

Não registrar:

* senhas;
* tokens;
* cookies;
* respostas corretas de simulados;
* dados pessoais desnecessários;
* segredos;
* informações sensíveis completas.

---

# 10. Banco de dados

Entidades iniciais esperadas:

* User
* Profile
* Role
* Permission
* Contest
* Course
* Module
* Lesson
* LessonMaterial
* LessonProgress
* Subject
* Topic
* Teacher
* Enrollment
* StudySession
* StudyActivity
* StudyPlan
* StudyPlanItem
* MockExam
* Question
* QuestionOption
* MockExamAttempt
* QuestionAttempt
* Flashcard
* FlashcardDeck
* FlashcardReview
* BrainstormBoard
* BrainstormColumn
* BrainstormCard
* Achievement
* UserAchievement
* GamificationEvent
* PointTransaction
* RankingScore
* DailyGoal
* WeeklyGoal
* UserStreak
* Notification
* Subscription
* AuditLog

O agente `database` pode ajustar essa modelagem.

Toda entidade relevante deve avaliar:

* `id`;
* `createdAt`;
* `updatedAt`;
* `deletedAt`;
* índices;
* constraints;
* chaves únicas;
* relacionamentos;
* auditoria.

Migrations destrutivas devem ser informadas antes de execução.

---

# 11. Autenticação e autorização

Papéis iniciais:

* aluno;
* professor;
* moderador;
* administrador.

Toda proteção deve existir no backend.

Não considerar os seguintes mecanismos como autorização suficiente:

* esconder botão;
* esconder menu;
* redirecionar página;
* validar apenas no cliente.

Validar autorização em:

* Server Actions;
* Route Handlers;
* serviços;
* operações de banco;
* rotas administrativas;
* uploads;
* exportações;
* operações destrutivas.

---

# 12. Regras de cursos e aulas

A estrutura deve seguir:

```text
Curso
└── Módulo
    └── Aula
```

Cada aula deve possuir:

* ordem;
* título;
* descrição;
* duração;
* professor;
* vídeo;
* materiais;
* status;
* percentual mínimo;
* pré-requisitos;
* regras de liberação.

Uma aula não pode ser considerada concluída apenas por um clique.

A conclusão deve exigir inicialmente:

```text
80% do vídeo assistido
```

Esse valor deve ser configurável.

---

# 13. Validação do progresso de vídeo

O frontend deve enviar sinais periódicos de progresso.

O backend deve avaliar:

* posição atual;
* duração total;
* vídeo em reprodução;
* aba visível;
* intervalo entre eventos;
* saltos excessivos;
* duplicação;
* sessão ativa;
* interações recentes.

Não confiar diretamente em:

* percentual enviado pelo cliente;
* tempo total enviado pelo navegador;
* estado final enviado isoladamente;
* evento de conclusão sem histórico.

A mesma aula não pode gerar pontos duas vezes.

---

# 14. Tempo válido de estudo

Não contabilizar tempo apenas pela diferença entre início e fim.

Sinais válidos podem incluir:

* vídeo reproduzindo;
* heartbeat;
* aba visível;
* interação recente;
* resposta de questões;
* uso de flashcards;
* Pomodoro ativo;
* navegação no conteúdo;
* edição de anotações.

Descartar ou limitar:

* períodos inativos;
* aba em segundo plano;
* sessões simultâneas suspeitas;
* heartbeats duplicados;
* intervalos excessivos;
* saltos artificiais;
* duração enviada diretamente pelo cliente;
* sessões sem atividade.

---

# 15. Gamificação

Regras iniciais:

* aula concluída: 100 pontos;
* módulo concluído: 500 pontos;
* curso concluído: 2.000 pontos;
* flashcard correto: 5 pontos;
* Pomodoro concluído: 50 pontos;
* simulado concluído: 300 pontos;
* questão correta: 20 pontos;
* meta diária: 150 pontos;
* meta semanal: 500 pontos;
* sequência de 7 dias: 700 pontos;
* sequência de 30 dias: 3.000 pontos.

Toda pontuação deve possuir:

* usuário;
* evento;
* entidade de origem;
* pontos;
* XP;
* chave de idempotência;
* data;
* contexto;
* status.

Não aceitar pontos enviados pelo frontend.

---

# 16. Níveis

Níveis iniciais:

1. Recruta
2. Aspirante
3. Combatente
4. Especialista
5. Veterano
6. Elite
7. Comandante

Cada nível deve possuir:

* nome;
* XP mínimo;
* ícone;
* benefício visual;
* progresso.

Os nomes são elementos de gamificação e não representam patentes oficiais.

---

# 17. Ranking

Fórmula inicial:

* 35% desempenho em simulados;
* 25% aulas concluídas;
* 20% constância;
* 10% tempo válido;
* 10% metas concluídas.

A fórmula deve ser configurável.

As métricas devem ser normalizadas.

O ranking deve considerar:

* período;
* concurso;
* curso;
* turma;
* cidade;
* estado;
* privacidade;
* desempate;
* fraude;
* cache;
* recálculo.

Não utilizar somente pontos totais como ranking.

---

# 18. Simulados

A resposta correta não deve ser enviada antes da correção.

O servidor deve controlar:

* início;
* término;
* tempo;
* respostas;
* status;
* correção;
* pontuação;
* duplicidade;
* finalização.

A tentativa não pode ser finalizada duas vezes.

Questões devem possuir:

* enunciado;
* alternativas;
* resposta correta;
* explicação;
* matéria;
* assunto;
* banca;
* dificuldade;
* status.

---

# 19. Flashcards

Os flashcards devem suportar:

* pergunta;
* resposta;
* matéria;
* assunto;
* dificuldade;
* tags;
* última revisão;
* próxima revisão;
* histórico;
* classificação.

Classificações:

* Errei
* Difícil
* Médio
* Fácil

O algoritmo de repetição espaçada deve ser documentado e testado.

---

# 20. Brainstorm

O módulo deve permitir:

* quadros;
* colunas;
* cartões;
* drag and drop;
* tags;
* prioridade;
* matéria;
* assunto;
* status;
* conversão em flashcard;
* conversão em tarefa de estudo.

Colunas iniciais:

* Ideias
* Estudar
* Revisar
* Dúvidas
* Resolvido

---

# 21. Interface

Paleta principal:

* grafite;
* cinza escuro;
* cinza claro;
* branco;
* amarelo como destaque;
* verde para progresso e acertos;
* vermelho para erros e alertas.

Evitar:

* aparência infantil;
* excesso de camuflagem;
* elementos militares exagerados;
* animações excessivas;
* cores saturadas em grandes áreas.

Utilizar discretamente:

* XP;
* barras de progresso;
* níveis;
* medalhas;
* conquistas;
* ranking;
* missões;
* sequência diária;
* efeitos de vitória.

---

# 22. Acessibilidade

Toda interface deve considerar:

* navegação por teclado;
* foco visível;
* labels;
* contraste;
* textos alternativos;
* ARIA quando necessário;
* suporte a leitores de tela;
* tamanhos de toque adequados;
* redução de movimento;
* mensagens de erro associadas aos campos.

---

# 23. Dados mockados

Enquanto o banco não estiver disponível, os mocks devem ser:

* centralizados;
* tipados;
* reutilizáveis;
* compatíveis com contratos reais;
* separados dos componentes;
* fáceis de substituir.

Não criar objetos mockados diretamente dentro das páginas.

---

# 24. Segurança

Regras obrigatórias:

* não expor segredos;
* não confiar em entrada do cliente;
* validar autorização no servidor;
* evitar IDOR;
* evitar XSS;
* evitar CSRF;
* utilizar queries seguras;
* validar uploads;
* limitar requisições críticas;
* proteger rotas administrativas;
* registrar auditoria;
* não expor respostas de simulados;
* não aceitar pontos do frontend;
* não aceitar tempo total do frontend;
* não registrar dados sensíveis.

Achados críticos ou altos devem ser corrigidos antes da conclusão da entrega.

---

# 25. Testes mínimos

Criar testes para:

* aula abaixo de 80% não concluir;
* aula válida concluir;
* mesma aula não gerar pontos duas vezes;
* usuário comum não acessar administração;
* resposta correta não ser exposta;
* manipulação de pontos ser rejeitada;
* manipulação de tempo ser rejeitada;
* Pomodoro sem atividade não pontuar;
* ranking respeitar privacidade;
* flashcard calcular próxima revisão;
* simulado não finalizar duas vezes;
* falha transacional não gerar pontuação parcial.

---

# 26. Comandos de validação

Antes de concluir uma etapa, executar:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Quando houver testes end-to-end:

```bash
npm run test:e2e
```

Quando houver alterações no Prisma:

```bash
npx prisma format
npx prisma validate
```

Não informar que um comando passou sem executá-lo.

---

# 27. Critérios para conclusão

Uma tarefa só pode ser considerada concluída quando:

* o código foi implementado;
* os tipos estão corretos;
* as validações existem;
* a autorização foi verificada;
* os testes foram executados;
* o lint foi executado;
* o build foi executado;
* os riscos foram registrados;
* não existem erros críticos pendentes;
* a revisão final foi concluída.

---

# 28. Formato de retorno dos agentes

Cada agente deve retornar:

```text
Agente:
Objetivo:
Análise:
Decisões:
Arquivos criados:
Arquivos alterados:
Testes executados:
Resultado:
Riscos:
Pendências:
```

O agente principal deve consolidar os resultados sem remover problemas ou pendências relevantes.

---

# 29. Relatório por etapa

Ao final de cada etapa, informar:

* agentes utilizados;
* objetivo;
* decisões;
* arquivos criados;
* arquivos alterados;
* entidades alteradas;
* migrations;
* endpoints;
* componentes;
* testes executados;
* resultado do lint;
* resultado do typecheck;
* resultado do build;
* achados de segurança;
* achados da revisão;
* riscos;
* pendências;
* próxima etapa recomendada.

---

# 30. Restrições

Não fazer:

* regras críticas somente no frontend;
* cálculo definitivo de pontos no cliente;
* cálculo definitivo de ranking no cliente;
* confiança em tempo enviado pelo navegador;
* exposição de respostas corretas;
* bypass de autorização;
* migrations destrutivas sem aviso;
* alterações fora do escopo;
* duplicação desnecessária;
* uso indiscriminado de `any`;
* mocks espalhados;
* segredos versionados;
* logs com dados sensíveis;
* encerramento com falhas críticas;
* afirmação falsa de testes aprovados;
* implementação integral do projeto em uma única alteração gigantesca.

---

# 31. Estratégia de desenvolvimento

Dividir o desenvolvimento em entregas pequenas:

1. arquitetura;
2. estrutura base;
3. banco;
4. autenticação;
5. layout;
6. dashboard;
7. cursos;
8. aulas;
9. progresso;
10. gamificação;
11. ranking;
12. simulados;
13. plano de estudos;
14. acompanhamento;
15. Brainstorm;
16. flashcards;
17. modo foco;
18. conquistas;
19. perfil;
20. administração;
21. segurança;
22. testes finais;
23. revisão final.

Cada etapa deve ser verificável antes do início da próxima.

---

# 32. Instrução para o agente principal

Ao receber uma nova tarefa:

1. leia este arquivo;
2. identifique os agentes necessários;
3. leia os arquivos desses agentes;
4. analise o estado atual do projeto;
5. delegue as atividades;
6. consolide os resultados;
7. execute as validações;
8. apresente o relatório final.

Não implemente todo o trabalho diretamente quando houver agente especializado disponível.

Em caso de conflito entre instruções:

1. segurança;
2. integridade dos dados;
3. este `CLAUDE.md`;
4. instruções dos agentes;
5. requisito específico da tarefa;
6. preferências de implementação.

Não avance quando houver risco crítico não resolvido.
