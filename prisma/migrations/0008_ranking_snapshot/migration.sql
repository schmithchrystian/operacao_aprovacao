-- CreateTable
CREATE TABLE "RankingSnapshot" (
    "periodType" "RankingPeriodType" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "scopeType" "RankingScopeType" NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "calculationVersion" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankingSnapshot_pkey" PRIMARY KEY ("periodType","periodKey","scopeType","scopeKey","calculationVersion")
);

-- Preserve existing calculation versions, including their latest actual calculation instant.
INSERT INTO "RankingSnapshot" ("periodType", "periodKey", "scopeType", "scopeKey", "calculationVersion", "calculatedAt") SELECT "periodType", "periodKey", "scopeType", "scopeKey", "calculationVersion", MAX("calculatedAt") FROM "RankingScore" GROUP BY "periodType", "periodKey", "scopeType", "scopeKey", "calculationVersion";
