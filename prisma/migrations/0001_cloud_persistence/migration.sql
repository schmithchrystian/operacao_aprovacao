-- CreateEnum
CREATE TYPE "CourseDifficulty" AS ENUM ('iniciante', 'intermediario', 'avancado');

-- CreateEnum
CREATE TYPE "StudyPlanItemKind" AS ENUM ('STUDY', 'REVIEW', 'MOCK_EXAM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FlashcardDeckKind" AS ENUM ('SUBJECT', 'PERSONAL', 'ERRORS', 'NOTES');

-- CreateEnum
CREATE TYPE "BrainstormCardType" AS ENUM ('IDEIA', 'DUVIDA', 'RESUMO', 'ANOTACAO');

-- CreateEnum
CREATE TYPE "FocusMode" AS ENUM ('FOCUS_25_5', 'FOCUS_50_10', 'QUICK_15', 'INTENSE_90', 'FREE', 'CUSTOM');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "showPerformance" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showStudyHours" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "coverColor" TEXT NOT NULL DEFAULT '#1F2937',
ADD COLUMN     "difficulty" "CourseDifficulty" NOT NULL DEFAULT 'iniciante',
ADD COLUMN     "teacherName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "workloadHours" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "slug" TEXT,
ADD COLUMN     "subjectId" TEXT;

-- AlterTable
ALTER TABLE "StudySession" ADD COLUMN     "clientSessionId" TEXT,
ADD COLUMN     "coveredIntervals" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "heartbeatCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastClientTimestamp" DOUBLE PRECISION,
ADD COLUMN     "lastHeartbeatAt" TIMESTAMP(3),
ADD COLUMN     "lastPositionSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "lessonId" TEXT;

-- AlterTable
ALTER TABLE "StudyPlanItem" ADD COLUMN     "kind" "StudyPlanItemKind" NOT NULL DEFAULT 'STUDY';

-- AlterTable
ALTER TABLE "MockExam" ADD COLUMN     "isPersonal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MockExamAttempt" ADD COLUMN     "timeLimitSeconds" INTEGER;

-- AlterTable
ALTER TABLE "FlashcardDeck" ADD COLUMN     "kind" "FlashcardDeckKind" NOT NULL DEFAULT 'PERSONAL';

-- AlterTable
ALTER TABLE "BrainstormCard" ADD COLUMN     "type" "BrainstormCardType" NOT NULL DEFAULT 'ANOTACAO';

-- CreateTable
CREATE TABLE "FocusSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "FocusMode" NOT NULL,
    "status" "StudySessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetSeconds" INTEGER NOT NULL,
    "breakSeconds" INTEGER NOT NULL,
    "subjectId" TEXT,
    "topicId" TEXT,
    "objective" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL,
    "lastClientTimestamp" DOUBLE PRECISION,
    "activeSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "heartbeatCount" INTEGER NOT NULL DEFAULT 0,
    "validHeartbeatCount" INTEGER NOT NULL DEFAULT 0,
    "cyclesPlanned" INTEGER NOT NULL DEFAULT 1,
    "cyclesCompleted" INTEGER NOT NULL DEFAULT 0,
    "goalAchieved" BOOLEAN,
    "contentStudied" TEXT,
    "focusLevel" INTEGER,
    "doubtNote" TEXT,
    "scored" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyMission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "StudySessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "blocks" JSONB NOT NULL,
    "currentBlockIndex" INTEGER NOT NULL DEFAULT 0,
    "totalMinutes" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityRateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "SecurityRateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PersistentLock" (
    "key" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersistentLock_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "BusinessConfig" (
    "id" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainOutbox" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "status" "GamificationEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "DomainOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FocusSession_userId_status_idx" ON "FocusSession"("userId", "status");

-- CreateIndex
CREATE INDEX "StudyMission_userId_startedAt_idx" ON "StudyMission"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "SecurityRateLimit_windowStart_idx" ON "SecurityRateLimit"("windowStart");

-- CreateIndex
CREATE INDEX "PersistentLock_expiresAt_idx" ON "PersistentLock"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "DomainOutbox_idempotencyKey_key" ON "DomainOutbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "DomainOutbox_status_availableAt_idx" ON "DomainOutbox"("status", "availableAt");

-- CreateIndex
CREATE INDEX "Module_subjectId_idx" ON "Module"("subjectId");

-- CreateIndex
CREATE INDEX "StudySession_userId_lastHeartbeatAt_idx" ON "StudySession"("userId", "lastHeartbeatAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudySession_userId_lessonId_clientSessionId_key" ON "StudySession"("userId", "lessonId", "clientSessionId");

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyMission" ADD CONSTRAINT "StudyMission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
