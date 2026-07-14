import { mockStore } from "@/server/repositories/mock/mock-store";

/**
 * Rascunho de flashcard gerado por `convertToFlashcard` (Fase 13 — Brainstorm).
 *
 * TODO(Fase 14 — agente `backend`/domínio de Flashcards): quando existir um repositório real
 * de Flashcard/FlashcardDeck (`FlashcardRepository`/`FlashcardDeckRepository`, ver
 * docs/DATA-MODEL.md "Flashcards"), este módulo deve ser SUBSTITUÍDO por uma chamada real a
 * ele (ex.: um baralho pessoal "Convertidos do Brainstorm", `FlashcardDeck.userId` preenchido).
 * Não é uma implementação da Fase 14 inteira — só o suficiente para o cartão registrar a
 * intenção de conversão sem perder a pergunta/resposta pretendidas.
 *
 * Deliberadamente NÃO segue o padrão contracts/mock/prisma + container dos demais repositórios
 * deste domínio (ADR-0002): é um mecanismo transitório, não uma entidade definitiva do schema
 * (não existe `BrainstormFlashcardDraft` em `prisma/schema.prisma`). Mesmo estilo simples de
 * `@/server/audit/log.ts` (array em memória + funções) — nunca `Math.random()`/
 * `crypto.randomUUID()`, mesmo motivo de determinismo/teste dos demais mocks deste projeto.
 * Estado via `mockStore` (`@/server/repositories/mock/mock-store`) — compartilhado entre
 * instâncias de módulo (Next.js 16/Turbopack).
 */
export interface BrainstormFlashcardDraft {
  id: string;
  userId: string;
  sourceCardId: string;
  /** Pergunta do rascunho — título do cartão de origem. */
  question: string;
  /** Resposta do rascunho — conteúdo do cartão de origem (string vazia quando o cartão não
   *  tinha conteúdo). */
  answer: string;
  createdAt: string;
}

const drafts = mockStore<BrainstormFlashcardDraft[]>("flashcard-draft", () => []);
const sequence = mockStore<{ value: number }>("flashcard-draft:sequence", () => ({ value: 0 }));

/** Cria e armazena um novo rascunho. Não deduplica por `sourceCardId` — o CHAMADOR
 *  (`convertToFlashcard`, `@/server/services/brainstorm/convert-to-flashcard.ts`) é responsável
 *  por checar idempotência via `BrainstormCardEntity.convertedFlashcardId` antes de chamar isto. */
export function createFlashcardDraft(
  userId: string,
  sourceCardId: string,
  question: string,
  answer: string,
  now: Date,
): BrainstormFlashcardDraft {
  sequence.value += 1;
  const draft: BrainstormFlashcardDraft = {
    id: `brainstorm-flashcard-draft-${sequence.value}`,
    userId,
    sourceCardId,
    question,
    answer,
    createdAt: now.toISOString(),
  };
  drafts.push(draft);
  return draft;
}

export function findFlashcardDraftById(id: string): BrainstormFlashcardDraft | null {
  return drafts.find((draft) => draft.id === id) ?? null;
}

export function listFlashcardDraftsByUserId(userId: string): BrainstormFlashcardDraft[] {
  return drafts.filter((draft) => draft.userId === userId);
}

/** Uso exclusivo de testes — restaura o store ao estado inicial (vazio). */
export function __resetFlashcardDraftStore(): void {
  drafts.splice(0, drafts.length);
  sequence.value = 0;
}
