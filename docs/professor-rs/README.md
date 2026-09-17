# Professor RS

Agente de pesquisa e produção pedagógica para GCM, PM/Brigada Militar, Bombeiros, PP e PC do Rio Grande do Sul. Perfil persistente: [professor-concursos-rs](../../.claude/agents/professor-concursos-rs.md).

## O que está disponível

A rota autenticada `/professor-rs`, também ligada ao catálogo `/cursos`, contém seis trilhas: Brigada Militar, CBMRS, PC, PP e GCM de Porto Alegre e Canoas. A biblioteca inicial possui **27 aulas únicas, 135 questões originais e 135 flashcards**, reaproveitados onde pertinente. As aulas têm conceitos, método de resolução, exemplo resolvido e resumo. Não é um curso integral de cada edital; as pendências aparecem em cada trilha.

A pesquisa de referência foi realizada em 13/09/2026. GCM Canoas usa edital histórico de 2023; GCM Porto Alegre usa CP 794 / 103-2024; Brigada e Bombeiros usam referências de soldado 2025; PC usa agentes 06/2025; PP tem portal 2026 e banca localizados, com extração integral do programa ainda pendente. Não se afirma que esses concursos estejam com inscrições abertas. Os URLs consultados estão no catálogo versionado, com notas de escopo.

Aulas e flashcards são renderizados no servidor. O cliente recebe apenas enunciados e alternativas para os exercícios; a correção usa sessão autenticada e gabarito no servidor. É treino formativo sem XP, sem nota de concurso e sem histórico persistido. Flashcards são recuperações de memória por revelação; não substituem o motor SM-2 da ferramenta nativa.

O cronograma distribui a duração das aulas e revisões D+1, D+7 e D+30 dentro da carga diária escolhida, reserva treino acumulado a cada seis dias com aulas e exporta CSV. Os primeiros N dias de cada ciclo de sete, a partir da data escolhida, são dias de estudo. Não presume data de prova e não salva automaticamente em `StudyPlan`. A carga de uma aula inclui teoria, prática e revisão de memória.

## Executar a IA

O executor utiliza [Responses API com web search](https://developers.openai.com/api/docs/guides/tools-web-search) e [saída estruturada](https://developers.openai.com/api/docs/guides/structured-outputs). Não há SDK adicional. Escolha um modelo habilitado na conta que suporte busca e Structured Outputs.

Configure no ambiente do terminal/CI, por gerenciador de segredos, `OPENAI_API_KEY` e `PROFESSOR_RS_MODEL`. Nunca cole chaves na conversa nem as inclua em arquivos versionados. O CLI não carrega `.env` automaticamente. Ele pode receber variáveis já exportadas ou usar o carregamento de ambiente do executor Node. A ausência de chave/modelo encerra a execução antes de qualquer chamada; não há fallback que finja ser IA.

```sh
npm run professor:agent -- --help
npm run professor:agent -- research policia-civil-rs
npm run professor:agent -- generate policia-civil-rs --limit=5
npm run professor:agent -- status policia-civil-rs
npm run professor:agent -- validate policia-civil-rs
```

Slugs: `brigada-militar-rs`, `bombeiros-rs`, `policia-civil-rs`, `policia-penal-rs`, `gcm-porto-alegre`, `gcm-canoas`.

- `research` busca e extrai o edital integral, sem reutilizar o mapa parcial da biblioteca. Guarda URLs de evidência e modelo.
- `generate` produz uma aula por tópico, com mínimo de cinco questões/cartões. Limite padrão de cinco aulas por execução, máximo 200. Custos dependem do modelo e das buscas; use limites de gasto da conta. Não há execução automática ao abrir a página.
- `.professor-rs/<slug>/pack.json` é checkpoint local excluído do Git. Escritas são atômicas; lock exclusivo evita duas execuções concorrentes no mesmo pacote. Uma interrupção abrupta pode deixar `running.lock`: confirme que o processo terminou antes de removê-lo.
- `research` não sobrescreve checkpoint existente. Para outra edição, preserve o diretório anterior em backup e inicie novo checkpoint. `generate` não repete aulas já concluídas.
- Respostas incompletas, recusas, falhas HTTP, ausência de busca ou schema inválido não são publicadas. Evidências e conteúdo gerado ainda exigem conferência editorial; validação estrutural não prova veracidade.
- Nenhum scheduler é criado. O perfil pode ser carregado por um agente com ferramentas de pesquisa próprias; o CLI é uma alternativa executável e retomável.

## Concluir e publicar uma edição

1. Conferir programa completo, retificações, provas/gabaritos e cada conteúdo jurídico/técnico. Produzir os tópicos ausentes, bibliografia e vídeos específicos. Não apagar lacunas sem resolvê-las.
2. `npm run professor:agent -- validate <slug>` deve sair 0. Saída 2 indica lacunas. Fontes de vídeo apenas localizadas por metadados ficam `verified=false`, não satisfazendo a completude.
3. Obter o digest: `npm run professor:publish -- .professor-rs/<slug>/pack.json`.
4. Registrar revisão realmente realizada em JSON: `sha256`, `reviewer`, `reviewedAt` (ISO UTC), `approved: true`, `syllabusAndAmendmentsChecked: true`, `answersAndSourcesChecked: true`, `rightsChecked: true`. Não preencher essas declarações antes da conferência. A autorização existente do usuário permite publicar depois de concluídas as verificações; não se exige nova confirmação por padrão.
5. Executar `npm run professor:publish -- <pack.json> <review.json>`. O pacote substitui a biblioteca inicial desse slug em `published.json`; o recibo vai a `docs/professor-rs/reviews/`. Edição existente não aceita conteúdo diferente com a mesma versão. Revisão com hash diferente é recusada.
6. Rodar `npm run check` e `npm run build` com ambiente apropriado. Inspecionar a interface e o diff. Fazer commit e push dos arquivos da tarefa, sem force e sem incluir segredos/checkpoints. Push não comprova deploy.

## Integração com PostgreSQL

```sh
npm run professor:import -- <pack.json> <review.json>
```

Requer `DATABASE_URL` acessível e migrations do projeto já aplicadas. Importa concurso, curso, módulos, aulas textuais, materiais externos, questões/opções, um banco autoral acumulado e baralhos/cartões. Usa transação e lock por pacote; a mesma edição é idempotente e não sobrescreve cursos/questões com histórico. Falha desfaz toda a transação. Registros são criados como DRAFT e decks privados para revisão no admin.

O catálogo Professor RS é independente de banco para conteúdo editorial versionado, mas exige autenticação normal da plataforma. O importador é uma ponte para o acervo administrativo; a publicação no catálogo web e a liberação nos fluxos nativos são passos distintos. O player nativo ainda depende de vídeo para progresso: não publicar aulas textuais importadas como se já tivessem vídeo e progressão. Elas são estudadas integralmente pela área Professor RS enquanto essa extensão do fluxo nativo não é implementada.

## Limites desta entrega

Não havia `OPENAI_API_KEY`, `PROFESSOR_RS_MODEL` ou `DATABASE_URL` configurados no ambiente desta execução. Portanto não foi executada geração pelo provedor nem importação em um banco persistente. A biblioteca não cobre integralmente os editais. Faltam aprofundamento, legislação estadual/municipal específica, provas/gabaritos correspondentes, simulados com regras oficiais, curadoria completa de livros/vídeos e revisão editorial integral. Não há alegação de curso completo ou aprovação garantida.

Vídeos externos são referências da UNIVESP e TV Justiça. Alguns foram localizados via páginas institucionais/metadados; onde a reprodução não foi conferida, isso está declarado e `verified=false`. A Constituição em formatos digitais é referência da Câmara; somente o link é indicado, sem redistribuir conteúdo de terceiros.

### Ampliação de Português da Brigada Militar

A retificação SD-P 02/2025, item 2, foi conferida e vinculada ao catálogo. Duas aulas originais tratam de intenção comunicativa e variação linguística, cada uma com cinco exercícios comentados e cinco flashcards. Elas entram automaticamente no planejador e no simulado da trilha PM. A conferência deste ato não significa que todas as retificações ou todo o programa tenham sido revisados.

### Sequência quantitativa da Polícia Civil

Seis aulas de 60 minutos ampliam a trilha PC: conectivos e De Morgan; quantificadores; frequências; dispersão; eventos; probabilidade condicional e Bayes. Cada aula tem três seções, exemplo resolvido, cinco questões de quatro alternativas com justificativas e cinco flashcards conceituais. O planejador distribui essas aulas respeitando o tempo diário e agenda as revisões existentes.

O programa de lógica e estatística foi consultado nas páginas impressas 62 e 63 do edital 06/2025. As pendências de Estatística agora discriminam os blocos avançados ainda sem aulas. Isso aumenta a transparência da cobertura; o percentual de tópicos mapeados não equivale à cobertura integral do edital. Os capítulos OpenStax e materiais MIT OpenCourseWare vinculados às seis aulas são gratuitos, em inglês, e complementares; não são apresentados como bibliografia obrigatória da banca. Vídeos e revisão integral das retificações continuam pendentes.

### Prática ampliada nas seis trilhas

Em 14/09/2026, dezenove aulas de fundamentos passaram a ter cinco questões e cinco flashcards: interpretação, concordância, crase, porcentagem, lógica, estatística, contabilidade, informática, física, química, biologia e redação. Também foram ampliadas as aulas de Constitucional, Administrativo, Penal, Processo Penal, Direitos Humanos, Execução Penal e Guardas. Foram acrescentados 57 exercícios originais com quatro alternativas e 57 cartões conceituais. As duas questões anteriores de cada aula foram preservadas com seus IDs.

Essas aulas passaram de 45 para 60 minutos para incluir treino e registro de erros. O planejador recalcula o tempo a partir do catálogo. O roteiro de caderno de erros orienta o estudo; não implica persistência automática das anotações ou do progresso. O guia oficial de phishing da Microsoft foi incluído em Informática. As 27 aulas disponíveis agora têm ao menos cinco questões e cinco flashcards. Atingir esse mínimo não certifica cobertura integral nem revisão editorial completa. Os novos exercícios jurídicos foram conferidos com os dispositivos oficiais; a revisão integral do marco temporal de cada edital continua pendente.
