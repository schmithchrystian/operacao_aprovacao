// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const { batch } = vi.hoisted(() => ({ batch: vi.fn() }));
vi.mock("@/config/env", () => ({ env: { CRON_SECRET: "synthetic-cron-secret" } }));
vi.mock("@/server/billing/reconciliation", () => ({ reconcileBillingBatch: batch }));
import { GET } from "@/app/api/cron/billing/route";
import { NextRequest } from "next/server";
beforeEach(() => {
  batch.mockReset();
});
it("rejects missing or incorrect authentication before reconciliation", async () => {
  for (const authorization of ["", "Bearer wrong"]) {
    expect(
      (
        await GET(
          new NextRequest("http://localhost/api/cron/billing", { headers: { authorization } }),
        )
      ).status,
    ).toBe(401);
  }
  expect(batch).not.toHaveBeenCalled();
});
it("returns safe counts and signals partial failures to monitoring", async () => {
  batch.mockResolvedValue({ attempted: 2, reconciled: 1, failed: 1 });
  const result = await GET(
    new NextRequest("http://localhost/api/cron/billing", {
      headers: { authorization: "Bearer synthetic-cron-secret" },
    }),
  );
  expect(result.status).toBe(503);
  expect(result.headers.get("Cache-Control")).toBe("no-store");
  expect(await result.json()).toEqual({ attempted: 2, reconciled: 1, failed: 1 });
});
it("does not leak provider exceptions", async () => {
  batch.mockRejectedValue(new Error("sk_test_do_not_expose"));
  const result = await GET(
    new NextRequest("http://localhost/api/cron/billing", {
      headers: { authorization: "Bearer synthetic-cron-secret" },
    }),
  );
  expect(result.status).toBe(503);
  expect(await result.text()).not.toContain("sk_test");
});
