import { ValidationError } from "@/server/errors";

/** Server-side validation shared by editorial writes and the player DTO. No fetch occurs here. */
export function validatedVideoUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ValidationError("Informe uma URL HTTPS válida para o vídeo.");
  }
  if (url.protocol !== "https:" || url.username || url.password ||
      url.hostname === "localhost" || url.hostname.endsWith(".localhost") ||
      url.hostname.endsWith(".mock")) {
    throw new ValidationError("Informe uma URL HTTPS pública, sem credenciais, para o vídeo.");
  }
  return url.href;
}

/** Private object references are stored editorially; never exposed directly to students. */
export function validatedVideoSource(value: string | null | undefined): string | null {
  if (value?.startsWith("storage:")) {
    if (!/^storage:videos\/[a-zA-Z0-9/_-]+\.mp4$/.test(value) || value.includes("..")) {
      throw new ValidationError("Informe uma referência válida de vídeo privado.");
    }
    return value;
  }
  return validatedVideoUrl(value);
}
