/** Provision a NEW administrator from a protected stdin JSON document; never accepts a password in argv. */
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { registerAccountSchema } from "../src/contracts/account";
export async function bootstrapAdmin(raw: unknown, expectedHost: string) {
  const input = registerAccountSchema.strict().parse(raw);
  const { env } = await import("../src/config/env");
  if (
    env.DATA_SOURCE !== "prisma" ||
    !env.DATABASE_URL ||
    new URL(env.DATABASE_URL).host !== expectedHost
  )
    throw new Error("Database target does not match the explicit expected host.");
  const passwordHash = await bcrypt.hash(input.password, 12),
    now = new Date();
  const { prisma, inDatabaseTransaction } = await import("../src/server/db/prisma");
  return inDatabaseTransaction(async () => {
    // Unique email makes retries fail safely: existing accounts are never promoted or modified.
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: "ADMIN",
        requiresEmailVerification: false,
        emailVerified: now,
        profile: {
          create: {
            isProfilePublic: false,
            showInRanking: false,
            showRealName: false,
            showCityState: false,
            showStudyHours: false,
            showPerformance: false,
          },
        },
      },
      select: { id: true },
    });
    await prisma.auditLog.create({
      data: {
        action: "accounts.bootstrap-admin",
        entityType: "User",
        entityId: user.id,
        after: { correlationId: randomUUID(), result: "success" },
      },
    });
    return user.id;
  });
}
async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    process.stdout.write(
      "Usage: tsx scripts/bootstrap-admin.ts --confirm-create-admin --database-host HOST:PORT < protected-account.json\nJSON requires name, email, password. Creates a new administrator only; never promotes an existing account.\n",
    );
    return;
  }
  const hostIndex = args.indexOf("--database-host"),
    expectedHost = hostIndex >= 0 ? args[hostIndex + 1] : undefined;
  if (!args.includes("--confirm-create-admin") || !expectedHost || process.stdin.isTTY)
    throw new Error(
      "Explicit confirmation, database host and protected stdin JSON are required. Use --help.",
    );
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk.toString();
    if (input.length > 4096) throw new Error("Input too large.");
  }
  await bootstrapAdmin(JSON.parse(input), expectedHost);
  process.stdout.write(
    "Administrator created. Store the credential securely and rotate it at first use.\n",
  );
  const { prisma } = await import("../src/server/db/prisma");
  await prisma.$disconnect();
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(async () => {
    process.stderr.write(
      "Administrator creation failed. Check the target, input and whether this email already exists. No existing account was changed.\n",
    );
    process.exitCode = 1;
  });
}
