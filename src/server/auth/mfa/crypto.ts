import {
  createHmac,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
  createHash,
} from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function newSecret(): string {
  return Array.from(randomBytes(32), (byte) => alphabet[byte & 31]).join("");
}
function decode(secret: string): Buffer {
  if (!/^[A-Z2-7]+$/.test(secret)) throw new Error("Invalid MFA secret");
  let bits = "";
  for (const char of secret) bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  return Buffer.from(bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)));
}
/** RFC 4226 dynamic truncation; RFC 6238 uses a 30-second counter. */
export function totp(secret: string, step: number, digits = 6): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac("sha1", decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1]! & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits)
    .toString()
    .padStart(digits, "0");
}
export function matchStep(secret: string, code: string, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const step = Math.floor(now / 30000);
  for (const candidate of [step, step - 1, step + 1]) {
    if (candidate >= 0 && timingSafeEqual(Buffer.from(code), Buffer.from(totp(secret, candidate))))
      return candidate;
  }
  return null;
}
export function encryptSecret(secret: string, keyHex: string, userId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), iv);
  cipher.setAAD(Buffer.from(userId));
  const data = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64url")).join(".");
}
export function decryptSecret(payload: string, keyHex: string, userId: string): string {
  const [iv, tag, data] = payload.split(".").map((part) => Buffer.from(part, "base64url"));
  if (!iv || !tag || !data) throw new Error("Invalid MFA ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), iv);
  decipher.setAAD(Buffer.from(userId));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
export const recoveryHash = (code: string) => createHash("sha256").update(code).digest("hex");
export const newRecoveryCodes = () =>
  Array.from({ length: 10 }, () => randomBytes(16).toString("hex"));
