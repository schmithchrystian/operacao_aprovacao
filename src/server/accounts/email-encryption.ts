import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import { AccountConfigurationError, type AccountEmail } from "./email";
const emailSchema = z.object({
  to: z.string().email(),
  subject: z.string().max(300),
  text: z.string().max(16000),
  idempotencyKey: z.string().min(1).max(256),
});
export function accountEmailKey(value?: string): Buffer {
  if (!value)
    throw new AccountConfigurationError("Fila de e-mail indisponível. Tente novamente mais tarde.");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64") !== value)
    throw new AccountConfigurationError("Fila de e-mail indisponível. Tente novamente mais tarde.");
  return key;
}
export function encryptAccountEmail(
  message: AccountEmail,
  key: Buffer,
  id: string,
  expiresAt: Date,
): string {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(id + ":" + expiresAt.toISOString()));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(emailSchema.parse(message)), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}
export function decryptAccountEmail(
  envelope: string,
  key: Buffer,
  id: string,
  expiresAt: Date,
): AccountEmail {
  const [version, iv, tag, body, ...extra] = envelope.split(".");
  if (version !== "v1" || !iv || !tag || !body || extra.length)
    throw new Error("Invalid encrypted email");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAAD(Buffer.from(id + ":" + expiresAt.toISOString()));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(body, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return emailSchema.parse(JSON.parse(plaintext));
}
