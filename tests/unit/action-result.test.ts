import { describe, expect, it } from "vitest";
import { fail, ok } from "@/contracts/common";

describe("ActionResult helpers", () => {
  it("ok() builds a success result carrying the data", () => {
    const result = ok({ id: "course-1" });

    expect(result).toEqual({ ok: true, data: { id: "course-1" } });
  });

  it("fail() builds an error result with code and message", () => {
    const result = fail("NOT_FOUND", "Curso não encontrado.");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
      expect(result.error.message).toBe("Curso não encontrado.");
      expect(result.error.fieldErrors).toBeUndefined();
    }
  });

  it("fail() carries fieldErrors when provided", () => {
    const result = fail("VALIDATION_ERROR", "Dados inválidos.", { email: ["Email inválido."] });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.fieldErrors).toEqual({ email: ["Email inválido."] });
    }
  });
});
