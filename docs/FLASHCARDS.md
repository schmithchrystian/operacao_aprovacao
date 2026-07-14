# Flashcards — Repetição Espaçada

> Documento produzido na **Fase 14** pelo subagente `backend` (CLAUDE.md §19/§25). Descreve o
> algoritmo de repetição espaçada, as regras de pontuação/anti-farm e as decisões de modelagem
> que não exigiram (ou ainda não têm) uma coluna própria no `prisma/schema.prisma`.

## 1. Visão geral

Entidades reais (agente `database`, `docs/DATA-MODEL.md` — "Flashcards"): `FlashcardDeck`,
`Flashcard`, `FlashcardReview`. Camadas desta fase:

```text
src/contracts/flashcards.ts                        DTOs/entradas (Zod)
src/server/repositories/{contracts,mock,prisma}/flashcard*.ts   Persistência (ADR-0002)
src/server/services/flashcards/
├─ spaced-repetition.ts   Algoritmo PURO (SM-2 simplificado) — sem I/O, sem Date.now()
├─ shared.ts              Acesso/autorização a baralhos/cartões + tags reservadas + "devido"
├─ favorite-store.ts       Favoritos por (usuário, cartão) — em memória (pendência de schema, §5)
├─ mappers.ts              Entidade -> DTO
├─ list-decks.ts | get-review-session.ts | retention-stats.ts   Leituras
├─ create-deck.ts | create-card.ts | create-from-errors.ts | create-from-notes.ts | review-card.ts | toggle-favorite.ts   Mutações
└─ index.ts                Barrel
src/server/actions/flashcards.ts                    Server Actions (ActionResult)
```

## 2. Algoritmo — "SM-2 simplificado"

Adaptação do SM-2 clássico (SuperMemo, escala de qualidade 0–5) para as **4 classificações** do
CLAUDE.md §19: **Errei / Difícil / Médio / Fácil** (`FlashcardRating`, espelha
`FlashcardReviewRating` do Prisma: `AGAIN/HARD/GOOD/EASY`).

Estado por `(usuário, cartão)` — a **última linha** de `FlashcardReview` (append-only,
`docs/DATA-MODEL.md`) de cada par:

| Campo | Significado | Default (cartão nunca revisado) |
|---|---|---|
| `easeFactor` | "fator de facilidade" — quanto maior, mais rápido o intervalo cresce | `2.5` |
| `intervalDays` | dias até a próxima revisão | `0` |
| `repetition` | nº de acertos **consecutivos** (zera a cada Errei) | `0` |

### 2.1 Fórmula

**Errei (AGAIN) — sempre reinicia**, não importa o estado anterior:

```text
repetition' = 0
easeFactor' = max(1.3, easeFactor - 0.20)
intervalDays' = 1
```

**Difícil (HARD) / Médio (GOOD) / Fácil (EASY) — todas "acertos"**, `repetition` avança:

```text
repetition' = repetition + 1
easeFactor' = clamp(easeFactor + delta, 1.3, 3.0)     delta = { HARD: -0.15, GOOD: 0, EASY: +0.15 }

intervalDays' =
  repetition' == 1  ->  passo fixo         { HARD: 2,  GOOD: 3,  EASY: 4 }   dias
  repetition' == 2  ->  passo fixo         { HARD: 4,  GOOD: 6,  EASY: 9 }   dias
  repetition' >= 3  ->  round( max(intervalDays, 1) * easeFactor' * fator )
                         fator = { HARD: 0.85, GOOD: 1.0, EASY: 1.3 }        (mínimo 1 dia)
```

`nextReviewAt = now + intervalDays'` dias corridos **exatos** (preserva hora do dia — não trunca
à meia-noite; ver `spaced-repetition.ts#addIntervalDays`, distinto de
`study-plan/date-utils.ts#addDaysIso`, que é para datas de CALENDÁRIO).

Por construção, para o **mesmo estado de partida**:

```text
intervalDays'(EASY)  >  intervalDays'(GOOD)  >  intervalDays'(HARD)  >  intervalDays'(AGAIN) = 1
```

sempre — Difícil/Médio ficam entre o reinício de Errei e o maior aumento de Fácil, como pede o
CLAUDE.md §19 ("Fácil aumenta mais; Difícil/Médio intermediários").

### 2.2 Exemplo — cartão novo (`easeFactor: 2.5, intervalDays: 0, repetition: 0`)

| Classificação | `repetition'` | `easeFactor'` | `intervalDays'` |
|---|---|---|---|
| Errei | 0 | 2.30 | **1** |
| Difícil | 1 | 2.35 | **2** |
| Médio | 1 | 2.50 | **3** |
| Fácil | 1 | 2.65 | **4** |

### 2.3 Exemplo — sequência de acertos "Médio" a partir do zero

| # | Classificação | `repetition'` | `easeFactor'` | `intervalDays'` | cálculo |
|---|---|---|---|---|---|
| 1 | Médio | 1 | 2.50 | 3 | passo fixo |
| 2 | Médio | 2 | 2.50 | 6 | passo fixo |
| 3 | Médio | 3 | 2.50 | 15 | `round(6 × 2.50 × 1.0)` |
| 4 | Médio | 4 | 2.50 | 38 | `round(15 × 2.50 × 1.0)` |

### 2.4 Exemplo — um "Errei" no meio de uma sequência de acertos

Continuando do passo 2 acima (`easeFactor: 2.5, intervalDays: 6, repetition: 2`):

| Classificação | `repetition'` | `easeFactor'` | `intervalDays'` |
|---|---|---|---|
| Errei | **0** | 2.30 | **1** (reinício total — não é `round(6 × ...)`, é sempre 1) |

Uma classificação Errei posterior a essa reinicia de novo a partir do zero (próximo Médio válido
seria `repetition'=1 -> intervalDays'=3`, não continua de onde parou).

## 3. O que conta como "acerto" (`isCorrectRating`)

**Difícil, Médio e Fácil contam como acerto** (emitem `FlashcardCorrect`, 5 pontos, CLAUDE.md
§15); **só Errei não pontua**. Decisão: mesmo "Difícil" significa que o aluno **lembrou** a
resposta (só achou mais custoso/quase esqueceu) — diferente de "Errei" (não lembrou). A mesma
regra vale para `retentionPercent` (`getRetentionStats`).

## 4. Pontuação — idempotência e regra anti-farm

`reviewCard` emite `FlashcardCorrect` com:

```text
idempotencyKey = "flashcard-correct:<userId>:<reviewId>"
```

chaveada pelo **id da revisão recém-criada** (não pelo `flashcardId`) — cada revisão LEGÍTIMA
pontua a sua vez (não é "1 vez por cartão para sempre"); reprocessar o MESMO evento (ex.:
reentrega de fila) nunca credita duas vezes (motor idempotente desde a Fase 8,
`@/server/services/gamification/engine.ts`).

**Isso sozinho não impede o "farm trivial"**: como cada clique cria uma linha `FlashcardReview`
NOVA (id novo → `idempotencyKey` nova), nada impediria clicar "Fácil" 100× seguidas no mesmo
cartão e ganhar 500 pontos. A barreira real é o **gate de "devido"**, aplicado no servidor em
`review-card.ts`:

> Um cartão só pode ser revisado de novo quando `nextReviewAt` da última revisão **já chegou**
> (`<= now`). Cartão nunca revisado é sempre aceito (devido imediatamente). Caso contrário:
> `ConflictError` ("Este cartão ainda não está disponível para revisão.").

Como toda classificação — mesmo Errei — produz `intervalDays' >= 1` (nunca 0), o cartão nunca
fica disponível de novo no MESMO instante: revisar de novo hoje é sempre rejeitado depois da
primeira revisão do dia. Isso é reforçado no servidor (CLAUDE.md §11: nunca confiar em "o cliente
só oferece o botão quando devido") — a UI pode (e deve) esconder o botão de revisão para um
cartão não devido, mas o servidor sempre reconfere.

**Decisão sobre repontuar em revisões repetidas**: pontuar uma revisão LEGÍTIMA (aceita pelo gate
acima, em dias/ciclos diferentes) é esperado e correto — não é "duplicidade", é o aluno revisando
de novo depois do intervalo previsto, exatamente o propósito da repetição espaçada. O que nunca
pode acontecer é pontuar duas vezes a MESMA submissão (coberto pela `idempotencyKey`) ou pontuar
sem o cartão estar de fato devido (coberto pelo gate).

### 4.1 Farm por corrida no gate — mutex por `(userId, flashcardId)` (achado ALTO A1)

O gate "devido" acima, **sozinho, não é atômico**: o fluxo "ler última revisão → checar gate →
criar revisão → emitir `FlashcardCorrect`" tem `await`s (a começar por `await auth()` em
`requireUser`) que cedem o event loop. K requisições concorrentes de `reviewCard` no MESMO cartão
devido leem o estado "devido/sem revisão pendente" **antes** de qualquer `create`, todas passam o
gate, e cada uma credita 5 pontos — a `idempotencyKey` por `reviewId` recém-criado **não
deduplica** (chaves diferentes por revisão). Farm de pontos por corrida.

**Correção (interim, processo único/mock):** a seção crítica de `reviewCard` roda dentro de
`withReviewLock(reviewLockKey(userId, flashcardId), …)` (`review-lock.ts`) — um single-flight/mutex
em memória que serializa por chave `(userId, flashcardId)`. Das K concorrentes, só a 1ª executa a
seção crítica inteira; as demais só prosseguem depois de a 1ª criar a revisão e então caem no gate
"não devido" → `ConflictError` (nenhuma pontua). Coberto por
`tests/unit/flashcards-service.test.ts` ("bloqueia farm por corrida — K revisões CONCORRENTES…":
10 `reviewCard` via `Promise.allSettled` → 1 sucesso, 9 `CONFLICT`, exatamente 1 `PointTransaction`).

**TODO(fase de banco) — solução DEFINITIVA:** substituir o mutex em memória por uma inserção
condicional/transação com row-lock: "inserir a revisão só se NÃO existir revisão de
`(userId, cardId)` com `nextReviewAt > now`", numa única transação (ex.:
`INSERT … SELECT … WHERE NOT EXISTS (…)` ou `SELECT … FOR UPDATE` sobre a última revisão do par).
Uma constraint `@unique` só na `idempotencyKey` **não resolve** (chaves diferem por `reviewId`). O
mutex em memória some quando houver múltiplas instâncias — só a barreira no banco fecha a corrida
entre processos distintos.

### 4.2 Defesa em profundidade — rate limit leve

`reviewCardAction` aplica um rate limit LEVE por `(userId, flashcardId)`
(`FLASHCARDS.reviewCardMinIntervalMs`, `rate-limit.ts`) — freia o martelar cru do endpoint antes
de tocar o service. É **defesa em profundidade**, não a barreira principal (que é o mutex + gate).
A chave é por `(userId, cartão)` de propósito: uma sessão de revisão legítima percorre cartões
DIFERENTES e nunca é limitada; só o martelar do MESMO cartão é freado.

## 5. Baralhos — tipos e decisões de modelagem sem coluna nova

`DeckDTO.type`: `SUBJECT` (matéria) | `PERSONAL` (personalizado) | `ERRORS` (criados de erros) |
`NOTES` (criados de anotações) | `FAVORITES` (favoritos).

- **`SUBJECT`/`PERSONAL`/`ERRORS`/`NOTES`** são o `kind` real de um `FlashcardDeckEntity` — campo
  de **aplicação** (mock/serviço), porque `FlashcardDeck` no schema Prisma ainda não tem uma
  coluna própria para distinguir "personalizado" de "criado do caderno de erros"/"criado de
  anotações" (todos são baralhos com `userId` preenchido). Mesma divergência documentada já
  existente em `StudyPlanItemEntity.kind`/`BrainstormCardEntity.type` — **pendência para o agente
  `database`**: adicionar `FlashcardDeck.kind FlashcardDeckKind` (enum) numa migration futura.
- **`FAVORITES` nunca é o `kind` real de um baralho** — é **sintetizado** por `listDecks`,
  agregando os cartões favoritados pelo usuário de QUALQUER baralho acessível (matéria ou
  pessoal). Um cartão nunca "muda de baralho" ao ser favoritado.
- `ERRORS`/`NOTES` são **auto-provisionados** (get-or-create idempotente por `(userId, kind)`,
  `shared.ts#getOrCreatePersonalDeck`) na primeira chamada de `createFromErrors`/`createFromNotes`
  — o aluno nunca os cria manualmente.
- **`dueCount`** de QUALQUER baralho (inclusive um baralho de matéria compartilhado entre todos
  os alunos) é sempre calculado pelo histórico de revisão **do usuário atual** (`FlashcardReview`
  filtrado por `userId`) — nunca um contador global.

## 6. Favoritos — por que não é uma tag e por que não é (ainda) uma tabela

Favoritar precisa ser uma relação **por usuário**, independente de quem é dono do cartão —
inclusive para cartões de baralhos de matéria, que são **públicos/compartilhados** entre todos
os alunos. Marcar um campo/tag na entidade `Flashcard` (compartilhada) favoritaria o cartão para
**todos** os alunos ao mesmo tempo — um vazamento de dado entre usuários, não uma decisão de
modelagem aceitável.

O schema atual não tem uma tabela `FlashcardFavorite` (só existe `QuestionFavorite`, para
questões — `docs/DATA-MODEL.md`). Até essa migration existir, `favorite-store.ts` guarda a
relação `(userId, flashcardId)` em memória de processo — mesmo estilo/mesma justificativa de
`@/server/services/brainstorm/flashcard-draft-store.ts` (conceito ainda sem tabela própria →
módulo simples em memória, deliberadamente fora do padrão contracts/mock/prisma + container,
ADR-0002, porque não é uma entidade real do schema hoje).

**Pendência explícita para o agente `database`**: adicionar

```prisma
model FlashcardFavorite {
  userId      String
  flashcardId String
  createdAt   DateTime @default(now())
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  flashcard   Flashcard @relation(fields: [flashcardId], references: [id], onDelete: Cascade)
  @@id([userId, flashcardId])
  @@index([flashcardId])
}
```

(espelhando `QuestionFavorite`) e substituir `favorite-store.ts` por um
`FlashcardFavoriteRepository` real (contracts + mock + prisma + container), sem mudar a
assinatura das funções hoje expostas (`isFavorite`, `listFavoriteFlashcardIds`, `toggleFavorite`).

## 7. "Criados de erros"/"criados de anotações" — idempotência sem coluna nova

`Flashcard` não tem `sourceQuestionId`/`sourceDraftId` no schema. `createFromErrors`/
`createFromNotes` reaproveitam `Flashcard.tags` (já existente) para marcar a proveniência de um
cartão **auto-importado**, com prefixos reservados que nenhuma tag genuína do aluno usaria:

- `src:error:<questionId>` — cartão importado do caderno de erros (questão já errada ao menos
  uma vez, `QuestionAttempt.isCorrect === false`, Fase 10).
- `src:note:<draftId>` — cartão importado de um rascunho de flashcard do Brainstorm (Fase 13,
  `@/server/services/brainstorm/flashcard-draft-store.ts`).

Antes de criar um cartão para uma questão/rascunho, o serviço verifica se já existe, no baralho
de destino, um cartão com a tag reservada correspondente — se sim, **pula** (idempotente: chamar
de novo não duplica). Essas tags são **sempre filtradas** de `FlashcardDTO.tags`
(`shared.ts#publicTags`) — nunca vazam para o cliente como se fossem tags de conteúdo.

**Namespace reservado, não forjável pelo cliente (achado B1, baixo):** `createFlashcardInputSchema`
(`@/contracts/flashcards`) **descarta** qualquer tag enviada pelo aluno que comece com `src:`
(case-insensitive) antes de o serviço vê-la. Sem isso, o aluno poderia forjar `src:error:<id>` no
próprio baralho e quebrar a idempotência do próprio import (`createFromErrors` acharia que já
importou). As importações do sistema escrevem essas tags **direto no repositório**, sem passar por
esse schema — só a entrada do cliente é sanitizada.

Pendência (mesma linha da seção 5): o agente `database` pode, no futuro, adicionar
`sourceQuestionId`/`sourceDraftId` reais a `Flashcard` e substituir esse mecanismo por FKs
explícitas — a assinatura pública dos serviços (`createFromErrors(userId)`/`createFromNotes(userId)`)
não muda.

## 8. Testes mínimos (`tests/unit/`)

- `spaced-repetition.test.ts`: tabela de entrada/saída do algoritmo puro — cada classificação
  produz o intervalo/ease/repetition corretos; Errei sempre reinicia; Fácil > Médio > Difícil >
  Errei no mesmo estado de partida; `easeFactor` nunca sai de `[1.3, 3.0]`.
- `flashcards-service.test.ts`: seleção de devidos respeita `nextReviewAt`; `reviewCard` idempotente
  por submissão (não duplica pontos na MESMA revisão já criada) e REJEITA revisar de novo antes do
  prazo (anti-farm); **K revisões CONCORRENTES no mesmo cartão creditam pontos uma única vez — mutex
  por `(userId, flashcardId)`, achado A1**; Errei não pontua, Difícil/Médio/Fácil pontuam;
  `createFromErrors`/`createFromNotes` puxam das fontes certas e não duplicam ao repetir;
  ownership/IDOR (baralho pessoal de outro aluno é sempre 404); favoritar funciona em cartão de
  matéria (compartilhado) sem vazar para outro usuário.
- `flashcards-action-authorization.test.ts`: fronteira de Server Actions — sem sessão ->
  `UNAUTHENTICATED`; entrada inválida -> `VALIDATION_ERROR`; recurso de outro usuário/cartão não
  devido -> `NOT_FOUND`/`CONFLICT`; tags no namespace reservado `src:` descartadas na entrada
  (achado B1); fluxo feliz completo.
