import { describe, expect, it } from "vitest";
import { HelpCircle, Shield, Trophy } from "lucide-react";
import { FALLBACK_ICON, ICON_ALLOWLIST } from "@/components/shared/lucide-icon";

describe("ICON_ALLOWLIST", () => {
  it("mapeia nomes conhecidos para o componente lucide-react correspondente", () => {
    expect(ICON_ALLOWLIST["Shield"]).toBe(Shield);
    expect(ICON_ALLOWLIST["Trophy"]).toBe(Trophy);
  });

  it("não contém entrada para nomes fora da allowlist (uso é sempre `?? FALLBACK_ICON`)", () => {
    expect(ICON_ALLOWLIST["NomeInexistente"]).toBeUndefined();
    expect(FALLBACK_ICON).toBe(HelpCircle);
  });
});
