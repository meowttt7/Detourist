import { getLiveDeals } from "@/lib/deal-store";
import { getDuplicateMatchesForDeal } from "@/lib/deal-duplicates";
import { getImportedDealDrafts } from "@/lib/import-draft-store";
import { scoreDeal } from "@/lib/score";
import type { ImportedDealDraft, ImportedDealDraftWithReview } from "@/lib/sources/types";

function enrichImportedDealDraft(draft: ImportedDealDraft) {
  return scoreDeal({
    id: draft.id,
    slug: draft.id,
    publishedAt: draft.createdAt,
    ...draft.payload,
  });
}

export async function getImportedDealDraftsWithReview(limit = 24) {
  const [drafts, deals] = await Promise.all([
    getImportedDealDrafts(limit),
    getLiveDeals(),
  ]);

  return drafts.map((draft) => {
    const score = enrichImportedDealDraft(draft);

    return {
      ...draft,
      review: {
        worthItScore: score.score,
        matchLabel: score.matchLabel,
        savingsPercent: score.savingsPercent,
        reasons: score.reasons,
        warnings: score.warnings,
        duplicateMatches: getDuplicateMatchesForDeal(draft.payload, deals),
      },
    } satisfies ImportedDealDraftWithReview;
  });
}
