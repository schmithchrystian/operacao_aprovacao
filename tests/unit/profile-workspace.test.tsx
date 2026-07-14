import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OwnProfileDTO } from "@/components/profile/types";

const { updateProfileActionMock, updatePrivacyActionMock, getPublicProfileActionMock, toastSuccessMock, toastErrorMock } =
  vi.hoisted(() => ({
    updateProfileActionMock: vi.fn(),
    updatePrivacyActionMock: vi.fn(),
    getPublicProfileActionMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
  }));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock("@/server/actions/profile", () => ({
  updateProfileAction: updateProfileActionMock,
  updatePrivacyAction: updatePrivacyActionMock,
  getPublicProfileAction: getPublicProfileActionMock,
}));

const { ProfileWorkspace } = await import("@/components/profile/profile-workspace");

function buildProfile(overrides: Partial<OwnProfileDTO> = {}): OwnProfileDTO {
  return {
    userId: "user-1",
    isOwnProfile: true,
    isPublic: true,
    name: "Ana Recruta",
    avatarUrl: null,
    bio: "Focada na aprovação para Soldado da Polícia Militar.",
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
      xp: 3150,
      rankingPosition: 5,
      rankingTotalParticipants: 50,
      studyHours: 42.5,
      lessonsCompleted: 30,
      mockExamsCompleted: 4,
      averageMockExamScorePercent: 81.5,
      streakDays: 12,
      achievementsUnlockedCount: 6,
      achievementsTotalCount: 18,
      recentAchievements: [{ key: "first-victory", name: "Primeira vitória", icon: "Star", unlockedAt: "2026-06-01T00:00:00.000Z" }],
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

const xpProgress = {
  levelIndex: 3,
  levelName: "Combatente",
  xp: 3150,
  progressPercent: 40,
  xpToNextLevel: 800,
};

describe("ProfileWorkspace", () => {
  const onUpdated = vi.fn();

  beforeEach(() => {
    updateProfileActionMock.mockReset();
    updatePrivacyActionMock.mockReset();
    getPublicProfileActionMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    onUpdated.mockReset();
  });

  it("renderiza cabeçalho, estatísticas, concursos e conquistas a partir do perfil inicial", () => {
    render(
      <ProfileWorkspace
        initialProfile={buildProfile()}
        xpProgress={xpProgress}
        daysUntilExam={62}
        contestOptions={contestOptions}
      />,
    );

    expect(screen.getByRole("heading", { name: "Ana Recruta" })).toBeTruthy();
    expect(screen.getByText(/são paulo/i)).toBeTruthy();
    expect(screen.getAllByText(/Polícia Militar — Soldado/).length).toBeGreaterThan(0);
    expect(screen.getByText(/faltam 62 dia\(s\)/i)).toBeTruthy();
    expect(screen.getByText("Nível 3 — Combatente")).toBeTruthy();
    expect(screen.getByText("Pontos")).toBeTruthy();
    expect(screen.getByText("4.200")).toBeTruthy();
    expect(screen.getByText("#5")).toBeTruthy();
    expect(screen.getByText("6/18")).toBeTruthy();
    expect(screen.getByText("Primeira vitória")).toBeTruthy();
  });

  it("após editar o perfil, o cabeçalho reflete os novos dados sem precisar recarregar a página", async () => {
    const updated = buildProfile({ city: "Rio de Janeiro", state: "RJ" });
    updateProfileActionMock.mockResolvedValue({ ok: true, data: updated });
    const user = userEvent.setup();

    render(
      <ProfileWorkspace
        initialProfile={buildProfile()}
        xpProgress={xpProgress}
        daysUntilExam={62}
        contestOptions={contestOptions}
      />,
    );

    expect(screen.getByText(/são paulo/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /editar perfil/i }));
    await user.clear(screen.getByLabelText(/^cidade$/i));
    await user.type(screen.getByLabelText(/^cidade$/i), "Rio de Janeiro");
    await user.selectOptions(screen.getByLabelText(/^estado$/i), "RJ");
    await user.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => expect(screen.getByText(/rio de janeiro — rj/i)).toBeTruthy());
    expect(screen.queryByText(/são paulo — sp/i)).toBeNull();
  });

  it("após alternar uma preferência de privacidade, o próprio card reflete o novo estado", async () => {
    const updated = buildProfile({
      privacy: {
        isProfilePublic: true,
        showRealName: true,
        showCityState: true,
        showStudyHours: true,
        showPerformance: true,
        showInRanking: false,
      },
    });
    updatePrivacyActionMock.mockResolvedValue({ ok: true, data: updated });
    const user = userEvent.setup();

    render(
      <ProfileWorkspace
        initialProfile={buildProfile()}
        xpProgress={xpProgress}
        daysUntilExam={62}
        contestOptions={contestOptions}
      />,
    );

    expect(screen.getAllByText("Ativado")).toHaveLength(6);

    const switches = screen.getAllByRole("switch");
    await user.click(switches[5]!); // "Aparecer no ranking" é a última da lista

    await waitFor(() => expect(updatePrivacyActionMock).toHaveBeenCalledWith({ showInRanking: false }));
    await waitFor(() => expect(screen.getAllByText("Desativado")).toHaveLength(1));
    expect(screen.getAllByText("Ativado")).toHaveLength(5);
  });
});
