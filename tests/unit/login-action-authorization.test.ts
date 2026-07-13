import { describe, expect, it } from "vitest";
import { loginSchema } from "@/contracts/auth";
import { parseInput } from "@/server/validation";
import { ValidationError } from "@/server/errors";

describe("loginSchema — role nunca é aceito do cliente", () => {
  it("descarta silenciosamente um campo 'role' enviado no payload", () => {
    const parsed = parseInput(loginSchema, {
      email: "ana.recruta@example.com",
      password: "senha123",
      role: "admin", // tentativa de payload malicioso — deve ser ignorada
    });

    expect(parsed).toEqual({ email: "ana.recruta@example.com", password: "senha123" });
    expect(parsed).not.toHaveProperty("role");
  });

  it("continua exigindo e-mail e senha válidos mesmo com 'role' presente", () => {
    expect(() =>
      parseInput(loginSchema, { email: "not-an-email", password: "", role: "admin" }),
    ).toThrow(ValidationError);
  });
});
