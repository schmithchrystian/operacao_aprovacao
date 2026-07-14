import { BRAINSTORM_RESOLVED_COLUMN_TITLE } from "@/config/business";
import type { BrainstormBoardDTO, BrainstormCardDTO, BrainstormColumnDTO } from "@/contracts/brainstorm";
import { getRepositories } from "@/server/repositories";
import type { BrainstormBoardEntity } from "@/server/repositories/contracts/brainstorm-board-repository";
import type { BrainstormCardEntity } from "@/server/repositories/contracts/brainstorm-card-repository";
import type { BrainstormColumnEntity } from "@/server/repositories/contracts/brainstorm-column-repository";

/**
 * Mapeamento entidade (persistência) → DTO (contrato) do domínio Brainstorm (Fase 13) — resolve
 * os nomes de matéria/assunto (a entidade só guarda os ids, ADR-0003) e deriva `resolvido` a
 * partir do NOME da coluna atual do cartão. Mesmo estilo de `toStudyPlanItemDTO`
 * (`@/server/services/study-plan/mappers.ts`): resolução por item via `Promise.all`, sem
 * batching — volume desprezível nos mocks/quadros desta fase.
 */

/**
 * Converte um cartão para DTO. `columnTitle` pode ser informado pelo chamador quando já
 * conhecido (ex.: montando o quadro inteiro em `toBrainstormBoardDTO`, evitando refazer a
 * mesma consulta de coluna por cartão); quando omitido, é resolvido aqui.
 */
export async function toBrainstormCardDTO(
  card: BrainstormCardEntity,
  columnTitle?: string | null,
): Promise<BrainstormCardDTO> {
  const repos = getRepositories();
  const [subject, topic, resolvedColumnTitle] = await Promise.all([
    card.subjectId ? repos.subjects.findById(card.subjectId) : Promise.resolve(null),
    card.topicId ? repos.topics.findById(card.topicId) : Promise.resolve(null),
    columnTitle !== undefined
      ? Promise.resolve(columnTitle)
      : repos.brainstormColumns.findById(card.columnId).then((column) => column?.name ?? null),
  ]);

  return {
    id: card.id,
    columnId: card.columnId,
    type: card.type,
    title: card.title,
    content: card.content,
    tags: card.tags,
    subjectId: card.subjectId,
    subjectName: subject?.name ?? null,
    topicId: card.topicId,
    topicName: topic?.name ?? null,
    priority: card.priority,
    status: card.status,
    resolvido: resolvedColumnTitle === BRAINSTORM_RESOLVED_COLUMN_TITLE,
    order: card.order,
    convertedFlashcardId: card.convertedFlashcardId,
    convertedStudyPlanItemId: card.convertedStudyPlanItemId,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

export async function toBrainstormCardDTOs(
  cards: readonly BrainstormCardEntity[],
  columnTitle?: string | null,
): Promise<BrainstormCardDTO[]> {
  return Promise.all(cards.map((card) => toBrainstormCardDTO(card, columnTitle)));
}

async function toBrainstormColumnDTO(
  column: BrainstormColumnEntity,
  cards: readonly BrainstormCardEntity[],
): Promise<BrainstormColumnDTO> {
  const sorted = [...cards].sort((a, b) => a.order - b.order);
  return {
    id: column.id,
    title: column.name,
    order: column.order,
    cards: await toBrainstormCardDTOs(sorted, column.name),
  };
}

/**
 * Monta o `BrainstormBoardDTO` completo: colunas ordenadas por `order`, cada uma com seus
 * cartões ordenados por `order` (`getBoard`/`createBoard`,
 * `@/server/services/brainstorm/{get-board,create-board}.ts`). `cards` pode conter cartões de
 * QUALQUER uma das colunas informadas — o agrupamento por `columnId` é feito aqui.
 */
export async function toBrainstormBoardDTO(
  board: BrainstormBoardEntity,
  columns: readonly BrainstormColumnEntity[],
  cards: readonly BrainstormCardEntity[],
): Promise<BrainstormBoardDTO> {
  const cardsByColumn = new Map<string, BrainstormCardEntity[]>();
  for (const card of cards) {
    const list = cardsByColumn.get(card.columnId) ?? [];
    list.push(card);
    cardsByColumn.set(card.columnId, list);
  }

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);
  const columnDTOs = await Promise.all(
    sortedColumns.map((column) => toBrainstormColumnDTO(column, cardsByColumn.get(column.id) ?? [])),
  );

  return {
    id: board.id,
    title: board.title,
    columns: columnDTOs,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  };
}
