CREATE TABLE "UserMfa" (
 "userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
 "encryptedSecret" TEXT NOT NULL,
 "enabledAt" TIMESTAMP(3),
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "lastStep" INTEGER NOT NULL DEFAULT -1,
 "recoveryHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Subscription" ADD COLUMN "accessBlockedReason" TEXT, ADD COLUMN "reconciledAt" TIMESTAMP(3);
CREATE INDEX "Subscription_provider_reconciledAt_idx" ON "Subscription"("provider", "reconciledAt");
