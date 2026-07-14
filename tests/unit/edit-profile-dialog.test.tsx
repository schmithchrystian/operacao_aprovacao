import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OwnProfileDTO } from "@/components/profile/types";

const { updateProfileActionMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  updateProfileActionMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock("@/server/actions/profile", () => ({
  updateProfileAction: updateProfileActionMock,
}));

const { EditProfileDialog } = await import("@/components/profile/edit-profile-dialog");

function buildProfile(overrides: Partial<OwnProfileDTO> = {}): OwnProfileDTO {
  return {
    userId: "user-1",
    isOwnProfile: true,
    isPublic: true,
    name: "Ana Recruta",
    avatarUrl: null,
    bio: "Focada na aprovação.",
    city: "São Paulo",
    state: "SP",
    phone: null,
    birthDate: null,
    mainContest: { contestId: "contest-pm-soldado", contestName: "Polícia Militar — Soldado" },
    interestedContests: [{ contestId: "contest-pm-soldado", contestName: "Polícia Militar — Soldado" }],
    examDate: "2026-09-14T00:00:00.000Z",
    aggregates: {
      level: { index: 3, name: "Combatente" },
      points: 4200,
      xp: 4200,
      rankingPosition: 5,
      rankingTotalParticipants: 50,
      studyHours: 42.5,
      lessonsCompleted: 30,
      mockExamsCompleted: 4,
      averageMockExamScorePercent: 81.5,
      streakDays: 12,
      achievementsUnlockedCount: 6,
      achievementsTotalCount: 18,
      recentAchievements: [],
    },
    privacy: {
      isProfilePublic: true,
      showRealName: true,
      showCityState: true,
      showStudyHours: true,
      showPerformance: true,
      showInRanking: true,
    },
    ...overrides,
  };
}

const contestOptions = [
  { value: "contest-pm-soldado", label: "Polícia Militar — Soldado" },
  { value: "contest-gcm-agente", label: "Guarda Civil Municipal — Agente" },
];

describe("EditProfileDialog", () => {
  const onUpdated = vi.fn();

  beforeEach(() => {
    updateProfileActionMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    onUpdated.mockReset();
  });

  it("pré-preenche o formulário com os dados atuais do perfil", async () => {
    const user = userEvent.setup();
    render(<EditProfileDialog profile={buildProfile()} contestOptions={contestOptions} onUpdated={onUpdated} />);

    await user.click(screen.getByRole("button", { name: /editar perfil/i }));

    expect((screen.getByLabelText(/^bio$/i) as HTMLTextAreaElement).value).toBe("Focada na aprovação.");
    expect((screen.getByLabelText(/^cidade$/i) as HTMLInputElement).value).toBe("São Paulo");
    expect((screen.getByLabelText(/^estado$/i) as HTMLSelectElement).value).toBe("SP");
    expect((screen.getByLabelText(/concurso principal/i) as HTMLSelectElement).value).toBe("contest-pm-soldado");
  });

  it("envia null para campos limpos e converte a data para meia-noite UTC", async () => {
    updateProfileActionMock.mockResolvedValue({ ok: true, data: buildProfile({ city: null, state: null }) });
    const user = userEvent.setup();

    render(<EditProfileDialog profile={buildProfile()} contestOptions={contestOptions} onUpdated={onUpdated} />);

    await user.click(screen.getByRole("button", { name: /editar perfil/i }));
    await user.clear(screen.getByLabelText(/^cidade$/i));
    await user.selectOptions(screen.getByLabelText(/^estado$/i), "");
    fireEvent.change(screen.getByLabelText(/data de nascimento/i), { target: { value: "2000-05-10" } });
    await user.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() =>
      expect(updateProfileActionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          city: null,
          state: null,
          birthDate: "2000-05-10T00:00:00.000Z",
        }),
      ),
    );
    expect(toastSuccessMock).toHaveBeenCalled();
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ city: null, state: null }));
  });

  it("mapeia fieldErrors do servidor (ex.: city) para o campo correspondente e não chama onUpdated", async () => {
    updateProfileActionMock.mockResolvedValue({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Dados inválidos.", fieldErrors: { city: ["Cidade inválida."] } },
    });
    const user = userEvent.setup();

    render(<EditProfileDialog profile={buildProfile()} contestOptions={contestOptions} onUpdated={onUpdated} />);

    await user.click(screen.getByRole("button", { name: /editar perfil/i }));
    await user.click(screen.getByRole("button", { name: /salvar alterações/i }));

    expect(await screen.findByText("Cidade inválida.")).toBeTruthy();
    expect(await screen.findByText("Dados inválidos.")).toBeTruthy();
    expect(onUpdated).not.toHaveBeenCalled();
  });
});
