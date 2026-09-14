import { env } from "@/config/env";

function settings() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error("Armazenamento privado não configurado.");
  const url = new URL(env.SUPABASE_URL);
  if (url.protocol !== "https:") throw new Error("Armazenamento exige HTTPS.");
  return {
    base: `${url.origin}/storage/v1`,
    bucket: env.SUPABASE_STORAGE_BUCKET,
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    },
  };
}
function objectPath(bucket: string, key: string) {
  if (!/^[a-zA-Z0-9/_-]+\.pdf$/.test(key) || key.includes(".."))
    throw new Error("Chave de objeto inválida.");
  return `${encodeURIComponent(bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;
}
export async function uploadPdf(key: string, bytes: Uint8Array): Promise<void> {
  const { base, bucket, headers } = settings();
  const response = await fetch(`${base}/object/${objectPath(bucket, key)}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/pdf", "x-upsert": "false" },
    body: Buffer.from(bytes),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error("Não foi possível armazenar o material.");
}
export async function removePdf(key: string): Promise<void> {
  const { base, bucket, headers } = settings();
  objectPath(bucket, key);
  const response = await fetch(`${base}/object/${encodeURIComponent(bucket)}`, {
    method: "DELETE",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [key] }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Não foi possível remover o objeto.");
}
export async function signedPdfUrl(key: string): Promise<string> {
  const { base, bucket, headers } = settings();
  const response = await fetch(`${base}/object/sign/${objectPath(bucket, key)}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 120 }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Não foi possível disponibilizar o material.");
  const result: unknown = await response.json();
  if (
    !result ||
    typeof result !== "object" ||
    !("signedURL" in result) ||
    typeof result.signedURL !== "string" ||
    !result.signedURL.startsWith("/object/sign/")
  )
    throw new Error("Resposta de armazenamento inválida.");
  const url = new URL(base + result.signedURL);
  url.searchParams.set("download", "");
  return url.href;
}

export async function signPrivateVideo(key: string): Promise<string> {
  if (!/^videos\/[a-zA-Z0-9/_-]+\.mp4$/.test(key) || key.includes(".."))
    throw new Error("Chave de vídeo inválida.");
  const { base, headers } = settings();
  const bucket = env.SUPABASE_VIDEO_BUCKET;
  const path = `${encodeURIComponent(bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const response = await fetch(`${base}/object/sign/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 900 }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Não foi possível disponibilizar o vídeo.");
  const result: unknown = await response.json();
  if (
    !result ||
    typeof result !== "object" ||
    !("signedURL" in result) ||
    typeof result.signedURL !== "string" ||
    !result.signedURL.startsWith("/object/sign/")
  )
    throw new Error("Resposta de armazenamento inválida.");
  return new URL(base + result.signedURL).href;
}
