
-- Derive legacy system decks from their explicit lack of owner.
UPDATE "FlashcardDeck" SET "kind" = 'SUBJECT' WHERE "userId" IS NULL;
-- Preserve privacy for legacy student-authored examinations during rollout.
UPDATE "MockExam" SET "isPersonal" = true WHERE "createdById" IN (SELECT "id" FROM "User" WHERE "role" = 'STUDENT');
-- Partial uniqueness enforces active-session and special-deck invariants.
-- Existing duplicate active plans require explicit reconciliation before applying this migration.
CREATE UNIQUE INDEX "FocusSession_one_active_per_user" ON "FocusSession"("userId") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "StudyPlan_one_active_per_user" ON "StudyPlan"("userId") WHERE "status" = 'ACTIVE' AND "deletedAt" IS NULL;
CREATE UNIQUE INDEX "FlashcardDeck_one_special_per_user" ON "FlashcardDeck"("userId", "kind") WHERE "kind" IN ('ERRORS', 'NOTES') AND "deletedAt" IS NULL;
