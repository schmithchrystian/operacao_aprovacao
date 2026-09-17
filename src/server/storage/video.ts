import { validatedVideoSource } from "@/server/services/courses/media-url";
import { signPrivateVideo } from "./supabase";
/** Call only after current account, publication, enrollment and lesson lock checks. */
export async function resolveLessonVideoUrl(value: string | null | undefined): Promise<string> {
  const source = validatedVideoSource(value);
  if (!source) return "";
  return source.startsWith("storage:") ? signPrivateVideo(source.slice(8)) : source;
}
