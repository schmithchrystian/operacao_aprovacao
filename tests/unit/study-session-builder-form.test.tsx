import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GeneratedSessionDTO, StartStudyMissionResultDTO } from "@/contracts/study-session";

const {
  buildSessionActionMock,
  startStudyMissionActionMock,
  listTopicOptionsActionMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  buildSessionActionMock: vi.fn(),
  startStudyMissionActionMock: vi.fn(),
  listTopicOptionsActionMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock("@/server/actions/study-plan", () => ({
  buildSessionAction: buildSessionActionMock,
  startStudyMissionAction: startStudyMissionActionMock,
}));

vi.mock("@/server/actions/simulations", () => ({
  listTopicOptionsAction: listTopicOptionsActionMock,
}));

const { StudySessionBuilderForm } =
  await import("@/components/study-session/study-session-builder-form");

const contests = [{ id: "contest-1", name: "Polícia Militar" }];
const courses = [{ id: "course-1", title: "PM — Curso A", contestId: "contest-1" }];
const subjects = [{ id: "subject-1", name: "Direito Penal" }];

const generatedSession: GeneratedSessionDTO = {
  totalMinutes: 60,
  blocks: [
    {
      type: "videoaula",
      label: "Videoaula",
      title: "Aula recomendada X",
      minutes: 60,
      contentRef: null,
    },
  ],
  contestId: null,
  courseId: null,
  subjectId: null,
  topicId: null,
};

function missionResultWithHref(href: string | null): StartStudyMissionResultDTO {
  const block = {
    type: "videoaula" as const,
    label: "Videoaula",
    title: "Aula recomendada X",
    minutes: 60,
    contentRef: href
      ? { kind: "lesson" as const, id: "lesson-1", title: "Aula recomendada X", href }
      : null,
  };
  return {
    mission: {
      id: "mission-1",
      status: "ACTIVE",
      startedAt: "2026-07-14T10:00:00.000Z",
      totalMinutes: 60,
      blocks: [block],
      currentBlockIndex: 0,
    },
    startingBlock: block,
  };
}

describe("StudySessionBuilderForm", () => {
  beforeEach(() => {
    buildSessionActionMock.mockReset();
    startStudyMissionActionMock.mockReset();
    listTopicOptionsActionMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("exige ao menos um tipo de conteúdo e não monta a sessão sem isso", async () => {
    const user = userEvent.setup();
    render(<StudySessionBuilderForm contests={contests} courses={courses} subjects={subjects} />);

    await user.click(screen.getByRole("button", { name: /montar sessão de estudo/i }));

    expect(await screen.findByText(/selecione ao menos um tipo de conteúdo/i)).toBeTruthy();
    expect(buildSessionActionMock).not.toHaveBeenCalled();
  });

  it("monta a sessão com os filtros e tempo escolhidos e exibe os blocos gerados", async () => {
    buildSessionActionMock.mockResolvedValue({ ok: true, data: generatedSession });
    const user = userEvent.setup();
    render(<StudySessionBuilderForm contests={contests} courses={courses} subjects={subjects} />);

    await user.click(screen.getByRole("checkbox", { name: /videoaula/i }));
    await user.click(screen.getByRole("button", { name: /montar sessão de estudo/i }));

    await waitFor(() => expect(buildSessionActionMock).toHaveBeenCalledTimes(1));
    expect(buildSessionActionMock).toHaveBeenCalledWith({
      contestId: undefined,
      courseId: undefined,
      subjectId: undefined,
      topicId: undefined,
      teacherId: undefined,
      difficulty: undefined,
      contentTypes: ["videoaula"],
      availableMinutes: 60,
    });

    expect(await screen.findByText("Aula recomendada X")).toBeTruthy();
    expect(screen.getByText("1h")).toBeTruthy();
  });

  it("envia o nome do professor como teacherId (campo texto, sem listagem própria nesta fase)", async () => {
    buildSessionActionMock.mockResolvedValue({ ok: true, data: generatedSession });
    const user = userEvent.setup();
    render(<StudySessionBuilderForm contests={contests} courses={courses} subjects={subjects} />);

    await user.type(screen.getByLabelText(/professor/i), "Prof. João");
    await user.click(screen.getByRole("checkbox", { name: /questões/i }));
    await user.click(screen.getByRole("radio", { name: /^30 min$/i }));
    await user.click(screen.getByRole("button", { name: /montar sessão de estudo/i }));

    await waitFor(() =>
      expect(buildSessionActionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          teacherId: "Prof. João",
          contentTypes: ["questoes"],
          availableMinutes: 30,
        }),
      ),
    );
  });

  it("inicia a missão de estudo com o mesmo filtro usado no preview e mostra o link do conteúdo", async () => {
    buildSessionActionMock.mockResolvedValue({ ok: true, data: generatedSession });
    startStudyMissionActionMock.mockResolvedValue({
      ok: true,
      data: missionResultWithHref("/cursos/pm/modulos/direito/aulas/lesson-1"),
    });
    const user = userEvent.setup();
    render(<StudySessionBuilderForm contests={contests} courses={courses} subjects={subjects} />);

    await user.click(screen.getByRole("checkbox", { name: /videoaula/i }));
    await user.click(screen.getByRole("button", { name: /montar sessão de estudo/i }));
    await screen.findByText("Aula recomendada X");

    await user.click(screen.getByRole("button", { name: /iniciar missão de estudo/i }));

    await waitFor(() => expect(startStudyMissionActionMock).toHaveBeenCalledTimes(1));
    expect(startStudyMissionActionMock).toHaveBeenCalledWith(
      buildSessionActionMock.mock.calls[0]![0],
    );
    expect(toastSuccessMock).toHaveBeenCalled();

    const link = await screen.findByRole("link", { name: /ir para o conteúdo/i });
    expect(link.getAttribute("href")).toBe("/cursos/pm/modulos/direito/aulas/lesson-1");
  });

  it("quando o bloco inicial não tem link direto, mostra aviso em vez de um link quebrado", async () => {
    buildSessionActionMock.mockResolvedValue({ ok: true, data: generatedSession });
    startStudyMissionActionMock.mockResolvedValue({ ok: true, data: missionResultWithHref(null) });
    const user = userEvent.setup();
    render(<StudySessionBuilderForm contests={contests} courses={courses} subjects={subjects} />);

    await user.click(screen.getByRole("checkbox", { name: /videoaula/i }));
    await user.click(screen.getByRole("button", { name: /montar sessão de estudo/i }));
    await screen.findByText("Aula recomendada X");
    await user.click(screen.getByRole("button", { name: /iniciar missão de estudo/i }));

    expect(await screen.findByText(/ainda não tem um link direto/i)).toBeTruthy();
    expect(screen.queryByRole("link", { name: /ir para o conteúdo/i })).toBeNull();
  });

  it("mapeia fieldErrors do servidor para o campo correspondente", async () => {
    buildSessionActionMock.mockResolvedValue({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Dados inválidos.",
        fieldErrors: { availableMinutes: ["Máximo de 8 horas (480 minutos) por sessão."] },
      },
    });
    const user = userEvent.setup();
    render(<StudySessionBuilderForm contests={contests} courses={courses} subjects={subjects} />);

    await user.click(screen.getByRole("checkbox", { name: /flashcards/i }));
    await user.click(screen.getByRole("button", { name: /montar sessão de estudo/i }));

    expect(await screen.findByText("Máximo de 8 horas (480 minutos) por sessão.")).toBeTruthy();
    expect(screen.getByText("Dados inválidos.")).toBeTruthy();
  });
});
