-- CreateTable
CREATE TABLE "AccountEmailOutbox" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ciphertext" TEXT,
    "status" "GamificationEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "leaseToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,

    CONSTRAINT "AccountEmailOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountEmailOutbox_tokenHash_key" ON "AccountEmailOutbox"("tokenHash");

-- CreateIndex
CREATE INDEX "AccountEmailOutbox_status_availableAt_leaseUntil_idx" ON "AccountEmailOutbox"("status", "availableAt", "leaseUntil");

-- CreateIndex
CREATE INDEX "AccountEmailOutbox_expiresAt_idx" ON "AccountEmailOutbox"("expiresAt");

-- AddForeignKey
ALTER TABLE "AccountEmailOutbox" ADD CONSTRAINT "AccountEmailOutbox_tokenHash_fkey" FOREIGN KEY ("tokenHash") REFERENCES "AccountToken"("hash") ON DELETE CASCADE ON UPDATE CASCADE;
