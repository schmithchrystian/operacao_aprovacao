import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LoginForm } from "@/app/(auth)/login/login-form";
import { fail, ok, type ActionResult } from "@/contracts/common";

const { login, router, success } = vi.hoisted(() => ({
  login: vi.fn(),
  router: { push: vi.fn(), refresh: vi.fn() },
  success: vi.fn(),
}));
vi.mock("@/server/actions/auth", () => ({ loginAction: login }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("sonner", () => ({ toast: { success } }));

function fill() {
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "aluno@example.test" } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "Test-only-password" } });
}

describe("LoginForm", () => {
  beforeEach(() => {
    login.mockReset().mockResolvedValue(ok({ redirectTo: "/dashboard" }));
    router.push.mockReset();
    router.refresh.mockReset();
    success.mockReset();
  });
  afterEach(cleanup);

  it("mantém o formulário disponível após falha de rede e permite nova tentativa", async () => {
    login.mockRejectedValueOnce(new Error("private transport details"));
    render(<LoginForm />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    const error = await screen.findByRole("alert");
    expect(error.textContent).toContain("Confira sua conexão");
    expect(error.textContent).not.toContain("private");
    expect(router.push).not.toHaveBeenCalled();
    expect((screen.getByLabelText("E-mail") as HTMLInputElement).value).toBe("aluno@example.test");
    fireEvent.click(await screen.findByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/dashboard"));
    expect(login).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("bloqueia edição enquanto autentica e só navega após confirmação", async () => {
    let finish!: (value: ActionResult<{ redirectTo: string }>) => void;
    login.mockReturnValueOnce(
      new Promise<ActionResult<{ redirectTo: string }>>((resolve) => {
        finish = resolve;
      }),
    );
    render(<LoginForm />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await screen.findByRole("button", { name: "Entrando..." });
    expect((screen.getByLabelText("Senha") as HTMLInputElement).disabled).toBe(true);
    expect(router.push).not.toHaveBeenCalled();
    await act(async () => finish(ok({ redirectTo: "/dashboard" })));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(success).toHaveBeenCalledTimes(1);
  });

  it("apresenta recusa do servidor sem anunciar sucesso", async () => {
    login.mockResolvedValueOnce(fail("INVALID_CREDENTIALS", "E-mail ou senha inválidos."));
    render(<LoginForm />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("E-mail ou senha inválidos.");
    expect(success).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("valida campos vazios antes de enviar credenciais", async () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await screen.findByText("Informe a senha.");
    expect(login).not.toHaveBeenCalled();
  });
});
