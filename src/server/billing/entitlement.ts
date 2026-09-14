import { env } from "@/config/env";
import { ForbiddenError } from "@/server/errors";
import { hasSubscriptionAccess } from "@/server/repositories/prisma/billing-repository";
export async function assertSubscriptionAccess(userId: string): Promise<void> {
  if (!env.BILLING_REQUIRED) return;
  if (env.DATA_SOURCE !== "prisma" || !(await hasSubscriptionAccess(userId)))
    throw new ForbiddenError("Assinatura ativa necessária. Consulte a página de assinatura.");
}
