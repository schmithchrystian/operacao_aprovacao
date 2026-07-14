import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OwnProfileDTO } from "@/components/profile/types";

const { updatePrivacyActionMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  updatePrivacyActionMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock("@/server/actions/profile", () => ({
  updatePrivacyAction: updatePrivacyActionMock,
}));

const { PrivacySettingsCard } = await import("@/components/profile/privacy-settings-card");

function buildProfile(overrides: Partial<OwnProfileDTO> = {}): OwnProfileDTO {
  return {
    userId: "user-1",
    isOwnProfile: true,
    isPublic: true,
    name: "Ana Recruta",
    avatarUrl: null,
    bio: null,
    city: null,
    state: null,
    phone: null,
    birthDate: null,
    mainContest: null,
    interestedContests: [],
    examDate: null,
    aggregates: {
      level: { index: 1, name: "Recruta" },
      points: 0,
      xp: 0,
      rankingPosition: null,
      rankingTotalParticipants: null,
      studyHours: 0,
      lessonsCompleted: 0,
      mockExamsCompleted: 0,
      averageMockExamScorePercent: null,
      streakDays: 0,
      achievementsUnlockedCount: 0,
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

// Ordem de renderização de `PRIVACY_FIELDS` (`privacy-settings-card.tsx`), usada para localizar
// cada `role="switch"` pela posição — mais robusto do que confiar no cálculo de nome acessível
// via `aria-labelledby` que o Base UI injeta a partir do `<label htmlFor>` associado.
const SWITCH_INDEX = {
  isProfilePublic: 0,
  showRealName: 1,
  showCityState: 2,
  showStudyHours: 3,
  showPerformance: 4,
  showInRanking: 5,
} as const;

describe("PrivacySettingsCard", () => {
  const basePrivacy = buildProfile().privacy;
  const onUpdated = vi.fn();

  beforeEach(() => {
    updatePrivacyActionMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    onUpdated.mockReset();
  });

  it("mostra as 6 preferências com rótulo textual de estado (nunca só por cor)", () => {
    render(<PrivacySettingsCard privacy={{ ...basePrivacy, showInRanking: false }} onUpdated={onUpdated} />);

    expect(screen.getAllByRole("switch")).toHaveLength(6);
    expect(screen.getAllByText("Ativado")).toHaveLength(5);
    expect(screen.getAllByText("Desativado")).toHaveLength(1);
  });

  it("alterna 'Aparecer no ranking' e envia só essa flag para updatePrivacyAction", async () => {
    updatePrivacyActionMock.mockResolvedValue({
      ok: true,
      data: buildProfile({ privacy: { ...basePrivacy, showInRanking: false } }),
    });
    const user = userEvent.setup();

    render(<PrivacySettingsCard privacy={basePrivacy} onUpdated={onUpdated} />);
    const switches = screen.getAllByRole("switch");
    await user.click(switches[SWITCH_INDEX.showInRanking]!);

    await waitFor(() => expect(updatePrivacyActionMock).toHaveBeenCalledWith({ showInRanking: false }));
    expect(toastSuccessMock).toHaveBeenCalled();
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ privacy: expect.objectContaining({ showInRanking: false }) }));
  });

  it("mostra o aviso de perfil fechado quando isProfilePublic está desativado", () => {
    render(<PrivacySettingsCard privacy={{ ...basePrivacy, isProfilePublic: false }} onUpdated={onUpdated} />);
    expect(screen.getByText(/perfil está fechado/i)).toBeTruthy();
  });

  it("não mostra o aviso de perfil fechado quando isProfilePublic está ativado", () => {
    render(<PrivacySettingsCard privacy={basePrivacy} onUpdated={onUpdated} />);
    expect(screen.queryByText(/perfil está fechado/i)).toBeNull();
  });

  it("em caso de erro do servidor, mostra toast.error e não chama onUpdated", async () => {
    updatePrivacyActionMock.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Não foi possível processar a solicitação." },
    });
    const user = userEvent.setup();

    render(<PrivacySettingsCard privacy={basePrivacy} onUpdated={onUpdated} />);
    const switches = screen.getAllByRole("switch");
    await user.click(switches[SWITCH_INDEX.showRealName]!);

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith("Não foi possível processar a solicitação."),
    );
    expect(onUpdated).not.toHaveBeenCalled();
  });
});
