import { env } from "@/config/env";
export interface AccountEmail {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
}
export interface AccountEmailTransport {
  send(message: AccountEmail): Promise<void>;
}
export class AccountConfigurationError extends Error {}
/** API contract: https://resend.com/docs/api-reference/emails/send-email (checked 2026-09-13). */
export function createResendTransport(
  options: { apiKey?: string; from?: string; fetcher?: typeof fetch } = {
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
  },
): AccountEmailTransport {
  if (!options.apiKey || !options.from)
    throw new AccountConfigurationError(
      "Envio de e-mail indisponível. Tente novamente mais tarde.",
    );
  const fetcher = options.fetcher ?? fetch;
  return {
    async send(message) {
      const response = await fetcher("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + options.apiKey,
          "Content-Type": "application/json",
          "Idempotency-Key": message.idempotencyKey,
        },
        body: JSON.stringify({
          from: options.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error("Account email delivery failed");
    },
  };
}
