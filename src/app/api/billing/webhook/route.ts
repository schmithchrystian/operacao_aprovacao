import { z } from "zod";
import { processWebhook } from "@/server/billing/service";
import { ValidationError } from "@/server/errors";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request): Promise<Response> {
  try {
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "Corpo ausente." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1024 * 1024) {
        await reader.cancel();
        return Response.json({ error: "Corpo excede limite." }, { status: 413 });
      }
      chunks.push(value);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    await processWebhook(raw, request.headers.get("stripe-signature"));
    return Response.json({ received: true });
  } catch (error) {
    const badRequest =
      error instanceof ValidationError ||
      error instanceof z.ZodError ||
      error instanceof SyntaxError;
    return Response.json(
      { error: badRequest ? "Webhook inválido." : "Processamento temporariamente indisponível." },
      { status: badRequest ? 400 : 503 },
    );
  }
}
