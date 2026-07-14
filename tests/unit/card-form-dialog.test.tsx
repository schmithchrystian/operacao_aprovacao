import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BrainstormCardDTO } from "@/contracts/brainstorm";

const { createCardActionMock, updateCardActionMock, listTopicOptionsActionMock, toastSuccessMock, toastErrorMock } =
  vi.hoisted(() => ({
    createCardActionMock: vi.fn(),
    updateCardActionMock: vi.fn(),
    listTopicOptionsActionMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
  }));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock("@/server/actions/brainstorm", () => ({
  createCardAction: createCardActionMock,
  updateCardAction: updateCardActionMock,
}));

vi.mock("@/server/actions/simulations", () => ({
  listTopicOptionsAction: listTopicOptionsActionMock,
}));

const { CardFormDialog } = await import("@/components/brainstorm/card-form-dialog");

const subjects = [
  { id: "subject-1", name: "Direito Penal" },
  { id: "subject-2", name: "Língua Portuguesa" },
];

const editCard: BrainstormCardDTO = {
  id: "card-1",
  columnId: "col-1",
  type: "DUVIDA",
  title: "Dúvida sobre prazos",
  content: "Conteúdo original",
  tags: ["penal", "prazos"],
  subjectId: "subject-1",
  subjectName: "Direito Penal",
  topicId: "topic-1",
  topicName: "Prescrição",
  priority: "HIGH",
  status: "OPEN",
  resolvido: false,
  order: 0,
  convertedFlashcardId: null,
  convertedStudyPlanItemId: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

describe("CardFormDialog", () => {
  const onOpenChange = vi.fn();
  const onCreated = vi.fn();
  const onUpdated = vi.fn();

  beforeEach(() => {
    createCardActionMock.mockReset();
    updateCardActionMock.mockReset();
    listTopicOptionsActionMock.mockReset();
    listTopicOptionsActionMock.mockResolvedValue({ ok: true, data: [] });
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    onOpenChange.mockReset();
    onCreated.mockReset();
    onUpdated.mockReset();
  });

  it("não renderiza formulário quando não há alvo definido", () => {
    render(
      <CardFormDialog
        open={false}
        onOpenChange={onOpenChange}
        target={null}
        subjects={subjects}
        onCreated={onCreated}
        onUpdated={onUpdated}
      />,
    );

    expect(screen.queryByLabelText(/^título$/i)).toBeNull();
  });

  it("cria um cartão só com o título preenchido, usando os valores padrão de tipo/prioridade", async () => {
    createCardActionMock.mockResolvedValue({ ok: true, data: { id: "card-novo" } });
    const user = userEvent.setup();

    render(
      <CardFormDialog
        open
        onOpenChange={onOpenChange}
        target={{ mode: "create", columnId: "col-ideias", columnTitle: "Ideias" }}
        subjects={subjects}
        onCreated={onCreated}
        onUpdated={onUpdated}
      />,
    );

    expect(screen.getByText(/novo cartão em "ideias"/i)).toBeTruthy();
    await user.type(screen.getByLabelText(/^título$/i), "Revisar prazos processuais");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(createCardActionMock).toHaveBeenCalledTimes(1));
    expect(createCardActionMock).toHaveBeenCalledWith({
      columnId: "col-ideias",
      type: "IDEIA",
      title: "Revisar prazos processuais",
      content: undefined,
      tags: [],
      subjectId: undefined,
      topicId: undefined,
      priority: "MEDIUM",
    });
    expect(onCreated).toHaveBeenCalledWith({ id: "card-novo" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it("não envia o formulário quando o título está vazio", async () => {
    const user = userEvent.setup();

    render(
      <CardFormDialog
        open
        onOpenChange={onOpenChange}
        target={{ mode: "create", columnId: "col-ideias", columnTitle: "Ideias" }}
        subjects={subjects}
        onCreated={onCreated}
        onUpdated={onUpdated}
      />,
    );

    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByText("Informe um título.")).toBeTruthy();
    expect(createCardActionMock).not.toHaveBeenCalled();
  });

  it("parseia tags separadas por vírgula, removendo vazios e duplicatas", async () => {
    createCardActionMock.mockResolvedValue({ ok: true, data: { id: "card-novo" } });
    const user = userEvent.setup();

    render(
      <CardFormDialog
        open
        onOpenChange={onOpenChange}
        target={{ mode: "create", columnId: "col-ideias", columnTitle: "Ideias" }}
        subjects={subjects}
        onCreated={onCreated}
        onUpdated={onUpdated}
      />,
    );

    await user.type(screen.getByLabelText(/^título$/i), "Cartão com tags");
    await user.type(screen.getByLabelText(/tags/i), " penal ,, penal ,processual ,");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(createCardActionMock).toHaveBeenCalledWith(expect.objectContaining({ tags: ["penal", "processual"] })),
    );
  });

  it("pré-preenche os campos ao editar, incluindo o assunto já denormalizado no cartão", async () => {
    render(
      <CardFormDialog
        open
        onOpenChange={onOpenChange}
        target={{ mode: "edit", card: editCard }}
        subjects={subjects}
        onCreated={onCreated}
        onUpdated={onUpdated}
      />,
    );

    expect(screen.getByText(/editar cartão/i)).toBeTruthy();
    expect(screen.getByLabelText(/^título$/i)).toHaveProperty("value", "Dúvida sobre prazos");
    expect(screen.getByLabelText(/tags/i)).toHaveProperty("value", "penal, prazos");
    // O assunto do cartão já vem "semeado" — visível mesmo antes de `listTopicOptionsAction` responder.
    expect(screen.getByRole("option", { name: "Prescrição" })).toBeTruthy();

    // Aguarda o efeito de busca de assuntos (disparado no mount, já que `subjectId` vem
    // preenchido em modo edição) resolver dentro de `act(...)`, evitando o aviso do React de
    // atualização de estado fora de `act` ao final do teste.
    await waitFor(() => expect(listTopicOptionsActionMock).toHaveBeenCalledWith({ subjectId: "subject-1" }));
  });

  it("atualiza um cartão existente e envia null para campos limpos (não omitidos)", async () => {
    updateCardActionMock.mockResolvedValue({ ok: true, data: { id: editCard.id } });
    const user = userEvent.setup();

    render(
      <CardFormDialog
        open
        onOpenChange={onOpenChange}
        target={{ mode: "edit", card: editCard }}
        subjects={subjects}
        onCreated={onCreated}
        onUpdated={onUpdated}
      />,
    );

    await user.clear(screen.getByLabelText(/conteúdo/i));
    await user.selectOptions(screen.getByLabelText(/^matéria/i), "");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(updateCardActionMock).toHaveBeenCalledTimes(1));
    expect(updateCardActionMock).toHaveBeenCalledWith({
      cardId: "card-1",
      type: "DUVIDA",
      title: "Dúvida sobre prazos",
      content: null,
      tags: ["penal", "prazos"],
      subjectId: null,
      topicId: null,
      priority: "HIGH",
    });
    expect(onUpdated).toHaveBeenCalledWith({ id: editCard.id });
  });

  it("busca assuntos ao trocar a matéria e limpa o assunto selecionado", async () => {
    listTopicOptionsActionMock.mockResolvedValue({
      ok: true,
      data: [{ id: "topic-2", subjectId: "subject-2", name: "Concordância verbal" }],
    });
    const user = userEvent.setup();

    render(
      <CardFormDialog
        open
        onOpenChange={onOpenChange}
        target={{ mode: "create", columnId: "col-ideias", columnTitle: "Ideias" }}
        subjects={subjects}
        onCreated={onCreated}
        onUpdated={onUpdated}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/^matéria/i), "subject-2");

    await waitFor(() => expect(listTopicOptionsActionMock).toHaveBeenCalledWith({ subjectId: "subject-2" }));
    expect(await screen.findByRole("option", { name: "Concordância verbal" })).toBeTruthy();
  });

  it("mapeia fieldErrors do servidor (ex.: tags) para o campo correspondente do cliente", async () => {
    createCardActionMock.mockResolvedValue({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Dados inválidos.", fieldErrors: { tags: ["Muitas tags."] } },
    });
    const user = userEvent.setup();

    render(
      <CardFormDialog
        open
        onOpenChange={onOpenChange}
        target={{ mode: "create", columnId: "col-ideias", columnTitle: "Ideias" }}
        subjects={subjects}
        onCreated={onCreated}
        onUpdated={onUpdated}
      />,
    );

    await user.type(screen.getByLabelText(/^título$/i), "Cartão qualquer");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByText("Muitas tags.")).toBeTruthy();
    expect(onCreated).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
