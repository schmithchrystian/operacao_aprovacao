import { env } from "@/config/env";
import type { Prisma } from "@/generated/prisma/client";
import { mockStore } from "@/server/repositories/mock/mock-store";

export interface AuditEntry {
  operation: string;
  userId?: string;
  entity: string;
  entityId?: string;
  result: "success" | "failure";
  correlationId: string;
  metadata?: Record<string, unknown>;
}
const auditRecords = mockStore<AuditEntry[]>("audit-records", () => []);

/** Only a bounded scalar allowlist is persisted; arbitrary request payloads never enter audit. */
function sanitize(entry: AuditEntry): AuditEntry {
  const safe: Record<string, unknown> = {};
  for (const key of [
    "points",
    "xp",
    "ruleVersion",
    "elapsedSeconds",
    "timeLimitSeconds",
    "correctCount",
    "wrongCount",
    "blankCount",
    "scorePercent",
    "reason",
    "status",
  ]) {
    const value = entry.metadata?.[key];
    if (typeof value === "number" || typeof value === "boolean") safe[key] = value;
  }
  return {
    operation: entry.operation,
    userId: entry.userId,
    entity: entry.entity,
    entityId: entry.entityId,
    result: entry.result,
    correlationId: entry.correlationId,
    ...(Object.keys(safe).length ? { metadata: safe } : {}),
  };
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  const safe = sanitize(entry);
  if (env.DATA_SOURCE === "prisma") {
    const { prisma } = await import("@/server/db/prisma");
    await prisma.auditLog.create({
      data: {
        action: safe.operation,
        entityType: safe.entity,
        entityId: safe.entityId,
        actorUserId: safe.userId,
        after: JSON.parse(JSON.stringify(safe)) as Prisma.InputJsonValue,
      },
    });
  } else {
    auditRecords.push(safe);
    if (auditRecords.length > 10_000) auditRecords.splice(0, auditRecords.length - 10_000);
  }
}

/** Mock-only diagnostics, retained for unit tests. */
export function getAuditRecords(): readonly AuditEntry[] {
  return auditRecords;
}

export async function listPersistedAuditRecords(): Promise<readonly AuditEntry[]> {
  if (env.DATA_SOURCE !== "prisma") return getAuditRecords();
  const { prisma } = await import("@/server/db/prisma");
  const records = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 1000 });
  return records.reverse().flatMap((record) => {
    const value = record.after;
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    if (
      typeof value.operation !== "string" ||
      typeof value.entity !== "string" ||
      typeof value.correlationId !== "string" ||
      (value.result !== "success" && value.result !== "failure")
    )
      return [];
    return [
      {
        operation: value.operation,
        entity: value.entity,
        correlationId: value.correlationId,
        result: value.result,
        userId: record.actorUserId ?? undefined,
        entityId: record.entityId ?? undefined,
      },
    ];
  });
}
