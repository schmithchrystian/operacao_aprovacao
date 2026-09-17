import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/config/env", () => ({
  env: {
    SUPABASE_URL: "https://media.example.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "server-only-test",
    SUPABASE_STORAGE_BUCKET: "lesson-materials",
    SUPABASE_VIDEO_BUCKET: "lesson-videos",
  },
}));
import { signedPdfUrl, signPrivateVideo, uploadPdf } from "@/server/storage/supabase";
import { validatedVideoSource } from "@/server/services/courses/media-url";
const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe("private media adapter", () => {
  it("signs PDF for two minutes and forces download without leaking service key", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          signedURL: "/object/sign/lesson-materials/lessons/id/test.pdf?token=temporary",
        }),
      ),
    );
    const url = await signedPdfUrl("lessons/id/test.pdf");
    expect(url).toContain("download=");
    expect(url).not.toContain("server-only-test");
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ expiresIn: 120 });
  });
  it("signs private MP4 with a fifteen-minute lifetime", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          signedURL: "/object/sign/lesson-videos/videos/unique.mp4?token=temporary",
        }),
      ),
    );
    expect(await signPrivateVideo("videos/unique.mp4")).toContain(
      "lesson-videos/videos/unique.mp4",
    );
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ expiresIn: 900 });
  });
  it("rejects traversal and invalid provider responses", async () => {
    await expect(signPrivateVideo("videos/../secret.mp4")).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ signedURL: "https://evil.example/a" })),
    );
    await expect(signedPdfUrl("lessons/id/test.pdf")).rejects.toThrow("Resposta");
  });
  it("does not make failed storage upload look successful", async () => {
    fetchMock.mockResolvedValue(new Response("unavailable", { status: 503 }));
    await expect(
      uploadPdf("lessons/id/test.pdf", new TextEncoder().encode("%PDF-1.7")),
    ).rejects.toThrow("armazenar");
  });
  it("accepts validated HTTPS or a private reference, never arbitrary protocols", () => {
    expect(validatedVideoSource("storage:videos/random-key.mp4")).toBe(
      "storage:videos/random-key.mp4",
    );
    expect(() => validatedVideoSource("storage:other/x.mp4")).toThrow();
    expect(() => validatedVideoSource("javascript:alert(1)")).toThrow();
    expect(() => validatedVideoSource("https://user:password@example.com/video.mp4")).toThrow();
  });
});
