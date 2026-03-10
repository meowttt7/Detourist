import { getAllDeals } from "@/lib/deal-store";
import { scoreDeal } from "@/lib/score";
import { getImportedDealDrafts } from "@/lib/import-draft-store";
import type { Deal } from "@/lib/types";
import type { ImportedDealDraft, ImportedDealDraftWithReview, ImportedDealDuplicateMatch } from "@/lib/sources/types";

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function getPriceGapPercent(left: number, right: number) {
  const baseline = Math.max(left, right, 1);
  return Math.round((Math.abs(left - right) / baseline) * 100);
}

function buildDuplicateLabel(draft: ImportedDealDraft, liveDeal: Deal) {
  const routeMatch = normalizeText(draft.payload.origin) === normalizeText(liveDeal.origin)
    && normalizeText(draft.payload.destination) === normalizeText(liveDeal.destination);
  const brandMatch = normalizeText(draft.payload.airlineOrBrand) === normalizeText(liveDeal.airlineOrBrand);
  const cabinMatch = normalizeText(draft.payload.cabin) === normalizeText(liveDeal.cabin);
  const priceGapPercent = getPriceGapPercent(draft.payload.currentPrice, liveDeal.currentPrice);

  if (routeMatch && brandMatch && cabinMatch && priceGapPercent <= 12) {
    return "Near-duplicate live deal";
  }

  if (routeMatch && cabinMatch && priceGapPercent <= 20) {
    return "Very similar route and cabin";
  }

  return "Related route already live";
}

function getDuplicateMatches(draft: ImportedDealDraft, deals: Deal[]): ImportedDealDuplicateMatch[] {
  const matches = deals
    .filter((deal) => deal.type === draft.payload.type)
    .map((deal) => {
      const routeMatch = normalizeText(deal.origin) === normalizeText(draft.payload.origin)
        && normalizeText(deal.destination) === normalizeText(draft.payload.destination);
      const inverseRouteMatch = normalizeText(deal.origin) === normalizeText(draft.payload.destination)
        && normalizeText(deal.destination) === normalizeText(draft.payload.origin);
      const brandMatch = normalizeText(deal.airlineOrBrand) === normalizeText(draft.payload.airlineOrBrand);
      const cabinMatch = normalizeText(deal.cabin) === normalizeText(draft.payload.cabin);
      const priceGapPercent = getPriceGapPercent(deal.currentPrice, draft.payload.currentPrice);

      let similarityScore = 0;
      if (routeMatch) {
        similarityScore += 5;
      }
      if (inverseRouteMatch) {
        similarityScore += 2;
      }
      if (brandMatch) {
        similarityScore += 3;
      }
      if (cabinMatch) {
        similarityScore += 2;
      }
      if (priceGapPercent <= 12) {
        similarityScore += 3;
      } else if (priceGapPercent <= 20) {
        similarityScore += 2;
      } else if (priceGapPercent <= 30) {
        similarityScore += 1;
      }

      return {
        deal,
        similarityScore,
        priceGapPercent,
      };
    })
    .filter((candidate) => candidate.similarityScore >= 5)
    .sort((left, right) => right.similarityScore - left.similarityScore || left.priceGapPercent - right.priceGapPercent)
    .slice(0, 3)
    .map(({ deal }) => ({
      dealId: deal.id,
      dealSlug: deal.slug,
      title: deal.title,
      publishedAt: deal.publishedAt,
      currentPrice: deal.currentPrice,
      currency: deal.currency,
      similarityLabel: buildDuplicateLabel(draft, deal),
    } satisfies ImportedDealDuplicateMatch));

  return matches;
}

function enrichImportedDealDraft(draft: ImportedDealDraft, deals: Deal[]): ImportedDealDraftWithReview {
  const score = scoreDeal({
    id: draft.id,
    slug: draft.id,
    publishedAt: draft.createdAt,
    ...draft.payload,
  });

  return {
    ...draft,
    review: {
      worthItScore: score.score,
      matchLabel: score.matchLabel,
      savingsPercent: score.savingsPercent,
      reasons: score.reasons,
      warnings: score.warnings,
      duplicateMatches: getDuplicateMatches(draft, deals),
    },
  };
}

export async function getImportedDealDraftsWithReview(limit = 24) {
  const [drafts, deals] = await Promise.all([
    getImportedDealDrafts(limit),
    getAllDeals(),
  ]);

  return drafts.map((draft) => enrichImportedDealDraft(draft, deals));
}
