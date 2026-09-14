import { z } from "zod";

/** Declarative criteria only: no expressions or executable user input. */
export const achievementCriteriaSchema = z.object({
  metric: z.enum([
    "lessonsCompleted",
    "firstWeekFullyActive",
    "streakDays",
    "mockExamsCompleted",
    "bestMockExamAccuracyPercent",
    "mockExamsAboveAccuracyThreshold",
    "questionsCorrect",
    "studyHours",
    "flashcardsMastered",
    "weeklyGoalsCompleted",
  ]),
  operator: z.enum(["gte", "gt"]).default("gte"),
  threshold: z.number().finite().min(0).max(1_000_000),
});
export type AchievementCriteria = z.infer<typeof achievementCriteriaSchema>;
