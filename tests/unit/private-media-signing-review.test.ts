// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/config/env", () => ({
  env: {
    SUPABASE_URL: "https://storage.example.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key",
    SUPABASE_STORAGE_BUCKET: "private-materials",
    SUPABASE_VIDEO_BUCKET: "private-videos",
  },
}));
import { signedPdfUrl, signPrivateVideo } from "@/server/storage/supabase";
import { resolveLessonVideoUrl } from "@/server/storage/video";
const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
describe("independent private media signer boundary", () => {
  it("rejects traversal, encoded traversal and unsupported private extensions before network calls", async () => {
    for (const key of ["../secret.pdf", "lessons/%2e%2e/secret.pdf", "lessons/a.html"])
      await expect(signedPdfUrl(key)).rejects.toThrow();
    for (const source of [
      "storage:videos/../secret.mp4",
      "storage:videos/%2e%2e/secret.mp4",
      "storage:videos/a.html",
    ])
      await expect(resolveLessonVideoUrl(source)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("uses the configured private bucket and bounded TTL without leaking service credentials", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        signedURL: "/object/sign/private-videos/videos/test.mp4?token=synthetic-short-lived",
      }),
    );
    const result = await signPrivateVideo("videos/test.mp4");
    expect(result).toBe(
      "https://storage.example.invalid/storage/v1/object/sign/private-videos/videos/test.mp4?token=synthetic-short-lived",
    );
    expect(result).not.toContain("synthetic-service-key");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://storage.example.invalid/storage/v1/object/sign/private-videos/videos/test.mp4",
    );
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1].body)).toEqual({ expiresIn: 900 });
  });
  it("does not return a provider response pointing directly to another origin", async () => {
    fetchMock.mockResolvedValue(Response.json({ signedURL: "https://untrusted.example.invalid/" }));
    await expect(signedPdfUrl("lessons/test.pdf")).rejects.toThrow(
      "Resposta de armazenamento inválida",
    );
  });
});
