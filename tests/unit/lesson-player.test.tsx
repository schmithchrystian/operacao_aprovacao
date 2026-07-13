import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { refreshMock, toastErrorMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: toastErrorMock },
}));

const { LessonPlayer } = await import("@/components/lessons/lesson-player");

/**
 * Sobrescreve uma propriedade de `HTMLMediaElement` diretamente na instância — jsdom não
 * implementa reprodução de vídeo real (duration/currentTime/paused ficam nos defaults),
 * então simulamos o estado do player para exercitar os sinais BRUTOS enviados no heartbeat.
 */
function setVideoProperty(video: HTMLVideoElement, key: string, value: unknown) {
  Object.defineProperty(video, key, { value, configurable: true });
}

function getVideo(): HTMLVideoElement {
  const video = document.querySelector("video");
  if (!video) throw new Error("elemento <video> não encontrado");
  return video;
}

describe("LessonPlayer", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("envia só sinais brutos no heartbeat ao iniciar a reprodução e atualiza o progresso com o valor do servidor", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: true,
        data: {
          lessonId: "lesson-1",
          watchedPercent: 45,
          status: "in_progress",
          resumePositionSeconds: 30,
          justCompleted: false,
          completion: null,
          flags: [],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LessonPlayer
        lessonId="lesson-1"
        videoUrl="https://cdn.opapp.mock/videos/lesson-1.mp4"
        resumePositionSeconds={10}
        initialWatchedPercent={20}
        initialStatus="in_progress"
        nextLessonHref={null}
        nextLessonTitle={null}
        courseTrackHref="/cursos/pm-soldado"
      />,
    );

    const video = getVideo();
    setVideoProperty(video, "duration", 120);
    setVideoProperty(video, "currentTime", 30);
    setVideoProperty(video, "paused", false);
    setVideoProperty(video, "playbackRate", 1);

    video.dispatchEvent(new Event("play"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/progress/heartbeat");
    const body: Record<string, unknown> = JSON.parse(init.body as string);

    // Só sinais brutos — nunca um percentual/tempo total/"concluído" calculado no cliente.
    expect(body).toMatchObject({
      lessonId: "lesson-1",
      positionSeconds: 30,
      durationSeconds: 120,
      playing: true,
      tabVisible: true,
      playbackRate: 1,
    });
    expect(typeof body.sessionId).toBe("string");
    expect(typeof body.clientTimestamp).toBe("number");
    expect(body).not.toHaveProperty("watchedPercent");
    expect(body).not.toHaveProperty("completed");
    expect(body).not.toHaveProperty("percent");

    // A barra de progresso reflete o valor devolvido pelo servidor, não um cálculo local.
    await waitFor(() => expect(screen.getByText("45%")).toBeTruthy());
  });

  it("abre a tela de Vitória e atualiza a árvore do servidor quando o heartbeat retorna justCompleted", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: true,
        data: {
          lessonId: "lesson-1",
          watchedPercent: 100,
          status: "completed",
          resumePositionSeconds: 120,
          justCompleted: true,
          completion: {
            lessonId: "lesson-1",
            lessonTitle: "Interpretação de texto",
            points: 100,
            xp: 100,
            moduleProgressPercent: 50,
            courseProgressPercent: 20,
            achievementUnlocked: null,
          },
          flags: [],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LessonPlayer
        lessonId="lesson-1"
        videoUrl="https://cdn.opapp.mock/videos/lesson-1.mp4"
        resumePositionSeconds={0}
        initialWatchedPercent={90}
        initialStatus="in_progress"
        nextLessonHref={null}
        nextLessonTitle={null}
        courseTrackHref="/cursos/pm-soldado"
      />,
    );

    const video = getVideo();
    setVideoProperty(video, "duration", 120);
    setVideoProperty(video, "currentTime", 120);
    setVideoProperty(video, "paused", true);
    setVideoProperty(video, "playbackRate", 1);

    video.dispatchEvent(new Event("pause"));

    await waitFor(() => expect(screen.getByText(/vitória conquistada/i)).toBeTruthy());
    expect(screen.getByText(/interpretação de texto/i)).toBeTruthy();
    expect(refreshMock).toHaveBeenCalled();
  });

  it("não envia heartbeat antes de a duração do vídeo estar disponível", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LessonPlayer
        lessonId="lesson-1"
        videoUrl="https://cdn.opapp.mock/videos/lesson-1.mp4"
        resumePositionSeconds={0}
        initialWatchedPercent={0}
        initialStatus="available"
        nextLessonHref={null}
        nextLessonTitle={null}
        courseTrackHref="/cursos/pm-soldado"
      />,
    );

    const video = getVideo();
    video.dispatchEvent(new Event("play"));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("não dispara toast de erro quando o heartbeat é limitado por rate-limit (429)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 429,
      json: async () => ({
        ok: false,
        error: { code: "RATE_LIMITED", message: "Heartbeat enviado com frequência excessiva." },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LessonPlayer
        lessonId="lesson-1"
        videoUrl="https://cdn.opapp.mock/videos/lesson-1.mp4"
        resumePositionSeconds={0}
        initialWatchedPercent={30}
        initialStatus="in_progress"
        nextLessonHref={null}
        nextLessonTitle={null}
        courseTrackHref="/cursos/pm-soldado"
      />,
    );

    const video = getVideo();
    setVideoProperty(video, "duration", 120);
    setVideoProperty(video, "currentTime", 42);
    setVideoProperty(video, "paused", false);
    setVideoProperty(video, "playbackRate", 1);

    video.dispatchEvent(new Event("seeked"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(toastErrorMock).not.toHaveBeenCalled();
    // O progresso exibido não regride: continua no valor inicial vindo do servidor.
    expect(screen.getByText("30%")).toBeTruthy();
  });

  it("dispara toast de erro em falha genuína do heartbeat (5xx)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 500,
      json: async () => ({
        ok: false,
        error: { code: "INTERNAL_ERROR", message: "Não foi possível processar o heartbeat." },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LessonPlayer
        lessonId="lesson-1"
        videoUrl="https://cdn.opapp.mock/videos/lesson-1.mp4"
        resumePositionSeconds={0}
        initialWatchedPercent={30}
        initialStatus="in_progress"
        nextLessonHref={null}
        nextLessonTitle={null}
        courseTrackHref="/cursos/pm-soldado"
      />,
    );

    const video = getVideo();
    setVideoProperty(video, "duration", 120);
    setVideoProperty(video, "currentTime", 42);
    setVideoProperty(video, "paused", false);
    setVideoProperty(video, "playbackRate", 1);

    video.dispatchEvent(new Event("seeked"));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(1));
  });
});
