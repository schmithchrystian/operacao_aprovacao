import { z } from "zod";
import { describe, expect, it } from "vitest";
import { parseInput } from "@/server/validation";
import { ValidationError } from "@/server/errors";

const schema = z.object({
  email: z.string().email(),
  page: z.coerce.number().int().min(1).default(1),
});

describe("parseInput", () => {
  it("returns the typed, parsed data when input is valid", () => {
    const result = parseInput(schema, { email: "aluno@example.com" });

    expect(result).toEqual({ email: "aluno@example.com", page: 1 });
  });

  it("throws a ValidationError with Zod fieldErrors when input is invalid", () => {
    expect.assertions(2);

    try {
      parseInput(schema, { email: "not-an-email" });
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).fieldErrors).toHaveProperty("email");
    }
  });
});
