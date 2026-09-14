import { createHash } from "node:crypto";
import { z } from "zod";
import { assessPack, validatePack } from "@/content/professor-rs/schema";

export function packDigest(input: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(validatePack(input)))
    .digest("hex");
}
export const reviewSchema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  reviewer: z.string().trim().min(3),
  reviewedAt: z.iso.datetime(),
  approved: z.literal(true),
  syllabusAndAmendmentsChecked: z.literal(true),
  answersAndSourcesChecked: z.literal(true),
  rightsChecked: z.literal(true),
});
export function validatePublication(input: unknown, review: unknown) {
  const pack = validatePack(input);
  const assessment = assessPack(pack);
  if (!assessment.readyForReview)
    throw new Error(
      `Curso incompleto: ${assessment.gaps.length} pendências. Execute professor:agent validate.`,
    );
  const approved = reviewSchema.parse(review);
  if (approved.sha256 !== packDigest(pack))
    throw new Error("O conteúdo mudou desde a revisão. Atualize a revisão do pacote exato.");
  if (Date.parse(approved.reviewedAt) > Date.now() + 60_000)
    throw new Error("A data de revisão não pode estar no futuro.");
  return { pack, review: approved };
}
