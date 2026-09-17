import { env } from "@/config/env";
import { PrismaAccountEmailQueueRepository } from "@/server/repositories/prisma/account-email-queue-repository";
import { accountEmailKey, decryptAccountEmail } from "./email-encryption";
import { createResendTransport, type AccountEmailTransport } from "./email";
/** Process a bounded batch outside all database transactions. Leases recover crashed workers. */
export async function processAccountEmailQueue(
  options: {
    transport?: AccountEmailTransport;
    encryptionKey?: string;
    now?: () => Date;
    limit?: number;
  } = {},
) {
  const key = accountEmailKey(options.encryptionKey ?? env.ACCOUNT_EMAIL_ENCRYPTION_KEY),
    transport = options.transport ?? createResendTransport(),
    now = options.now ?? (() => new Date());
  const repo = new PrismaAccountEmailQueueRepository();
  const skipped = await repo.cleanup(now());
  const rows = await repo.claim(now(), Math.max(1, Math.min(options.limit ?? 10, 25)));
  const result = { claimed: rows.length, processed: 0, retrying: 0, failed: 0, skipped };
  await Promise.all(
    rows.map(async (row) => {
      if (
        row.attempts > 5 ||
        !row.ciphertext ||
        !(await repo.eligible(row.id, row.leaseToken!, now()))
      ) {
        await repo.complete(
          row,
          row.attempts > 5 ? "FAILED" : "SKIPPED",
          now(),
          "EXPIRED_OR_EXHAUSTED",
        );
        result.skipped++;
        return;
      }
      let message;
      try {
        message = decryptAccountEmail(row.ciphertext, key, row.id, row.expiresAt);
      } catch {
        await repo.complete(row, "FAILED", now(), "INVALID_CIPHERTEXT");
        result.failed++;
        return;
      }
      try {
        await transport.send(message);
        if (await repo.complete(row, "PROCESSED", now())) result.processed++;
      } catch {
        if (await repo.retry(row, now())) result.failed++;
        else result.retrying++;
      }
    }),
  );
  return result;
}
