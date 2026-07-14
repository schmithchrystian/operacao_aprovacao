import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OwnProfileDTO } from "@/components/profile/types";
import type { ProfileDTO } from "@/contracts/profile";

const { getPublicProfileActionMock } = vi.hoisted(() => ({
  getPublicProfileActionMock: vi.fn(),
}));

vi.mock("@/server/actions/profile", () => ({
  getPublicProfileAction: getPublicProfileActionMock,
}));

const { ProfilePreviewDialog } = await import("@/components/profile/profile-preview-dialog");

const ownProfile: OwnProfileDTO = {
  userId: "user-1",
  isOwnProfile: true,
  isPublic: true,
  name: "Ana Recruta",
  avatarUrl: null,
  bio: null,
  city: "São Paulo",
  state: "SP",
  phone: null,
  birthDate: null,
  mainContest: { contestId: "contest-pm-soldado", contestName: "Polícia Militar — Soldado" },
  interestedContests: [],
  examDate: null,
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
    recentAchievements: [],
  },
  privacy: {
    isProfilePublic: true,
    showRealName: true,
    showCityState: true,
    showStudyHours: true,
    showPerformance: true,
    showInRanking: false,
  },
};

describe("ProfilePreviewDialog", () => {
  beforeEach(() => {
    getPublicProfileActionMock.mockReset();
  });

  it("busca a visão pública só quando o dialog abre, nunca antes", async () => {
    getPublicProfileActionMock.mockResolvedValue({ ok: true, data: ownProfile });
    const user = userEvent.setup();
    render(<ProfilePreviewDialog profile={ownProfile} />);

    expect(getPublicProfileActionMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /ver como outros veem/i }));

    await waitFor(() =>
      expect(getPublicProfileActionMock).toHaveBeenCalledWith({ targetUserId: "user-1", previewAsVisitor: true }),
    );
  });

  it("mostra 'Não disponível' para um agregado null, sem afirmar que é privacidade (pode ser só ausência de dado)", async () => {
    const masked: ProfileDTO = {
      ...ownProfile,
      privacy: null,
      aggregates: { ...ownProfile.aggregates!, rankingPosition: null, rankingTotalParticipants: null },
    };
    getPublicProfileActionMock.mockResolvedValue({ ok: true, data: masked });
    const user = userEvent.setup();
    render(<ProfilePreviewDialog profile={ownProfile} />);

    await user.click(screen.getByRole("button", { name: /ver como outros veem/i }));

    expect(await screen.findByText("Não disponível")).toBeTruthy();
    expect(screen.queryByText(/oculto pela/i)).toBeNull();
  });

  it("mostra a mensagem de perfil fechado quando isPublic é false", async () => {
    const closed: ProfileDTO = {
      ...ownProfile,
      isPublic: false,
      privacy: null,
      name: null,
      city: null,
      state: null,
      mainContest: null,
      aggregates: null,
    };
    getPublicProfileActionMock.mockResolvedValue({ ok: true, data: closed });
    const user = userEvent.setup();
    render(<ProfilePreviewDialog profile={ownProfile} />);

    await user.click(screen.getByRole("button", { name: /ver como outros veem/i }));

    expect(await screen.findByText(/perfil está fechado/i)).toBeTruthy();
  });

  it("mostra a mensagem de erro quando a action falha", async () => {
    getPublicProfileActionMock.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Não foi possível processar a solicitação." },
    });
    const user = userEvent.setup();
    render(<ProfilePreviewDialog profile={ownProfile} />);

    await user.click(screen.getByRole("button", { name: /ver como outros veem/i }));

    expect(await screen.findByText("Não foi possível processar a solicitação.")).toBeTruthy();
  });
});
