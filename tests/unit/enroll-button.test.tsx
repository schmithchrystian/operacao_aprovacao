import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { enrollActionMock, refreshMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  enrollActionMock: vi.fn(),
  refreshMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/server/actions/courses", () => ({
  enrollAction: enrollActionMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

const { EnrollButton } = await import("@/components/courses/enroll-button");

describe("EnrollButton", () => {
  beforeEach(() => {
    enrollActionMock.mockReset();
    refreshMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("matricula com sucesso: mostra toast de sucesso e atualiza a página", async () => {
    enrollActionMock.mockResolvedValue({
      ok: true,
      data: { courseId: "course-3", status: "active", enrolledAt: "2026-07-13T00:00:00.000Z" },
    });
    const user = userEvent.setup();

    render(<EnrollButton courseId="course-3" />);
    await user.click(screen.getByRole("button", { name: /matricular/i }));

    await waitFor(() => expect(enrollActionMock).toHaveBeenCalledWith({ courseId: "course-3" }));
    expect(toastSuccessMock).toHaveBeenCalled();
    expect(refreshMock).toHaveBeenCalled();
  });

  it("mostra toast de erro quando a matrícula falha e não atualiza a página", async () => {
    enrollActionMock.mockResolvedValue({
      ok: false,
      error: { code: "NOT_FOUND", message: "Curso não encontrado." },
    });
    const user = userEvent.setup();

    render(<EnrollButton courseId="course-inexistente" />);
    await user.click(screen.getByRole("button", { name: /matricular/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Curso não encontrado."));
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
